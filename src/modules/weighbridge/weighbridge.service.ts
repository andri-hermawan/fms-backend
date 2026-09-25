import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WeighbridgeRepository } from './repositories/weighbridge.repository';
import { CreateWeighbridgeDto } from './dto/create-weighbridge.dto';
import { UpdateWeighbridgeDto } from './dto/update-weighbridge.dto';
import { QueryWeighbridgeDto } from './dto/query-weighbridge.dto';
import * as XLSX from 'xlsx';
import type { Express } from 'express';
import { Prisma } from '@prisma/client';

@Injectable()
export class WeighbridgeService {
  constructor(private readonly repository: WeighbridgeRepository) {}

  async create(dto: CreateWeighbridgeDto) {
    const data = {
      date_at: this.parseDate(dto.date_at),
      shift: dto.shift,
      ticket_no: dto.ticket_no,
      equipment_code: dto.equipment_code,
      product: dto.product,
      gross: dto.gross,
      tare: dto.tare,
      net: dto.net,
      recipient: dto.recipient,
      customer: dto.customer,
      transporter: dto.transporter,
      gross_time: this.toTime(dto.gross_time),
      tare_time: this.toTime(dto.tare_time),
      gross_operator: dto.gross_operator,
      tare_operator: dto.tare_operator,
      description: dto.description,
      location: dto.location,
    };
    return this.serialize(await this.repository.create(data));
  }

