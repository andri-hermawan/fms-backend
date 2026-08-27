import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { geofences, Prisma } from '@prisma/client';

@Injectable()
export class GeofencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const { latitude, longitude, ...rest } = data;
    // console.log(rest);

    // Menggunakan executeRaw untuk query PostGIS (ST_GeomFromText)
    return await this.prisma.$executeRaw`
      INSERT INTO geofences (
        equipment_id,
        log_id,
        alert_category,
        event,
        is_alert,
        description,
        location,
        is_inside,
        orig_fid,
        location_category,
        segment,
        speed,
        fuel_level,
        vessel,
        mileage,
        vessel_status,
        engine_status,
        status,
        shift,
        created_at
      ) VALUES (
        ${rest.equipment_id}::uuid,
        ${rest.log_id}, 
        ${rest.alert_category},
        ${rest.event},
        ${rest.is_alert},
        ${rest.description}, 
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
        ${rest.is_inside},
        ${rest.orig_fid ? Number(rest.orig_fid) : 0},
        ${rest.location_category},
        ${rest.segment},
        ${rest.speed ? Number(rest.speed) : 0},
        ${rest.fuel_level ? Number(rest.fuel_level) : 0},
        ${rest.vessel},
        ${rest.mileage ? Number(rest.mileage) : 0},
        ${rest.vessel_status},
        ${rest.engine_status}, 
        ${rest.status || 'open'},
        ${rest.shift || null},
        COALESCE(${rest.created_at}::timestamptz, NOW())
      )
    `;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.geofencesWhereInput;
  }) {
    const { skip, take, where } = params;
    const filteredWhere: Prisma.geofencesWhereInput = {
      AND: [where ?? {}, { orig_fid: 0 }],
    };

    return await this.prisma.$transaction([
      this.prisma.geofences.count({ where: filteredWhere }),
      this.prisma.geofences.findMany({
        skip,
        take,
        where: filteredWhere,
        orderBy: { created_at: 'desc' },
        include: { equipments: { select: { equipment_code: true } } },
      }),
    ]);
  }

  async findById(id: bigint): Promise<geofences | null> {
    return await this.prisma.geofences.findUnique({
      where: { id },
      include: { equipments: { select: { equipment_code: true } } },
    });
  }

  async update(id: bigint, data: Prisma.alertsUpdateInput): Promise<geofences> {
    return await this.prisma.geofences.update({
      where: { id },
      data,
    });
  }

  async delete(id: bigint): Promise<geofences> {
    return await this.prisma.geofences.delete({
      where: { id },
    });
  }

  async getPassing(params: {
    skip?: number;
    take?: number;
    equipment_code?: string;
    segment?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<
    [
      number,
      {
        id: bigint;
        equipment_code: string;
        time: string;
        event: string;
        segment: string;
      }[],
    ]
  > {
    const {
      skip = 0,
      take = 10,
      equipment_code,
      segment,
      start_date,
      end_date,
    } = params;

    const conditions: Prisma.Sql[] = [Prisma.sql`g.orig_fid = 0`];

    if (equipment_code) {
      conditions.push(
        Prisma.sql`e.equipment_code ILIKE ${'%' + equipment_code + '%'}`,
      );
    }

    if (segment) {
      conditions.push(
        Prisma.sql`g.segment = ${decodeURIComponent(segment).trim()}`,
      );
    }

    if (start_date) {
      conditions.push(Prisma.sql`g.created_at >= ${start_date}`);
    }

    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);

      conditions.push(Prisma.sql`g.created_at <= ${end}`);
    }

    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const total = await this.prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM geofences g
    LEFT JOIN equipments e
      ON e.id = g.equipment_id
    ${where}
  `;

    const data = await this.prisma.$queryRaw<
      {
        id: bigint;
        equipment_code: string;
        time: string;
        event: string;
        segment: string;
      }[]
    >`
    SELECT
      g.id,
      e.equipment_code,
      TO_CHAR(g.created_at, 'HH24:MI') AS time,
      g.event,
      g.segment
    FROM geofences g
    LEFT JOIN equipments e
      ON e.id = g.equipment_id

    ${where}

    ORDER BY g.created_at Desc

    OFFSET ${skip}
    LIMIT ${take}
  `;

    return [Number(total[0]?.total ?? 0), data];
  }

  async getPassingSummary(params: {
    equipment_code?: string;
    segment?: string;
    start_date?: Date;
    end_date?: Date;
  }) {
    const { equipment_code, segment, start_date, end_date } = params;

    const conditions: Prisma.Sql[] = [Prisma.sql`g.orig_fid = 0`];

    if (equipment_code) {
      conditions.push(
        Prisma.sql`e.equipment_code ILIKE ${'%' + equipment_code + '%'}`,
      );
    }

    if (segment) {
      conditions.push(
        Prisma.sql`g.segment = ${decodeURIComponent(segment).trim()}`,
      );
    }

    if (start_date) {
      conditions.push(Prisma.sql`g.created_at >= ${start_date}`);
    }

    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);

      conditions.push(Prisma.sql`g.created_at <= ${end}`);
    }

    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    return await this.prisma.$queryRaw<
      {
        hour: string;
        in: bigint;
        out: bigint;
        total: bigint;
      }[]
    >`
      SELECT
        TO_CHAR(
          DATE_TRUNC('hour', g.created_at),
          'HH24:00'
        ) AS hour,

        COUNT(*) FILTER (
          WHERE g.event = 'IN'
        ) AS "in",

        COUNT(*) FILTER (
          WHERE g.event = 'OUT'
        ) AS "out",

        COUNT(*) AS total

      FROM geofences g
      LEFT JOIN equipments e
        ON e.id = g.equipment_id

      ${where}

      GROUP BY DATE_TRUNC('hour', g.created_at)

      ORDER BY DATE_TRUNC('hour', g.created_at);
    `;
  }
}
