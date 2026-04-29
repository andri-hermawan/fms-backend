import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, alert_categories } from '@prisma/client';

@Injectable()
export class AlertCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.alert_categoriesCreateInput,
  ): Promise<alert_categories> {
    return await this.prisma.alert_categories.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.alert_categoriesWhereInput;
    orderBy?: Prisma.alert_categoriesOrderByWithRelationInput;
  }): Promise<[alert_categories[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.alert_categories.findMany({ skip, take, where, orderBy }),
      this.prisma.alert_categories.count({ where }),
    ]);
  }

  async findById(id: string): Promise<alert_categories | null> {
    return await this.prisma.alert_categories.findUnique({ where: { id } });
  }

  async findByCode(
    alert_category_code: string,
  ): Promise<alert_categories | null> {
    return await this.prisma.alert_categories.findUnique({
      where: { alert_category_code },
    });
  }

  async update(
    id: string,
    data: Prisma.alert_categoriesUpdateInput,
  ): Promise<alert_categories> {
    return await this.prisma.alert_categories.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<alert_categories> {
    return await this.prisma.alert_categories.delete({ where: { id } });
  }
}
