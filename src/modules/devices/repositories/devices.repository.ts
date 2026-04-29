import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, devices } from '@prisma/client';

@Injectable()
export class DevicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.devicesCreateInput): Promise<devices> {
    return await this.prisma.devices.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.devicesWhereInput;
    orderBy?: Prisma.devicesOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.devices.count({ where }),
      this.prisma.devices.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          equipments: {
            select: {
              equipment_code: true,
              equipment_alias: true,
            },
          },
        },
      }),
    ]);
  }

  async findById(id: string): Promise<devices | null> {
    return await this.prisma.devices.findUnique({
      where: { id },
      include: {
        equipments: {
          select: {
            equipment_code: true,
            equipment_alias: true,
          },
        },
      },
    });
  }

  async findByCode(code: string): Promise<devices | null> {
    return await this.prisma.devices.findUnique({
      where: { device_code: code },
    });
  }

  async update(id: string, data: Prisma.devicesUpdateInput): Promise<devices> {
    return await this.prisma.devices.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<devices> {
    return await this.prisma.devices.delete({
      where: { id },
    });
  }
}
