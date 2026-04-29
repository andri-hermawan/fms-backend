import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AlertCategoriesRepository } from './repositories/alert-categories.repository';
import { CreateAlertCategoryDto } from './dto/create-alert-category.dto';
import { QueryAlertCategoryDto } from './dto/query-alert-category.dto';
import { UpdateAlertCategoryDto } from './dto/update-alert-category.dto';

@Injectable()
export class AlertCategoriesService {
  constructor(private readonly repository: AlertCategoriesRepository) {}

  async create(dto: CreateAlertCategoryDto) {
    const existing = await this.repository.findByCode(dto.alert_category_code);
    if (existing) {
      throw new ConflictException(
        `Alert category with code '${dto.alert_category_code}' already exists`,
      );
    }

    return this.repository.create({
      alert_category_code: dto.alert_category_code,
      alert_category_name: dto.alert_category_name,
      status: dto.status || 'active',
    });
  }

  async findAll(query: QueryAlertCategoryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    // Build filter query secara dinamis
    const where: Prisma.alert_categoriesWhereInput = {};

    if (search) {
      where.OR = [
        { alert_category_code: { contains: search, mode: 'insensitive' } },
        { alert_category_name: { contains: search, mode: 'insensitive' } },
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
    const alert_category = await this.repository.findById(id);
    if (!alert_category) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }
    return alert_category;
  }

  async update(id: string, dto: UpdateAlertCategoryDto) {
    await this.findOne(id); // Pastikan data ada sebelum di-update

    // Jika company_code ikut di-update, pastikan tidak bentrok dengan ID lain
    if (dto.alert_category_code) {
      const existing = await this.repository.findByCode(
        dto.alert_category_code,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Alert category code '${dto.alert_category_code}' is already in use`,
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
