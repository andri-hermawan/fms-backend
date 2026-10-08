import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, alert_rules } from '@prisma/client';

const RULE_INCLUDE = {
  alert_categories: {
    select: { alert_category_code: true, alert_category_name: true },
  },
  projects: { select: { project_code: true, project_name: true } },
} satisfies Prisma.alert_rulesInclude;

@Injectable()
export class AlertRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.alert_rulesUncheckedCreateInput) {
    return await this.prisma.alert_rules.create({
      data,
      include: RULE_INCLUDE,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.alert_rulesWhereInput;
  }) {
    const { skip, take, where } = params;
    return await this.prisma.$transaction([
      this.prisma.alert_rules.findMany({
        skip,
        take,
        where,
        include: RULE_INCLUDE,
        orderBy: [
          { alert_category_id: 'asc' },
          { project_id: { sort: 'asc', nulls: 'first' } },
          { segment: { sort: 'asc', nulls: 'first' } },
        ],
      }),
      this.prisma.alert_rules.count({ where }),
    ]);
  }

  async findById(id: string) {
    return await this.prisma.alert_rules.findUnique({
      where: { id },
      include: RULE_INCLUDE,
    });
  }

  // Segment dicocokkan case-insensitive, sama dengan unique index uq_alert_rules_scope.
  async findByScope(
    alert_category_id: string,
    project_id: string | null,
    segment: string | null,
  ): Promise<alert_rules | null> {
    return await this.prisma.alert_rules.findFirst({
      where: {
        alert_category_id,
        project_id,
        segment:
          segment === null ? null : { equals: segment, mode: 'insensitive' },
      },
    });
  }

  async segmentExists(project_id: string, segment: string) {
    const found = await this.prisma.attribute_geo.findFirst({
      where: { project_id, segment: { equals: segment, mode: 'insensitive' } },
      select: { id: true },
    });
    return found !== null;
  }

  async findSegmentsByProject(project_id: string) {
    const rows = await this.prisma.attribute_geo.findMany({
      where: { project_id, segment: { not: null } },
      distinct: ['segment'],
      select: { segment: true, category: true },
      orderBy: { segment: 'asc' },
    });
    return rows;
  }

  // Dipakai AlertRuleProvider: semua rule aktif beserta kode kategorinya.
  async findActiveWithCategoryCode() {
    return await this.prisma.alert_rules.findMany({
      where: { status: 'active' },
      include: { alert_categories: { select: { alert_category_code: true } } },
    });
  }

  async findCategoriesByCodes(codes: string[]) {
    return await this.prisma.alert_categories.findMany({
      where: { alert_category_code: { in: codes } },
      select: { id: true, alert_category_code: true },
    });
  }

  async update(id: string, data: Prisma.alert_rulesUncheckedUpdateInput) {
    return await this.prisma.alert_rules.update({
      where: { id },
      data,
      include: RULE_INCLUDE,
    });
  }

  async delete(id: string): Promise<alert_rules> {
    return await this.prisma.alert_rules.delete({ where: { id } });
  }
}
