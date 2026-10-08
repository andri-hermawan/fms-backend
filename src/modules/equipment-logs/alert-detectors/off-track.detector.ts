import { Injectable, Logger } from '@nestjs/common';
import { AlertsRepository } from '../../alerts/repositories/alerts.repository';
import { ALERT_CODES } from '../../alert-rules/alert-rule.constants';
import { EquipmentLogsRepository } from '../repositories/equipment-logs.repository';
import { TelemetryContext } from '../telemetry/telemetry-context';
import { AlertDispatcherService } from './alert-dispatcher.service';

/**
 * Off Track: is_inside = false & speed = 0 selama durasi rule (default 3 menit).
 * Alert aktif (resolved_at null) di-resolve begitu unit kembali ke dalam track.
 */
@Injectable()
export class OffTrackDetector {
  private readonly logger = new Logger(OffTrackDetector.name);

  constructor(
    private readonly repository: EquipmentLogsRepository,
    private readonly alertRepo: AlertsRepository,
    private readonly dispatcher: AlertDispatcherService,
  ) {}

  async detect({ equipmentId, logId, time, info, rules }: TelemetryContext) {
    const rule = rules[ALERT_CODES.OFF_TRACK];
    try {
      // Resolve the current active alert immediately after returning inside.
      if (info.is_inside) {
        const lastStoppedOutside = await this.repository.findLastStoppedOutside(
          equipmentId,
          logId,
        );
        const resolvedTime = lastStoppedOutside?.created_at
          ? new Date(String(lastStoppedOutside.created_at))
          : time;
        await this.alertRepo.resolveActive(
          equipmentId,
          rule.categoryId,
          resolvedTime,
        );
        return;
      }

      if (Number(info.speed) !== 0) return;

      // Waktu mulai equipment berhenti di luar track.
      const outsideStart =
        await this.repository.findStoppedOutsideStart(equipmentId);
      const startTimeOutside = outsideStart?.created_at
        ? new Date(String(outsideStart.created_at))
        : time;
      const diffMinutes =
        (time.getTime() - startTimeOutside.getTime()) / (1000 * 60);

      if (diffMinutes >= rule.durationMinutes) {
        const exist = await this.alertRepo.findOne({
          where: {
            equipment_id: equipmentId,
            alert_category_id: rule.categoryId,
            resolved_at: null,
          },
        });

        if (!exist) {
          // A resolved occurrence is historical; create a new alert row.
          await this.dispatcher.dispatch({
            equipmentId,
            logId,
            categoryId: rule.categoryId,
            status: 'Off Track',
            createdAt: startTimeOutside,
            info,
            event: {
              alert_type: 'Off Track',
              status: 'Off Track',
              speed: info.speed,
            },
            summaryTime: time,
          });
        }
      }
    } catch (e: unknown) {
      this.logger.error(
        `OffTrack Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
