import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, shift } from '@prisma/client';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.shiftCreateInput): Promise<shift> {
    return await this.prisma.shift.create({ data });
  }

  // Menggunakan $transaction untuk mengeksekusi query data dan total count secara paralel
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.shiftWhereInput;
    orderBy?: Prisma.shiftOrderByWithRelationInput;
  }): Promise<[shift[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.shift.findMany({ skip, take, where, orderBy }),
      this.prisma.shift.count({ where }),
    ]);
  }

  async findById(id: string): Promise<shift | null> {
    return await this.prisma.shift.findUnique({ where: { id } });
  }

  async findByCode(shift_code: string): Promise<shift | null> {
    return await this.prisma.shift.findUnique({ where: { shift_code } });
  }

  async update(id: string, data: Prisma.shiftUpdateInput): Promise<shift> {
    return await this.prisma.shift.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<shift> {
    return await this.prisma.shift.delete({ where: { id } });
  }
}
