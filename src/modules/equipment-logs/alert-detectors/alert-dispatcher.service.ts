import { Injectable, Logger } from '@nestjs/common';
import { AlertsService } from '../../alerts/alerts.service';
import { CreateAlertDto } from '../../alerts/dto/create-alert.dto';
import { EquipmentStatusService } from '../../equipment-status/equipment-status.service';
import { WebSocketGatewayService } from '../../../common/websocket/websocket.gateway';
import { EquipmentSnapshotService } from '../telemetry/equipment-snapshot.service';
import { AlertInfo } from '../telemetry/telemetry-context';

export interface AlertDispatchParams {
  equipmentId: string;
  logId: bigint;
  categoryId: string;
  // Nilai kolom alerts.status
  status: string;
  createdAt: Date;
  info: AlertInfo;
  resolvedAt?: Date;
  // Payload tambahan / override untuk event websocket new-alert.
  event: { alert_type: string; status: string } & Record<string, unknown>;
  // Waktu acuan alert-summary-update.
  summaryTime: Date;
}

/**
 * Langkah yang sama untuk semua alert baru:
 * simpan alert -> increment alert_count -> emit new-alert ->
 * emit alert summary -> emit equipment status (alert_count terbaru).
 */
@Injectable()
export class AlertDispatcherService {
  private readonly logger = new Logger(AlertDispatcherService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly equipmentStatusService: EquipmentStatusService,
    private readonly snapshotService: EquipmentSnapshotService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async dispatch({
    equipmentId,
    logId,
    categoryId,
    status,
    createdAt,
    info,
    resolvedAt,
    event,
    summaryTime,
  }: AlertDispatchParams) {
    const dto = this.buildAlertDto(
      equipmentId,
      logId,
      categoryId,
      status,
      createdAt,
      info,
    );
    await this.alertsService.create(
      resolvedAt ? { ...dto, resolved_at: resolvedAt } : dto,
    );
    await this.equipmentStatusService.incrementAlertCount(
      equipmentId,
      1,
      info.alert_period_date,
      info.shift,
    );

    this.wsGateway.emitNewAlert({
      equipment_id: equipmentId,
      equipment_code: info.equipment_code,
      alert_category_id: categoryId,
      longitude: info.longitude,
      latitude: info.latitude,
      segment: info.segment,
      created_at: createdAt,
      ...event,
    });

    await this.emitAlertSummaryUpdate(summaryTime);
    await this.snapshotService.emitAfterAlert(equipmentId);
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

  // Map shared telemetry data into the alert payload format.
  private buildAlertDto(
    equipment_id: string,
    log_id: bigint,
    alert_category_id: string,
    status: string,
    created_at: Date,
    info: AlertInfo,
  ): CreateAlertDto {
    return {
      equipment_id,
      log_id: Number(log_id),
      alert_category_id,
      status,
      created_at,
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
      // null diteruskan apa adanya ke repository (sama seperti sebelumnya).
      shift: info.shift as string,
      breakdown: info.breakdown,
      status_engine: info.status_engine,
      operator_name: info.operator_name as string,
    };
  }
}
