import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FuelCalibrationsRepository } from './repositories/fuel-calibrations.repository';
import { CreateFuelCalibrationDto } from './dto/create-fuel-calibration.dto';
import { UpdateFuelCalibrationDto } from './dto/update-fuel-calibration.dto';
import { QueryFuelCalibrationDto } from './dto/query-fuel-calibration.dto';

@Injectable()
export class FuelCalibrationsService {
  private readonly logger = new Logger(FuelCalibrationsService.name);

  constructor(private readonly repository: FuelCalibrationsRepository) {}

  async create(dto: CreateFuelCalibrationDto, userId: string) {
    if (dto.fuel_volume <= 0 || dto.fuel_level <= 0) {
      throw new ConflictException(
        'Fuel volume dan fuel level harus lebih dari 0.',
      );
    }

    const calibrations = this.buildCalibrations(dto, userId);

    try {
      return await this.repository.createMany(calibrations);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Fuel calibration sudah ada.');
      }

      throw error;
    }
  }

  /**
   * Memperbarui fuel calibration berdasarkan equipment_id.
   * Konsep: hapus semua calibration milik equipment lalu buat ulang.
   */
  async updateByEquipment(dto: CreateFuelCalibrationDto, userId: string) {
    if (dto.fuel_volume <= 0 || dto.fuel_level <= 0) {
      throw new ConflictException(
        'Fuel volume dan fuel level harus lebih dari 0.',
      );
    }

    const calibrations = this.buildCalibrations(dto, userId);

    return await this.repository.$transaction(async (tx) => {
      await tx.fuel_calibrations.deleteMany({
        where: { equipment_id: dto.equipment_id },
      });

      return tx.fuel_calibrations.createMany({
        data: calibrations,
      });
    });
  }

  /**
   * Membuat daftar titik calibration (kelipatan 5 liter) dari DTO.
   */
  private buildCalibrations(dto: CreateFuelCalibrationDto, userId: string) {
    const calibrations = Array.from(
      { length: Math.floor(dto.fuel_volume / 5) + 1 },
      (_, index) => {
        const fuelVolume = index * 5;

        return {
          equipment_id: dto.equipment_id,
          fuel_volume: fuelVolume,
          fuel_level: Math.round(
            (fuelVolume / dto.fuel_volume) * dto.fuel_level,
          ),
          created_by: userId,
        };
      },
    );

    if (dto.fuel_volume % 5 !== 0) {
      calibrations.push({
        equipment_id: dto.equipment_id,
        fuel_volume: dto.fuel_volume,
        fuel_level: dto.fuel_level,
        created_by: userId,
      });
    }

    return calibrations;
  }

  async findAll(query: QueryFuelCalibrationDto) {
    const { page = 1, limit = 10, search, equipment_id } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.fuel_calibrationsWhereInput = {};

    if (equipment_id) {
      where.equipment_id = equipment_id;
    }

    if (search) {
      where.equipments = {
        OR: [
          {
            equipment_code: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            equipment_alias: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    const [data, total] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy: {
        fuel_volume: 'asc',
      },
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

  async findOne(id: bigint) {
    const calibration = await this.repository.findById(id);

    if (!calibration) {
      throw new NotFoundException(`Fuel Calibration '${id}' tidak ditemukan.`);
    }

    return calibration;
  }

  async update(id: bigint, dto: UpdateFuelCalibrationDto, userId: string) {
    await this.findOne(id);

    return this.repository.update(id, {
      ...dto,
      updated_at: new Date(),
      updated_by: userId,
    });
  }

  async remove(id: bigint) {
    await this.findOne(id);

    return this.repository.delete(id);
  }

  /**
   * Menghapus seluruh fuel calibration milik equipment_id.
   */
  async removeByEquipment(equipmentId: string) {
    return this.repository.deleteByEquipment(equipmentId);
  }

  /**
   * Mengambil list fuel calibration yang di-group by equipment_id
   * beserta nilai maksimum fuel_level dan fuel_volume per equipment.
   * Bisa difilter per equipment_id (opsional).
   */
  async groupByEquipment(equipmentId?: string) {
    return this.repository.groupByEquipment(equipmentId);
  }

  /**
   * Lookup Volume berdasarkan nilai LLS
   * menggunakan interpolasi linear.
   */
  async lookupVolume(equipmentId: string, lls: number) {
    const result = await this.repository.lookupVolume(equipmentId, lls);

    if (!result) {
      throw new NotFoundException(
        'Fuel calibration tidak ditemukan untuk equipment tersebut.',
      );
    }

    return {
      equipment_id: result.equipment_id,

      lls: result.lls,

      tank_capacity: result.tank_capacity,

      volume: result.volume,

      percentage: result.percentage,

      interpolation: {
        lower: result.lower,
        upper: result.upper,
      },
    };
  }
}
