import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WeighbridgeRepository } from './repositories/weighbridge.repository';
import { CreateWeighbridgeDto } from './dto/create-weighbridge.dto';
import { UpdateWeighbridgeDto } from './dto/update-weighbridge.dto';
import { QueryWeighbridgeDto } from './dto/query-weighbridge.dto';
import * as ExcelJS from 'exceljs';
import type { Express } from 'express';

@Injectable()
export class WeighbridgeService {
  constructor(private readonly repository: WeighbridgeRepository) {}

  async create(dto: CreateWeighbridgeDto) {
    const data = {
      date_at: new Date(dto.date_at),
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
      date_at: new Date(dto.date_at),
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

    const rows: CreateWeighbridgeDto[] = [];

    if (isCsv) {
      const content = file.buffer.toString('utf8');
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
      lines.forEach((line, index) => {
        if (index === 0) return; // skip header
        const cols = line.split(',');
        const date_at = cols[0]?.trim();
        const equipment_code = cols[3]?.trim();
        if (!date_at || !equipment_code) return;
        rows.push({
          date_at,
          shift: cols[1]?.trim() || undefined,
          ticket_no: cols[2]?.trim() || undefined,
          equipment_code,
          product: cols[4]?.trim() || undefined,
          gross: cols[5]?.trim() ? Number(cols[5]) : undefined,
          tare: cols[6]?.trim() ? Number(cols[6]) : undefined,
          net: cols[7]?.trim() ? Number(cols[7]) : undefined,
          recipient: cols[8]?.trim() || undefined,
          customer: cols[9]?.trim() || undefined,
          transporter: cols[10]?.trim() || undefined,
          gross_time: cols[11]?.trim() || undefined,
          tare_time: cols[12]?.trim() || undefined,
          gross_operator: cols[13]?.trim() || undefined,
          tare_operator: cols[14]?.trim() || undefined,
          description: cols[15]?.trim() || undefined,
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
        const getNum = (index: number) => {
          const v = get(index);
          return v && !isNaN(Number(v)) ? Number(v) : undefined;
        };
        const getTime = (index: number) => {
          const v = row.getCell(index).value;
          if (v === null || v === undefined) return undefined;
          if (v instanceof Date) {
            return v.toISOString();
          }
          if (typeof v === 'number') {
            const date = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
            return date.toISOString();
          }
          return String(v);
        };
        const date_at = get(1);
        const equipment_code = get(4);
        if (!date_at || !equipment_code) return;
        rows.push({
          date_at,
          shift: get(2),
          ticket_no: get(3),
          equipment_code,
          product: get(5),
          gross: getNum(6),
          tare: getNum(7),
          net: getNum(8),
          recipient: get(9),
          customer: get(10),
          transporter: get(11),
          gross_time: getTime(12),
          tare_time: getTime(13),
          gross_operator: get(14),
          tare_operator: get(15),
          description: get(16),
        });
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada data valid di dalam file');
    }

    const count = await this.createMany(rows);
    return { imported: rows.length, count: count.count };
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
    const data: any = {};
    for (const key of fields) {
      if (dto[key] !== undefined) {
        if (key === 'date_at') {
          data[key] = new Date(dto[key] as string);
        } else if (key === 'gross_time' || key === 'tare_time') {
          data[key] = this.toTime(dto[key] as string);
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