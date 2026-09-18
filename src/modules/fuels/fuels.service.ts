import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FuelsRepository } from './repositories/fuels.repository';
import { CreateFuelDto } from './dto/create-fuel.dto';
import { QueryFuelDto } from './dto/query-fuel.dto';
import { UpdateFuelDto } from './dto/update-fuel.dto';
import { QueryFuelFilterDto } from './dto/query-fuel-filter.dto';

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

  async findByFilter(query: QueryFuelFilterDto) {
    const {
      page = 1,
      limit = 10,
      start_date,
      end_date,
      equipment_code,
      shift,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.fuelsWhereInput = {};

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at.gte = new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(start_date)
            ? `${start_date}T00:00:00.000+07:00`
            : start_date,
        );
      }
      if (end_date) {
        where.created_at.lte = new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(end_date)
            ? `${end_date}T23:59:59.999+07:00`
            : end_date,
        );
      }
    }

    if (equipment_code) {
      where.equipments = { equipment_code };
    }

    if (shift) {
      where.shift = shift;
    }

    const [total, data] = await this.repository.findByFilter({
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
