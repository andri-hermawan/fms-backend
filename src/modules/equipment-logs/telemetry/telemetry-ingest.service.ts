import { Injectable, Logger } from '@nestjs/common';
import { EquipmentLogsRepository } from '../repositories/equipment-logs.repository';
import { BreakdownStatusRepository } from '../../breakdown-status/repositories/breakdown-status.repository';
import { CreateEquipmentLogDto } from '../dto/create-equipment-log.dto';
import { EquipmentsRepository } from '../../equipments/repositories/equipments.repository';
import { FuelCalibrationsService } from '../../fuel-calibrations/fuel-calibrations.service';
import { ShiftsService } from '../../shifts/shifts.service';
import { SettingOperatorRepository } from '../../setting-operator/repositories/setting-operator.repository';
import { AlertRuleProvider } from '../../alert-rules/alert-rule.provider';
import { WebSocketGatewayService } from '../../../common/websocket/websocket.gateway';
import { serializeBigInt } from '../../../common/helpers/bigint.helper';
import { GeofenceEventService } from '../geofence-events/geofence-event.service';
import { OffTrackDetector } from '../alert-detectors/off-track.detector';
import { SpeedDetector } from '../alert-detectors/speed.detector';
import { FuelDetector } from '../alert-detectors/fuel.detector';
import { EquipmentSnapshotService } from './equipment-snapshot.service';
import { locateInGeofence } from './calculators/geofence-locator';
import { resolveVesselStatus } from './calculators/vessel-status';
import { resolveOperationalStatus } from './calculators/operational-status';
import { isInvalidFuelReading } from './calculators/fuel-reading';
import {
  CalibrationLookup,
  createCalibrationLookup,
} from './fuel-calibration-lookup';
import { AlertInfo, LastLog, TelemetryContext } from './telemetry-context';

const BREAKDOWN_CACHE_TTL_MS = 30_000;

interface BreakdownLatest {
  status: string | null;
  description: string | null;
}

interface OperationalPeriod {
  shiftName: string | null;
  // created_at yang disimpan (mundur 1 hari untuk shift lintas tengah malam).
  operationalCreatedAt: Date;
  // YYYY-MM-DD (Asia/Jakarta) dari operationalCreatedAt.
  operationalDate: string;
}

interface FuelReading {
  volume?: number;
  percentage?: number;
  difference?: number;
}

/**
 * Alur satu paket telemetry:
 * normalisasi -> geofence -> status -> fuel -> shift/operator -> simpan log ->
 * snapshot -> off-track -> geofence IN/OUT -> speed -> fuel alert.
 */
@Injectable()
export class TelemetryIngestService {
  private readonly logger = new Logger(TelemetryIngestService.name);
  private readonly breakdownCache = new Map<
    string,
    { latest: BreakdownLatest | null; expiresAt: number }
  >();

  constructor(
    private readonly repository: EquipmentLogsRepository,
    private readonly breakdownStatusRepo: BreakdownStatusRepository,
    private readonly equipmentRepo: EquipmentsRepository,
    private readonly fuelCalibrationsService: FuelCalibrationsService,
    private readonly shiftsService: ShiftsService,
    private readonly settingOperatorRepository: SettingOperatorRepository,
    private readonly alertRuleProvider: AlertRuleProvider,
    private readonly wsGateway: WebSocketGatewayService,
    private readonly snapshotService: EquipmentSnapshotService,
    private readonly geofenceEventService: GeofenceEventService,
    private readonly offTrackDetector: OffTrackDetector,
    private readonly speedDetector: SpeedDetector,
    private readonly fuelDetector: FuelDetector,
  ) {}

