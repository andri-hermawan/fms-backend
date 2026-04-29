import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EquipmentLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const { latitude, longitude, ...rest } = data;

    // Menggunakan raw query untuk memasukkan data Point PostGIS
    return await this.prisma.$executeRaw`
      INSERT INTO equipment_logs (
        time, equipment_id, device_id, location, speed, 
        fuel_level, mileage, engine_status, vessel_status, created_at
      ) VALUES (
        ${rest.time}::timestamp, ${rest.equipment_id}::uuid, ${rest.device_id}::uuid,
        ST_GeomFromText(${`POINT(${longitude} ${latitude})`}, 4326),
        ${rest.speed}, ${rest.fuel_level}, ${rest.mileage}, 
        ${rest.engine_status}, ${rest.vessel_status}, NOW()
      )
    `;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.equipment_logsWhereInput;
  }) {
    const { skip, take, where } = params;
    return await this.prisma.$transaction([
      this.prisma.equipment_logs.count({ where }),
      this.prisma.equipment_logs.findMany({
        skip,
        take,
        where,
        orderBy: { time: 'desc' },
        include: {
          equipments: { select: { equipment_code: true } },
          devices: { select: { device_code: true } },
        },
      }),
    ]);
  }

  async findById(id: string) {
    // Karena ID BigInt, Prisma akan mengembalikan BigInt yang perlu di-string kan di JSON
    return await this.prisma.equipment_logs.findUnique({
      where: { id: BigInt(id) },
      include: { equipments: true, devices: true },
    });
  }
}
