import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EquipmentsRepository } from './repositories/equipments.repository';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EquipmentsService {
  constructor(private readonly repository: EquipmentsRepository) {}

  async create(dto: CreateEquipmentDto, userId: string) {
    const existing = await this.repository.findByCode(dto.equipment_code);
    if (existing) {
      throw new ConflictException(
        `Equipment code '${dto.equipment_code}' already exists`,
      );
    }

    return await this.repository.create({
      ...dto,
      created_by: userId,
    });
  }

  async findAll(query: QueryEquipmentDto) {
    const { page = 1, limit = 10, search, project_id, type } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.equipmentsWhereInput = {};
    if (search) {
      where.OR = [
        { equipment_code: { contains: search, mode: 'insensitive' } },
        { equipment_alias: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (project_id) where.project_id = project_id;
    if (type) where.type = type;

    const [total, data] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string) {
    const equipment = await this.repository.findById(id);
    if (!equipment)
      throw new NotFoundException(`Equipment with ID '${id}' not found`);
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto, userId: string) {
    await this.findOne(id);
    return await this.repository.update(id, {
      ...dto,
      updated_by: userId,
      updated_at: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.repository.delete(id);
  }
}
