import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class EquipmentStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertStatus(data: any) {
    const { latitude, longitude, ...rest } = data;

    // Menggunakan ON CONFLICT untuk PostgreSQL (Upsert)
    return await this.prisma.$executeRaw`
      INSERT INTO equipment_status (
        equipment_id, log_id, location, speed, fuel_level, 
        engine_status, status, updated_at
      ) VALUES (
        ${rest.equipment_id}::uuid, 
        ${rest.log_id ? BigInt(rest.log_id) : null},
        ST_GeomFromText(${`POINT(${longitude} ${latitude})`}, 4326),
        ${rest.speed}, ${rest.fuel_level}, 
        ${rest.engine_status}, ${rest.status}, NOW()
      )
      ON CONFLICT (equipment_id) DO UPDATE SET
        log_id = EXCLUDED.log_id,
        location = EXCLUDED.location,
        speed = EXCLUDED.speed,
        fuel_level = EXCLUDED.fuel_level,
        engine_status = EXCLUDED.engine_status,
        status = EXCLUDED.status,
        updated_at = NOW();
    `;
  }

  async findAll() {
    return await this.prisma.equipment_status.findMany({
      include: {
        equipments: { select: { equipment_code: true, equipment_alias: true } },
      },
    });
  }
}