  async ingest(dto: CreateEquipmentLogDto) {
    // STEP 1: Normalize incoming telemetry data.
    const {
      longitude,
      latitude,
      speed,
      fuel_level,
      fuel_temperature,
      engine_status,
      breakdown,
      vessel,
      equipment_id,
      gsm_signal,
      gsm_operator,
      created_at,
      ...rest
    } = dto;
    const equipmentId = equipment_id!;
    const currentTime = new Date(dto.time);
    const currentSpeed = Number(speed ?? 0);
    const gsmSignal = Number(gsm_signal ?? 0);

    // STEP 2: Load equipment and project geofence configuration.
    const equipment = await this.equipmentRepo.findById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment tidak ditemukan');
    }
    const equipmentCode = equipment.equipment_code;

    // STEP 3: Calculate geofence information from the current coordinates.
    const location = locateInGeofence(
      equipment.projects?.geojson_origin,
      longitude,
      latitude,
    );
    const { segmentName, categoryLocation, origFid, isInside } = location;

    // STEP 4: Load the latest log once; reuse it for all comparisons below.
    const lastLog = await this.repository.findByIdLastEquip(equipmentId);

    // STEP 5: Determine vessel status from the current and previous geofence.
    const vesselStatus = resolveVesselStatus(origFid, lastLog);

    // STEP 6: Determine operational status.
    const opStatus = resolveOperationalStatus({
      gsmSignal,
      gsmOperator: gsm_operator,
      isEngineOn: Boolean(engine_status),
      currentSpeed,
      diffMinutes: this.minutesSinceLastLog(lastLog),
      idleThreshold: origFid === 0 ? 10 : 5,
    });

    // STEP 7: Fuel calibration (di-memo; dipakai ulang oleh fuel detector).
    const lookupCalibration = createCalibrationLookup(
      this.fuelCalibrationsService,
      equipmentId,
    );
    const fuel = await this.readFuel(fuel_level, lastLog, lookupCalibration);

    // STEP 7.5 - 7.6: Shift & operator.
    const period = await this.resolveOperationalPeriod(
      equipment.project_id!,
      currentTime,
      created_at,
    );
    const { shiftName, operationalCreatedAt, operationalDate } = period;
    const operatorName = await this.resolveOperatorName(
      equipmentId,
      operationalDate,
      shiftName,
    );

    // Sensor tidak valid (-4 / 0): pakai nilai fuel dari log sebelumnya.
    const useLastFuel = isInvalidFuelReading(fuel_level);

    // Breakdown real dari breakdown_status (fallback ke nilai perangkat).
    const breakdownInfo = await this.resolveBreakdown(
      equipmentCode,
      operationalDate,
      shiftName,
      breakdown || false,
    );

    // STEP 8: Persist the normalized telemetry and calculated status.
    const savedLog = await this.repository.create({
      ...rest,
      equipment_id: equipmentId,
      shift: shiftName,
      operator_name: operatorName,
      speed: speed || 0,
      fuel_level: useLastFuel ? lastLog?.fuel_level : fuel_level,
      fuel_volume: useLastFuel ? lastLog?.fuel_volume : fuel.volume,
      fuel_percentage: useLastFuel ? lastLog?.fuel_percentage : fuel.percentage,
      fuel_difference: useLastFuel ? lastLog?.fuel_difference : fuel.difference,
      fuel_temperature: useLastFuel
        ? lastLog?.fuel_temperature
        : fuel_temperature,
      engine_status: engine_status || false,
      latitude,
      longitude,
      category_location: categoryLocation,
      segment: segmentName,
      is_inside: isInside,
      orig_fid: origFid,
      vessel: vessel,
      vessel_status: vesselStatus,
      status: opStatus,
      gsm_signal: gsmSignal,
      gsm_operator: gsm_operator,
      breakdown: breakdownInfo.breakdown,
      breakdown_desc: breakdownInfo.description,
      created_at: operationalCreatedAt,
    });

    this.logger.debug(
      `[SavedLog] equipment=${equipmentId} operatorName=${operatorName} ` +
        `operationalCreatedAt=${operationalCreatedAt.toISOString()} ` +
        `shiftName=${shiftName} `,
    );

