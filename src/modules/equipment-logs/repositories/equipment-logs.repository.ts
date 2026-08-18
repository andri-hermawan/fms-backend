import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma } from '@prisma/client';
import { equipment_logs } from '../../../../generated/prisma/client';

@Injectable()
export class EquipmentLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any): Promise<equipment_logs> {
    const { latitude, longitude, ...rest } = data;

    const result = await this.prisma.$queryRaw<equipment_logs[]>`
      INSERT INTO equipment_logs (
        time,
        equipment_id,
        device_id,
        location,
        altitude,
        heading,
        satellites,
        speed,
        category_location,
        segment,
        is_inside,
        orig_fid,
        accelerometer_x,
        accelerometer_y,
        accelerometer_z,
        odometer,
        engine_status,
        external_voltage,
        internal_battery_voltage,
        battery_current,
        gsm_signal,
        gsm_operator,
        pdop,
        hdop,
        gnss_status,
        fuel_level,
        fuel_volume,
        fuel_percentage,
        fuel_difference,
        fuel_temperature,
        sleep_mode,
        movement_runtime,
        analog_input_1,
        mileage,
        vessel,
        vessel_status,
        status,
        shift,
        created_at
      ) VALUES (
        ${rest.time}::timestamp,
        ${rest.equipment_id}::uuid,
        ${rest.device_id}::uuid,
        ST_GeomFromText(${`POINT(${longitude} ${latitude})`}, 4326),
        ${rest.altitude},
        ${rest.heading},
        ${rest.satellites},
        ${rest.speed},
        ${rest.category_location},
        ${rest.segment},
        ${rest.is_inside},
        ${rest.orig_fid},
        ${rest.accelerometer_x},
        ${rest.accelerometer_y},
        ${rest.accelerometer_z},
        ${rest.odometer},
        ${rest.engine_status},
        ${rest.external_voltage},
        ${rest.internal_battery_voltage},
        ${rest.battery_current},
        ${rest.gsm_signal},
        ${rest.gsm_operator},
        ${rest.pdop},
        ${rest.hdop},
        ${rest.gnss_status},
        ${rest.fuel_level},
        ${rest.fuel_volume !== undefined ? rest.fuel_volume : null},
        ${rest.fuel_percentage !== undefined ? rest.fuel_percentage : null},
        ${rest.fuel_difference !== undefined ? rest.fuel_difference : null},
        ${rest.fuel_temperature},
        ${rest.sleep_mode},
        ${rest.movement_runtime},
        ${rest.analog_input_1},
        ${rest.mileage},
        ${rest.vessel},
        ${rest.vessel_status},
        ${rest.status},
        ${rest.shift || null},
        NOW()
      )
      RETURNING
      id,
      time,
      equipment_id,
      device_id,
      ST_AsGeoJSON(location) AS location,
      ST_X(location) AS longitude,
      ST_Y(location) AS latitude,
      altitude,
      heading,
      satellites,
      speed,
      category_location,
      segment,
      is_inside,
      orig_fid,
      accelerometer_x,
      accelerometer_y,
      accelerometer_z,
      odometer,
      engine_status,
      external_voltage,
      internal_battery_voltage,
      battery_current,
      gsm_signal,
      gsm_operator,
      pdop,
      hdop,
      gnss_status,
      fuel_level,
      fuel_volume,
      fuel_percentage,
      fuel_difference,
      fuel_temperature,
      sleep_mode,
      movement_runtime,
      analog_input_1,
      mileage,
      vessel,
      vessel_status,
      status,
      shift,
      created_at;
    `;

    return result[0];
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

  // const lastLog = await this.repository.findByIdLastEquip(dto.equipment_id!);
  async findByIdLastEquip(equipment_id: string) {
    return await this.prisma.equipment_logs.findFirst({
      where: {
        equipment_id,
      },
      include: {
        equipments: true,
        devices: true,
      },
      orderBy: {
        time: 'desc',
      },
    });
  }

