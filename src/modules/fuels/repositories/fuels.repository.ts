import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { fuels, Prisma } from '@prisma/client';

@Injectable()
export class FuelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const { latitude, longitude, log_id, ...rest } = data;

    // Build location geometry using raw SQL fragment
    const locationWKT = `POINT(${longitude} ${latitude})`;

    return await this.prisma.$executeRaw`
      INSERT INTO fuels (
        equipment_id, log_id, fuel_level, fuel_volume, fuel_percentage,
        fuel_temperature, fuel_difference, event_type, description,
        location, is_inside, orig_fid, location_category, segment,
        speed, vessel, mileage, vessel_status, engine_status, status,
        shift, created_at
      ) VALUES (
        ${rest.equipment_id}::uuid,
        ${log_id ? BigInt(log_id) : null},
        ${rest.fuel_level !== undefined ? rest.fuel_level : null},
        ${rest.fuel_volume !== undefined ? rest.fuel_volume : null},
        ${rest.fuel_percentage !== undefined ? rest.fuel_percentage : null},
        ${rest.fuel_temperature !== undefined ? rest.fuel_temperature : null},
        ${rest.fuel_difference !== undefined ? rest.fuel_difference : null},
        ${rest.event_type || null},
        ${rest.description || null},
        ST_GeomFromText(${locationWKT}, 4326),
        ${rest.is_inside !== undefined ? rest.is_inside : null},
        ${rest.orig_fid !== undefined ? rest.orig_fid : null},
        ${rest.location_category || null},
        ${rest.segment || null},
        ${rest.speed !== undefined ? rest.speed : null},
        ${rest.vessel || null},
        ${rest.mileage !== undefined ? rest.mileage : null},
        ${rest.vessel_status || null},
        ${rest.engine_status !== undefined ? rest.engine_status : null},
        ${rest.status || null},
        ${rest.shift || null},
        NOW()
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
