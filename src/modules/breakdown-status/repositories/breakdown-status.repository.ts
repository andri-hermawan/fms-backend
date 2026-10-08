import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, breakdown_status } from '@prisma/client';

@Injectable()
export class BreakdownStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.breakdown_statusUncheckedCreateInput,
  ): Promise<breakdown_status> {
    return await this.prisma.breakdown_status.create({ data });
  }

  async createMany(
    data: Prisma.breakdown_statusUncheckedCreateInput[],
  ): Promise<{ count: number }> {
    return await this.prisma.breakdown_status.createMany({ data });
  }

  async upsertImportRow(
    row: Prisma.breakdown_statusUncheckedCreateInput,
  ): Promise<{
    record: breakdown_status;
    created: number;
    updated: number;
  }> {
    console.log('[BREAKDOWN-REPOSITORY-UPSERT-DATE-INPUT]', {
      date_at: row.date_at,
      date_at_iso:
        row.date_at instanceof Date
          ? row.date_at.toISOString()
          : String(row.date_at),
    });

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.breakdown_status.findFirst({
        where: {
          date_at: row.date_at,
          shift: row.shift ?? null,
          equipment_code: row.equipment_code ?? null,
          category: row.category ?? null,
          time_start: row.time_start ?? null,
        },
      });

      if (existing) {
        const record = await tx.breakdown_status.update({
          where: { id: existing.id },
          data: { ...row, updated_at: new Date() },
        });
        console.log('[BREAKDOWN-REPOSITORY-UPSERT-DATE-UPDATED]', {
          id: record.id.toString(),
          date_at: record.date_at,
          date_at_iso:
            record.date_at instanceof Date
              ? record.date_at.toISOString()
              : String(record.date_at),
        });
        return { record, created: 0, updated: 1 };
      }

      const record = await tx.breakdown_status.create({ data: row });
      console.log('[BREAKDOWN-REPOSITORY-UPSERT-DATE-CREATED]', {
        id: record.id.toString(),
        date_at: record.date_at,
        date_at_iso:
          record.date_at instanceof Date
            ? record.date_at.toISOString()
            : String(record.date_at),
      });
      return { record, created: 1, updated: 0 };
    });
  }

  async upsertImportRows(
    rows: Prisma.breakdown_statusUncheckedCreateInput[],
  ): Promise<{ created: number; updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const existing = await tx.breakdown_status.findFirst({
          where: {
            date_at: row.date_at,
            shift: row.shift ?? null,
            equipment_code: row.equipment_code ?? null,
            category: row.category ?? null,
            time_start: row.time_start ?? null,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.breakdown_status.update({
            where: { id: existing.id },
            data: { ...row, updated_at: new Date() },
          });
          updated++;
        } else {
          await tx.breakdown_status.create({ data: row });
          created++;
        }
      }

      return { created, updated };
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.breakdown_statusWhereInput;
    orderBy?: Prisma.breakdown_statusOrderByWithRelationInput;
  }): Promise<[breakdown_status[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.breakdown_status.findMany({ skip, take, where, orderBy }),
      this.prisma.breakdown_status.count({ where }),
    ]);
  }

  async findById(id: bigint): Promise<breakdown_status | null> {
    return await this.prisma.breakdown_status.findUnique({ where: { id } });
  }

  async update(
    id: bigint,
    data: Prisma.breakdown_statusUncheckedUpdateInput,
  ): Promise<breakdown_status> {
    return await this.prisma.breakdown_status.update({ where: { id }, data });
  }

  // Status & deskripsi terbaru (id terbesar) per date_at + equipment_code + shift.
  async findLatestStatus(params: {
    date_at: string; // YYYY-MM-DD
    equipment_code: string;
    shift: string;
  }): Promise<{ status: string | null; description: string | null } | null> {
    const row = await this.prisma.breakdown_status.findFirst({
      where: {
        date_at: new Date(`${params.date_at}T00:00:00.000Z`),
        equipment_code: params.equipment_code,
        shift: params.shift,
      },
      orderBy: { id: 'desc' },
      select: { status: true, description: true },
    });
    return row ?? null;
  }

  async delete(id: bigint): Promise<breakdown_status> {
    return await this.prisma.breakdown_status.delete({ where: { id } });
  }
}
