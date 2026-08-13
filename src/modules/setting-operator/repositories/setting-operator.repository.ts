import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, daily_setting_operator } from '@prisma/client';

@Injectable()
export class SettingOperatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.daily_setting_operatorUncheckedCreateInput,
  ): Promise<daily_setting_operator> {
    return await this.prisma.daily_setting_operator.create({ data });
  }

  async createMany(
    data: Prisma.daily_setting_operatorUncheckedCreateInput[],
  ): Promise<{ count: number }> {
    return await this.prisma.daily_setting_operator.createMany({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.daily_setting_operatorWhereInput;
    orderBy?: Prisma.daily_setting_operatorOrderByWithRelationInput;
  }): Promise<[daily_setting_operator[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.daily_setting_operator.findMany({ skip, take, where, orderBy }),
      this.prisma.daily_setting_operator.count({ where }),
    ]);
  }

  async findById(id: bigint): Promise<daily_setting_operator | null> {
    return await this.prisma.daily_setting_operator.findUnique({ where: { id } });
  }

  async update(
    id: bigint,
    data: Prisma.daily_setting_operatorUncheckedUpdateInput,
  ): Promise<daily_setting_operator> {
    return await this.prisma.daily_setting_operator.update({ where: { id }, data });
  }

  async delete(id: bigint): Promise<daily_setting_operator> {
    return await this.prisma.daily_setting_operator.delete({ where: { id } });
  }
}