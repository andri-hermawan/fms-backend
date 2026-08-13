import { Injectable, NotFoundException } from '@nestjs/common';
import { GeofencesRepository } from './repositories/geofences.repository';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { QueryGeofenceDto } from './dto/query-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';

@Injectable()
export class GeofencesService {
  constructor(private readonly repository: GeofencesRepository) {}

  // Helper untuk serialisasi BigInt ke String
  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async create(dto: CreateGeofenceDto) {
    return await this.repository.create(dto);
  }

  async findAll(query: QueryGeofenceDto) {
    const { page = 1, limit = 10, equipment_id, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (equipment_id) where.equipment_id = equipment_id;
    if (status) where.status = status;

    const [total, data] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
    });

    return {
      data: this.serialize(data),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string) {
    const geofence = await this.repository.findById(BigInt(id));
    if (!geofence)
      throw new NotFoundException(`Geofence with ID '${id}' not found`);
    return this.serialize(geofence);
  }

  async update(id: string, dto: UpdateGeofenceDto, userId: string) {
    await this.findOne(id); // Validasi keberadaan data
    const result = await this.repository.update(BigInt(id), {
      ...dto,
      updated_by: userId,
      updated_at: new Date(),
    });
    return this.serialize(result);
  }

  async remove(id: string) {
    await this.findOne(id); // Validasi keberadaan data
    return await this.repository.delete(BigInt(id));
  }

  async getPassing(query: QueryGeofenceDto) {
    const {
      page = 1,
      limit = 10,
      equipment_code,
      segment,
      start_date,
      end_date,
    } = query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const [total, rows] = await this.repository.getPassing({
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      equipment_code,
      segment,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
    });

    return {
      data: rows.map((item) => ({
        id: Number(item.id),
        equipment_code: item.equipment_code,
        time: item.time,
        event: item.event,
      })),
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }

  async getPassingSummary(query: QueryGeofenceDto) {
    const { equipment_code, segment, start_date, end_date } = query;

    const rows = await this.repository.getPassingSummary({
      equipment_code,
      segment,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
    });

    return rows.map((item) => ({
      hour: item.hour,
      in: Number(item.in),
      out: Number(item.out),
      total: Number(item.total),
    }));
  }
}
