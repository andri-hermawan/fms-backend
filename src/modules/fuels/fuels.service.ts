import { Injectable, NotFoundException } from '@nestjs/common';
import { FuelsRepository } from './repositories/fuels.repository';
import { CreateFuelDto } from './dto/create-fuel.dto';
import { QueryFuelDto } from './dto/query-fuel.dto';
import { UpdateFuelDto } from './dto/update-fuel.dto';

@Injectable()
export class FuelsService {
  constructor(private readonly repository: FuelsRepository) {}

  // Helper untuk serialisasi BigInt ke String
  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async create(dto: CreateFuelDto) {
    return await this.repository.create(dto);
  }

  async findAll(query: QueryFuelDto) {
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
    const fuel = await this.repository.findById(BigInt(id));
    if (!fuel) throw new NotFoundException(`Fuel with ID '${id}' not found`);
    return this.serialize(fuel);
  }

  async update(id: string, dto: UpdateFuelDto, userId: string) {
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
