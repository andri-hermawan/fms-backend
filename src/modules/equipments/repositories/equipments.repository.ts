import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, equipments } from '@prisma/client';

export type EquipmentWithProject = Prisma.equipmentsGetPayload<{
  include: {
    projects: {
      select: {
        project_code: true;
        project_name: true;
        geojson_origin: true;
      };
    };
  };
}>;

@Injectable()
export class EquipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.equipmentsCreateInput): Promise<equipments> {
    return await this.prisma.equipments.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.equipmentsWhereInput;
    orderBy?: Prisma.equipmentsOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.equipments.count({ where }),
      this.prisma.equipments.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          projects: {
            select: {
              project_code: true,
              project_name: true,
              geojson_origin: true,
            },
          },
        },
      }),
    ]);
  }

  async findByCode(code: string): Promise<equipments | null> {
    return await this.prisma.equipments.findUnique({
      where: { equipment_code: code },
    });
  }

  async findById(id: string): Promise<EquipmentWithProject | null> {
    return await this.prisma.equipments.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            project_code: true,
            project_name: true,
            geojson_origin: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.equipmentsUpdateInput,
  ): Promise<equipments> {
    return await this.prisma.equipments.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<equipments> {
    return await this.prisma.equipments.delete({
      where: { id },
    });
  }
}
