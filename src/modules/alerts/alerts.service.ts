import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertsRepository } from './repositories/alerts.repository';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(private readonly repository: AlertsRepository) {}

  // Helper untuk serialisasi BigInt ke String
  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async create(dto: CreateAlertDto) {
    return await this.repository.create(dto);
  }

  async findAll(query: QueryAlertDto) {
    const {
      page = 1,
      limit = 10,
      search,
      id,
      created_at,
      created_at_end,
      alert_category_id,
      is_read,
    } = query;
    // console.log('DEBUG findAll query:', JSON.stringify(query));
    // console.log('DEBUG is_read value:', is_read, typeof is_read);
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.alertsWhereInput = {};
    if (search) {
      where.OR = [
        {
          equipments: {
            equipment_code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          alert_categories: {
            alert_category_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }
    if (alert_category_id) {
      where.alert_category_id = alert_category_id;
    }
    if (is_read !== undefined) {
      if (is_read === false) {
        where.OR = [...(where.OR ?? []), { is_read: false }, { is_read: null }];
      } else {
        where.is_read = true;
      }
    }
    if (id) where.id = BigInt(id);
    if (created_at || created_at_end) {
      where.created_at = {};

      if (created_at) {
        where.created_at.gte = new Date(`${created_at}T00:00:00.000Z`);
      }

      if (created_at_end) {
        where.created_at.lte = new Date(`${created_at_end}T23:59:59.999Z`);
      }
    }

    const [total, data] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
    });

    return {
      data: this.serialize(data),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(total) / Number(limit)),
      },
    };
  }

  async findAlertSummary(query: QueryAlertDto) {
    const { search, created_at, created_at_end, alert_category_id } = query;

    const rows = await this.repository.findAlertSummary({
      search,
      created_at_start: created_at ? new Date(created_at) : undefined,
      created_at_end: created_at_end ? new Date(created_at_end) : undefined,
      alert_category_id,
    });

    return rows.map((item) => ({
      alert_category_name: item.alert_category_name,
      equipment_code: item.equipment_code,
      alert_count: Number(item.alert_count),
      duration: item.duration ?? '00:00',
    }));
  }

  async findOne(id: string) {
    const alert = await this.repository.findById(BigInt(id));
    if (!alert) throw new NotFoundException(`Alert with ID '${id}' not found`);
    return this.serialize(alert);
  }

  async update(id: string, dto: UpdateAlertDto, userId: string) {
    await this.findOne(id); // Validasi keberadaan data
    const result = await this.repository.update(BigInt(id), {
      ...dto,
      updated_by: userId,
      updated_at: new Date(),
    });
    return this.serialize(result);
  }

  async markAsRead(id: string) {
    await this.findOne(id); // Validasi keberadaan data
    const result = await this.repository.markAsRead(BigInt(id));
    return this.serialize(result);
  }

  async remove(id: string) {
    await this.findOne(id); // Validasi keberadaan data
    return await this.repository.delete(BigInt(id));
  }
}
