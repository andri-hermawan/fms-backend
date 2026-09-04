import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BreakdownStatusRepository } from './repositories/breakdown-status.repository';
import { CreateBreakdownStatusDto } from './dto/create-breakdown-status.dto';
import { UpdateBreakdownStatusDto } from './dto/update-breakdown-status.dto';
import { QueryBreakdownStatusDto } from './dto/query-breakdown-status.dto';
import { EquipmentsRepository } from '../equipments/repositories/equipments.repository';
import { EquipmentStatusRepository } from '../equipment-status/repositories/equipment-status.repository';
import { WebSocketGatewayService } from '../../common/websocket/websocket.gateway';
import * as ExcelJS from 'exceljs';
import type { Express } from 'express';

@Injectable()
export class BreakdownStatusService {
  constructor(
    private readonly repository: BreakdownStatusRepository,
    private readonly equipmentsRepository: EquipmentsRepository,
    private readonly equipmentStatusRepository: EquipmentStatusRepository,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  async create(dto: CreateBreakdownStatusDto) {
    const data = {
      date_at: this.parseDate(dto.date_at),
      shift: dto.shift,
      equipment_code: dto.equipment_code,
      status: dto.status,
      category: dto.category,
      time_start: this.toTime(dto.time_start),
      time_end: this.toTime(dto.time_end),
      duration: this.toTime(dto.duration),
      repair_status: dto.repair_status,
      description: dto.description,
      location: dto.location,
    };
    return this.serialize(await this.repository.create(data));
  }

  async createMany(dtos: CreateBreakdownStatusDto[]) {
    const data = dtos.map((dto) => ({
      date_at: this.parseDate(dto.date_at),
      shift: dto.shift,
      equipment_code: dto.equipment_code,
      status: dto.status,
      category: dto.category,
      time_start: this.toTime(dto.time_start),
      time_end: this.toTime(dto.time_end),
      duration: this.toTime(dto.duration),
      repair_status: dto.repair_status,
      description: dto.description,
      location: dto.location,
    }));
    const result = await this.repository.createMany(data);
    return { count: result.count };
  }

  async importExcel(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }

    const originalName = (file.originalname || '').toLowerCase();
    const isCsv = originalName.endsWith('.csv');
    const isXlsx = originalName.endsWith('.xlsx');
    const isXls = originalName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      throw new BadRequestException(
        'Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv',
      );
    }

    const rows: CreateBreakdownStatusDto[] = [];

