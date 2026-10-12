import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, weighbridge } from '@prisma/client';

@Injectable()
export class WeighbridgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.weighbridgeUncheckedCreateInput,
  ): Promise<weighbridge> {
    return await this.prisma.weighbridge.create({ data });
  }

  async createMany(
    data: Prisma.weighbridgeUncheckedCreateInput[],
  ): Promise<{ count: number }> {
    return await this.prisma.weighbridge.createMany({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.weighbridgeWhereInput;
    orderBy?: Prisma.weighbridgeOrderByWithRelationInput;
  }): Promise<[weighbridge[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.weighbridge.findMany({ skip, take, where, orderBy }),
      this.prisma.weighbridge.count({ where }),
    ]);
  }

  async findById(id: bigint): Promise<weighbridge | null> {
    return await this.prisma.weighbridge.findUnique({ where: { id } });
  }

  /**
   * Jumlah ritase (COUNT baris weighbridge) per equipment_code per tanggal.
   * date_at bertipe `date`, jadi ::text langsung menghasilkan YYYY-MM-DD tanpa
   * terpengaruh timezone server.
   */
  async countRitaseByDateAndEquipment(params: {
    startDate: string;
    endDate: string;
    where?: Prisma.weighbridgeWhereInput;
  }): Promise<
    { equipment_code: string; date: string; ritase: number; net: number }[]
  > {
    const rows = await this.prisma.weighbridge.groupBy({
      by: ['date_at', 'equipment_code'],
      where: {
        ...(params.where ?? {}),
        date_at: {
          gte: new Date(`${params.startDate}T00:00:00.000Z`),
          lte: new Date(`${params.endDate}T00:00:00.000Z`),
        },
      },
      _count: { _all: true },
      _sum: { net: true },
      orderBy: [{ date_at: 'asc' }, { equipment_code: 'asc' }],
    });

    return rows
      .filter((row) => row.date_at && row.equipment_code)
      .map((row) => ({
        equipment_code: row.equipment_code as string,
        date: this.formatDateKey(row.date_at!),
        ritase: row._count._all,
        net: Number(row._sum.net ?? 0),
      }));
  }

  /**
   * Total payload (SUM net) per equipment_code per tanggal — setara SUMIFS
   * pada Excel. Dipakai oleh report production-daily.
   * date_at bertipe `date`, jadi getUTC* menghasilkan YYYY-MM-DD tanpa
   * terpengaruh timezone server.
   */
  async sumNetByDateAndEquipment(params: {
    startDate: string;
    endDate: string;
    where?: Prisma.weighbridgeWhereInput;
  }): Promise<{ equipment_code: string; date: string; sum_net: number }[]> {
    const rows = await this.prisma.weighbridge.groupBy({
      by: ['date_at', 'equipment_code'],
      where: {
        ...(params.where ?? {}),
        date_at: {
          gte: new Date(`${params.startDate}T00:00:00.000Z`),
          lte: new Date(`${params.endDate}T00:00:00.000Z`),
        },
      },
      _sum: { net: true },
      orderBy: [{ date_at: 'asc' }, { equipment_code: 'asc' }],
    });

    return rows
      .filter((row) => row.date_at && row.equipment_code)
      .map((row) => ({
        equipment_code: row.equipment_code as string,
        date: this.formatDateKey(row.date_at!),
        sum_net: Number(row._sum.net ?? 0),
      }));
  }

  /**
   * Rata-rata payload (AVERAGE net) per equipment_code per tanggal — setara
   * AVERAGEIFS pada Excel. Dipakai oleh report payload-daily.
   * date_at bertipe `date`, jadi getUTC* menghasilkan YYYY-MM-DD tanpa
   * terpengaruh timezone server.
   */
  async avgNetByDateAndEquipment(params: {
    startDate: string;
    endDate: string;
    where?: Prisma.weighbridgeWhereInput;
  }): Promise<{ equipment_code: string; date: string; avg_net: number }[]> {
    const rows = await this.prisma.weighbridge.groupBy({
      by: ['date_at', 'equipment_code'],
      where: {
        ...(params.where ?? {}),
        date_at: {
          gte: new Date(`${params.startDate}T00:00:00.000Z`),
          lte: new Date(`${params.endDate}T00:00:00.000Z`),
        },
      },
      _avg: { net: true },
      orderBy: [{ date_at: 'asc' }, { equipment_code: 'asc' }],
    });

    return rows
      .filter((row) => row.date_at && row.equipment_code)
      .map((row) => ({
        equipment_code: row.equipment_code as string,
        date: this.formatDateKey(row.date_at!),
        avg_net: Number(row._avg.net ?? 0),
      }));
  }

  /** Format tanggal kolom `date` menjadi YYYY-MM-DD. */
  private formatDateKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  async findExistingImportKeys(
    keys: {
      date_at: Date;
      ticket_no?: string;
    }[],
  ): Promise<Pick<weighbridge, 'date_at' | 'ticket_no'>[]> {
    if (keys.length === 0) return [];

    return await this.prisma.weighbridge.findMany({
      where: {
        OR: keys.map((key) => ({
          date_at: key.date_at,
          ticket_no: key.ticket_no ?? null,
        })),
      },
      select: {
        date_at: true,
        ticket_no: true,
      },
    });
  }

  async upsertImportRows(
    rows: Prisma.weighbridgeUncheckedCreateInput[],
  ): Promise<{ created: number; updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const existing = await tx.weighbridge.findFirst({
          where: {
            date_at: row.date_at,
            ticket_no: row.ticket_no ?? null,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.weighbridge.update({
            where: { id: existing.id },
            data: { ...row, updated_at: new Date() },
          });
          updated++;
        } else {
          await tx.weighbridge.create({ data: row });
          created++;
        }
      }

      return { created, updated };
    });
  }

  async update(
    id: bigint,
    data: Prisma.weighbridgeUncheckedUpdateInput,
  ): Promise<weighbridge> {
    return await this.prisma.weighbridge.update({ where: { id }, data });
  }

  async delete(id: bigint): Promise<weighbridge> {
    return await this.prisma.weighbridge.delete({ where: { id } });
  }
}
