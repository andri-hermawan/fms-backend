import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { CreateEquipmentLogDto } from './dto/create-equipment-log.dto';
import { QueryEquipmentLogDto } from './dto/query-equipment-log.dto';
import { ActivitySummaryQueryDto } from './dto/activity-summary.dto';
import { EquipmentsRepository } from '../equipments/repositories/equipments.repository';
import * as turf from '@turf/turf';
import { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { GeofencesService } from '../geofences/geofences.service';
import { AlertsRepository } from '../alerts/repositories/alerts.repository';
import { EquipmentStatusService } from '../equipment-status/equipment-status.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateAlertDto } from '../alerts/dto/create-alert.dto';
import { FuelsService } from '../fuels/fuels.service';
import { FuelCalibrationsService } from '../fuel-calibrations/fuel-calibrations.service';
import { serializeBigInt } from '../../common/helpers/bigint.helper';
import { WebSocketGatewayService } from '../../common/websocket/websocket.gateway';
import { ShiftsService } from '../shifts/shifts.service';
@Injectable()
export class EquipmentLogsService {
  private readonly logger = new Logger(EquipmentLogsService.name);
  constructor(
    private readonly repository: EquipmentLogsRepository,
    private readonly equipmentRepo: EquipmentsRepository,
    private readonly alertRepo: AlertsRepository,
    private readonly alertsService: AlertsService,
    private readonly fuelsService: FuelsService,
    private readonly fuelCalibrationsService: FuelCalibrationsService,
    private readonly geofenceService: GeofencesService,
    private readonly equipmentStatusService: EquipmentStatusService,
    private readonly wsGateway: WebSocketGatewayService,
    private readonly shiftsService: ShiftsService,
  ) {}

  async create(dto: CreateEquipmentLogDto) {
    // STEP 1: Normalize incoming telemetry data.
    const {
      longitude,
      latitude,
      speed,
      fuel_level,
      fuel_temperature,
      engine_status,
      vessel,
      equipment_id,
      gsm_signal,
      gsm_operator,
      ...rest
    } = dto;
    const currentTime = new Date(dto.time);
    // this.logger.debug(`currentTime 1 =${currentTime?.toISOString()}`);

    // STEP 2: Load equipment and project geofence configuration.
    const equipment = await this.equipmentRepo.findById(equipment_id!);
    if (!equipment) {
      throw new Error('Equipment tidak ditemukan');
    }
    const geojsonRaw = equipment.projects?.geojson_origin;

    // STEP 3: Calculate geofence information from the current coordinates.
    // const locationPoint = { type: 'Point', coordinates: [longitude, latitude] };
    let segmentName = 'Unknown';
    let categoryLocation = 'Unknown';
    let origFid = 0;
    let isInside = false;

    if (geojsonRaw) {
      const geojson =
        typeof geojsonRaw === 'string' ? JSON.parse(geojsonRaw) : geojsonRaw;
      // Turf mendeteksi [longitude, latitude]
      const pt = turf.point([longitude, latitude]);

      turf.featureEach(geojson as Feature | FeatureCollection, (feature) => {
        if (
          feature.geometry &&
          (feature.geometry.type === 'Polygon' ||
            feature.geometry.type === 'MultiPolygon')
        ) {
          if (
            turf.booleanPointInPolygon(
              pt,
              feature as Feature<Polygon | MultiPolygon>,
            )
          ) {
            isInside = true;
            segmentName = feature.properties?.Segment || 'No Segment Name';
            categoryLocation = feature.properties?.Category || 'No Category';
            origFid = Number(feature.properties?.ORIG_FID) || 0;
          }
        }
      });
    }

    // STEP 4: Load the latest log once; reuse it for all comparisons below.
    const lastLog = await this.repository.findByIdLastEquip(dto.equipment_id!);

    // STEP 5: Determine vessel status from the current and previous geofence.
    let currentVesselStatus: string = lastLog?.vessel_status ?? 'UNKNOWN';
    if (origFid === 0) {
      currentVesselStatus = 'UNKNOWN';
    } else if (lastLog && lastLog.orig_fid !== null && lastLog.orig_fid !== 0) {
      if (origFid > lastLog.orig_fid) {
        currentVesselStatus = 'EMPTY';
      } else if (origFid < lastLog.orig_fid) {
        currentVesselStatus = 'LOADED';
      }
    } else {
      currentVesselStatus = 'EMPTY';
    }

    const currentSpeed = Number(speed ?? 0);
    const isEngineOn = Boolean(engine_status);
    const gsmSignal = Number(gsm_signal ?? 0);
    const gsmOperator = gsm_operator;
    const lastLogCreate = lastLog?.created_at
      ? new Date(lastLog.created_at)
      : null;
    const nowDateTime = new Date();
    const idleThreshold = origFid === 0 ? 10 : 5;

    // this.logger.debug(
    //   `[Equipment Status] lastLogCreate=${lastLogCreate?.toISOString() ?? 'NULL'}`,
    // );
    // this.logger.debug(
    //   `[Equipment Status] nowDateTime=${nowDateTime.toISOString()}`,
    // );

    // Calculate elapsed time from the previous log for operational status.
    const diffMinutes = lastLogCreate
      ? (nowDateTime.getTime() - lastLogCreate.getTime()) / 1000 / 60
      : Number.MAX_SAFE_INTEGER;

    // this.logger.debug(
    //   `[Equipment Status] diffMinutes=${diffMinutes.toFixed(2)} minutes`,
    // );

    let opStatus = 'OFFLINE';

    // STEP 6: Determine operational status.
    // OFFLINE: stale telemetry, invalid GSM signal, or missing operator.
    if (gsmSignal <= 0 || !gsmOperator) {
      opStatus = 'OFFLINE';
    }
    // RUNNING: engine on and vehicle moving.
    else if (isEngineOn && currentSpeed > 0) {
      opStatus = 'RUNNING';
    }
    // IDLE: engine on, stopped, and threshold elapsed.
    else if (isEngineOn && currentSpeed === 0 && diffMinutes >= idleThreshold) {
      opStatus = 'IDLE';
    }
    // STOP: engine off while speed is non-zero.
    else if (!isEngineOn && currentSpeed === 0) {
      opStatus = 'STOP';
    }
    // Transition state: telemetry has not reached the configured threshold.
    else if (isEngineOn) {
      opStatus = currentSpeed > 0 ? 'RUNNING' : 'IDLE';
    } else {
      opStatus = 'STOP';
    }

    // this.logger.debug(
    //   `[Equipment Status] speed=${currentSpeed}, engine=${isEngineOn}, gsmSignal=${gsmSignal}, gsmOperator=${gsmOperator}, status=${opStatus}`,
    // );

    // this.logger.debug(`segmentName savelog: ${segmentName}`);

    // STEP 7: Get fuel calibration data before saving log
    let fuelVolume: number | undefined;
    let fuelPercentage: number | undefined;
    let fuelDifference: number | undefined;

    if (fuel_level && lastLog?.fuel_level) {
      try {
        const currentCalibration =
          await this.fuelCalibrationsService.lookupVolume(
            dto.equipment_id!,
            Number(fuel_level),
          );
        const previousCalibration =
          await this.fuelCalibrationsService.lookupVolume(
            dto.equipment_id!,
            Number(lastLog.fuel_level),
          );

        fuelVolume = Number(currentCalibration.volume);
        fuelPercentage = Number(currentCalibration.percentage);
        fuelDifference = fuelVolume - Number(previousCalibration.volume);
      } catch {
        // If calibration fails, set to undefined
      }
    } else if (fuel_level) {
      try {
        const calibration = await this.fuelCalibrationsService.lookupVolume(
          dto.equipment_id!,
          Number(fuel_level),
        );
        fuelVolume = Number(calibration.volume);
        fuelPercentage = Number(calibration.percentage);
        fuelDifference = 0;
      } catch {
        // If calibration fails, set to undefined
      }
    }

    // STEP 7.5: Determine current shift based on equipment project & time.
    let shiftName: string | null = null;
    try {
      const checkedAt = currentTime.toTimeString().slice(0, 5);
      const shiftResult = await this.shiftsService.findCurrentByProject(
        equipment.project_id!,
        checkedAt,
      );
      shiftName = shiftResult.shift?.shift_name ?? null;
    } catch {
      shiftName = null;
    }

    // STEP 8: Persist the normalized telemetry and calculated status.
    const savedLog = await this.repository.create({
      ...rest,
      equipment_id: dto.equipment_id,
      shift: shiftName,
      speed: speed || 0,
      fuel_level: fuel_level,
      fuel_volume: fuelVolume,
      fuel_percentage: fuelPercentage,
      fuel_difference: fuelDifference,
      fuel_temperature: fuel_temperature,
      engine_status: engine_status || false,
      latitude,
      longitude,
      category_location: categoryLocation,
      segment: segmentName,
      is_inside: isInside,
      orig_fid: origFid,
      vessel: vessel,
      vessel_status: currentVesselStatus,
      status: opStatus,
      gsm_signal: gsmSignal,
      gsm_operator: gsmOperator,
    });

    this.logger.debug(
      `[SavedLog] equipment=${dto.equipment_id} id=${savedLog.id} ` +
        `speed=${Number(savedLog.speed ?? 0)} fuel_level=${Number(savedLog.fuel_level ?? 0)} ` +
        `fuel_volume=${fuelVolume ?? 'N/A'} fuel_percentage=${fuelPercentage ?? 'N/A'} ` +
        `fuel_difference=${fuelDifference ?? 'N/A'} segment=${savedLog.segment ?? 'N/A'} ` +
        `status=${savedLog.status ?? 'N/A'} vessel_status=${savedLog.vessel_status ?? 'N/A'} ` +
        `created_at=${savedLog.created_at?.toISOString() ?? 'N/A'}`,
    );

    // STEP 9: Push the latest status to the equipment snapshot.
    await this.updateSnapshot(
      dto,
      savedLog,
      isInside,
      segmentName,
      categoryLocation,
      origFid,
      currentVesselStatus,
      currentTime,
      equipment?.equipment_code ?? undefined,
      fuelVolume,
      fuelPercentage,
      fuelDifference,
      shiftName,
    );

    // Emit equipment log via WebSocket
    this.wsGateway.emitNewEquipmentLog({
      id: savedLog.id.toString(),
      equipment_id: dto.equipment_id,
      equipment_code: equipment?.equipment_code,
      latitude,
      longitude,
      speed: speed || 0,
      fuel_level: fuel_level || 0,
      fuel_volume: fuelVolume,
      fuel_percentage: fuelPercentage,
      engine_status: engine_status || false,
      status: opStatus,
      segment: segmentName,
      category_location: categoryLocation,
      is_inside: isInside,
      vessel_status: currentVesselStatus,
      time: savedLog.created_at,
    });

    const alertInfo = {
      is_inside: isInside,
      equipment_code: equipment?.equipment_code || 'N/A',
      vessel: vessel || 0,
      segment: segmentName,
      category_location: categoryLocation,
      orig_fid: origFid,
      longitude,
      latitude,
      speed: speed || 0,
      fuel_level: fuel_level || 0,
      engine_status: engine_status || false,
      vessel_status: currentVesselStatus,
      shift: shiftName,
    };

    // Run off-track lifecycle before geofence events can interrupt processing.
    const savedLogTime = savedLog.created_at
      ? new Date(String(savedLog.created_at))
      : currentTime;
    await this.checkAndTriggerOffTrack(
      dto.equipment_id!,
      savedLogTime,
      alertInfo,
      savedLog.id,
    );

    // STEP 9: Push geofence transition events (IN, OUT, or OFF TRACK).
    if (lastLog) {
      const isSegmentChanged = lastLog.segment !== segmentName;
      const wasInside = lastLog.is_inside;

      if (wasInside && (isSegmentChanged || !isInside)) {
        const newGeofence = await this.geofenceService.create({
          equipment_id: dto.equipment_id,
          log_id: savedLog.id,
          alert_category: 'GEOFENCING',
          event: 'OUT',
          is_alert: false,
          description: '',
          longitude,
          latitude,
          is_inside: lastLog.is_inside,
          orig_fid: lastLog.orig_fid,
          location_category: lastLog.category_location,
          segment: lastLog.segment,
          speed,
          fuel_level,
          vessel: savedLog.vessel,
          mileage: savedLog.mileage,
          vessel_status: savedLog.vessel_status,
          engine_status,
          shift: shiftName,
        });

        this.wsGateway.emitGeofenceEvent({
          equipment_id: dto.equipment_id,
          equipment_code: equipment?.equipment_code,
          event: 'OUT',
          segment: lastLog.segment,
          longitude,
          latitude,
          created_at: currentTime,
        });

        this.wsGateway.emitNewGeofence(newGeofence);
      }

      if (isInside && (isSegmentChanged || !wasInside)) {
        const newGeofence = await this.geofenceService.create({
          equipment_id: dto.equipment_id,
          log_id: savedLog.id,
          alert_category: 'GEOFENCING',
          event: 'IN',
          is_alert: false,
          description: '',
          longitude,
          latitude,
          is_inside: savedLog.is_inside,
          orig_fid: savedLog.orig_fid,
          location_category: savedLog.category_location,
          segment: savedLog.segment,
          speed,
          fuel_level,
          vessel: savedLog.vessel,
          mileage: savedLog.mileage,
          vessel_status: savedLog.vessel_status,
          engine_status,
          shift: shiftName,
        });

        this.wsGateway.emitGeofenceEvent({
          equipment_id: dto.equipment_id,
          equipment_code: equipment?.equipment_code,
          event: 'IN',
          segment: savedLog.segment,
          longitude,
          latitude,
          created_at: currentTime,
        });

        this.wsGateway.emitNewGeofence(newGeofence);
      }

      if (!isInside && wasInside) {
        const newGeofence = await this.geofenceService.create({
          equipment_id: dto.equipment_id,
          log_id: savedLog.id,
          alert_category: 'GEOFENCING',
          event: 'OFF TRACK',
          is_alert: false,
          description: '',
          longitude,
          latitude,
          is_inside: savedLog.is_inside,
          orig_fid: savedLog.orig_fid,
          location_category: savedLog.category_location,
          segment: savedLog.segment,
          speed,
          fuel_level,
          vessel: savedLog.vessel,
          mileage: savedLog.mileage,
          vessel_status: savedLog.vessel_status,
          engine_status,
          shift: shiftName,
        });

        this.wsGateway.emitGeofenceEvent({
          equipment_id: dto.equipment_id,
          equipment_code: equipment?.equipment_code,
          event: 'OFF TRACK',
          segment: savedLog.segment,
          longitude,
          latitude,
          created_at: currentTime,
        });

        this.wsGateway.emitNewGeofence(newGeofence);
      }
    }

    // STEP 10: Check and push speed/fuel alerts when applicable.
    await this.checkSpeedAlert(
      dto.equipment_id!,
      savedLogTime,
      alertInfo,
      savedLog.id,
    );
    // Fuel comparison requires a previous log, but always record initial fuel level
    if (lastLog) {
      await this.checkFuelAlert(
        dto.equipment_id!,
        currentTime,
        lastLog,
        alertInfo,
        savedLog.id,
      );
    } else {
      // First log: record initial fuel level as baseline
      await this.recordInitialFuelLevel(
        dto.equipment_id!,
        currentTime,
        alertInfo,
        savedLog.id,
      );
    }

    serializeBigInt(savedLog);
  }

  private async updateSnapshot(
    dto: CreateEquipmentLogDto,
    savedLog: any,
    isInside: boolean,
    segmentName: string,
    categoryLocation: string,
    origFid: number,
    currentVesselStatus: string,
    currentTime: Date,
    equipmentCode?: string,
    fuelVolume?: number,
    fuelPercentage?: number,
    fuelDifference?: number,
    shiftName?: string | null,
  ) {
    try {
      // STEP 8.1: Count unread daily alerts before updating the snapshot.

      const startOfDay = new Date(currentTime);
      startOfDay.setHours(0, 0, 0, 0);

      const alertCount = await this.alertRepo.count({
        where: {
          equipment_id: dto.equipment_id,
          is_read: false,
          created_at: { gte: startOfDay },
        },
      });
      await this.equipmentStatusService.updateStatus({
        // Push the latest equipment state, location, geofence, and counters.
        equipment_id: dto.equipment_id,
        log_id: savedLog.id,
        engine_status: dto.engine_status,
        longitude: dto.longitude,
        latitude: dto.latitude,
        location: {
          type: 'Point',
          coordinates: [dto.longitude, dto.latitude],
        } as any,
        location_category: categoryLocation,
        segment: segmentName,
        is_inside: isInside,
        orig_fid: origFid,
        speed: savedLog.speed,
        fuel_level: dto.fuel_level ?? 0,
        fuel_temperature: dto.fuel_temperature ?? 0,
        fuel_volume: fuelVolume ?? 0,
        fuel_percentage: fuelPercentage ?? 0,
        fuel_difference: fuelDifference ?? 0,
        vessel: dto.vessel ?? 0,
        mileage: dto.mileage ?? 0,
        vessel_status: currentVesselStatus,
        status: savedLog.status,
        shift: shiftName,
        alert_count: alertCount,
        last_update_at: currentTime,
      });

      // Emit equipment status update via WebSocket
      this.wsGateway.emitEquipmentStatusUpdate({
        equipment_id: dto.equipment_id,
        equipment_code: equipmentCode,
        engine_status: dto.engine_status,
        longitude: dto.longitude,
        latitude: dto.latitude,
        location_category: categoryLocation,
        segment: segmentName,
        is_inside: isInside,
        orig_fid: origFid,
        speed: savedLog.speed,
        fuel_level: dto.fuel_level ?? 0,
        fuel_volume: fuelVolume ?? 0,
        fuel_percentage: fuelPercentage ?? 0,
        fuel_difference: fuelDifference ?? 0,
        fuel_temperature: dto.fuel_temperature ?? 0,
        vessel: dto.vessel ?? 0,
        mileage: dto.mileage ?? 0,
        vessel_status: currentVesselStatus,
        status: savedLog.status,
        shift: shiftName,
        alert_count: alertCount,
        last_update_at: currentTime,
      });

      this.logger.debug(
        `Snapshot updated: ${equipmentCode || dto.equipment_id}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to update snapshot: ${msg}`);
    }
  }

  private async checkAndTriggerOffTrack(
    equipmentId: string,
    currentTime: Date,
    info: any,
    logId: bigint,
  ) {
    try {
      const speed = Number(info.speed);

      // Resolve the current active alert immediately after returning inside.
      if (info.is_inside) {
        const resolvedCount = await this.alertRepo.resolveActive(
          equipmentId,
          'a9bd6aa2-94d5-4266-9135-0fff314a6714',
        );
        if (resolvedCount > 0) {
          this.logger.log(
            `Unit ${info.equipment_code} back on track. ${resolvedCount} alert resolved.`,
          );
        }
        return;
      }

      if (speed !== 0) return;

      const outsideStart =
        await this.repository.findStoppedOutsideStart(equipmentId);
      const startTimeOutside = outsideStart?.created_at
        ? new Date(String(outsideStart.created_at))
        : currentTime;
      const diffMinutes =
        (currentTime.getTime() - startTimeOutside.getTime()) / (1000 * 60);

      // this.logger.debug(
      //   `[OffTrack] equipment=${equipmentId} start=${startTimeOutside.toISOString()} ` +
      //     `current=${currentTime.toISOString()} diff=${diffMinutes.toFixed(2)}m`,
      // );

      // Push an off-track alert after three minutes outside while stopped.
      if (diffMinutes >= 3) {
        const exist = await this.alertRepo.findOne({
          where: {
            equipment_id: equipmentId,
            alert_category_id: 'a9bd6aa2-94d5-4266-9135-0fff314a6714',
            resolved_at: null,
          },
        });

        if (!exist) {
          // A resolved occurrence is historical; create a new alert row.
          await this.alertsService.create({
            ...this.mapInfoToDto(
              equipmentId,
              logId,
              'a9bd6aa2-94d5-4266-9135-0fff314a6714',
              'Off Track',
              currentTime,
              info,
            ),
          });
          await this.equipmentStatusService.incrementAlertCount(equipmentId, 1);

          // Emit alert via WebSocket
          this.wsGateway.emitNewAlert({
            equipment_id: equipmentId,
            equipment_code: info.equipment_code,
            alert_category_id: 'a9bd6aa2-94d5-4266-9135-0fff314a6714',
            alert_type: 'Off Track',
            status: 'Off Track',
            longitude: info.longitude,
            latitude: info.latitude,
            segment: info.segment,
            speed: info.speed,
            created_at: currentTime,
          });

          // Emit alert summary update via WebSocket
          await this.emitAlertSummaryUpdate(currentTime);

          this.logger.log(
            `New off-track alert created for ${info.equipment_code}.`,
          );
        }
      }
    } catch (e: unknown) {
      this.logger.error(
        `OffTrack Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async checkSpeedAlert(
    equipmentId: string,
    currentTime: Date,
    info: any,
    logId: bigint,
  ) {
    try {
      const speed = Number(info.speed);
      const OVER_SPEED_ID = 'ac85c75e-39ee-4cd9-ba7d-2822948d6022';
      const UNDER_SPEED_ID = '8d41e23c-f91b-4ec9-807d-1ebe1a3ec669';

      // Resolve overspeed after speed returns to 50 or below.
      if (speed <= 50) {
        await this.alertRepo.resolveActive(equipmentId, OVER_SPEED_ID);
      }

      // Resolve underspeed after speed reaches 10 or above.
      if (speed >= 10) {
        await this.alertRepo.resolveActive(equipmentId, UNDER_SPEED_ID);
      }

      let categoryId: string | null = null;
      let alertName: string | null = null;

      if (speed > 50) {
        categoryId = OVER_SPEED_ID;
        alertName = 'Overspeed';
      } else if (speed > 0 && speed < 10) {
        // Same pattern as off-track: get the first log in the active streak.
        const underSpeedStart =
          await this.repository.findUnderSpeedStart(equipmentId);
        const startTimeUnderSpeed = underSpeedStart?.created_at
          ? new Date(String(underSpeedStart.created_at))
          : currentTime;
        const diffMinutes =
          (currentTime.getTime() - startTimeUnderSpeed.getTime()) / (1000 * 60);

        // this.logger.debug(
        //   `[Underspeed] equipment=${equipmentId} speed=${speed} ` +
        //     `start=${startTimeUnderSpeed.toISOString()} ` +
        //     `current=${currentTime.toISOString()} ` +
        //     `diff=${diffMinutes.toFixed(2)}m`,
        // );

        if (diffMinutes >= 2) {
          categoryId = UNDER_SPEED_ID;
          alertName = 'Underspeed';
        }
      }

      if (!categoryId || !alertName) return;

      const activeAlert = await this.alertRepo.findOne({
        where: {
          equipment_id: equipmentId,
          alert_category_id: categoryId,
          resolved_at: null,
        },
      });

      if (!activeAlert) {
        await this.alertsService.create({
          ...this.mapInfoToDto(
            equipmentId,
            logId,
            categoryId,
            alertName,
            currentTime,
            info,
          ),
        });
        await this.equipmentStatusService.incrementAlertCount(equipmentId, 1);

        // Emit alert via WebSocket
        this.wsGateway.emitNewAlert({
          equipment_id: equipmentId,
          equipment_code: info.equipment_code,
          alert_category_id: categoryId,
          alert_type: alertName,
          status: alertName,
          longitude: info.longitude,
          latitude: info.latitude,
          segment: info.segment,
          speed: info.speed,
          created_at: currentTime,
        });

        // Emit alert summary update via WebSocket
        await this.emitAlertSummaryUpdate(currentTime);

        this.logger.log(
          `New ${alertName.toLowerCase()} alert created for ${info.equipment_code}.`,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `Speed Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async recordInitialFuelLevel(
    equipmentId: string,
    currentTime: Date,
    info: any,
    logId: bigint,
  ) {
    try {
      this.logger.debug(
        `[Initial Fuel] Recording initial fuel level for equipment ${equipmentId}`,
      );

      // Lookup fuel volume using calibration API
      let calibration: any;
      try {
        calibration = await this.fuelCalibrationsService.lookupVolume(
          equipmentId,
          Number(info.fuel_level),
        );
      } catch {
        this.logger.warn(
          `[Initial Fuel] No calibration data for equipment ${equipmentId}`,
        );
        return;
      }

      const currentVolume = Number(calibration.volume);
      const currentPercentage = Number(calibration.percentage);

      this.logger.debug(
        `[Initial Fuel] equipment=${equipmentId} LLS=${info.fuel_level} ` +
          `volume=${currentVolume}L percentage=${currentPercentage.toFixed(2)}%`,
      );

      // Insert initial fuel level into fuels table
      await this.fuelsService.create({
        equipment_id: equipmentId,
        log_id: logId.toString(),
        fuel_level: info.fuel_level,
        fuel_volume: currentVolume,
        fuel_percentage: currentPercentage,
        fuel_temperature: info.fuel_temperature,
        fuel_difference: 0, // No difference for initial record
        event_type: 'INITIAL',
        description: `Initial fuel level recorded for equipment ${info.equipment_code}: ${currentVolume.toFixed(2)}L (${currentPercentage.toFixed(2)}%)`,
        longitude: info.longitude,
        latitude: info.latitude,
        is_inside: info.is_inside,
        orig_fid: info.orig_fid,
        location_category: info.category_location,
        segment: info.segment,
        speed: info.speed,
        vessel: info.vessel,
        mileage: info.mileage,
        vessel_status: info.vessel_status,
        engine_status: info.engine_status,
        status: 'INITIAL',
        shift: info.shift,
      });

      // Emit fuel event via WebSocket
      this.wsGateway.emitFuelEvent({
        equipment_id: equipmentId,
        equipment_code: info.equipment_code,
        event_type: 'INITIAL',
        fuel_level: info.fuel_level,
        fuel_volume: currentVolume,
        fuel_percentage: currentPercentage,
        fuel_difference: 0,
        longitude: info.longitude,
        latitude: info.latitude,
        segment: info.segment,
        created_at: new Date(),
      });

      this.logger.log(
        `[Initial Fuel] Initial fuel level recorded for ${info.equipment_code}: ${currentVolume.toFixed(2)}L (${currentPercentage.toFixed(2)}%)`,
      );
    } catch (e: unknown) {
      this.logger.error(
        `Initial Fuel Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async checkFuelAlert(
    equipmentId: string,
    currentTime: Date,
    lastLog: any,
    info: any,
    logId: bigint,
  ) {
    try {
      // STEP 1: Calculate delta fuel (LLS) and delta time
      const deltaFuel = info.fuel_level - lastLog.fuel_level;

      // STEP 2: Lookup current fuel volume using calibration API
      let currentCalibration: any;
      try {
        currentCalibration = await this.fuelCalibrationsService.lookupVolume(
          equipmentId,
          Number(info.fuel_level),
        );
      } catch {
        this.logger.warn(
          `[Fuel Alert] No calibration data for equipment ${equipmentId}`,
        );
        return;
      }

      // STEP 3: Lookup previous fuel volume using calibration API
      let previousCalibration: any;
      try {
        previousCalibration = await this.fuelCalibrationsService.lookupVolume(
          equipmentId,
          Number(lastLog.fuel_level),
        );
      } catch {
        this.logger.warn(
          `[Fuel Alert] No calibration data for previous fuel level`,
        );
        return;
      }

      const currentVolume = Number(currentCalibration.volume);
      const previousVolume = Number(previousCalibration.volume);
      const currentPercentage = Number(currentCalibration.percentage);

      // Calculate fuel difference in liters
      const fuelDifference = currentVolume - previousVolume;

      let eventType: string | null = null;
      const FUEL_ALERT_ID = '5c6e755c-28fb-4058-8180-0e887f98cd5a';

      // STEP 4: Check for FUEL DECREASE or INCREASE
      if (fuelDifference <= -1.5) {
        // Fuel is decreasing, find when it started
        const decreaseStart = await this.repository.findFuelDecreaseStart(
          equipmentId,
          Number(lastLog.fuel_level),
        );

        const startTime = decreaseStart?.created_at
          ? new Date(String(decreaseStart.created_at))
          : currentTime;

        const deltaTimeMinutes =
          (currentTime.getTime() - startTime.getTime()) / (1000 * 60);

        this.logger.debug(
          `[Fuel Alert] equipment=${equipmentId} deltaFuel=${deltaFuel} fuelDifference=${fuelDifference.toFixed(2)}L ` +
            `deltaTime=${deltaTimeMinutes.toFixed(2)}m (from ${startTime.toISOString()})`,
        );

        // Check if decrease happened within 5 minutes
        if (deltaTimeMinutes <= 5) {
          eventType = 'FUEL DECREASE';
        }
      } else if (fuelDifference >= 1.5) {
        // Fuel is increasing (refueling)
        const deltaTimeMinutes =
          (currentTime.getTime() - new Date(String(lastLog.time)).getTime()) /
          (1000 * 60);

        this.logger.debug(
          `[Fuel Alert] equipment=${equipmentId} deltaFuel=${deltaFuel} fuelDifference=${fuelDifference.toFixed(2)}L ` +
            `deltaTime=${deltaTimeMinutes.toFixed(2)}m`,
        );

        if (deltaTimeMinutes <= 5) {
          eventType = 'FUEL INCREASE';
        }
      }

      if (!eventType) {
        this.logger.debug(`[Fuel Alert] No fuel event detected`);
        return;
      }

      // STEP 5: Insert into fuels table for history (ALWAYS log the event)
      await this.fuelsService.create({
        equipment_id: equipmentId,
        log_id: logId.toString(),
        fuel_level: info.fuel_level,
        fuel_volume: currentVolume,
        fuel_percentage: currentPercentage,
        fuel_temperature: info.fuel_temperature,
        fuel_difference: fuelDifference,
        event_type: eventType,
        description: `${eventType} detected for equipment ${info.equipment_code}: ${Math.abs(fuelDifference).toFixed(2)}L`,
        longitude: info.longitude,
        latitude: info.latitude,
        is_inside: info.is_inside,
        orig_fid: info.orig_fid,
        location_category: info.category_location,
        segment: info.segment,
        speed: info.speed,
        vessel: info.vessel,
        mileage: info.mileage,
        vessel_status: info.vessel_status,
        engine_status: info.engine_status,
        status: eventType,
        shift: info.shift,
      });

      // Emit fuel event via WebSocket
      this.wsGateway.emitFuelEvent({
        equipment_id: equipmentId,
        equipment_code: info.equipment_code,
        event_type: eventType,
        fuel_level: info.fuel_level,
        fuel_volume: currentVolume,
        fuel_percentage: currentPercentage,
        fuel_difference: fuelDifference,
        longitude: info.longitude,
        latitude: info.latitude,
        segment: info.segment,
        created_at: currentTime,
      });

      this.logger.log(
        `[Fuel Alert] ${eventType} logged for ${info.equipment_code}: ${Math.abs(fuelDifference).toFixed(2)}L`,
      );

      // STEP 6: Create alert if event is FUEL DECREASE (always create, no duplicate check)
      if (eventType === 'FUEL DECREASE') {
        await this.alertsService.create({
          ...this.mapInfoToDto(
            equipmentId,
            logId,
            FUEL_ALERT_ID,
            eventType,
            currentTime,
            info,
          ),
        });
        await this.equipmentStatusService.incrementAlertCount(equipmentId, 1);

        // Emit alert via WebSocket
        this.wsGateway.emitNewAlert({
          equipment_id: equipmentId,
          equipment_code: info.equipment_code,
          alert_category_id: FUEL_ALERT_ID,
          alert_type: eventType,
          status: eventType,
          fuel_level: info.fuel_level,
          fuel_volume: currentVolume,
          fuel_difference: fuelDifference,
          longitude: info.longitude,
          latitude: info.latitude,
          segment: info.segment,
          created_at: currentTime,
        });

        // Emit alert summary update via WebSocket
        await this.emitAlertSummaryUpdate(currentTime);

        this.logger.log(
          `[Fuel Alert] ${eventType} alert created for ${info.equipment_code}`,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `Fuel Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Emit alert summary update fetched from alertsService.findAlertSummary
  private async emitAlertSummaryUpdate(alertTime: Date) {
    try {
      const dateStr = alertTime.toISOString().slice(0, 10);
      const summary = await this.alertsService.findAlertSummary({
        created_at: dateStr,
        created_at_end: dateStr,
      });
      this.wsGateway.emitAlertSummaryUpdate({
        statusCode: 200,
        message: 'Success',
        data: summary,
      });
    } catch (e: unknown) {
      this.logger.error(
        `Alert Summary Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private mapInfoToDto(
    equipment_id: string,
    log_id: bigint,
    alert_category_id: string,
    status: string,
    created_at: Date,
    info: any,
  ): CreateAlertDto {
    // Map shared telemetry data into the alert payload format.
    return {
      equipment_id,
      log_id: Number(log_id), // atau log_id.toString()
      alert_category_id,
      status,
      longitude: info.longitude,
      latitude: info.latitude,
      location_category: info.category_location,
      segment: info.segment,
      is_inside: info.is_inside,
      orig_fid: info.orig_fid,
      speed: info.speed,
      fuel_level: info.fuel_level,
      fuel_volume: info.fuel_volume,
      fuel_percentage: info.fuel_percentage,
      fuel_difference: info.fuel_difference,
      fuel_temperature: info.fuel_temperature,
      vessel: info.vessel,
      mileage: info.mileage,
      vessel_status: info.vessel_status,
      engine_status: info.engine_status,
      is_read: false,
      shift: info.shift,
    };
  }

  async findAll(query: QueryEquipmentLogDto) {
    // Query paginated logs with optional equipment and date filters.
    const { page = 1, limit = 10, equipment_id, start_date, end_date } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (equipment_id) where.equipment_id = equipment_id;
    if (start_date && end_date) {
      where.time = { gte: new Date(start_date), lte: new Date(end_date) };
    }

    const [total, data] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
    });

    return {
      // BigInt handling: Konversi BigInt ke String agar JSON.stringify tidak error
      data: JSON.parse(
        JSON.stringify(data, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      ),
      meta: { total, page, limit },
    };
  }

  async findOne(id: string) {
    // Load one log by ID and serialize BigInt values for the API response.
    const log = await this.repository.findById(id);
    if (!log) throw new NotFoundException('Log not found');
    return JSON.parse(
      JSON.stringify(log, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async findByIdLastEquip(equipment_id: string) {
    // Load the latest log for equipment comparison.
    const equipmentLog = await this.repository.findByIdLastEquip(equipment_id);

    if (!equipmentLog) {
      throw new NotFoundException(
        `Equipment log with equipment_id ${equipment_id} not found`,
      );
    }

    return equipmentLog;
  }

  async getActivitySummary(query: ActivitySummaryQueryDto) {
    const { equipment_id, start_date, end_date } = query;

    // Validate equipment exists
    const equipment = await this.equipmentRepo.findById(equipment_id);
    if (!equipment) {
      throw new NotFoundException(
        `Equipment with ID ${equipment_id} not found`,
      );
    }

    // Parse dates with time boundaries
    const startDate = new Date(start_date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);

    // Get activity summary from repository
    const summary = await this.repository.getActivitySummary(
      equipment_id,
      startDate,
      endDate,
    );

    // Calculate fuel ratio (km per liter)
    const fuelDecrease = Number(summary.fuel_decrease) || 0;
    const mileage = Number(summary.mileage) || 0;
    const fuelRatio = fuelDecrease > 0 ? mileage / fuelDecrease : 0;

    return {
      equipment_id,
      equipment_code: equipment.equipment_code,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        running_time: Number(summary.running_time) || 0,
        idling_time: Number(summary.idling_time) || 0,
        mileage: Number(summary.mileage) || 0,
        avg_running_speed: Number(summary.avg_running_speed) || 0,
        max_running_speed: Number(summary.max_running_speed) || 0,
        fuel_decrease: Number(summary.fuel_decrease) || 0,
        fuel_ratio: Number(fuelRatio.toFixed(2)) || 0,
        fuel_remaining: Number(summary.fuel_remaining) || 0,
        fuel_remaining_percentage:
          Number(summary.fuel_remaining_percentage) || 0,
      },
    };
  }
}
