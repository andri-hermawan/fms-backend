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

  async create(dto: CreateGeofenceDto, userId: string) {
    return await this.repository.create(dto, userId);
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
}
