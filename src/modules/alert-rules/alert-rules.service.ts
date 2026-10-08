import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AlertRulesRepository } from './repositories/alert-rules.repository';
import { AlertRuleProvider } from './alert-rule.provider';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { QueryAlertRuleDto } from './dto/query-alert-rule.dto';

// String kosong / spasi dianggap tidak diisi (rule level project).
const normalizeSegmentInput = (segment: string | null | undefined) =>
  segment?.trim() || null;

@Injectable()
export class AlertRulesService {
  constructor(
    private readonly repository: AlertRulesRepository,
    private readonly ruleProvider: AlertRuleProvider,
  ) {}

  async create(dto: CreateAlertRuleDto) {
    const projectId = dto.project_id ?? null;
    const segment = normalizeSegmentInput(dto.segment);
    await this.assertScope(dto.alert_category_id, projectId, segment);

    const created = await this.repository.create({
      ...dto,
      project_id: projectId,
      segment,
      status: dto.status || 'active',
    });
    this.ruleProvider.invalidate();
    return created;
  }

  async findAll(query: QueryAlertRuleDto) {
    const {
      page = 1,
      limit = 50,
      alert_category_id,
      project_id,
      status,
    } = query;
    const where: Prisma.alert_rulesWhereInput = {};
    if (alert_category_id) where.alert_category_id = alert_category_id;
    // Filter project tetap menampilkan rule global sebagai acuan default.
    if (project_id) where.OR = [{ project_id }, { project_id: null }];
    if (status) where.status = status;

    const [data, total] = await this.repository.findAll({
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Pilihan segment untuk form rule per segment (dari attribute_geo project).
  async findSegments(projectId: string) {
    return this.repository.findSegmentsByProject(projectId);
  }

  async findOne(id: string) {
    const rule = await this.repository.findById(id);
    if (!rule) {
      throw new NotFoundException(`Alert rule with ID '${id}' not found`);
    }
    return rule;
  }

  async update(id: string, dto: UpdateAlertRuleDto) {
    const existing = await this.findOne(id);

    const categoryId = dto.alert_category_id ?? existing.alert_category_id;
    const projectId =
      dto.project_id !== undefined ? dto.project_id : existing.project_id;
    const segment =
      dto.segment !== undefined
        ? normalizeSegmentInput(dto.segment)
        : existing.segment;
    await this.assertScope(categoryId, projectId, segment, id);

    const updated = await this.repository.update(id, {
      ...dto,
      ...(dto.segment !== undefined && { segment }),
      updated_at: new Date(),
    });
    this.ruleProvider.invalidate();
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.repository.delete(id);
    this.ruleProvider.invalidate();
    return deleted;
  }

  private async assertScope(
    categoryId: string,
    projectId: string | null,
    segment: string | null,
    excludeId?: string,
  ) {
    if (segment !== null) {
      if (!projectId) {
        throw new BadRequestException(
          'Rule per segment wajib memiliki project_id',
        );
      }
      const exists = await this.repository.segmentExists(projectId, segment);
      if (!exists) {
        throw new BadRequestException(
          `Segment '${segment}' tidak ditemukan pada attribute_geo project tersebut`,
        );
      }
    }

    const duplicate = await this.repository.findByScope(
      categoryId,
      projectId,
      segment,
    );
    if (duplicate && duplicate.id !== excludeId) {
      throw new ConflictException(
        'Alert rule untuk kategori dan scope tersebut sudah ada',
      );
    }
  }
}
