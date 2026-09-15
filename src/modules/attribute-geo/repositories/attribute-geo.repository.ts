import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, attribute_geo } from '@prisma/client';

@Injectable()
export class AttributeGeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.attribute_geoCreateInput): Promise<attribute_geo> {
    return await this.prisma.attribute_geo.create({ data });
  }

  async createMany(data: Prisma.attribute_geoCreateManyInput[]) {
    return await this.prisma.attribute_geo.createMany({
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.attribute_geoWhereInput;
    orderBy?: Prisma.attribute_geoOrderByWithRelationInput;
  }): Promise<[attribute_geo[], number]> {
    const { skip, take, where, orderBy } = params;

    return await this.prisma.$transaction([
      this.prisma.attribute_geo.findMany({ skip, take, where, orderBy }),
      this.prisma.attribute_geo.count({ where }),
    ]);
  }

  async findById(id: string): Promise<attribute_geo | null> {
    return await this.prisma.attribute_geo.findUnique({ where: { id } });
  }

  async findByProjectId(project_id: string): Promise<attribute_geo[]> {
    return await this.prisma.attribute_geo.findMany({
      where: { project_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(
    id: string,
    data: Prisma.attribute_geoUpdateInput,
  ): Promise<attribute_geo> {
    return await this.prisma.attribute_geo.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<attribute_geo> {
    return await this.prisma.attribute_geo.delete({ where: { id } });
  }

  async deleteByProjectId(project_id: string) {
    return await this.prisma.attribute_geo.deleteMany({
      where: { project_id },
    });
  }
}
