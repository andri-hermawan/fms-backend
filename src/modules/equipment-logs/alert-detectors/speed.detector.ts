import { Injectable, Logger } from '@nestjs/common';
import { AlertsRepository } from '../../alerts/repositories/alerts.repository';
import { ALERT_CODES } from '../../alert-rules/alert-rule.constants';
import { EquipmentLogsRepository } from '../repositories/equipment-logs.repository';
import { TelemetryContext } from '../telemetry/telemetry-context';
import { AlertDispatcherService } from './alert-dispatcher.service';

/**
 * Overspeed : speed > speed_limit selama durasi rule (default 50 km/h, 1 menit).
 * Underspeed: 0 < speed < speed_limit selama durasi rule (default 10 km/h, 2 menit).
 * speed_limit Overspeed dapat di-override per segment lewat alert_rules.
 */
@Injectable()
export class SpeedDetector {
  private readonly logger = new Logger(SpeedDetector.name);

  constructor(
    private readonly repository: EquipmentLogsRepository,
    private readonly alertRepo: AlertsRepository,
    private readonly dispatcher: AlertDispatcherService,
  ) {}

  async detect({ equipmentId, logId, time, info, rules }: TelemetryContext) {
    const overSpeed = rules[ALERT_CODES.OVERSPEED];
    const underSpeed = rules[ALERT_CODES.UNDERSPEED];
    try {
      const speed = Number(info.speed);

      // Resolve overspeed after speed returns to the limit or below.
      if (speed <= overSpeed.speedLimit) {
        await this.alertRepo.resolveActive(
          equipmentId,
          overSpeed.categoryId,
          time,
        );
      }

      // Resolve underspeed when speed reaches the limit or above, or stops at 0.
      if (speed === 0 || speed >= underSpeed.speedLimit) {
        await this.alertRepo.resolveActive(
          equipmentId,
          underSpeed.categoryId,
          time,
        );
      }

      let categoryId: string | null = null;
      let alertName: string | null = null;
      let alertCreatedAt = time;

      if (speed > overSpeed.speedLimit) {
        const overSpeedStart = await this.repository.findOverSpeedStart(
          equipmentId,
          overSpeed.speedLimit,
        );
        const startTimeOverSpeed = overSpeedStart?.created_at
          ? new Date(String(overSpeedStart.created_at))
          : time;
        const diffMinutes =
          (time.getTime() - startTimeOverSpeed.getTime()) / (1000 * 60);

        if (diffMinutes >= overSpeed.durationMinutes) {
          categoryId = overSpeed.categoryId;
          alertName = 'Overspeed';
          alertCreatedAt = startTimeOverSpeed;
        }
      } else if (speed > 0 && speed < underSpeed.speedLimit) {
        // Same pattern as off-track: get the first log in the active streak.
        const underSpeedStart = await this.repository.findUnderSpeedStart(
          equipmentId,
          underSpeed.speedLimit,
        );
        const startTimeUnderSpeed = underSpeedStart?.created_at
          ? new Date(String(underSpeedStart.created_at))
          : time;
        const diffMinutes =
          (time.getTime() - startTimeUnderSpeed.getTime()) / (1000 * 60);

        if (diffMinutes >= underSpeed.durationMinutes) {
          categoryId = underSpeed.categoryId;
          alertName = 'Underspeed';
          alertCreatedAt = startTimeUnderSpeed;
        }
      }

      if (!categoryId || !alertName) return;

      const activeAlert = await this.alertRepo.findOne({
        where: {
          equipment_id: equipmentId,
          alert_category_id: categoryId,
          created_at: alertCreatedAt,
        },
      });

      if (activeAlert && alertName === 'Underspeed') {
        await this.alertRepo.update(activeAlert.id, { resolved_at: time });
        return;
      }

      if (!activeAlert) {
        await this.dispatcher.dispatch({
          equipmentId,
          logId,
          categoryId,
          status: alertName,
          createdAt: alertCreatedAt,
          info,
          resolvedAt: time,
          event: {
            alert_type: alertName,
            status: alertName,
            speed: info.speed,
          },
          summaryTime: time,
        });
      }
    } catch (e: unknown) {
      this.logger.error(
        `Speed Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
