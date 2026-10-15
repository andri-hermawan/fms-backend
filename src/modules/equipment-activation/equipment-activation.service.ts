import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import type { Express } from 'express';
import { EquipmentActivationRepository } from './repositories/equipment-activation.repository';
import { CreateEquipmentActivationDto } from './dto/create-equipment-activation.dto';
import { UpdateEquipmentActivationDto } from './dto/update-equipment-activation.dto';
import { QueryEquipmentActivationDto } from './dto/query-equipment-activation.dto';

type ImportRow = {
  date_at: string;
  equipment_code: string;
  status: 'Active' | 'Non Active';
  description?: string;
};

@Injectable()
export class EquipmentActivationService {
  constructor(private readonly repository: EquipmentActivationRepository) {}

  async create(dto: CreateEquipmentActivationDto, name: string | null) {
    const dateAt = this.parseDate(dto.date_at);
    if (Number.isNaN(dateAt.getTime())) {
      throw new BadRequestException('Tanggal tidak valid');
    }
    this.assertStatus(dto.status);

    const result = await this.repository.upsertRow(
      {
        date_at: dateAt,
        equipment_code: dto.equipment_code.trim(),
        status: dto.status,
        description: dto.description?.trim(),
      },
      name,
    );
    return {
      ...this.serialize(result.record),
      created: result.created,
      updated: result.updated,
    };
  }

  async importExcel(file: Express.Multer.File, name: string | null) {
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
      cellDates: false,
      raw: true,
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      throw new BadRequestException('File tidak memiliki worksheet');
    }
    const records = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: undefined,
      raw: true,
    });

    const rows: ImportRow[] = [];
    let skipped = 0;
    const getText = (value: unknown): string | undefined => {
      if (value === null || value === undefined) return undefined;
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
    const getDate = (value: unknown): string | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
        return (
          this.normalizeImportDate(date.toISOString().slice(0, 10)) ?? undefined
        );
      }
      if (value instanceof Date) {
        const date = new Date(
          value.getFullYear(),
          value.getMonth(),
          value.getDate(),
        );
        return (
          this.normalizeImportDate(
            `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
          ) ?? undefined
        );
      }
      const text = getText(value);
      return text ? (this.normalizeImportDate(text) ?? undefined) : undefined;
    };
    const appendRow = (values: unknown[]) => {
      const [dateValue, equipmentCode, statusValue, description] = values;
      const date_at = getDate(dateValue);
      const normalizedEquipmentCode = getText(equipmentCode);
      const status = this.normalizeStatus(getText(statusValue));
      if (!date_at || !normalizedEquipmentCode || !status) {
        skipped++;
        return;
      }
      rows.push({
        date_at,
        equipment_code: normalizedEquipmentCode,
        status,
        description: getText(description),
      });
    };

    records.slice(1).forEach((record) => appendRow(record));

    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada data valid di dalam file');
    }

    const uniqueRows = new Map<string, ImportRow>();
    for (const row of rows) {
      uniqueRows.set(`${row.date_at}|${row.equipment_code}`, row);
    }

    const result = await this.repository.upsertImportRows(
      [...uniqueRows.values()].map((row) => ({
        date_at: this.parseDate(row.date_at),
        equipment_code: row.equipment_code,
        status: row.status,
        description: row.description,
      })),
      name,
    );

    return {
      imported: uniqueRows.size,
      count: result.created,
      created: result.created,
      updated: result.updated,
      skipped: skipped + rows.length - uniqueRows.size,
    };
  }

  async findAll(query: QueryEquipmentActivationDto) {
    const {
      page = 1,
      limit = 10,
      search,
      date_at,
      status,
      equipment_code,
    } = query;
    const where: Prisma.equipment_activationWhereInput = {};

    if (search) {
      where.OR = [
        { equipment_code: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (date_at) where.date_at = this.parseDate(date_at);
    if (status) where.status = status;
    if (equipment_code) where.equipment_code = equipment_code;

    const [data, total] = await this.repository.findAll({
      skip: (page - 1) * limit,
      take: limit,
      where,
    });

    return {
      data: this.serialize(data),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const record = await this.repository.findById(BigInt(id));
    if (!record) {
      throw new NotFoundException(
        `Equipment activation with ID '${id}' not found`,
      );
    }
    return this.serialize(record);
  }

  async update(
    id: string,
    dto: UpdateEquipmentActivationDto,
    name: string | null,
  ) {
    const numericId = BigInt(id);
    const existing = await this.repository.findById(numericId);
    if (!existing) {
      throw new NotFoundException(
        `Equipment activation with ID '${id}' not found`,
      );
    }

    const data: Prisma.equipment_activationUncheckedUpdateInput = {
      updated_at: new Date(),
      updated_by: name,
    };
    if (dto.date_at !== undefined) {
      const dateAt = this.parseDate(dto.date_at);
      if (Number.isNaN(dateAt.getTime())) {
        throw new BadRequestException('Tanggal tidak valid');
      }
      data.date_at = dateAt;
    }
    if (dto.equipment_code !== undefined) {
      data.equipment_code = dto.equipment_code.trim();
    }
    if (dto.status !== undefined) {
      this.assertStatus(dto.status);
      data.status = dto.status;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }

    return this.serialize(await this.repository.update(numericId, data));
  }

  async remove(id: string) {
    const numericId = BigInt(id);
    const existing = await this.repository.findById(numericId);
    if (!existing) {
      throw new NotFoundException(
        `Equipment activation with ID '${id}' not found`,
      );
    }
    return this.serialize(await this.repository.delete(numericId));
  }

  private assertStatus(
    value: string,
  ): asserts value is 'Active' | 'Non Active' {
    if (value !== 'Active' && value !== 'Non Active') {
      throw new BadRequestException(
        'Status harus bernilai Active atau Non Active',
      );
    }
  }

  private normalizeStatus(value?: string): 'Active' | 'Non Active' | null {
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'active') return 'Active';
    if (normalized === 'non active') return 'Non Active';
    return null;
  }

  private normalizeImportDate(value: string): string | null {
    const trimmed = value.trim();
    const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
    const iso = dmy
      ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
      : trimmed;
    const date = this.parseDate(iso);
    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString().slice(0, 10);
  }

  private parseDate(value: string | Date): Date {
    if (value instanceof Date) {
      return new Date(
        Date.UTC(
          value.getUTCFullYear(),
          value.getUTCMonth(),
          value.getUTCDate(),
        ),
      );
    }
    const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value.trim());
    if (iso) {
      return new Date(
        Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
      );
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return parsed;
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
  }

  private serialize(value: unknown) {
    return JSON.parse(
      JSON.stringify(value, (_, item) =>
        typeof item === 'bigint' ? item.toString() : item,
      ),
    );
  }
}