    if (isCsv) {
      const content = file.buffer.toString('utf8');
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
      lines.forEach((line, index) => {
        if (index === 0) return; // skip header
        const cols = line.split(',');
        const date_at = this.normalizeImportDate(cols[0]?.trim());
        const equipment_code = cols[2]?.trim();
        const status = cols[4]?.trim();
        if (!date_at || !equipment_code || !status) return;
        rows.push({
          date_at,
          shift: cols[1]?.trim() || undefined,
          equipment_code,
          class: cols[3]?.trim() || undefined,
          status,
          category: cols[5]?.trim() || undefined,
          time_start: cols[6]?.trim() || undefined,
          time_end: cols[7]?.trim() || undefined,
          duration: cols[8]?.trim() || undefined,
          repair_status: cols[9]?.trim() || undefined,
          description: cols[10]?.trim() || undefined,
          location: cols[11]?.trim() || undefined,
        });
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.worksheets[0];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const getDate = (index: number) => {
          const cell = row.getCell(index);
          const value = cell.value;

          // 1) Cell tanggal asli dari Excel -> ExcelJS memberi objek Date (UTC).
          //    Ini tidak ambigu, jadi diprioritaskan di atas cell.text
          //    (cell.text bisa tampil M/D/YYYY tergantung format/locale).
          if (value instanceof Date) {
            const dateString = this.toDatabaseDateString(
              value.getUTCFullYear(),
              value.getUTCDate(),
              value.getUTCMonth() + 1,
            );
            return dateString;
          }

          // 2) Excel serial number (hari sejak 1899-12-30).
          if (typeof value === 'number' && Number.isFinite(value)) {
            const serialDate = new Date(
              Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000,
            );
            const dateString = this.toDatabaseDateString(
              serialDate.getUTCFullYear(),
              serialDate.getUTCDate(),
              serialDate.getUTCMonth() + 1,
            );
            return dateString;
          }

          // 3) Cell berupa teks. Ambil teks yang tampil, atau nilai mentahnya.
          const text =
            cell.text?.trim() ||
            (value === null || value === undefined
              ? undefined
              : String(value).trim());
          if (!text) return undefined;

          // Sudah ISO YYYY-MM-DD -> pakai langsung.
          const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (iso) {
            return this.toDatabaseDateString(
              Number(iso[1]),
              Number(iso[2]),
              Number(iso[3]),
            );
          }

          // Teks Indonesia D/M/YYYY -> YYYY-MM-DD.
          const dmy = text.match(
            /^(\d{1,2})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{4})/,
          );
          if (dmy) {
            const dateString = this.toDatabaseDateString(
              Number(dmy[3]),
              Number(dmy[2]),
              Number(dmy[1]),
            );
            return dateString;
          }

          return text;
        };
        const get = (index: number) =>
          row.getCell(index).value !== null &&
          row.getCell(index).value !== undefined
            ? String(row.getCell(index).value)
            : undefined;
        const getTime = (index: number) => {
          const v = row.getCell(index).value;
          if (v === null || v === undefined) return undefined;
          if (v instanceof Date) {
            // ExcelJS menyimpan waktu sebagai Date dalam UTC.
            // Ambil dari komponen UTC agar tidak geser oleh timezone lokal.
            const hh = v.getUTCHours().toString().padStart(2, '0');
            const mm = v.getUTCMinutes().toString().padStart(2, '0');
            return `${hh}:${mm}`;
          }
          if (typeof v === 'number') {
            // Excel time as decimal fraction of a day -> HH:MM
            const totalMinutes = Math.round(v * 24 * 60);
            const hh = Math.floor(totalMinutes / 60)
              .toString()
              .padStart(2, '0');
            const mm = (totalMinutes % 60).toString().padStart(2, '0');
            return `${hh}:${mm}`;
          }
          return String(v);
        };
        const date_at = getDate(1);
        const equipment_code = get(3);
        const status = get(5);
        if (!date_at || !equipment_code || !status) return;
        rows.push({
          date_at,
          shift: get(2),
          equipment_code,
          status,
          category: get(6),
          time_start: getTime(7),
          time_end: getTime(8),
          duration: getTime(9),
          repair_status: get(10),
          description: get(11),
          location: get(12),
        });
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada data valid di dalam file');
    }
    const count = await this.createMany(rows);

    const now = new Date();
    const todayString = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    for (const row of rows) {
      const normalizedStatus = (row.status ?? '').trim().toLowerCase();
      const breakdownValue =
        normalizedStatus === 'breakdown' || normalizedStatus === 'continue'
          ? true
          : normalizedStatus === 'ready'
            ? false
            : undefined;

      const equipment = await this.equipmentsRepository.findByCode(
        row.equipment_code,
      );

      const dateAt = this.parseDate(row.date_at);

      console.log('[BREAKDOWN-IMPORT-ROW-START]', {
        equipment_id: equipment?.id,
        equipment_code: row.equipment_code,
        raw_date_at: row.date_at,
        raw_date_at_type: typeof row.date_at,
        date_at: dateAt,
        todayString,
        shift: row.shift,
        raw_status: row.status,
        normalizedStatus,
        breakdownValue,
      });

      if (
        Number.isNaN(dateAt.getTime()) ||
        dateAt.getUTCFullYear() !== todayString.getUTCFullYear() ||
        dateAt.getUTCMonth() !== todayString.getUTCMonth() ||
        dateAt.getUTCDate() !== todayString.getUTCDate()
      ) {
        continue;
      }
      if (!equipment) {
        continue;
      }
      if (breakdownValue === undefined) {
        continue;
      }

      const updatedStatus =
        await this.equipmentStatusRepository.updateBreakdownByDateAndShift({
          equipment_id: equipment.id,
          date_at: dateAt,
          shift: row.shift,
          breakdown: breakdownValue,
        });

      if (updatedStatus.count > 0) {
        const equipmentStatus =
          await this.equipmentStatusRepository.findByEquipmentId(equipment.id);
        if (equipmentStatus) {
          this.wsGateway.emitEquipmentStatusUpdate({
            equipment_id: equipmentStatus.equipment_id,
            equipment_code: equipmentStatus.equipment_code,
            equipment_alias: equipmentStatus.equipment_alias,
            latitude: Number(equipmentStatus.latitude),
            longitude: Number(equipmentStatus.longitude),
            speed: Number(equipmentStatus.speed ?? 0),
            fuel_level: Number(equipmentStatus.fuel_level ?? 0),
            fuel_temperature: Number(equipmentStatus.fuel_temperature ?? 0),
            fuel_volume: Number(equipmentStatus.fuel_volume ?? 0),
            fuel_percentage: Number(equipmentStatus.fuel_percentage ?? 0),
            fuel_difference: Number(equipmentStatus.fuel_difference ?? 0),
            alert_count: Number(equipmentStatus.alert_count ?? 0),
            ignition: Boolean(equipmentStatus.engine_status),
            status: equipmentStatus.status ?? 'UNKNOWN',
            recorded_at: equipmentStatus.updated_at,
            log_id: equipmentStatus.log_id?.toString(),
            updated_at: equipmentStatus.updated_at,
            last_update_at: equipmentStatus.updated_at,
            is_inside: equipmentStatus.is_inside,
            location_category: equipmentStatus.location_category,
            segment: equipmentStatus.segment,
            vessel: equipmentStatus.vessel,
            mileage: equipmentStatus.mileage,
            vessel_status: equipmentStatus.vessel_status,
            engine_status: equipmentStatus.engine_status,
            breakdown: equipmentStatus.breakdown,
            gsm_signal: equipmentStatus.gsm_signal,
            shift: equipmentStatus.shift,
          });
        }
      }
    }

    return { imported: rows.length, count: count.count };
  }

