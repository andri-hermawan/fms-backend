import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AttributeGeoRepository } from './repositories/attribute-geo.repository';
import { CreateAttributeGeoDto } from './dto/create-attribute-geo.dto';
import { UpdateAttributeGeoDto } from './dto/update-attribute-geo.dto';
import { QueryAttributeGeoDto } from './dto/query-attribute-geo.dto';

@Injectable()
export class AttributeGeoService {
  constructor(private readonly repository: AttributeGeoRepository) {}

  async create(dto: CreateAttributeGeoDto) {
    return this.repository.create({
      ...dto,
      status: dto.status || 'active',
    });
  }

  async findAll(query: QueryAttributeGeoDto) {
    const {
      page = 1,
      limit = 10,
      search,
      project_id,
      status,
      orig_fid,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.attribute_geoWhereInput = {};

    if (search) {
      where.OR = [
        { category: { contains: search, mode: 'insensitive' } },
        { segment: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (project_id) {
      where.project_id = project_id;
    }

    if (status) {
      where.status = status;
    }

    if (orig_fid !== undefined && orig_fid !== null) {
      where.orig_fid = orig_fid;
    }

    const [data, total] = await this.repository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException(`Attribute geo with ID '${id}' not found`);
    }
    return item;
  }

  async update(id: string, dto: UpdateAttributeGeoDto) {
    await this.findOne(id);

    return this.repository.update(id, {
      ...dto,
      updated_at: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }

  async syncFromGeojson(projectId: string, geojson: any) {
    if (
      !geojson ||
      geojson.type !== 'FeatureCollection' ||
      !Array.isArray(geojson.features) ||
      geojson.features.length === 0
    ) {
      return [];
    }

    const payload = geojson.features.map((feature: any, index: number) => {
      const properties = feature?.properties ?? {};
      const geometry = feature?.geometry ?? {};

      return {
        type: feature?.type ?? 'Feature',
        geometry_type: geometry?.type ?? null,
        category: properties.Category ?? properties.category ?? null,
        segment: properties.Segment ?? properties.segment ?? null,
        buff_dist:
          properties.BUFF_DIST ??
          properties.buff_dist ??
          properties.BUFF_DIST ??
          null,
        orig_fid: properties.ORIG_FID ?? properties.orig_fid ?? index ?? null,
        code: properties.CODE ?? properties.code ?? null,
        code_2: properties.CODE_2 ?? properties.code_2 ?? null,
        hex_line: properties.HEX_Line ?? properties.hex_line ?? null,
        hex_fill: properties.HEX_Fill ?? properties.hex_fill ?? null,
        value1: null,
        value2: null,
        status: properties.status ?? 'active',
        project_id: projectId,
      };
    });

    await this.repository.deleteByProjectId(projectId);
    return this.repository.createMany(payload);
  }
}
