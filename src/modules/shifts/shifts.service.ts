import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
      project_id: dto.project_id,
      start_time: this.toTime(dto.start_time),
      end_time: this.toTime(dto.end_time),
      sequence: dto.sequence,
      timezone: dto.timezone || 'Asia/Jakarta',
    });
  }

  async findAll(query: QueryShiftDto) {
    const { page = 1, limit = 10, search, status, project_id } = query;
    const skip = (page - 1) * limit;

    // Build filter query secara dinamis
    const where: any = {};

    if (search) {
      where.OR = [
        { shift_code: { contains: search, mode: 'insensitive' } },
        { shift_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }
    if (project_id) where.project_id = project_id;

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
      shift_code: dto.shift_code,
      shift_name: dto.shift_name,
      project_id: dto.project_id,
      status: dto.status,
      sequence: dto.sequence,
      timezone: dto.timezone,
      start_time: dto.start_time ? this.toTime(dto.start_time) : undefined,
      end_time: dto.end_time ? this.toTime(dto.end_time) : undefined,
      updated_at: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Pastikan data ada sebelum dihapus
    return this.repository.delete(id);
  }

  async findCurrentByProject(projectId: string, currentTime?: string) {
    const checkedAt = currentTime ? this.parseTime(currentTime) : new Date();
    const shifts = await this.repository.findCurrentByProject(
      projectId,
      checkedAt,
    );
    const currentMinutes = checkedAt.getHours() * 60 + checkedAt.getMinutes();
    const current = shifts.find((shift) => {
      if (!shift.start_time || !shift.end_time) return false;
      // start_time/end_time dibaca dari DB sebagai Date bertipe Time (UTC),
      // gunakan getUTC* agar kembali ke jam "wall-clock" yang tersimpan.
      const start =
        shift.start_time.getUTCHours() * 60 + shift.start_time.getUTCMinutes();
      const end =
        shift.end_time.getUTCHours() * 60 + shift.end_time.getUTCMinutes();
      return start <= end
        ? currentMinutes >= start && currentMinutes < end
        : currentMinutes >= start || currentMinutes < end;
    });
    return {
      project_id: projectId,
      checked_time: currentTime ?? checkedAt.toTimeString().slice(0, 5),
      shift: current ?? null,
    };
  }

  private toTime(value: string): Date {
    const [hours, minutes, seconds = 0] = value.split(':').map(Number);
    const result = new Date(1970, 0, 1, hours, minutes, seconds, 0);
    return result;
  }

  private parseTime(value: string): Date {
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) {
      throw new ConflictException('Format time harus HH:mm atau HH:mm:ss');
    }
    return this.toTime(value);
  }
}
