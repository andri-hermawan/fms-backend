import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, projects } from '@prisma/client';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.projectsCreateInput): Promise<projects> {
    return await this.prisma.projects.create({ data });
  }

  // 👇 TAMBAHKAN FUNGSI INI UNTUK MENANGANI POSTGIS
  async updateGeometry(id: string, geometryObj: any): Promise<void> {
    const geoJsonString = JSON.stringify(geometryObj);
    // Menggunakan ST_GeomFromGeoJSON untuk mengonversi JSON ke Geometry PostGIS
    // 4326 adalah SRID standar untuk koordinat GPS (Latitude/Longitude)
    await this.prisma.$executeRaw`
      UPDATE projects 
      SET geom_origin = ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonString}::jsonb), 4326) 
      WHERE id = CAST(${id} AS UUID)
    `;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.projectsWhereInput;
    orderBy?: Prisma.projectsOrderByWithRelationInput;
  }): Promise<[projects[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.projects.findMany({ skip, take, where, orderBy }),
      this.prisma.projects.count({ where }),
    ]);
  }

  async findById(id: string): Promise<projects | null> {
    return await this.prisma.projects.findUnique({ where: { id } });
  }

  async findByCode(project_code: string): Promise<projects | null> {
    return await this.prisma.projects.findUnique({ where: { project_code } });
  }

  async update(
    id: string,
    data: Prisma.projectsUpdateInput,
  ): Promise<projects> {
    return await this.prisma.projects.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<projects> {
    return await this.prisma.projects.delete({ where: { id } });
  }
}
