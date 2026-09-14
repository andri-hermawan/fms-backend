import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { CompaniesService } from '../companies/companies.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly companiesService: CompaniesService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateProjectDto) {
    await this.companiesService.findOne(dto.company_id);
    const existing = await this.repository.findByCode(dto.project_code);
    if (existing) {
      throw new ConflictException(
        `Project code '${dto.project_code}' already exists`,
      );
    }
    // 3. Ekstrak geometri dari GeoJSON jika ada (Optional Chaining agar aman)
    let extractedGeometry = null;
    if (
      dto.geojson_origin &&
      dto.geojson_origin.type === 'FeatureCollection' &&
      dto.geojson_origin.features?.length > 0
    ) {
      // Mengambil geometry dari feature pertama (index 0)
      extractedGeometry = dto.geojson_origin.features[0].geometry;
    }

    // 4. Simpan data teks & relasinya menggunakan Prisma
    const newProject = await this.repository.create({
      project_code: dto.project_code,
      project_name: dto.project_name,
      image: dto.image,
      geojson_origin: dto.geojson_origin,
      status: dto.status || 'active',
      companies: { connect: { id: dto.company_id } }, // Pastikan menggunakan scalar field agar tidak error TypeScript
    });

    // 5. Update kolom spasial (geom_origin) jika GeoJSON-nya valid
    if (extractedGeometry) {
      await this.repository.updateGeometry(newProject.id, extractedGeometry);
    }

    return newProject;
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, search, company_id } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.projectsWhereInput = {};
    if (search) {
      where.OR = [
        { project_code: { contains: search, mode: 'insensitive' } },
        { project_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (company_id) where.company_id = company_id;

    const [data, total] = await this.repository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const project = await this.repository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with ID '${id}' not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const existingProject = await this.findOne(id);

    if (dto.project_code && dto.project_code !== existingProject.project_code) {
      const duplicate = await this.repository.findByCode(dto.project_code);

      if (duplicate) {
        throw new ConflictException(
          `Project code '${dto.project_code}' is already in use`,
        );
      }
    }

    if (dto.company_id) {
      await this.companiesService.findOne(dto.company_id);
    }

    let extractedGeometry = null;

    if (
      dto.geojson_origin &&
      dto.geojson_origin.type === 'FeatureCollection' &&
      dto.geojson_origin.features.length > 0
    ) {
      extractedGeometry = dto.geojson_origin.features[0].geometry;
    }

    const updatedProject = await this.repository.update(id, {
      ...dto,
      updated_at: new Date(),
    });

    if (extractedGeometry) {
      await this.repository.updateGeometry(id, extractedGeometry);
    }

    if (dto.geojson_origin && dto.geojson_origin.type === 'FeatureCollection') {
      const features = dto.geojson_origin.features ?? [];

      if (features.length > 0) {
        const attributeGeoData = features.map((feature: any, index: number) => {
          const properties = feature?.properties ?? {};
          const geometry = feature?.geometry ?? {};

          // Kolom `code` dan `code_2` bertipe String di database, sedangkan
          // GeoJSON bisa menyimpan nilai number (mis. CODE_2: 0).
          const code = properties.CODE ?? properties.code ?? null;
          const code2 = properties.CODE_2 ?? properties.code_2 ?? null;

          return {
            type: feature?.type ?? 'Feature',
            geometry_type: geometry?.type ?? null,
            category: properties.Category ?? properties.category ?? null,
            segment: properties.Segment ?? properties.segment ?? null,
            buff_dist:
              properties.BUFF_DIST ??
              properties.buff_dist ??
              properties.BUFF_DIST ??
              0,
            orig_fid: properties.ORIG_FID ?? properties.orig_fid ?? index ?? 0,
            code: code != null ? String(code) : null,
            code_2: code2 != null ? String(code2) : null,
            hex_line: properties.HEX_Line ?? properties.hex_line ?? null,
            hex_fill: properties.HEX_Fill ?? properties.hex_fill ?? null,
            value1: null,
            value2: null,
            status: properties.status ?? 'active',
            created_at: new Date(),
            project_id: id,
          };
        });

        await this.prisma.attribute_geo.deleteMany({
          where: { project_id: id },
        });

        await this.prisma.attribute_geo.createMany({
          data: attributeGeoData,
        });
      } else {
        await this.prisma.attribute_geo.deleteMany({
          where: { project_id: id },
        });
      }
    }

    return updatedProject;
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.repository.delete(id);
  }
}
