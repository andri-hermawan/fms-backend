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

  async findExistingImportKeys(
    keys: {
      date_at: Date;
      shift?: string;
      ticket_no?: string;
      equipment_code: string;
    }[],
  ): Promise<
    Pick<weighbridge, 'date_at' | 'shift' | 'ticket_no' | 'equipment_code'>[]
  > {
    if (keys.length === 0) return [];

    return await this.prisma.weighbridge.findMany({
      where: {
        OR: keys.map((key) => ({
          date_at: key.date_at,
          shift: key.shift ?? null,
          ticket_no: key.ticket_no ?? null,
          equipment_code: key.equipment_code,
        })),
      },
      select: {
        date_at: true,
        shift: true,
        ticket_no: true,
        equipment_code: true,
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
            shift: row.shift ?? null,
            ticket_no: row.ticket_no ?? null,
            equipment_code: row.equipment_code,
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
