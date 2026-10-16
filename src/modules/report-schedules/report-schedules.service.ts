import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, report_schedules } from '@prisma/client';
import { ReportSchedulesRepository } from './repositories/report-schedules.repository';
import { ReportPdfService } from './report-pdf.service';
import { ReportMailerService } from './report-mailer.service';
import { CreateReportScheduleDto } from './dto/create-report-schedule.dto';
import { UpdateReportScheduleDto } from './dto/update-report-schedule.dto';
import { QueryReportScheduleDto } from './dto/query-report-schedule.dto';
import { REPORT_REGISTRY } from './report-registry';
import { addDays, nowInTimezone } from './report-time.util';

type Trigger = 'schedule' | 'manual';

// Error browser memuat URL print lengkap; token sementara tidak boleh masuk log/DB/respons.
const redactToken = (message: string) =>
  message.replace(/token=[^&\s]+/g, 'token=***');

@Injectable()
export class ReportSchedulesService {
  private readonly logger = new Logger(ReportSchedulesService.name);

  constructor(
    private readonly repository: ReportSchedulesRepository,
    private readonly pdf: ReportPdfService,
    private readonly mailer: ReportMailerService,
  ) {}

  getReportTypes() {
    return Object.entries(REPORT_REGISTRY).map(([value, def]) => ({
      value,
      label: def.label,
    }));
  }

  create(dto: CreateReportScheduleDto, userId: string | null) {
    return this.repository.create({
      ...dto,
      status: dto.status || 'active',
      created_by: userId,
    });
  }

  async findAll(query: QueryReportScheduleDto) {
    const { page = 1, limit = 25, status } = query;
    const where: Prisma.report_schedulesWhereInput = {};
    if (status) where.status = status;

    const [rows, total] = await this.repository.findAll({
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    const users = await this.repository.findUsersByIds([
      ...new Set(rows.flatMap((row) => row.user_ids)),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: rows.map((row) => ({
        ...row,
        recipients: row.user_ids
          .map((id) => userMap.get(id))
          .filter((u): u is NonNullable<typeof u> => !!u),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const schedule = await this.repository.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Report schedule '${id}' not found`);
    }
    return schedule;
  }

  async findLogs(id: string) {
    await this.findOne(id);
    return this.repository.findLogs(id);
  }

  async update(
    id: string,
    dto: UpdateReportScheduleDto,
    userId: string | null,
  ) {
    await this.findOne(id);
    return this.repository.update(id, {
      ...dto,
      updated_at: new Date(),
      updated_by: userId,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repository.delete(id);
    return null;
  }

  async sendNow(id: string) {
    const schedule = await this.findOne(id);
    const { recipients } = await this.run(schedule, 'manual');
    return { sent: true, recipients };
  }

  // Render PDF -> kirim email -> catat log. Gagal tetap dicatat; pemanggil
  // manual menerima error-nya, scheduler cukup menelan (sudah ter-log).
  async run(schedule: report_schedules, trigger: Trigger) {
    const timezone = schedule.timezone || 'Asia/Jakarta';
    const runDate = nowInTimezone(timezone).date;
    const reportDate = addDays(runDate, schedule.date_offset);
    let recipientCount = 0;

    try {
      const definition = REPORT_REGISTRY[schedule.report_type];
      if (!definition) {
        throw new Error(`Report type '${schedule.report_type}' tidak dikenal`);
      }

      const recipients = await this.repository.findRecipients(
        schedule.user_ids,
      );
      recipientCount = recipients.length;
      if (recipients.length === 0) {
        throw new Error('Tidak ada penerima aktif pada jadwal ini');
      }

      const pdf = await this.pdf.render(definition.printPath, {
        date: reportDate,
        shift: schedule.shift,
      });

      const safeShift = schedule.shift.replace(/\s+/g, '-');
      await this.mailer.send({
        to: recipients.map((u) => u.email),
        subject: `[FMS] ${definition.label} - ${schedule.shift} - ${reportDate}`,
        html: `<p>Terlampir report <b>${definition.label}</b> untuk tanggal <b>${reportDate}</b>, <b>${schedule.shift}</b>.</p><p>Email ini dikirim otomatis oleh FMS.</p>`,
        attachment: {
          filename: `${schedule.report_type}_${reportDate}_${safeShift}.pdf`,
          content: pdf,
        },
      });

      await this.writeLog(schedule.id, runDate, reportDate, trigger, {
        status: 'success',
        recipients: recipientCount,
      });
      return { recipients: recipientCount };
    } catch (error) {
      const message = redactToken(
        error instanceof Error ? error.message : String(error),
      );
      this.logger.error(`Jadwal '${schedule.name}' gagal: ${message}`);
      await this.writeLog(schedule.id, runDate, reportDate, trigger, {
        status: 'failed',
        recipients: recipientCount,
        error_message: message,
      });
      // HttpException agar pesan aslinya sampai ke UI (bukan "Internal server error").
      throw new InternalServerErrorException(message);
    }
  }

  private async writeLog(
    scheduleId: string,
    runDate: string,
    reportDate: string,
    trigger: Trigger,
    result: { status: string; recipients: number; error_message?: string },
  ) {
    await this.repository.createLog({
      schedule_id: scheduleId,
      run_date: new Date(`${runDate}T00:00:00.000Z`),
      report_date: new Date(`${reportDate}T00:00:00.000Z`),
      trigger,
      ...result,
    });
    await this.repository.touchLastRun(scheduleId);
  }
}
