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

  async delete(id: bigint): Promise<breakdown_status> {
    return await this.prisma.breakdown_status.delete({ where: { id } });
  }
}