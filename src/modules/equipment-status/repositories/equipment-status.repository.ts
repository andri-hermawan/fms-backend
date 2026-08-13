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
        equipment_id,
        log_id,
        location,
        is_inside,
        orig_fid,
        location_category,
        segment,
        speed,
        fuel_level,
        fuel_temperature,
        fuel_volume,
        fuel_percentage,
        fuel_difference,
        alert_count,
        vessel,
        mileage,
        vessel_status,
        engine_status,
        status,
        shift,
        updated_at
      ) VALUES (
        ${rest.equipment_id}::uuid, 
        ${rest.log_id ? BigInt(rest.log_id) : null},
        ST_GeomFromText(${`POINT(${longitude} ${latitude})`}, 4326),
        ${rest.is_inside},
        ${rest.orig_fid},
        ${rest.location_category},
        ${rest.segment},
        ${rest.speed},
        ${rest.fuel_level},
        ${rest.fuel_temperature},
        ${rest.fuel_volume},
        ${rest.fuel_percentage},
        ${rest.fuel_difference},
        ${rest.alert_count},
        ${rest.vessel},
        ${rest.mileage},
        ${rest.vessel_status},
        ${rest.engine_status},
        ${rest.status},
        ${rest.shift || null},
        NOW()
      )
        ON CONFLICT (equipment_id) DO UPDATE SET
          log_id = EXCLUDED.log_id,
          location = EXCLUDED.location,
          is_inside = EXCLUDED.is_inside,
          orig_fid = EXCLUDED.orig_fid,
          location_category = EXCLUDED.location_category,
          segment = EXCLUDED.segment,
          speed = EXCLUDED.speed,
          fuel_level = EXCLUDED.fuel_level,
          fuel_temperature = EXCLUDED.fuel_temperature,
          fuel_volume = EXCLUDED.fuel_volume,
          fuel_percentage = EXCLUDED.fuel_percentage,
          fuel_difference = EXCLUDED.fuel_difference,
          alert_count = EXCLUDED.alert_count,
          vessel = EXCLUDED.vessel,
          mileage = EXCLUDED.mileage,
          vessel_status = EXCLUDED.vessel_status,
          engine_status = EXCLUDED.engine_status,
          status = EXCLUDED.status,
          shift = EXCLUDED.shift,
          updated_at = NOW();
      `;
  }

  async incrementAlertCount(equipment_id: string, amount: number) {
    return this.prisma.$executeRaw`
      UPDATE equipment_status
      SET alert_count = GREATEST(COALESCE(alert_count, 0) + ${amount}, 0),
          updated_at = NOW()
      WHERE equipment_id = ${equipment_id}::uuid;
    `;
  }

  async findAll() {
    return this.prisma.$queryRaw`
      SELECT
        es.equipment_id,
        es.log_id,
        es.speed,
        es.fuel_level,
        es.fuel_temperature,
        es.fuel_volume,
        es.fuel_percentage,
        es.fuel_difference,
        es.alert_count,
        es.engine_status,
        es.status,
        es.updated_at,
        es.is_inside,
        es.location_category,
        es.segment,
        es.vessel,
        es.mileage,
        es.vessel_status,
        es.status,
        es.engine_status,
        ST_Y(es.location::geometry) AS latitude,
        ST_X(es.location::geometry) AS longitude,

        e.equipment_code,
        e.equipment_alias

      FROM equipment_status es
      LEFT JOIN equipments e
        ON e.id = es.equipment_id
    `;
  }
}
