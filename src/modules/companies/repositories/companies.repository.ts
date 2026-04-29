import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, companies } from '@prisma/client';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.companiesCreateInput): Promise<companies> {
    return await this.prisma.companies.create({ data });
  }

  // Menggunakan $transaction untuk mengeksekusi query data dan total count secara paralel
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.companiesWhereInput;
    orderBy?: Prisma.companiesOrderByWithRelationInput;
  }): Promise<[companies[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.companies.findMany({ skip, take, where, orderBy }),
      this.prisma.companies.count({ where }),
    ]);
  }

  async findById(id: string): Promise<companies | null> {
    return await this.prisma.companies.findUnique({ where: { id } });
  }

  async findByCode(company_code: string): Promise<companies | null> {
    return await this.prisma.companies.findUnique({ where: { company_code } });
  }

  async update(
    id: string,
    data: Prisma.companiesUpdateInput,
  ): Promise<companies> {
    return await this.prisma.companies.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<companies> {
    return await this.prisma.companies.delete({ where: { id } });
  }
}
