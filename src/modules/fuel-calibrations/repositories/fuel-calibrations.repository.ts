import { Injectable } from '@nestjs/common';
import { Prisma, fuel_calibrations } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class FuelCalibrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    data: Prisma.fuel_calibrationsUncheckedCreateInput[],
  ): Promise<fuel_calibrations[]> {
    return this.prisma.$transaction(
      data.map((item) =>
        this.prisma.fuel_calibrations.upsert({
          where: {
            equipment_id_fuel_volume: {
              equipment_id: item.equipment_id,
              fuel_volume: item.fuel_volume,
            },
          },
          create: item,
          update: {
            fuel_level: item.fuel_level,
            updated_at: new Date(),
            updated_by: item.created_by,
          },
        }),
      ),
    );
  }

  async create(
    data: Prisma.fuel_calibrationsUncheckedCreateInput,
  ): Promise<fuel_calibrations> {
    return this.prisma.fuel_calibrations.upsert({
      where: {
        equipment_id_fuel_volume: {
          equipment_id: data.equipment_id,
          fuel_volume: data.fuel_volume,
        },
      },
      create: data,
      update: {
        fuel_level: data.fuel_level,
        updated_at: new Date(),
        updated_by: data.created_by,
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.fuel_calibrationsWhereInput;
    orderBy?: Prisma.fuel_calibrationsOrderByWithRelationInput;
  }): Promise<[fuel_calibrations[], number]> {
    const { skip, take, where, orderBy } = params;

    return this.prisma.$transaction([
      this.prisma.fuel_calibrations.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          equipments: {
            select: {
              id: true,
              equipment_code: true,
              equipment_alias: true,
            },
          },
        },
      }),
      this.prisma.fuel_calibrations.count({
        where,
      }),
    ]);
  }

  async findById(id: bigint) {
    return this.prisma.fuel_calibrations.findUnique({
      where: {
        id,
      },
      include: {
        equipments: {
          select: {
            id: true,
            equipment_code: true,
            equipment_alias: true,
          },
        },
      },
    });
  }

  /**
   * Mengambil seluruh data calibration milik equipment
   * Digunakan untuk proses interpolasi linear
   */
  async findCalibrationByEquipment(
    equipmentId: string,
  ): Promise<fuel_calibrations[]> {
    return this.prisma.fuel_calibrations.findMany({
      where: {
        equipment_id: equipmentId,
      },
      orderBy: {
        fuel_level: 'asc',
      },
    });
  }

  /**
   * Titik calibration di bawah atau sama dengan nilai LLS
   */
  async findLowerCalibration(
    equipmentId: string,
    lls: number,
  ): Promise<fuel_calibrations | null> {
    return this.prisma.fuel_calibrations.findFirst({
      where: {
        equipment_id: equipmentId,
        fuel_level: {
          lte: lls,
        },
      },
      orderBy: {
        fuel_level: 'desc',
      },
    });
  }

  /**
   * Titik calibration di atas atau sama dengan nilai LLS
   */
  async findUpperCalibration(
    equipmentId: string,
    lls: number,
  ): Promise<fuel_calibrations | null> {
    return this.prisma.fuel_calibrations.findFirst({
      where: {
        equipment_id: equipmentId,
        fuel_level: {
          gte: lls,
        },
      },
      orderBy: {
        fuel_level: 'asc',
      },
    });
  }

  /**
   * Mengambil kapasitas tangki (volume terbesar)
   */
  async getTankCapacity(equipmentId: string): Promise<number> {
    const last = await this.prisma.fuel_calibrations.findFirst({
      where: {
        equipment_id: equipmentId,
      },
      orderBy: {
        fuel_volume: 'desc',
      },
      select: {
        fuel_volume: true,
      },
    });

    return Number(last?.fuel_volume ?? 0);
  }

  /**
   * Mengambil list fuel calibration yang di-group by equipment_id
   * beserta nilai maksimum fuel_level dan fuel_volume per equipment.
   */
  async groupByEquipment(equipmentId?: string) {
    const grouped = await this.prisma.fuel_calibrations.groupBy({
      by: ['equipment_id'],
      where: equipmentId ? { equipment_id: equipmentId } : undefined,
      _max: {
        fuel_level: true,
        fuel_volume: true,
      },
      orderBy: {
        equipment_id: 'asc',
      },
    });

    const equipmentIds = grouped.map((item) => item.equipment_id);

    const equipments = equipmentIds.length
      ? await this.prisma.equipments.findMany({
          where: { id: { in: equipmentIds } },
          select: {
            id: true,
            equipment_code: true,
            equipment_alias: true,
          },
        })
      : [];

    const equipmentMap = new Map(equipments.map((eq) => [eq.id, eq]));

    return grouped.map((item) => ({
      equipment_id: item.equipment_id,
      equipment_code:
        equipmentMap.get(item.equipment_id)?.equipment_code ?? null,
      equipment_alias:
        equipmentMap.get(item.equipment_id)?.equipment_alias ?? null,
      fuel_level: Number(item._max.fuel_level ?? 0),
      fuel_volume: Number(item._max.fuel_volume ?? 0),
    }));
  }

  /**
   * Lookup volume berdasarkan LLS menggunakan interpolasi linear
   */
  async lookupVolume(equipmentId: string, lls: number) {
    const lower = await this.findLowerCalibration(equipmentId, lls);

    const upper = await this.findUpperCalibration(equipmentId, lls);

    if (!lower || !upper) {
      return null;
    }

    const lowerLLS = Number(lower.fuel_level);
    const upperLLS = Number(upper.fuel_level);

    const lowerVolume = Number(lower.fuel_volume);
    const upperVolume = Number(upper.fuel_volume);

    let volume = lowerVolume;

    if (lowerLLS !== upperLLS) {
      volume =
        lowerVolume +
        ((lls - lowerLLS) * (upperVolume - lowerVolume)) /
          (upperLLS - lowerLLS);
    }

    const tankCapacity = await this.getTankCapacity(equipmentId);

    const percentage = tankCapacity === 0 ? 0 : (volume / tankCapacity) * 100;

    return {
      equipment_id: equipmentId,
      lls,
      lower: {
        fuel_level: lowerLLS,
        fuel_volume: lowerVolume,
      },
      upper: {
        fuel_level: upperLLS,
        fuel_volume: upperVolume,
      },
      volume: Number(volume.toFixed(2)),
      percentage: Number(percentage.toFixed(2)),
      tank_capacity: tankCapacity,
    };
  }

  async update(
    id: bigint,
    data: Prisma.fuel_calibrationsUncheckedUpdateInput,
  ): Promise<fuel_calibrations> {
    return this.prisma.fuel_calibrations.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: bigint): Promise<fuel_calibrations> {
    return this.prisma.fuel_calibrations.delete({
      where: {
        id,
      },
    });
  }

  async deleteByEquipment(equipmentId: string): Promise<{ count: number }> {
    return this.prisma.fuel_calibrations.deleteMany({
      where: {
        equipment_id: equipmentId,
      },
    });
  }

  /**
   * Menjalankan callback dalam satu transaksi.
   */
  async $transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