  async findAll(query: QueryBreakdownStatusDto) {
    const {
      page = 1,
      limit = 10,
      search,
      date_at,
      shift,
      equipment_code,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { equipment_code: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (date_at) where.date_at = new Date(date_at);
    if (shift) where.shift = shift;
    if (equipment_code) where.equipment_code = equipment_code;

    const [data, total] = await this.repository.findAll({
      skip,
      take: limit,
      where,
      orderBy: { date_at: 'desc' },
    });

    return {
      data: this.serialize(data),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const record = await this.repository.findById(BigInt(id));
    if (!record) {
      throw new NotFoundException(`Breakdown status with ID '${id}' not found`);
    }
    return this.serialize(record);
  }

  async update(id: string, dto: UpdateBreakdownStatusDto) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Breakdown status with ID '${id}' not found`);
    }
    const data: any = {};
    if (dto.date_at !== undefined) data.date_at = this.parseDate(dto.date_at);
    if (dto.shift !== undefined) data.shift = dto.shift;
    if (dto.equipment_code !== undefined)
      data.equipment_code = dto.equipment_code;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.time_start !== undefined)
      data.time_start = this.toTime(dto.time_start);
    if (dto.time_end !== undefined) data.time_end = this.toTime(dto.time_end);
    if (dto.duration !== undefined) data.duration = this.toTime(dto.duration);
    if (dto.repair_status !== undefined) data.repair_status = dto.repair_status;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    data.updated_at = new Date();
    return this.serialize(await this.repository.update(BigInt(id), data));
  }

  async remove(id: string) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Breakdown status with ID '${id}' not found`);
    }
    return await this.repository.delete(BigInt(id));
  }

  private toIsoDateString(year: number, month: number, day: number): string {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  private parseDate(value?: string | Date): Date {
    if (value instanceof Date) {
      return new Date(
        Date.UTC(
          value.getUTCFullYear(),
          value.getUTCMonth(),
          value.getUTCDate(),
        ),
      );
    }

    const str = (value ?? '').trim();

    // Format hasil import YYYY/MM/DD.
    const ymd = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
    if (ymd) {
      return new Date(
        Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])),
      );
    }

    // Format D/M/YYYY atau DD/MM/YYYY (standar Indonesia, pemisah / - .)
    const dmy = str.match(/^(\d{1,2})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{4})$/);
    if (dmy) {
      return new Date(
        Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])),
      );
    }

    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return parsed;
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
  }

  private toDatabaseDateString(
    year: number,
    month: number,
    day: number,
  ): string {
    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  }

  private normalizeImportDate(value?: string): string | undefined {
    const text = value?.trim();
    if (!text) return undefined;

    const dmy = text.match(/^(\d{1,2})[/\-.]\s*(\d{1,2})[/\-.]\s*(\d{4})$/);
    if (dmy) {
      return this.toDatabaseDateString(
        Number(dmy[3]),
        Number(dmy[2]),
        Number(dmy[1]),
      );
    }

    const ymd = text.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
    if (ymd) {
      return this.toDatabaseDateString(
        Number(ymd[1]),
        Number(ymd[2]),
        Number(ymd[3]),
      );
    }

    return text;
  }

  private toTime(value?: string): Date | undefined {
    if (!value) return undefined;
    const [h, m] = value.split(':').map(Number);
    if (isNaN(h)) return undefined;
    // Gunakan UTC agar jam yang disimpan sesuai nilai, tanpa geser timezone
    return new Date(Date.UTC(1970, 0, 1, h, m || 0, 0, 0));
  }

  private serialize(value: any) {
    return JSON.parse(
      JSON.stringify(value, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
}
