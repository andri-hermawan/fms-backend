import { Injectable, Logger } from '@nestjs/common';
import { EquipmentStatusService } from '../../equipment-status/equipment-status.service';
import { WebSocketGatewayService } from '../../../common/websocket/websocket.gateway';
import { CreateEquipmentLogDto } from '../dto/create-equipment-log.dto';
import { GeofenceLocation } from './calculators/geofence-locator';
import { SavedLog } from './telemetry-context';

export interface SnapshotUpdateParams {
  dto: CreateEquipmentLogDto;
  savedLog: SavedLog;
  location: GeofenceLocation;
  vesselStatus: string;
  currentTime: Date;
  operationalDate: string;
  equipmentCode?: string;
  shiftName?: string | null;
}

// Menjaga tabel equipment_status (snapshot terakhir) dan push ke frontend.
@Injectable()
export class EquipmentSnapshotService {
  private readonly logger = new Logger(EquipmentSnapshotService.name);

  constructor(
    private readonly equipmentStatusService: EquipmentStatusService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  // Fuel values are read from savedLog so the snapshot always matches the
  // persisted log, including the useLastFuel fallback and null handling.
  async update({
    dto,
    savedLog,
    location,
    vesselStatus,
    currentTime,
    operationalDate,
    equipmentCode,
    shiftName,
  }: SnapshotUpdateParams) {
    const { segmentName, categoryLocation, isInside, origFid } = location;
    try {
      // alert_count is managed by incrementAlertCount when a new alert is
      // created. Telemetry updates must not overwrite it, even when the
      // frontend marks notifications as read.
      await this.equipmentStatusService.updateStatus({
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
        fuel_level: savedLog.fuel_level,
        fuel_temperature: savedLog.fuel_temperature,
        fuel_volume: savedLog.fuel_volume,
        fuel_percentage: savedLog.fuel_percentage,
        fuel_difference: savedLog.fuel_difference,
        vessel: dto.vessel ?? 0,
        mileage: dto.mileage ?? 0,
        vessel_status: vesselStatus,
        status: savedLog.status,
        gsm_signal: dto.gsm_signal ?? 0,
        shift: shiftName,
        alert_date: operationalDate,
        operator_name: savedLog.operator_name,
        last_update_at: savedLog.created_at,
      });

      // alert_count & breakdown_desc dibaca dari DB agar frontend selalu
      // melihat nilai terbaru yang dikelola incrementAlertCount.
      const currentStatus = await this.equipmentStatusService.findByEquipmentId(
        dto.equipment_id!,
      );
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
        fuel_level: savedLog.fuel_level,
        fuel_volume: savedLog.fuel_volume,
        fuel_percentage: savedLog.fuel_percentage,
        fuel_difference: savedLog.fuel_difference,
        fuel_temperature: savedLog.fuel_temperature,
        vessel: dto.vessel ?? 0,
        mileage: dto.mileage ?? 0,
        vessel_status: vesselStatus,
        status: savedLog.status,
        gsm_signal: dto.gsm_signal ?? 0,
        shift: shiftName,
        operator_name: savedLog.operator_name,
        breakdown_desc: currentStatus?.breakdown_desc,
        alert_count: Number(currentStatus?.alert_count ?? 0),
        last_update_at: currentTime,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to update snapshot: ${msg}`);
    }
  }

  // Emit equipment-status-update so the frontend receives the latest
  // alert_count right after an alert is created and incrementAlertCount runs.
  async emitAfterAlert(equipmentId: string) {
    try {
      const status =
        await this.equipmentStatusService.findByEquipmentId(equipmentId);
      if (!status) return;
      this.wsGateway.emitEquipmentStatusUpdate({
        equipment_id: status.equipment_id,
        equipment_code: status.equipment_code,
        engine_status: status.engine_status,
        longitude: Number(status.longitude),
        latitude: Number(status.latitude),
        location_category: status.location_category,
        segment: status.segment,
        is_inside: status.is_inside,
        orig_fid: status.orig_fid,
        speed: Number(status.speed ?? 0),
        fuel_level: Number(status.fuel_level ?? 0),
        fuel_volume: Number(status.fuel_volume ?? 0),
        fuel_percentage: Number(status.fuel_percentage ?? 0),
        fuel_difference: Number(status.fuel_difference ?? 0),
        fuel_temperature: Number(status.fuel_temperature ?? 0),
        vessel: status.vessel,
        mileage: status.mileage,
        vessel_status: status.vessel_status,
        status: status.status,
        gsm_signal: status.gsm_signal,
        shift: status.shift,
        operator_name: status.operator_name,
        breakdown_desc: status.breakdown_desc,
        alert_count: Number(status.alert_count ?? 0),
        last_update_at: status.updated_at,
      });
    } catch (e: unknown) {
      this.logger.error(
        `Emit Equipment Status Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
