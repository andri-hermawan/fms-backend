import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ReportSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.report_schedulesUncheckedCreateInput) {
    return this.prisma.report_schedules.create({ data });
  }

  findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.report_schedulesWhereInput;
  }) {
    const { skip, take, where } = params;
    return this.prisma.$transaction([
      this.prisma.report_schedules.findMany({
        skip,
        take,
        where,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.report_schedules.count({ where }),
    ]);
  }

  findActive() {
    return this.prisma.report_schedules.findMany({
      where: { status: 'active' },
    });
  }

  findById(id: string) {
    return this.prisma.report_schedules.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.report_schedulesUncheckedUpdateInput) {
    return this.prisma.report_schedules.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.report_schedules.delete({ where: { id } });
  }

  touchLastRun(id: string) {
    return this.prisma.report_schedules.update({
      where: { id },
      data: { last_run_at: new Date() },
    });
  }

  // Penerima: hanya user aktif yang dipilih pada jadwal.
  findRecipients(userIds: string[]) {
    return this.prisma.users.findMany({
      where: { id: { in: userIds }, status: 'active' },
      select: { id: true, name: true, email: true },
    });
  }

  // Dipakai form untuk menampilkan nama penerima.
  findUsersByIds(userIds: string[]) {
    return this.prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
  }

  createLog(data: Prisma.report_schedule_logsUncheckedCreateInput) {
    return this.prisma.report_schedule_logs.create({ data });
  }

  findLogs(scheduleId: string, take = 20) {
    return this.prisma.report_schedule_logs.findMany({
      where: { schedule_id: scheduleId },
      orderBy: { created_at: 'desc' },
      take,
    });
  }

  // Sudah ada eksekusi terjadwal pada tanggal kirim ini (sukses maupun gagal)?
  hasScheduledRun(scheduleId: string, runDate: string) {
    return this.prisma.report_schedule_logs
      .count({
        where: {
          schedule_id: scheduleId,
          trigger: 'schedule',
          run_date: new Date(`${runDate}T00:00:00.000Z`),
        },
      })
      .then((count) => count > 0);
  }
}
