import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { CreateEquipmentLogDto } from './dto/create-equipment-log.dto';
import { QueryEquipmentLogDto } from './dto/query-equipment-log.dto';

@Injectable()
export class EquipmentLogsService {
  constructor(private readonly repository: EquipmentLogsRepository) {}

  async create(dto: CreateEquipmentLogDto) {
    return await this.repository.create(dto);
  }

  async findAll(query: QueryEquipmentLogDto) {
    const { page = 1, limit = 10, equipment_id, start_date, end_date } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (equipment_id) where.equipment_id = equipment_id;
    if (start_date && end_date) {
      where.time = { gte: new Date(start_date), lte: new Date(end_date) };
    }

    const [total, data] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
    });

    return {
      // BigInt handling: Konversi BigInt ke String agar JSON.stringify tidak error
      data: JSON.parse(
        JSON.stringify(data, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      ),
      meta: { total, page, limit },
    };
  }

  async findOne(id: string) {
    const log = await this.repository.findById(id);
    if (!log) throw new NotFoundException('Log not found');
    return JSON.parse(
      JSON.stringify(log, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }
}
