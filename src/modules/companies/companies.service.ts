import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CompaniesRepository } from './repositories/companies.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private readonly repository: CompaniesRepository) {}

  async create(dto: CreateCompanyDto) {
    // Validasi duplikasi Company Code
    const existing = await this.repository.findByCode(dto.company_code);
    if (existing) {
      throw new ConflictException(
        `Company with code '${dto.company_code}' already exists`,
      );
    }

    return this.repository.create({
      company_code: dto.company_code,
      company_name: dto.company_name,
      status: dto.status || 'active',
    });
  }

  async findAll(query: QueryCompanyDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    // Build filter query secara dinamis
    const where: Prisma.companiesWhereInput = {};

    if (search) {
      where.OR = [
        { company_code: { contains: search, mode: 'insensitive' } },
        { company_name: { contains: search, mode: 'insensitive' } },
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
    const company = await this.repository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id); // Pastikan data ada sebelum di-update

    // Jika company_code ikut di-update, pastikan tidak bentrok dengan ID lain
    if (dto.company_code) {
      const existing = await this.repository.findByCode(dto.company_code);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Company code '${dto.company_code}' is already in use`,
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
