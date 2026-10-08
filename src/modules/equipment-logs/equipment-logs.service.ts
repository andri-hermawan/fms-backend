import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentLogsRepository } from './repositories/equipment-logs.repository';
import { CreateEquipmentLogDto } from './dto/create-equipment-log.dto';
import { QueryEquipmentLogDto } from './dto/query-equipment-log.dto';
import { ActivitySummaryQueryDto } from './dto/activity-summary.dto';
import { QueryByDateShiftDto } from './dto/query-by-date-shift.dto';
import { QueryByEquipmentDateShiftDto } from './dto/query-by-equipment-date-shift.dto';
import { EquipmentsRepository } from '../equipments/repositories/equipments.repository';
import { serializeBigInt } from '../../common/helpers/bigint.helper';
import { TelemetryIngestService } from './telemetry/telemetry-ingest.service';

@Injectable()
export class EquipmentLogsService {
  constructor(
    private readonly repository: EquipmentLogsRepository,
    private readonly equipmentRepo: EquipmentsRepository,
    private readonly telemetryIngest: TelemetryIngestService,
  ) {}

  // Proses telemetry (simpan log, snapshot, geofence, alert) ada di TelemetryIngestService.
  async create(dto: CreateEquipmentLogDto) {
    return this.telemetryIngest.ingest(dto);
  }

  async findAll(query: QueryEquipmentLogDto) {
    // Query paginated logs with optional equipment and date filters.
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
      data: serializeBigInt(data),
      meta: { total, page, limit },
    };
  }

  async findOne(id: string) {
    // Load one log by ID and serialize BigInt values for the API response.
    const log = await this.repository.findById(id);
    if (!log) throw new NotFoundException('Log not found');
    return serializeBigInt(log);
  }

  async findByIdLastEquip(equipment_id: string) {
    // Load the latest log for equipment comparison.
    const equipmentLog = await this.repository.findByIdLastEquip(equipment_id);

    if (!equipmentLog) {
      throw new NotFoundException(
        `Equipment log with equipment_id ${equipment_id} not found`,
      );
    }

    return equipmentLog;
  }

  async getActivitySummary(query: ActivitySummaryQueryDto) {
    const { equipment_id, start_date, end_date, shift } = query;

    // Validate equipment exists
    const equipment = await this.equipmentRepo.findById(equipment_id);
    if (!equipment) {
      throw new NotFoundException(
        `Equipment with ID ${equipment_id} not found`,
      );
    }

    // Date-only query values represent calendar days in the application's WIB timezone.
    const startDate = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(start_date)
        ? `${start_date}T00:00:00.000+07:00`
        : start_date,
    );
    const endDate = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(end_date)
        ? `${end_date}T23:59:59.999+07:00`
        : end_date,
    );

    // Get activity summary from repository
    const summary = await this.repository.getActivitySummary(
      equipment_id,
      startDate,
      endDate,
      shift,
    );

    // Calculate fuel burn ratio (km per liter)
    const fuelDecrease = Number(summary.fuel_decrease) || 0;
    const mileage = Number(summary.mileage) || 0;
    const fuelBurnRatio = fuelDecrease > 0 ? mileage / fuelDecrease : 0;

    return {
      equipment_id,
      equipment_code: equipment.equipment_code,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      shift: shift || null,
      summary: {
        running_time: Number(summary.running_time) || 0,
        running_empty: Number(summary.running_empty) || 0,
        running_loaded: Number(summary.running_loaded) || 0,
        idling_time: Number(summary.idling_time) || 0,
        idling_empty: Number(summary.idling_empty) || 0,
        idling_loaded: Number(summary.idling_loaded) || 0,
        avg_running_speed: Number(summary.avg_running_speed) || 0,
        avg_running_speed_empty: Number(summary.avg_running_speed_empty) || 0,
        avg_running_speed_loaded: Number(summary.avg_running_speed_loaded) || 0,
        max_running_speed: Number(summary.max_running_speed) || 0,
        max_running_speed_empty: Number(summary.max_running_speed_empty) || 0,
        max_running_speed_loaded: Number(summary.max_running_speed_loaded) || 0,
        mileage: Number(summary.mileage) || 0,
        fuel_start_run: Number(summary.fuel_start_run) || 0,
        fuel_remaining: Number(summary.fuel_remaining) || 0,
        fuel_increase: Number(summary.fuel_increase) || 0,
        fuel_decrease: Number(summary.fuel_decrease) || 0,
        fuel_burn_ratio: Number(fuelBurnRatio.toFixed(2)) || 0,
      },
    };
  }

  async findByEquipmentDateShift(query: QueryByEquipmentDateShiftDto) {
    return serializeBigInt(
      await this.repository.findByEquipmentDateShift(query),
    );
  }

  async findByDateShift(query: QueryByDateShiftDto) {
    return serializeBigInt(await this.repository.findByDateShift(query));
  }

  async getSegmentSpeedSummary(query: QueryByDateShiftDto) {
    return serializeBigInt(await this.repository.getSegmentSpeedSummary(query));
  }
}
