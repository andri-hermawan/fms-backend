import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { fuels, Prisma } from '@prisma/client';

@Injectable()
export class FuelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, userId?: string) {
    const { latitude, longitude, ...rest } = data;
    return await this.prisma.$executeRaw`
      INSERT INTO fuels (
        equipment_id, location, speed, engine_status, 
        status, created_by, created_at
      ) VALUES (
        ${rest.equipment_id}::uuid,
        ST_GeomFromText(${`POINT(${longitude} ${latitude})`}, 4326),
        ${rest.speed}, ${rest.engine_status}, 
        ${rest.status || 'open'}, ${userId}::uuid, NOW()
      )
    `;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.fuelsWhereInput;
  }) {
    const { skip, take, where } = params;
    return await this.prisma.$transaction([
      this.prisma.fuels.count({ where }),
      this.prisma.fuels.findMany({
        skip,
        take,
        where,
        orderBy: { created_at: 'desc' },
        include: { equipments: { select: { equipment_code: true } } },
      }),
    ]);
  }

  async findById(id: bigint): Promise<fuels | null> {
    return await this.prisma.fuels.findUnique({
      where: { id },
      include: { equipments: { select: { equipment_code: true } } },
    });
  }

  async update(id: bigint, data: Prisma.fuelsUpdateInput): Promise<fuels> {
    return await this.prisma.fuels.update({
      where: { id },
      data,
    });
  }

  async delete(id: bigint): Promise<fuels> {
    return await this.prisma.fuels.delete({
      where: { id },
    });
  }
}
