import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SettingOperatorRepository } from './setting-operator.repository';
import { CreateSettingOperatorDto } from '../dto/create-setting-operator.dto';
import { UpdateSettingOperatorDto } from '../dto/update-setting-operator.dto';
import { QuerySettingOperatorDto } from '../dto/query-setting-operator.dto';
import * as ExcelJS from 'exceljs';
import type { Express } from 'express';

@Injectable()
export class SettingOperatorService {
  private readonly logger = new Logger(SettingOperatorService.name);

  constructor(private readonly repository: SettingOperatorRepository) {}

  async create(dto: CreateSettingOperatorDto) {
    const data = {
      date_at: new Date(dto.date_at),
      shift: dto.shift,
      equipment_code: dto.equipment_code,
      operator_name: dto.operator_name,
      description: dto.description,
    };
    return this.serialize(await this.repository.create(data));
  }

  async createMany(dtos: CreateSettingOperatorDto[]) {
    const data = dtos
      .filter((dto) => {
        const d = new Date(dto.date_at);
        return !isNaN(d.getTime());
      })
      .map((dto) => ({
        date_at: new Date(dto.date_at),
        shift: dto.shift,
        equipment_code: dto.equipment_code,
        operator_name: dto.operator_name,
        description: dto.description,
      }));
    const result = await this.repository.createMany(data);
    return { count: result.count };
  }

  async importExcel(file: Express.Multer.File) {
    if (!file) {
      this.logger.warn('[importExcel] File tidak ditemukan');
      throw new BadRequestException('File wajib diunggah');
    }

    const originalName = (file.originalname || '').toLowerCase();
    const isCsv = originalName.endsWith('.csv');
    const isXlsx = originalName.endsWith('.xlsx');
    const isXls = originalName.endsWith('.xls');
    this.logger.log(
      `[importExcel] file=${file.originalname}, size=${file.size}, mimetype=${file.mimetype}, format=${isCsv ? 'csv' : isXlsx ? 'xlsx' : isXls ? 'xls' : 'unknown'}`,
    );

    if (!isCsv && !isXlsx && !isXls) {
      throw new BadRequestException(
        'Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv',
      );
    }

    const rows: CreateSettingOperatorDto[] = [];

    if (isCsv) {
      const content = file.buffer.toString('utf8');
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
      this.logger.log(`[importExcel] CSV total lines=${lines.length}`);
      lines.forEach((line, index) => {
        if (index === 0) return; // skip header
        const cols = line.split(',');
        const date_at = cols[0]?.trim();
        const shift = cols[1]?.trim();
        const equipment_code = cols[2]?.trim();
        const operator_name = cols[3]?.trim();
        const description = cols[4]?.trim();
        this.logger.debug(
          `[importExcel] CSV row=${index + 1} raw=${JSON.stringify(cols)}`,
        );
        if (!date_at || !shift || !equipment_code || !operator_name) {
          this.logger.warn(
            `[importExcel] CSV row=${index + 1} dilewati: kolom wajib kosong`,
          );
          return;
        }
        const normalizedDate = this.normalizeImportDate(date_at);
        if (!normalizedDate) {
          this.logger.warn(
            `[importExcel] CSV row=${index + 1} dilewati: tanggal invalid=${date_at}`,
          );
          return;
        }
        rows.push({
          date_at: normalizedDate,
          shift,
          equipment_code,
          operator_name,
          description: description || undefined,
        });
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.worksheets[0];
      this.logger.log(
        `[importExcel] worksheet=${worksheet?.name}, rowCount=${worksheet?.rowCount}, columnCount=${worksheet?.columnCount}`,
      );

      if (!worksheet) {
        this.logger.error('[importExcel] Worksheet pertama tidak ditemukan');
      }

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const rawValues = row.values;
        this.logger.debug(
          `[importExcel] Excel row=${rowNumber} raw=${JSON.stringify(rawValues, (_, value) => value instanceof Date ? value.toISOString() : value)}`,
        );
        const get = (index: number) => {
          const cell = row.getCell(index);
          const val = cell.value;
          if (val === null || val === undefined) return undefined;
          if (val instanceof Date) {
            return val.toISOString().split('T')[0]; // YYYY-MM-DD
          }
          if (typeof val === 'number' && val > 36526) {
            // Excel serial date number (only if > year 2000)
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + val * 86400000);
            return date.toISOString().split('T')[0];
          }
          return String(val);
        };
        const date_at = get(1);
        const shift = get(2);
        const equipment_code = get(3);
        const operator_name = get(4);
        const description = get(5);
        this.logger.debug(
          `[importExcel] Excel row=${rowNumber} parsed=${JSON.stringify({ date_at, shift, equipment_code, operator_name, description })}`,
        );
        if (!date_at || !shift || !equipment_code || !operator_name) {
          this.logger.warn(
            `[importExcel] Excel row=${rowNumber} dilewati: kolom wajib kosong`,
          );
          return;
        }
        const normalizedDate = this.normalizeImportDate(date_at);
        if (!normalizedDate) {
          this.logger.warn(
            `[importExcel] Excel row=${rowNumber} dilewati: tanggal invalid=${date_at}`,
          );
          return;
        }
        rows.push({
          date_at: normalizedDate,
          shift,
          equipment_code,
          operator_name,
          description,
        });
      });
    }

    this.logger.log(`[importExcel] valid rows=${rows.length}`);
    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada data valid di dalam file');
    }

    const count = await this.createMany(rows);
    return { imported: rows.length, count: count.count };
  }

  async findAll(query: QuerySettingOperatorDto) {
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
        { operator_name: { contains: search, mode: 'insensitive' } },
        { equipment_code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (date_at) {
      where.date_at = new Date(date_at);
    }
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
      throw new NotFoundException(`Setting operator with ID '${id}' not found`);
    }
    return this.serialize(record);
  }

  async update(id: string, dto: UpdateSettingOperatorDto) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Setting operator with ID '${id}' not found`);
    }
    const data: any = {};
    if (dto.date_at !== undefined) data.date_at = new Date(dto.date_at);
    if (dto.shift !== undefined) data.shift = dto.shift;
    if (dto.equipment_code !== undefined)
      data.equipment_code = dto.equipment_code;
    if (dto.operator_name !== undefined) data.operator_name = dto.operator_name;
    if (dto.description !== undefined) data.description = dto.description;
    data.updated_at = new Date();
    return this.serialize(await this.repository.update(BigInt(id), data));
  }

  async remove(id: string) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Setting operator with ID '${id}' not found`);
    }
    return await this.repository.delete(BigInt(id));
  }

  private serialize(value: any) {
    return JSON.parse(
      JSON.stringify(value, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }

  private normalizeImportDate(value: string): string | undefined {
    const dateValue = value.trim();
    const match = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(dateValue);
    const isoDate = match
      ? `${match[3]}-${match[2]}-${match[1]}`
      : dateValue;
    const parsedDate = new Date(isoDate);

    if (isNaN(parsedDate.getTime())) return undefined;
    return isoDate;
  }
}
