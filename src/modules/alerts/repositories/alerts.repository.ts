import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { alerts, Prisma } from '@prisma/client';

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const { latitude, longitude, ...rest } = data;
    return await this.prisma.$executeRaw`
      INSERT INTO alerts (
        equipment_id, alert_category_id,log_id, 
        location, is_inside,orig_fid, location_category,
        segment, speed, fuel_level, fuel_volume, fuel_percentage,
        fuel_difference, fuel_temperature,
        vessel, mileage, vessel_status, engine_status, 
        status, shift, is_read, created_at, resolved_at
      ) VALUES (
        ${rest.equipment_id}::uuid, ${rest.alert_category_id}::uuid,${rest.log_id},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
        ${rest.is_inside}, ${rest.orig_fid}, ${rest.location_category},
        ${rest.segment}, ${rest.speed}, ${rest.fuel_level},
        ${rest.fuel_volume}, ${rest.fuel_percentage},
        ${rest.fuel_difference}, ${rest.fuel_temperature},
        ${rest.vessel}, ${rest.mileage}, ${rest.vessel_status}, ${rest.engine_status},
        ${rest.status}, ${rest.shift || null}, ${rest.is_read ?? false},
        COALESCE(${rest.created_at}::timestamptz, NOW()),
        ${rest.resolved_at ?? null}::timestamptz
      )
    `;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.alertsWhereInput;
  }) {
    const { skip, take, where } = params;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.alerts.count({ where }),
      this.prisma.alerts.findMany({
        skip,
        take,
        where,
        orderBy: { created_at: 'desc' },
        include: {
          equipments: { select: { equipment_code: true } },
          alert_categories: { select: { alert_category_name: true } },
        },
      }),
    ]);

    // Ekstrak latitude & longitude dari kolom geometry (PostGIS)
    const ids = rows.map((r) => r.id);
    const coords: {
      id: bigint;
      latitude: number | null;
      longitude: number | null;
    }[] =
      ids.length > 0
        ? await this.prisma.$queryRaw`
            SELECT id, ST_Y(location) AS latitude, ST_X(location) AS longitude
            FROM alerts
            WHERE id IN (${Prisma.join(ids)})
          `
        : [];

    const coordMap = new Map(
      coords.map((c) => [
        c.id,
        { latitude: c.latitude, longitude: c.longitude },
      ]),
    );

    const data = rows.map((row) => ({
      ...row,
      ...(coordMap.get(row.id) ?? { latitude: null, longitude: null }),
    }));

    return [total, data];
  }

  async findAlertSummary(params: {
    search?: string;
    created_at_start?: Date;
    created_at_end?: Date;
    alert_category_id?: string;
    shift?: string;
  }) {
    const {
      search,
      created_at_start,
      created_at_end,
      alert_category_id,
      shift,
    } = params;

    const conditions: Prisma.Sql[] = [];

    if (search) {
      conditions.push(Prisma.sql`e.equipment_code ILIKE ${'%' + search + '%'}`);
    }

    if (alert_category_id) {
      conditions.push(
        Prisma.sql`a.alert_category_id = ${alert_category_id}::uuid`,
      );
    }

    if (shift) {
      conditions.push(Prisma.sql`a.shift = ${shift}`);
    }

    if (created_at_start && created_at_end) {
      const start = new Date(created_at_start);
      start.setHours(0, 0, 0, 0);

      const end = new Date(created_at_end);
      end.setHours(23, 59, 59, 999);

      conditions.push(Prisma.sql`a.created_at BETWEEN ${start} AND ${end}`);
    } else if (created_at_start) {
      conditions.push(Prisma.sql`a.created_at >= ${created_at_start}`);
    } else if (created_at_end) {
      const end = new Date(created_at_end);
      end.setHours(23, 59, 59, 999);

      conditions.push(Prisma.sql`a.created_at <= ${end}`);
    }

    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    return await this.prisma.$queryRaw<
      {
        alert_category_name: string;
        equipment_code: string;
        alert_count: bigint;
        duration: string;
      }[]
    >`
    SELECT
      f.alert_category_name,
      e.equipment_code,
      COUNT(a.id)::bigint AS alert_count,
      TO_CHAR(
        SUM(a.resolved_at - a.created_at),
        'MI:SS'
      ) AS duration
    FROM alerts a
    LEFT JOIN equipments e
      ON e.id = a.equipment_id
    LEFT JOIN alert_categories f
      ON f.id = a.alert_category_id

    ${where}

    GROUP BY
      f.alert_category_name,
      e.equipment_code

    ORDER BY
      e.equipment_code
  `;
  }

  async findSummaryByDateShift(params: {
    date: string;
    shift: string;
  }): Promise<
    {
      title: string;
      vessel_status: string;
      events: bigint;
      dt: bigint;
    }[]
  > {
    const { date, shift } = params;

    return await this.prisma.$queryRaw`
      SELECT
        f.alert_category_name AS title,
        COALESCE(NULLIF(LOWER(a.vessel_status), ''), 'unknown') AS vessel_status,
        COUNT(a.id)::bigint AS events,
        COUNT(DISTINCT a.equipment_id)::bigint AS dt
      FROM alerts a
      LEFT JOIN alert_categories f
        ON f.id = a.alert_category_id
      WHERE a.created_at::date = ${date}::date
        AND a.shift = ${shift}
      GROUP BY
        f.alert_category_name,
        COALESCE(NULLIF(LOWER(a.vessel_status), ''), 'unknown')
      ORDER BY
        f.alert_category_name,
        COALESCE(NULLIF(LOWER(a.vessel_status), ''), 'unknown')
    `;
  }

  async findShiftStartHour(shift: string): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ start_hour: number }[]>`
      SELECT EXTRACT(HOUR FROM start_time)::int AS start_hour
      FROM shifts
      WHERE LOWER(shift_name) = LOWER(${shift})
      ORDER BY sequence
      LIMIT 1
    `;
    return rows.length > 0 ? Number(rows[0].start_hour) : null;
  }

  async findAbnormalHourly(params: { date: string; shift: string }): Promise<
    {
      category: string;
      hour: number;
      events: bigint;
      equipment_count: bigint;
    }[]
  > {
    const { date, shift } = params;

    return await this.prisma.$queryRaw`
      SELECT
        CASE
          WHEN f.alert_category_name ILIKE 'fuel decrease%' THEN 'Fuel Decrease'
          ELSE f.alert_category_name
        END AS category,
        EXTRACT(HOUR FROM a.created_at)::int AS hour,
        COUNT(a.id)::bigint AS events,
        COUNT(DISTINCT a.equipment_id)::bigint AS equipment_count
      FROM alerts a
      LEFT JOIN alert_categories f
        ON f.id = a.alert_category_id
      WHERE a.created_at::date = ${date}::date
        AND a.shift = ${shift}
        AND f.alert_category_name IS NOT NULL
      GROUP BY 1, 2
    `;
  }

  async findAbnormalBySegment(params: { date: string; shift: string }): Promise<
    {
      segment: string;
      category: string;
      events: bigint;
    }[]
  > {
    const { date, shift } = params;

    return await this.prisma.$queryRaw`
      SELECT
        COALESCE(NULLIF(TRIM(a.segment), ''), 'Unknown') AS segment,
        CASE
          WHEN f.alert_category_name ILIKE 'fuel decrease%' THEN 'Fuel Decrease'
          ELSE f.alert_category_name
        END AS category,
        COUNT(a.id)::bigint AS events
      FROM alerts a
      LEFT JOIN alert_categories f
        ON f.id = a.alert_category_id
      WHERE a.created_at::date = ${date}::date
        AND a.shift = ${shift}
        AND f.alert_category_name IS NOT NULL
      GROUP BY 1, 2
    `;
  }

  async findAttributeGeoSegments(): Promise<{ segment: string }[]> {
    return await this.prisma.$queryRaw`
      SELECT DISTINCT segment
      FROM attribute_geo
      WHERE segment IS NOT NULL
        AND TRIM(segment) <> ''
      ORDER BY segment
    `;
  }

  async findById(id: bigint): Promise<alerts | null> {
    return await this.prisma.alerts.findUnique({
      where: { id },
      include: {
        equipments: { select: { equipment_code: true } },
        alert_categories: { select: { alert_category_name: true } },
      },
    });
  }

  async update(id: bigint, data: Prisma.alertsUpdateInput): Promise<alerts> {
    return await this.prisma.alerts.update({
      where: { id },
      data,
    });
  }

  async markAsRead(id: bigint) {
    await this.prisma.$executeRaw`
      UPDATE alerts
      SET is_read = true,
          updated_at = NOW()
      WHERE id = ${id}
    `;
    return await this.prisma.alerts.findUnique({
      where: { id },
      include: {
        equipments: { select: { equipment_code: true } },
        alert_categories: { select: { alert_category_name: true } },
      },
    });
  }

  async delete(id: bigint): Promise<alerts> {
    return await this.prisma.alerts.delete({
      where: { id },
    });
  }

  async count(params: Prisma.alertsCountArgs): Promise<number> {
    return await this.prisma.alerts.count(params);
  }

  async findOne(params: Prisma.alertsFindFirstArgs) {
    return await this.prisma.alerts.findFirst(params);
  }

  async updateMany(
    where: Prisma.alertsWhereInput,
    data: Prisma.alertsUpdateManyMutationInput,
  ) {
    return await this.prisma.alerts.updateMany({
      where,
      data,
    });
  }

  async resolveActive(
    equipmentId: string,
    alertCategoryId: string,
    resolvedAt?: Date,
  ) {
    const resolvedTime = resolvedAt ?? new Date();
    return await this.prisma.$executeRaw`
      UPDATE alerts
      SET resolved_at = ${resolvedTime}::timestamptz,
          updated_at = ${resolvedTime}::timestamptz
      WHERE equipment_id = ${equipmentId}::uuid
        AND alert_category_id = ${alertCategoryId}::uuid
        AND resolved_at IS NULL;
    `;
  }
}