    // STEP 9: Push the latest status to the equipment snapshot.
    await this.snapshotService.update({
      dto,
      savedLog,
      location,
      vesselStatus,
      currentTime,
      operationalDate,
      equipmentCode: equipmentCode ?? undefined,
      shiftName,
    });

    this.wsGateway.emitNewEquipmentLog({
      id: savedLog.id.toString(),
      equipment_id: equipmentId,
      equipment_code: equipmentCode,
      latitude,
      longitude,
      speed: speed || 0,
      fuel_level: savedLog.fuel_level,
      fuel_volume: savedLog.fuel_volume,
      fuel_percentage: savedLog.fuel_percentage,
      fuel_difference: savedLog.fuel_difference,
      fuel_temperature: savedLog.fuel_temperature,
      engine_status: engine_status || false,
      status: opStatus,
      segment: segmentName,
      category_location: categoryLocation,
      is_inside: isInside,
      vessel_status: vesselStatus,
      breakdown: savedLog.breakdown,
      breakdown_desc: savedLog.breakdown_desc,
      time: savedLog.created_at,
    });

    // Mirror the persisted log so alerts and fuel checks share one source of truth.
    const info: AlertInfo = {
      is_inside: isInside,
      equipment_code: equipmentCode || 'N/A',
      breakdown: breakdown || false,
      vessel: vessel || 0,
      segment: segmentName,
      category_location: categoryLocation,
      orig_fid: origFid,
      longitude,
      latitude,
      speed: speed || 0,
      fuel_level: savedLog.fuel_level,
      fuel_volume: savedLog.fuel_volume,
      fuel_percentage: savedLog.fuel_percentage,
      fuel_difference: savedLog.fuel_difference,
      fuel_temperature: savedLog.fuel_temperature,
      engine_status: engine_status || false,
      mileage: dto.mileage,
      vessel_status: vesselStatus,
      shift: shiftName,
      alert_period_date: operationalDate,
      status_engine: opStatus,
      operator_name: operatorName,
    };

    const ctx: TelemetryContext = {
      equipmentId,
      logId: savedLog.id,
      time: savedLog.created_at
        ? new Date(String(savedLog.created_at))
        : currentTime,
      info,
      rules: await this.alertRuleProvider.resolve(
        equipment.project_id,
        segmentName,
      ),
      lookupCalibration,
    };

    // Run off-track lifecycle before geofence events can interrupt processing.
    await this.offTrackDetector.detect(ctx);

    // STEP 9: Push geofence transition events (IN or OUT).
    await this.geofenceEventService.pushTransitionEvents({
      dto,
      equipmentCode,
      lastLog,
      savedLog,
      location,
      shiftName,
    });

    // STEP 10: Check and push speed/fuel alerts when applicable.
    await this.speedDetector.detect(ctx);
    // Fuel comparison requires a previous log, but always record initial fuel level
    if (lastLog) {
      await this.fuelDetector.detect(ctx, lastLog);
    } else {
      await this.fuelDetector.recordInitial(ctx);
    }