  async findStoppedOutsideStart(equipment_id: string) {
    const result = await this.prisma.$queryRaw<{ created_at: Date }[]>`
      SELECT created_at
      FROM equipment_logs
      WHERE equipment_id = ${equipment_id}::uuid
        AND is_inside = false
        AND COALESCE(speed, 0) = 0
        AND id > COALESCE(
          (
            SELECT MAX(id)
            FROM equipment_logs
            WHERE equipment_id = ${equipment_id}::uuid
              AND (
                is_inside IS DISTINCT FROM false
                OR COALESCE(speed, 0) <> 0
              )
          ),
          0
        )
      ORDER BY id ASC
      LIMIT 1;
    `;

    return result[0] ?? null;
  }

  async findUnderSpeedStart(equipment_id: string) {
    const result = await this.prisma.$queryRaw<{ created_at: Date }[]>`
      SELECT created_at
      FROM equipment_logs
      WHERE equipment_id = ${equipment_id}::uuid
        AND COALESCE(speed, 0) > 0
        AND COALESCE(speed, 0) < 10
        AND id > COALESCE(
          (
            SELECT MAX(id)
            FROM equipment_logs
            WHERE equipment_id = ${equipment_id}::uuid
              AND (
                COALESCE(speed, 0) <= 0
                OR COALESCE(speed, 0) >= 10
              )
          ),
          0
        )
      ORDER BY id ASC
      LIMIT 1;
    `;

    return result[0] ?? null;
  }

  async findFuelDecreaseStart(
    equipment_id: string,
    current_fuel_level: number,
  ) {
    const result = await this.prisma.$queryRaw<
      { created_at: Date; fuel_level: number }[]
    >`
      SELECT created_at, fuel_level
      FROM equipment_logs
      WHERE equipment_id = ${equipment_id}::uuid
        AND fuel_level IS NOT NULL
        AND fuel_level < ${current_fuel_level}
        AND id > COALESCE(
          (
            SELECT MAX(id)
            FROM equipment_logs
            WHERE equipment_id = ${equipment_id}::uuid
              AND fuel_level >= ${current_fuel_level}
          ),
          0
        )
      ORDER BY id ASC
      LIMIT 1;
    `;

    return result[0] ?? null;
  }

  async findOne(params: Prisma.equipment_logsFindFirstArgs) {
    return await this.prisma.equipment_logs.findFirst(params);
  }

