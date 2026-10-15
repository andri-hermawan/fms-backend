import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { equipment_activation, Prisma } from '@prisma/client';

@Injectable()
export class EquipmentActivationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertRow(
    row: Prisma.equipment_activationUncheckedCreateInput,
    name: string | null,
  ): Promise<{
    record: equipment_activation;
    created: number;
    updated: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.equipment_activation.findFirst({
        where: {
          date_at: row.date_at,
          equipment_code: row.equipment_code,
        },
      });

      if (existing) {
        const record = await tx.equipment_activation.update({
          where: { id: existing.id },
          data: {
            status: row.status,
            description: row.description,
            updated_at: new Date(),
            updated_by: name,
          },
        });
        return { record, created: 0, updated: 1 };
      }

      const record = await tx.equipment_activation.create({
        data: { ...row, created_at: new Date(), created_by: name },
      });
      return { record, created: 1, updated: 0 };
    });
  }

  async upsertImportRows(
    rows: Prisma.equipment_activationUncheckedCreateInput[],
    name: string | null,
  ): Promise<{ created: number; updated: number }> {
    return this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const existing = await tx.equipment_activation.findFirst({
          where: {
            date_at: row.date_at,
            equipment_code: row.equipment_code,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.equipment_activation.update({
            where: { id: existing.id },
            data: {
              status: row.status,
              description: row.description,
              updated_at: new Date(),
              updated_by: name,
            },
          });
          updated++;
        } else {
          await tx.equipment_activation.create({
            data: { ...row, created_at: new Date(), created_by: name },
          });
          created++;
        }
      }

      return { created, updated };
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.equipment_activationWhereInput;
  }): Promise<[equipment_activation[], number]> {
    const { skip, take, where } = params;
    return this.prisma.$transaction([
      this.prisma.equipment_activation.findMany({
        skip,
        take,
        where,
        orderBy: { date_at: 'desc' },
      }),
      this.prisma.equipment_activation.count({ where }),
    ]);
  }

  async findById(id: bigint): Promise<equipment_activation | null> {
    return this.prisma.equipment_activation.findUnique({ where: { id } });
  }

  async update(
    id: bigint,
    data: Prisma.equipment_activationUncheckedUpdateInput,
  ): Promise<equipment_activation> {
    return this.prisma.equipment_activation.update({ where: { id }, data });
  }

  async delete(id: bigint): Promise<equipment_activation> {
    return this.prisma.equipment_activation.delete({ where: { id } });
  }
}
