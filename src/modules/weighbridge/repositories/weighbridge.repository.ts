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