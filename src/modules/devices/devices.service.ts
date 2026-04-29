import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DevicesRepository } from './repositories/devices.repository';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(private readonly repository: DevicesRepository) {}

  async create(dto: CreateDeviceDto, userId: string) {
    const existing = await this.repository.findByCode(dto.device_code);
    if (existing) {
      throw new ConflictException(
        `Device code '${dto.device_code}' already exists`,
      );
    }

    return await this.repository.create({
      ...dto,
      created_by: userId,
    });
  }

  async findAll(query: QueryDeviceDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.devicesWhereInput = {};
    if (search) {
      where.OR = [
        { device_code: { contains: search, mode: 'insensitive' } },
        { device_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

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
    const device = await this.repository.findById(id);
    if (!device)
      throw new NotFoundException(`Device with ID '${id}' not found`);
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto, userId: string) {
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
