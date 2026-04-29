import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProjectsRepository } from './repositories/projects.repository';
import { CompaniesService } from '../companies/companies.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly companiesService: CompaniesService, // Inject CompaniesService
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
    if (dto.geojson_origin?.features?.length > 0) {
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
    // 1. Pastikan project ada
    const existingProject = await this.findOne(id);

    // 2. Validasi duplikasi project_code jika ada perubahan code
    if (dto.project_code && dto.project_code !== existingProject.project_code) {
      const duplicate = await this.repository.findByCode(dto.project_code);
      if (duplicate) {
        throw new ConflictException(
          `Project code '${dto.project_code}' is already in use`,
        );
      }
    }

    // 3. Validasi company_id jika ada perubahan
    if (dto.company_id) {
      await this.companiesService.findOne(dto.company_id);
    }

    // 4. Update data dasar via Prisma
    const updatedProject = await this.repository.update(id, {
      ...dto,
      updated_at: new Date(),
    });

    // 5. Update Geometri jika ada data geojson_origin baru di dalam DTO
    if (dto.geojson_origin?.features?.length > 0) {
      const geometry = dto.geojson_origin.features[0].geometry;
      await this.repository.updateGeometry(id, geometry);
    }

    return updatedProject;
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.repository.delete(id);
  }
}
