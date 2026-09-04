import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class EquipmentStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateBreakdownByDateAndShift(params: {
    equipment_id: string;
    date_at: Date | string;
    shift?: string;
    breakdown: boolean;
  }) {
    const normalizedDate = this.normalizeDateToDate(params.date_at);
    if (!normalizedDate) {
      return { count: 0 };
    }

    const startOfDay = new Date(normalizedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const normalizedShift = typeof params.shift === 'string'
      ? params.shift.trim()
      : params.shift;

    return this.prisma.equipment_status.updateMany({
      where: {
        equipment_id: params.equipment_id,
        ...(normalizedShift ? { shift: normalizedShift } : {}),
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      data: {
        breakdown: params.breakdown,
        updated_at: new Date(),
      },
    });
  }

  async findByEquipmentId(equipment_id: string) {
    const result = await this.prisma.$queryRaw<any[]>`
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
        es.breakdown,
        es.gsm_signal,
        es.shift,
        ST_Y(es.location::geometry) AS latitude,
        ST_X(es.location::geometry) AS longitude,
        e.equipment_code,
        e.equipment_alias
      FROM equipment_status es
      LEFT JOIN equipments e ON e.id = es.equipment_id
      WHERE es.equipment_id = ${equipment_id}::uuid
      LIMIT 1
    `;

    return result[0] ?? null;
  }

  private normalizeDateToDate(value: Date | string): Date | null {
    if (!value) return null;

    let date: Date;
    if (value instanceof Date) {
      date = new Date(value);
    } else {
      const str = value.trim();
      // Format DD/MM/YYYY atau D/M/YYYY (dengan pemisah / - . )
      const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
      if (dmy) {
        const day = Number(dmy[1]);
        const month = Number(dmy[2]);
        const year = Number(dmy[3]);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(str);
      }
    }

    if (Number.isNaN(date.getTime())) return null;

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0,
      0,
    );
  }

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
        breakdown,
        gsm_signal,
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
        ${rest.breakdown ?? null},
        ${rest.gsm_signal ?? null},
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
          breakdown = EXCLUDED.breakdown,
          gsm_signal = EXCLUDED.gsm_signal,
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
        es.breakdown,
        es.gsm_signal,
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
