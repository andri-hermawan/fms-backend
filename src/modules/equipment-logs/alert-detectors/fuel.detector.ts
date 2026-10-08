import { Injectable, Logger } from '@nestjs/common';
import { AlertsRepository } from '../../alerts/repositories/alerts.repository';
import { FuelsService } from '../../fuels/fuels.service';
import { ALERT_CODES } from '../../alert-rules/alert-rule.constants';
import { WebSocketGatewayService } from '../../../common/websocket/websocket.gateway';
import { EquipmentLogsRepository } from '../repositories/equipment-logs.repository';
import { isInvalidFuelReading } from '../telemetry/calculators/fuel-reading';
import { FuelCalibration } from '../telemetry/fuel-calibration-lookup';
import { LastLog, TelemetryContext } from '../telemetry/telemetry-context';
import { AlertDispatcherService } from './alert-dispatcher.service';

/**
 * Mencatat setiap event fuel ke tabel fuels dan membuat alert:
 * - Fuel Decrease Engine Off: engine sebelumnya OFF lalu ON, dan penurunan
 *   dibanding log sebelumnya <= fuel_threshold (bahan bakar berkurang saat
 *   mesin mati, terdeteksi ketika mesin dinyalakan lagi).
 * - Fuel Decrease Engine On: engine ON & berhenti, penurunan kumulatif sejak
 *   awal berhenti <= fuel_threshold dan durasi berhenti >= duration_minutes.
 */
@Injectable()
export class FuelDetector {
  private readonly logger = new Logger(FuelDetector.name);

  constructor(
    private readonly repository: EquipmentLogsRepository,
    private readonly alertRepo: AlertsRepository,
    private readonly fuelsService: FuelsService,
    private readonly dispatcher: AlertDispatcherService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async detect(ctx: TelemetryContext, lastLog: LastLog) {
    const { equipmentId, logId, time, info, rules, lookupCalibration } = ctx;
    const engineOnRule = rules[ALERT_CODES.FUEL_DECREASE_ENGINE_ON];
    const engineOffRule = rules[ALERT_CODES.FUEL_DECREASE_ENGINE_OFF];
    try {
      const useLastFuel = isInvalidFuelReading(info.fuel_level);
      const currentFuelLevel = useLastFuel
        ? lastLog.fuel_level
        : info.fuel_level;

      let currentCalibration: Pick<FuelCalibration, 'volume' | 'percentage'>;
      try {
        currentCalibration = useLastFuel
          ? {
              volume: lastLog.fuel_volume as any,
              percentage: lastLog.fuel_percentage as any,
            }
          : await lookupCalibration(Number(currentFuelLevel));
      } catch {
        this.logger.warn(
          `[Fuel Alert] No calibration data for equipment ${equipmentId}`,
        );
        return;
      }

      let previousCalibration: FuelCalibration;
      try {
        previousCalibration = await lookupCalibration(
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

      let eventType: string;
      let alertCategoryId: string | null = null;
      let startTime: Date = time;
      const wasEngineOff = lastLog.engine_status === false;
      const isEngineOn = info.engine_status === true;

      // Every fuel decrease/increase is recorded as an event.
      if (fuelDifference < 0) {
        eventType = 'FUEL DECREASE';

        // Direct decrease after an engine-OFF period: theft while OFF.
        const isAfterEngineOff = isEngineOn && wasEngineOff;
        const isEngineOffDecrease =
          Number(fuelDifference.toFixed(1)) <= engineOffRule.fuelThreshold;
        if (isAfterEngineOff && isEngineOffDecrease) {
          alertCategoryId = engineOffRule.categoryId;
          // ON + stopped: use cumulative fuel and duration thresholds.
        } else if (isEngineOn && Number(info.speed ?? 0) === 0) {
          const stopStart =
            await this.repository.findStopStreakStart(equipmentId);
          startTime = stopStart?.created_at
            ? new Date(String(stopStart.created_at))
            : time;
          const deltaTimeMinutes =
            (time.getTime() - startTime.getTime()) / (1000 * 60);
          let startVolume = previousVolume;

          if (
            stopStart?.fuel_level !== undefined &&
            stopStart.fuel_level !== null
          ) {
            try {
              const startCalibration = await lookupCalibration(
                Number(stopStart.fuel_level),
              );
              startVolume = Number(startCalibration.volume);
            } catch {
              // Keep previousVolume when the streak baseline cannot be calibrated.
            }
          }

          const cumulativeDiff = currentVolume - startVolume;
          const isCumulativeDecrease =
            Number(cumulativeDiff.toFixed(1)) <= engineOnRule.fuelThreshold;
          if (
            isCumulativeDecrease &&
            deltaTimeMinutes >= engineOnRule.durationMinutes
          ) {
            alertCategoryId = engineOnRule.categoryId;
          }
        }
      } else if (fuelDifference > 0) {
        eventType = 'FUEL INCREASE';
      } else {
        eventType = 'FUEL NO CHANGE';
      }

      // Insert into fuels table for history (ALWAYS log the event)
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
        shift: info.shift as string,
        created_at: time.toISOString(),
      });

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
        created_at: time,
      });

      // Create alert only after the engine ON/OFF threshold is reached.
      if (!alertCategoryId) return;

      const isEngineOffAlert = alertCategoryId === engineOffRule.categoryId;
      const existingAlert = await this.alertRepo.findOne({
        where: {
          equipment_id: equipmentId,
          alert_category_id: alertCategoryId,
          created_at: startTime,
        },
      });

      if (existingAlert) {
        await this.alertRepo.update(existingAlert.id, { resolved_at: time });
        return;
      }

      await this.dispatcher.dispatch({
        equipmentId,
        logId,
        categoryId: alertCategoryId,
        status: isEngineOffAlert
          ? 'Fuel Decrease Engine Off'
          : 'Fuel Decrease Engine On',
        createdAt: startTime,
        info: isEngineOffAlert
          ? {
              ...info,
              fuel_level: currentFuelLevel,
              fuel_volume: currentVolume,
              fuel_percentage: currentPercentage,
              fuel_difference: fuelDifference,
            }
          : info,
        resolvedAt: time,
        event: {
          alert_type: eventType,
          status: eventType,
          fuel_level: currentFuelLevel,
          fuel_volume: currentVolume,
          fuel_difference: fuelDifference,
        },
        summaryTime: time,
      });
    } catch (e: unknown) {
      this.logger.error(
        `Fuel Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // First log: record initial fuel level as baseline.
  async recordInitial({
    equipmentId,
    logId,
    time,
    info,
    lookupCalibration,
  }: TelemetryContext) {
    try {
      let calibration: FuelCalibration;
      try {
        calibration = await lookupCalibration(Number(info.fuel_level));
      } catch {
        this.logger.warn(
          `[Initial Fuel] No calibration data for equipment ${equipmentId}`,
        );
        return;
      }

      const currentVolume = Number(calibration.volume);
      const currentPercentage = Number(calibration.percentage);

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
        shift: info.shift as string,
        created_at: time.toISOString(),
      });

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
    } catch (e: unknown) {
      this.logger.error(
        `Initial Fuel Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