  async getActivitySummary(
    equipmentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const result = await this.prisma.$queryRaw<any[]>`
      WITH time_diffs AS (
        SELECT 
          status,
          speed,
          mileage,
          fuel_volume,
          fuel_percentage,
          created_at,
          LEAD(created_at) OVER (ORDER BY created_at) as next_time,
          EXTRACT(EPOCH FROM (LEAD(created_at) OVER (ORDER BY created_at) - created_at)) / 3600 as duration_hours
        FROM equipment_logs
        WHERE equipment_id = ${equipmentId}::uuid
          AND created_at BETWEEN ${startDate} AND ${endDate}
        ORDER BY created_at
      ),
      status_durations AS (
        SELECT 
          SUM(duration_hours) FILTER (WHERE status = 'RUNNING') as running_hours,
          SUM(duration_hours) FILTER (WHERE status = 'IDLE') as idling_hours
        FROM time_diffs
        WHERE next_time IS NOT NULL
      ),
      speed_stats AS (
        SELECT 
          AVG(speed) as avg_running_speed,
          MAX(speed) as max_speed
        FROM time_diffs
        WHERE status = 'RUNNING' AND speed > 0
      ),
      mileage_stats AS (
        SELECT 
          MAX(mileage) - MIN(mileage) as total_mileage
        FROM time_diffs
        WHERE mileage IS NOT NULL
      ),
      fuel_stats AS (
        SELECT 
          SUM(ABS(fuel_difference)) as total_fuel_decrease
        FROM fuels
        WHERE equipment_id = ${equipmentId}::uuid
          AND created_at BETWEEN ${startDate} AND ${endDate}
          AND event_type = 'FUEL DECREASE'
      ),
      last_fuel AS (
        SELECT 
          fuel_volume,
          fuel_percentage
        FROM equipment_logs
        WHERE equipment_id = ${equipmentId}::uuid
          AND created_at <= ${endDate}
          AND fuel_volume IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      )
      SELECT 
        COALESCE((SELECT running_hours FROM status_durations), 0) as running_time,
        COALESCE((SELECT idling_hours FROM status_durations), 0) as idling_time,
        COALESCE((SELECT total_mileage FROM mileage_stats), 0) as mileage,
        COALESCE((SELECT avg_running_speed FROM speed_stats), 0) as avg_running_speed,
        COALESCE((SELECT max_speed FROM speed_stats), 0) as max_running_speed,
        COALESCE((SELECT total_fuel_decrease FROM fuel_stats), 0) as fuel_decrease,
        COALESCE((SELECT fuel_volume FROM last_fuel), 0) as fuel_remaining,
        COALESCE((SELECT fuel_percentage FROM last_fuel), 0) as fuel_remaining_percentage
    `;

    return (
      result[0] || {
        running_time: 0,
        idling_time: 0,
        mileage: 0,
        avg_running_speed: 0,
        max_running_speed: 0,
        fuel_decrease: 0,
        fuel_remaining: 0,
        fuel_remaining_percentage: 0,
      }
    );
  }

  async findByDateShift(params: {
    created_at?: string;
    equipment_code?: string;
    shift?: string;
  }) {
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.created_at) {
      const start = new Date(`${params.created_at}T00:00:00.000+07:00`);
      const end = new Date(`${params.created_at}T23:59:59.999+07:00`);
      conditions.push(
        `el.created_at >= $${values.length + 1}::timestamptz AND el.created_at <= $${values.length + 2}::timestamptz`,
      );
      values.push(start, end);
    }
    if (params.shift) {
      conditions.push(`el.shift = $${values.length + 1}`);
      values.push(params.shift);
    }
    if (params.equipment_code) {
      conditions.push(`eq.equipment_code = $${values.length + 1}`);
      values.push(params.equipment_code);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        el.id,
        el.time,
        el.equipment_id,
        el.device_id,
        ST_X(el.location) AS longitude,
        ST_Y(el.location) AS latitude,
        el.altitude,
        el.heading,
        el.satellites,
        el.speed,
        el.category_location,
        el.segment,
        el.is_inside,
        el.orig_fid,
        el.accelerometer_x,
        el.accelerometer_y,
        el.accelerometer_z,
        el.odometer,
        el.engine_status,
        el.external_voltage,
        el.internal_battery_voltage,
        el.battery_current,
        el.gsm_signal,
        el.gsm_operator,
        el.pdop,
        el.hdop,
        el.gnss_status,
        el.fuel_level,
        el.fuel_volume,
        el.fuel_percentage,
        el.fuel_difference,
        el.fuel_temperature,
        el.sleep_mode,
        el.movement_runtime,
        el.analog_input_1,
        el.mileage,
        el.vessel,
        el.vessel_status,
        el.status,
        el.shift,
        el.created_at,
        eq.equipment_code,
        dv.device_code,
        COALESCE(json_agg(
          json_build_object('status', al.status)
        ) FILTER (WHERE al.id IS NOT NULL), '[]') AS alerts
      FROM equipment_logs el
      LEFT JOIN equipments eq ON el.equipment_id = eq.id
      LEFT JOIN devices dv ON el.device_id = dv.id
      LEFT JOIN alerts al ON el.id = al.log_id
      ${whereClause}
      GROUP BY el.id, eq.equipment_code, dv.device_code
      ORDER BY el.created_at ASC
    `;

    return this.prisma.$queryRawUnsafe(query, ...values);
  }
}
