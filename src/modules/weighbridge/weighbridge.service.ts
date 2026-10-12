import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WeighbridgeRepository } from './repositories/weighbridge.repository';
import { CreateWeighbridgeDto } from './dto/create-weighbridge.dto';
import { UpdateWeighbridgeDto } from './dto/update-weighbridge.dto';
import { QueryWeighbridgeDto } from './dto/query-weighbridge.dto';
import { QueryWeighbridgeRitaseDailyDto } from './dto/query-weighbridge-ritase-daily.dto';
import { QueryWeighbridgePayloadDailyDto } from './dto/query-weighbridge-payload-daily.dto';
import { QueryWeighbridgeProductionDailyDto } from './dto/query-weighbridge-production-daily.dto';
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
      // Keep Excel dates as serial numbers. Converting them to JavaScript
      // Date objects can shift the calendar date because of the server TZ.
      cellDates: false,
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
        // SheetJS creates date cells using the local timezone. Using UTC
        // getters here can turn 28-09-2026 into 27-09-2026 on the server.
        return this.toDatabaseDateString(
          value.getFullYear(),
          value.getMonth() + 1,
          value.getDate(),
        );
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return this.excelSerialDateToDatabaseDate(value);
      }
      const normalizedDate = this.normalizeImportDate(getText(value));
      if (!normalizedDate) return undefined;

      return normalizedDate;
    };
    const getNum = (value: unknown) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const text = getText(value);
      if (!text) return undefined;
      const number = Number(text.replace(/,/g, ''));
      return Number.isFinite(number) ? number : undefined;
    };

    records.slice(1).forEach((record) => {
      console.log('[WEIGHBRIDGE-IMPORT-RAW-DATE]', {
        raw_date_at: record[0],
        raw_date_at_type: typeof record[0],
      });
      const date_at = getDate(record[0]);
      const equipment_code = getText(record[3]);
      if (!date_at || !equipment_code) return;

      console.log('[WEIGHBRIDGE-IMPORT-NORMALIZED-DATE]', {
        raw_date_at: record[0],
        date_at,
      });

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
        row.ticket_no?.trim() ?? '',
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

  /**
   * Report production harian (matrix Asset ID x tanggal).
   * Nilai tiap sel = SUM net (payload) per equipment_code per tanggal dibagi
   * 1000 (konversi kg -> ton), setara dengan rumus Excel
   * IFERROR(SUMIFS(Input_WB!$J:$J; Input_WB!$P:$P; asset; Input_WB!$B:$B; tanggal)/1000; 0).
   */
  async getProductionDaily(query: QueryWeighbridgeProductionDailyDto) {
    const { startDate, endDate, totalDays, where, shift, equipmentCode } =
      this.resolvePeriod(query);

    const rows = await this.repository.sumNetByDateAndEquipment({
      startDate,
      endDate,
      where,
    });

    const days = this.buildDateRange(startDate, totalDays);
    const units = new Map<string, { values: Map<string, number> }>();

    for (const row of rows) {
      const unit = units.get(row.equipment_code) ?? {
        values: new Map<string, number>(),
      };
      unit.values.set(row.date, this.toTon(row.sum_net));
      units.set(row.equipment_code, unit);
    }

    return this.buildMatrixResponse({
      startDate,
      endDate,
      totalDays,
      days,
      shift,
      equipmentCode,
      units,
      emptyValue: 0,
    });
  }

  /**
   * Report payload harian (matrix Asset ID x tanggal).
   * Nilai tiap sel = AVERAGE net (payload) per equipment_code per tanggal
   * dibagi 1000 (konversi kg -> ton), setara dengan rumus Excel
   * IFERROR(AVERAGEIFS(Input_WB!$J:$J; Input_WB!$P:$P; asset; Input_WB!$B:$B; tanggal)/1000; 0).
   */
  async getPayloadDaily(query: QueryWeighbridgePayloadDailyDto) {
    const { startDate, endDate, totalDays, where, shift, equipmentCode } =
      this.resolvePeriod(query);

    const rows = await this.repository.avgNetByDateAndEquipment({
      startDate,
      endDate,
      where,
    });

    const days = this.buildDateRange(startDate, totalDays);
    const units = new Map<string, { values: Map<string, number> }>();

    for (const row of rows) {
      const unit = units.get(row.equipment_code) ?? {
        values: new Map<string, number>(),
      };
      unit.values.set(row.date, this.toTon(row.avg_net));
      units.set(row.equipment_code, unit);
    }

    return this.buildMatrixResponse({
      startDate,
      endDate,
      totalDays,
      days,
      shift,
      equipmentCode,
      units,
      emptyValue: 0,
    });
  }

  /**
   * Report ritase harian (matrix Asset ID x tanggal).
   * Nilai tiap sel = COUNT ritase (jumlah baris) weighbridge untuk
   * equipment_code tersebut pada tanggal tersebut, setara dengan
   * COUNTIFS(Input_WB!D:D; asset; Input_WB!B:B; tanggal) pada Excel.
   */
  async getRitaseDaily(query: QueryWeighbridgeRitaseDailyDto) {
    const { startDate, endDate, totalDays, where, shift, equipmentCode } =
      this.resolvePeriod(query);

    const rows = await this.repository.countRitaseByDateAndEquipment({
      startDate,
      endDate,
      where,
    });

    const days = this.buildDateRange(startDate, totalDays);
    const units = new Map<
      string,
      { ritase: number; total_net: number; values: Map<string, number> }
    >();

    for (const row of rows) {
      const unit = units.get(row.equipment_code) ?? {
        ritase: 0,
        total_net: 0,
        values: new Map<string, number>(),
      };
      unit.ritase += row.ritase;
      unit.total_net += row.net;
      unit.values.set(row.date, (unit.values.get(row.date) ?? 0) + row.ritase);
      units.set(row.equipment_code, unit);
    }

    const data = Array.from(units.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, unit]) => ({
        asset_id: code,
        equipment_code: code,
        ritase: unit.ritase,
        total_net: Number(unit.total_net.toFixed(2)),
        values: Object.fromEntries(
          days.map((day) => [day, unit.values.get(day) ?? 0]),
        ),
      }));

    return {
      period: {
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
      },
      days,
      filters: {
        shift: shift ?? null,
        equipment_code: equipmentCode ?? null,
      },
      data,
      total_row: data.length,
    };
  }

  /**
   * Validasi periode + bangun filter where. Dipakai bersama oleh report
   * ritase-daily dan payload-daily supaya aturannya konsisten.
   */
  private resolvePeriod(query: {
    start_date: string;
    end_date: string;
    max_days?: number;
    shift?: string[];
    equipment_code?: string[];
  }) {
    const startDate = this.normalizeQueryDate(query.start_date);
    const endDate = this.normalizeQueryDate(query.end_date);

    if (!startDate || !endDate) {
      throw new BadRequestException(
        'Format tanggal tidak valid, gunakan format YYYY-MM-DD',
      );
    }
    if (startDate > endDate) {
      throw new BadRequestException('start_date tidak boleh melebihi end_date');
    }

    const maxDays = query.max_days ?? 31;
    const totalDays = this.diffInDays(startDate, endDate) + 1;
    if (totalDays > maxDays) {
      throw new BadRequestException(
        `Rentang tanggal terlalu panjang (${totalDays} hari). Maksimal ${maxDays} hari per request.`,
      );
    }

    const where: Prisma.weighbridgeWhereInput = {};
    const shift = this.toList(query.shift);
    const equipmentCode = this.toList(query.equipment_code);

    if (shift) where.shift = { in: shift };
    if (equipmentCode) where.equipment_code = { in: equipmentCode };

    return { startDate, endDate, totalDays, where, shift, equipmentCode };
  }

  /**
   * Susun matrix Asset ID x tanggal. Asset yang difilter secara eksplisit
   * tetap ditampilkan walau belum ada transaksi, sehingga barisnya persis
   * mengikuti pilihan user.
   */
  private buildMatrixResponse(params: {
    startDate: string;
    endDate: string;
    totalDays: number;
    days: string[];
    shift?: string[];
    equipmentCode?: string[];
    units: Map<string, { values: Map<string, number> }>;
    emptyValue: number;
  }) {
    const { units, days, equipmentCode } = params;

    for (const code of equipmentCode ?? []) {
      if (!units.has(code)) units.set(code, { values: new Map() });
    }

    const data = Array.from(units.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, unit]) => ({
        asset_id: code,
        equipment_code: code,
        values: Object.fromEntries(
          days.map((day) => [day, unit.values.get(day) ?? params.emptyValue]),
        ),
      }));

    return {
      period: {
        start_date: params.startDate,
        end_date: params.endDate,
        total_days: params.totalDays,
      },
      days,
      filters: {
        shift: params.shift ?? null,
        equipment_code: params.equipmentCode ?? null,
      },
      data,
      total_row: data.length,
    };
  }

  /** Konversi net (kg) ke ton, dibulatkan 3 desimal. */
  private toTon(value: number): number {
    return Number((value / 1000).toFixed(3));
  }

  private normalizeQueryDate(value?: string): string | null {
    const text = (value ?? '').trim();
    const match = text.match(/^([0-9]{4})[/.-]([0-9]{1,2})[/.-]([0-9]{1,2})/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private diffInDays(startDate: string, endDate: string): number {
    const start = Date.parse(`${startDate}T00:00:00.000Z`);
    const end = Date.parse(`${endDate}T00:00:00.000Z`);
    return Math.round((end - start) / 86_400_000);
  }

  private buildDateRange(startDate: string, totalDays: number): string[] {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate() + index,
        ),
      );
      return `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
  }

  private toList(value?: string[] | string): string[] | undefined {
    if (value === undefined || value === null) return undefined;
    const items = (Array.isArray(value) ? value : [value])
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? Array.from(new Set(items)) : undefined;
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

  private excelSerialDateToDatabaseDate(serial: number) {
    const wholeDays = Math.floor(serial);
    const date = new Date(Date.UTC(1899, 11, 30 + wholeDays));
    return this.toDatabaseDateString(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
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
