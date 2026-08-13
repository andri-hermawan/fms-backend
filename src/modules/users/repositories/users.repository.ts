import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, users } from '@prisma/client';
import { projects } from '../../../../generated/prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.usersCreateInput): Promise<users> {
    return await this.prisma.users.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.usersWhereInput;
    orderBy?: Prisma.usersOrderByWithRelationInput;
  }): Promise<[users[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.users.findMany({ skip, take, where, orderBy }),
      this.prisma.users.count({ where }),
    ]);
  }

  async findById(id: string): Promise<users | null> {
    return await this.prisma.users.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<users | null> {
    return await this.prisma.users.findUnique({ where: { email } });
  }

  async update(id: string, data: Prisma.usersUpdateInput): Promise<users> {
    return await this.prisma.users.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<users> {
    return await this.prisma.users.delete({ where: { id } });
  }

  // Sesuai standar, urusan query 'include' diisolasi di dalam repository
  async findByEmailWithProject(
    email: string,
  ): Promise<(users & { projects: projects | null }) | null> {
    return await this.prisma.users.findUnique({
      where: { email },
      include: {
        projects: true,
      },
    });
  }
}