    return serializeBigInt(savedLog);
  }

  // Elapsed time from the previous log for operational status.
  private minutesSinceLastLog(lastLog: LastLog | null): number {
    if (!lastLog?.created_at) return Number.MAX_SAFE_INTEGER;
    const lastLogCreate = new Date(lastLog.created_at);
    return (Date.now() - lastLogCreate.getTime()) / 1000 / 60;
  }

  private async readFuel(
    fuelLevel: number | undefined,
    lastLog: LastLog | null,
    lookupCalibration: CalibrationLookup,
  ): Promise<FuelReading> {
    if (fuelLevel && lastLog?.fuel_level) {
      try {
        const currentCalibration = await lookupCalibration(Number(fuelLevel));
        const previousCalibration = await lookupCalibration(
          Number(lastLog.fuel_level),
        );
        const volume = Number(currentCalibration.volume);
        return {
          volume,
          percentage: Number(currentCalibration.percentage),
          difference: volume - Number(previousCalibration.volume),
        };
      } catch {
        // If calibration fails, set to undefined
        return {};
      }
    }

    if (fuelLevel) {
      try {
        const calibration = await lookupCalibration(Number(fuelLevel));
        return {
          volume: Number(calibration.volume),
          percentage: Number(calibration.percentage),
          difference: 0,
        };
      } catch {
        // If calibration fails, set to undefined
        return {};
      }
    }

    return {};
  }

  // Determine current shift based on equipment project & time.
  private async resolveOperationalPeriod(
    projectId: string,
    currentTime: Date,
    createdAt: string | undefined,
  ): Promise<OperationalPeriod> {
    let shiftName: string | null = null;
    let operationalCreatedAt = createdAt ? new Date(createdAt) : currentTime;
    try {
      const checkedAt = currentTime.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const { shift: currentShift } =
        await this.shiftsService.findCurrentByProject(projectId, checkedAt);
      shiftName = currentShift?.shift_name ?? null;

      // Shift lintas tengah malam: jam sebelum end_time milik tanggal kemarin.
      if (
        currentShift?.start_time &&
        currentShift.end_time &&
        currentShift.start_time > currentShift.end_time &&
        checkedAt < currentShift.end_time
      ) {
        operationalCreatedAt = new Date(
          operationalCreatedAt.getTime() - 24 * 60 * 60 * 1000,
        );
      }
    } catch {
      shiftName = null;
    }

    // `date` dikirim sebagai YYYY-MM-DD (timezone Asia/Jakarta) agar sesuai
    // dengan format parameter pada endpoint setting-operator.
    const operationalDate = operationalCreatedAt.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Jakarta',
    });

    return { shiftName, operationalCreatedAt, operationalDate };
  }

  // Breakdown dari status terbaru breakdown_status (date_at + equipment_code +
  // shift): Continue/Breakdown -> true, Ready -> false. Tanpa data / status
  // tidak dikenal / error -> breakdown pakai nilai fallback (dari perangkat)
  // dan description null.
  private async resolveBreakdown(
    equipmentCode: string | null,
    date: string,
    shiftName: string | null,
    fallback: boolean,
  ): Promise<{ breakdown: boolean; description: string | null }> {
    const fallbackResult = { breakdown: fallback, description: null };
    if (!equipmentCode || !shiftName) return fallbackResult;

    const key = `${equipmentCode}|${date}|${shiftName}`;
    const cached = this.breakdownCache.get(key);
    let latest: BreakdownLatest | null;
    if (cached && cached.expiresAt > Date.now()) {
      latest = cached.latest;
    } else {
      try {
        latest = await this.breakdownStatusRepo.findLatestStatus({
          date_at: date,
          equipment_code: equipmentCode,
          shift: shiftName,
        });
      } catch {
        return fallbackResult;
      }
      this.breakdownCache.set(key, {
        latest,
        expiresAt: Date.now() + BREAKDOWN_CACHE_TTL_MS,
      });
      // Bersihkan entri kadaluarsa agar map tidak tumbuh tanpa batas.
      if (this.breakdownCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of this.breakdownCache) {
          if (v.expiresAt <= now) this.breakdownCache.delete(k);
        }
      }
    }

    const description = latest?.description ?? null;
    switch (latest?.status?.trim().toLowerCase()) {
      case 'continue':
      case 'breakdown':
        return { breakdown: true, description };
      case 'ready':
        return { breakdown: false, description };
      default:
        return fallbackResult;
    }
  }

  // Resolve operator_name from daily_setting_operator.
  private async resolveOperatorName(
    equipmentId: string,
    date: string,
    shiftName: string | null,
  ): Promise<string | null> {
    try {
      return await this.settingOperatorRepository.findOperatorNameByEquipmentID(
        {
          equipment_id: equipmentId,
          date,
          shift: shiftName ?? undefined,
        },
      );
    } catch {
      return null;
    }
  }
}