  async createMany(dtos: CreateWeighbridgeDto[]) {
    const data = dtos.map((dto) => ({
      date_at: this.parseDate(dto.date_at),
      shift: dto.shift,
      ticket_no: dto.ticket_no,
      equipment_code: dto.equipment_code,
      product: dto.product,
      gross: dto.gross,
      tare: dto.tare,
      net: dto.net,
      recipient: dto.recipient,
      customer: dto.customer,
      transporter: dto.transporter,
      gross_time: this.toTime(dto.gross_time),
      tare_time: this.toTime(dto.tare_time),
      gross_operator: dto.gross_operator,
      tare_operator: dto.tare_operator,
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

    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      raw: true,
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      throw new BadRequestException('File tidak memiliki worksheet');
    }

    // `header: 1` preserves the existing import column order and also makes
    // this work for CSV files with quoted commas in their values.
    const records = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: undefined,
      raw: true,
    });
    const rows: CreateWeighbridgeDto[] = [];

    const getText = (value: unknown) => {
      if (value === null || value === undefined) return undefined;
      if (value instanceof Date) return value.toISOString();
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
      ) {
        return String(value).trim() || undefined;
      }
      return undefined;
    };
    const getDate = (value: unknown) => {
      if (value instanceof Date) {
        return this.toDatabaseDateString(
          value.getUTCFullYear(),
          value.getUTCMonth() + 1,
          value.getUTCDate(),
        );
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        const serialDate = new Date(
          Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000,
        );
        return this.toDatabaseDateString(
          serialDate.getUTCFullYear(),
          serialDate.getUTCMonth() + 1,
          serialDate.getUTCDate(),
        );
      }
      return this.normalizeImportDate(getText(value));
    };
    const getNum = (value: unknown) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const text = getText(value);
      if (!text) return undefined;
      const number = Number(text.replace(/,/g, ''));
      return Number.isFinite(number) ? number : undefined;
    };

    records.slice(1).forEach((record) => {
      const date_at = getDate(record[0]);
      const equipment_code = getText(record[3]);
      if (!date_at || !equipment_code) return;

      rows.push({
        date_at,
        shift: getText(record[1]),
        ticket_no: getText(record[2]),
        equipment_code,
        product: getText(record[4]),
        gross: getNum(record[5]),
        tare: getNum(record[6]),
        net: getNum(record[7]),
        recipient: getText(record[8]),
        customer: getText(record[9]),
        transporter: getText(record[10]),
        gross_time: getText(record[11]),
        tare_time: getText(record[12]),
        gross_operator: getText(record[13]),
        tare_operator: getText(record[14]),
        description: getText(record[15]),
        location: getText(record[16]),
      });
    });

    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada data valid di dalam file');
    }

    const getImportKey = (row: CreateWeighbridgeDto) => {
      const date = this.parseDate(row.date_at);
      return [
        Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10),
        row.shift?.trim() ?? '',
        row.ticket_no?.trim() ?? '',
        row.equipment_code.trim(),
      ].join('|');
    };

    // Remove repeated keys from the same file before querying the database.
    const uniqueRows = Array.from(
      new Map(rows.map((row) => [getImportKey(row), row])).values(),
    );
    const persistenceRows = uniqueRows.map((row) => ({
      date_at: this.parseDate(row.date_at),
      shift: row.shift,
      ticket_no: row.ticket_no,
      equipment_code: row.equipment_code,
      product: row.product,
      gross: row.gross,
      tare: row.tare,
      net: row.net,
      recipient: row.recipient,
      customer: row.customer,
      transporter: row.transporter,
      gross_time: this.toTime(row.gross_time),
      tare_time: this.toTime(row.tare_time),
      gross_operator: row.gross_operator,
      tare_operator: row.tare_operator,
      description: row.description,
      location: row.location,
    }));
    const result = await this.repository.upsertImportRows(persistenceRows);
    const skipped = rows.length - uniqueRows.length;

    return {
      imported: uniqueRows.length,
      count: result.created,
      created: result.created,
      updated: result.updated,
      skipped,
    };
  }

  async findAll(query: QueryWeighbridgeDto) {
    const {
      page = 1,
      limit = 10,
      search,
      date_at,
      shift,
      ticket_no,
      equipment_code,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { equipment_code: { contains: search, mode: 'insensitive' } },
        { ticket_no: { contains: search, mode: 'insensitive' } },
        { customer: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (date_at) where.date_at = new Date(date_at);
    if (shift) where.shift = shift;
    if (ticket_no) where.ticket_no = ticket_no;
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
      throw new NotFoundException(`Weighbridge with ID '${id}' not found`);
    }
    return this.serialize(record);
  }

  async update(id: string, dto: UpdateWeighbridgeDto) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Weighbridge with ID '${id}' not found`);
    }
    const fields: (keyof UpdateWeighbridgeDto)[] = [
      'date_at',
      'shift',
      'ticket_no',
      'equipment_code',
      'product',
      'gross',
      'tare',
      'net',
      'recipient',
      'customer',
      'transporter',
      'gross_time',
      'tare_time',
      'gross_operator',
      'tare_operator',
      'description',
      'location',
    ];
    const data: Prisma.weighbridgeUncheckedUpdateInput = {};
    for (const key of fields) {
      if (dto[key] !== undefined) {
        if (key === 'date_at') {
          data[key] = this.parseDate(dto[key]);
        } else if (key === 'gross_time' || key === 'tare_time') {
          data[key] = this.toTime(dto[key]);
        } else {
          data[key] = dto[key];
        }
      }
    }
    data.updated_at = new Date();
    return this.serialize(await this.repository.update(BigInt(id), data));
  }

  async remove(id: string) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Weighbridge with ID '${id}' not found`);
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
    const ymd = str.match(/^([0-9]{4})[/.-]([0-9]{1,2})[/.-]([0-9]{1,2})/);
    if (ymd) {
      return new Date(
        Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])),
      );
    }

    const dmy = str.match(
      /^([0-9]{1,2})[/.-]\s*([0-9]{1,2})[/.-]\s*([0-9]{4})$/,
    );
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

  private toDatabaseDateString(year: number, month: number, day: number) {
    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  }

  private normalizeImportDate(value?: string): string | undefined {
    const text = value?.trim();
    if (!text) return undefined;

    const dmy = text.match(
      /^([0-9]{1,2})[/.-]\s*([0-9]{1,2})[/.-]\s*([0-9]{4})$/,
    );
    if (dmy) {
      return this.toDatabaseDateString(
        Number(dmy[3]),
        Number(dmy[2]),
        Number(dmy[1]),
      );
    }

    const ymd = text.match(/^([0-9]{4})[/.-]([0-9]{1,2})[/.-]([0-9]{1,2})$/);
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
    if (/^\d{1,2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':').map(Number);
      if (isNaN(h)) return undefined;
      return new Date(Date.UTC(1970, 0, 1, h, m || 0, 0, 0));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
}
