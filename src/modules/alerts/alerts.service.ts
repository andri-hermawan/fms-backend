import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertsRepository } from './repositories/alerts.repository';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

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

  async create(dto: CreateAlertDto, userId: string) {
    return await this.repository.create(dto, userId);
  }

  async findAll(query: QueryAlertDto) {
    const { page = 1, limit = 10, equipment_id, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (equipment_id) where.equipment_id = equipment_id;
    if (status) where.status = status;

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
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
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

  async remove(id: string) {
    await this.findOne(id); // Validasi keberadaan data
    return await this.repository.delete(BigInt(id));
  }
}
