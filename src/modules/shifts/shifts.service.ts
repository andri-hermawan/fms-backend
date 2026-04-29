import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShiftsRepository } from './repositories/shifts.repository';
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftDto } from './dto/query-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly repository: ShiftsRepository) {}

  async create(dto: CreateShiftDto) {
    const existing = await this.repository.findByCode(dto.shift_code);
    if (existing) {
      throw new ConflictException(
        `Shift with code '${dto.shift_code}' already exists`,
      );
    }

    return this.repository.create({
      shift_code: dto.shift_code,
      shift_name: dto.shift_name,
      status: dto.status || 'active',
    });
  }

  async findAll(query: QueryShiftDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    // Build filter query secara dinamis
    const where: Prisma.shiftWhereInput = {};

    if (search) {
      where.OR = [
        { shift_code: { contains: search, mode: 'insensitive' } },
        { shift_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await this.repository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { created_at: 'desc' }, // Tampilkan data terbaru lebih dulu
    });

    // Standar format balikan API Enterprise dengan meta pagination
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const shift = await this.repository.findById(id);
    if (!shift) {
      throw new NotFoundException(`Shift with ID '${id}' not found`);
    }
    return shift;
  }

  async update(id: string, dto: UpdateShiftDto) {
    await this.findOne(id); // Pastikan data ada sebelum di-update

    // Jika shift_code ikut di-update, pastikan tidak bentrok dengan ID lain
    if (dto.shift_code) {
      const existing = await this.repository.findByCode(dto.shift_code);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Shift code '${dto.shift_code}' is already in use`,
        );
      }
    }

    return this.repository.update(id, {
      ...dto,
      updated_at: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Pastikan data ada sebelum dihapus
    return this.repository.delete(id);
  }
}
