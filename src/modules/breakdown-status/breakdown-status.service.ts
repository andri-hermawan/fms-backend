import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BreakdownStatusRepository } from './repositories/breakdown-status.repository';
import { CreateBreakdownStatusDto } from './dto/create-breakdown-status.dto';
import { UpdateBreakdownStatusDto } from './dto/update-breakdown-status.dto';
import { QueryBreakdownStatusDto } from './dto/query-breakdown-status.dto';
import * as ExcelJS from 'exceljs';
import type { Express } from 'express';

@Injectable()
export class BreakdownStatusService {
  constructor(private readonly repository: BreakdownStatusRepository) {}

  async create(dto: CreateBreakdownStatusDto) {
    const data = {
      date_at: new Date(dto.date_at),
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
    const first = dtos[0];
    console.log('[BREAKDOWN-DEBUG] raw time_start:', first?.time_start);
    console.log('[BREAKDOWN-DEBUG] raw time_end:', first?.time_end);
    console.log('[BREAKDOWN-DEBUG] raw duration:', first?.duration);
    console.log(
      '[BREAKDOWN-DEBUG] toTime(time_start):',
      this.toTime(first?.time_start),
    );
    console.log(
      '[BREAKDOWN-DEBUG] toTime(time_end):',
      this.toTime(first?.time_end),
    );
    console.log(
      '[BREAKDOWN-DEBUG] toTime(duration):',
      this.toTime(first?.duration),
    );
    const data = dtos.map((dto) => ({
      date_at: new Date(dto.date_at),
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
        const date_at = cols[0]?.trim();
        const equipment_code = cols[2]?.trim();
        const status = cols[4]?.trim();
        if (!date_at || !equipment_code || !status) return;
        rows.push({
          date_at,
          shift: cols[1]?.trim() || undefined,
          equipment_code,
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
        const date_at = get(1);
        const equipment_code = get(3);
        const status = get(4);
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
    if (dto.date_at !== undefined) data.date_at = new Date(dto.date_at);
    if (dto.shift !== undefined) data.shift = dto.shift;
    if (dto.equipment_code !== undefined)
      data.equipment_code = dto.equipment_code;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.time_start !== undefined) data.time_start = this.toTime(dto.time_start);
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
