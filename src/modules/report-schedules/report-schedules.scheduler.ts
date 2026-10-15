import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportSchedulesRepository } from './repositories/report-schedules.repository';
import { ReportSchedulesService } from './report-schedules.service';
import { nowInTimezone, toMinutes } from './report-time.util';

// Jadwal yang terlewat (mis. server restart tepat jam kirim) masih dikejar
// selama berada dalam jendela ini; lewat dari itu dilewati agar tidak kirim telat.
const CATCH_UP_WINDOW_MINUTES = 120;

@Injectable()
export class ReportSchedulesScheduler {
  private readonly logger = new Logger(ReportSchedulesScheduler.name);
  private running = false;

  constructor(
    private readonly repository: ReportSchedulesRepository,
    private readonly service: ReportSchedulesService,
  ) {}

  // Polling tiap menit: jam kirim dibaca dari DB, jadi perubahan di UI langsung berlaku.
  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.running) return; // render PDF masih berjalan, jangan tumpang tindih
    this.running = true;
    try {
      const schedules = await this.repository.findActive();
      for (const schedule of schedules) {
        const { date, time } = nowInTimezone(
          schedule.timezone || 'Asia/Jakarta',
        );
        const late = toMinutes(time) - toMinutes(schedule.send_time);
        if (late < 0 || late > CATCH_UP_WINDOW_MINUTES) continue;
        if (await this.repository.hasScheduledRun(schedule.id, date)) continue;

        try {
          await this.service.run(schedule, 'schedule');
        } catch {
          // sudah dicatat di report_schedule_logs
        }
      }
    } catch (error) {
      this.logger.error(`Scheduler tick gagal: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
