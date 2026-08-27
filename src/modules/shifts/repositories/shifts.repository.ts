import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, shifts } from '@prisma/client';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.shiftsUncheckedCreateInput): Promise<shifts> {
    return await this.prisma.shifts.create({ data });
  }

  // Menggunakan $transaction untuk mengeksekusi query data dan total count secara paralel
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.shiftsWhereInput;
    orderBy?: Prisma.shiftsOrderByWithRelationInput;
  }): Promise<[shifts[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.shifts.findMany({ skip, take, where, orderBy }),
      this.prisma.shifts.count({ where }),
    ]);
  }

  async findById(id: string): Promise<shifts | null> {
    return await this.prisma.shifts.findUnique({ where: { id } });
  }

  async findByCode(shift_code: string): Promise<shifts | null> {
    return await this.prisma.shifts.findUnique({ where: { shift_code } });
  }

  async findByName(shift_name: string): Promise<shifts[]> {
    return await this.prisma.shifts.findMany({
      where: {
        shift_name: { equals: shift_name, mode: 'insensitive' },
      },
      orderBy: { sequence: 'asc' },
    });
  }

  async update(
    id: string,
    data: Prisma.shiftsUncheckedUpdateInput,
  ): Promise<shifts> {
    return await this.prisma.shifts.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<shifts> {
    return await this.prisma.shifts.delete({ where: { id } });
  }

  async findCurrentByProject(project_id: string, now: Date) {
    return this.prisma.shifts.findMany({
      where: { project_id, status: 'active' },
      orderBy: { sequence: 'asc' },
    });
  }
}
