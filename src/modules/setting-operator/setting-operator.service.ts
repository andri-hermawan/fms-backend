import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SettingOperatorRepository } from './repositories/setting-operator.repository';
import { CreateSettingOperatorDto } from './dto/create-setting-operator.dto';
import { UpdateSettingOperatorDto } from './dto/update-setting-operator.dto';
import { QuerySettingOperatorDto } from './dto/query-setting-operator.dto';
import { EquipmentsRepository } from '../equipments/repositories/equipments.repository';
import { EquipmentStatusRepository } from '../equipment-status/repositories/equipment-status.repository';
import { WebSocketGatewayService } from '../../common/websocket/websocket.gateway';
import * as ExcelJS from 'exceljs';
import type { Express } from 'express';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingOperatorService {
  private readonly logger = new Logger(SettingOperatorService.name);

  constructor(
    private readonly repository: SettingOperatorRepository,
    private readonly equipmentsRepository: EquipmentsRepository,
    private readonly equipmentStatusRepository: EquipmentStatusRepository,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

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
          `[importExcel] Excel row=${rowNumber} raw=${JSON.stringify(rawValues, (_, value) => (value instanceof Date ? value.toISOString() : value))}`,
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
          if (
            typeof val === 'string' ||
            typeof val === 'number' ||
            typeof val === 'boolean' ||
            typeof val === 'bigint'
          ) {
            return String(val);
          }
          return undefined;
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

    const rowsWithKeys = rows.map((row) => ({
      row,
      date_at: this.parseDate(row.date_at),
      shift: row.shift.trim(),
      equipment_code: row.equipment_code.trim(),
    }));
    const importedKeys = new Set<string>();
    const uniqueRows = rowsWithKeys
      .filter(({ date_at, shift, equipment_code }) => {
        const key = this.buildImportKey(date_at, shift, equipment_code);
        if (importedKeys.has(key)) {
          this.logger.warn(
            `[importExcel] dilewati karena key sudah ada: date_at=${date_at.toISOString().slice(0, 10)}, shift=${shift}, equipment_code=${equipment_code}`,
          );
          return false;
        }
        importedKeys.add(key);
        return true;
      })
      .map(({ row, date_at, shift, equipment_code }) => ({
        ...row,
        date_at: date_at.toISOString().slice(0, 10),
        shift,
        equipment_code,
      }));

    if (uniqueRows.length === 0) {
      return {
        imported: 0,
        count: 0,
        created: 0,
        updated: 0,
        skipped: rows.length,
      };
    }

    const result = await this.repository.upsertImportRows(
      uniqueRows.map((row) => ({
        date_at: this.parseDate(row.date_at),
        shift: row.shift,
        equipment_code: row.equipment_code,
        operator_name: row.operator_name,
        description: row.description,
      })),
    );

    const now = new Date();
    const todayString = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    for (const row of uniqueRows) {
      if (!row.operator_name) {
        continue;
      }

      const dateAt = this.parseDate(row.date_at);

      if (
        Number.isNaN(dateAt.getTime()) ||
        dateAt.getUTCFullYear() !== todayString.getUTCFullYear() ||
        dateAt.getUTCMonth() !== todayString.getUTCMonth() ||
        dateAt.getUTCDate() !== todayString.getUTCDate()
      ) {
        continue;
      }

      const equipment = await this.equipmentsRepository.findByCode(
        row.equipment_code,
      );

      if (!equipment) {
        this.logger.warn(
          `[importExcel] equipment_code=${row.equipment_code} tidak ditemukan, skip update operator_name`,
        );
        continue;
      }

      const updatedStatus =
        await this.equipmentStatusRepository.updateOperatorNameByDateAndShift({
          equipment_id: equipment.id,
          date_at: dateAt,
          shift: row.shift,
          operator_name: row.operator_name,
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
            operator_name: row.operator_name,
          });
        }
      }
    }

    return {
      imported: uniqueRows.length,
      count: result.created,
      created: result.created,
      updated: result.updated,
      skipped: rows.length - uniqueRows.length,
    };
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

  /**
   * Mengambil `operator_name` berdasarkan `date`, `equipment_id`, dan `shift`.
   *
   * `equipment_id` di-join lewat `equipments.equipment_code`,
   * sedangkan filter `date` dan `shift` mengacu ke `daily_setting_operator`.
   */
  async findOperatorNameByEquipmentID(params: {
    date: string;
    equipment_id: string;
    shift?: string;
  }) {
    const { date, equipment_id, shift } = params;
    const operator_name =
      await this.repository.findOperatorNameByEquipmentID(params);
    return { date, equipment_id, shift, operator_name };
  }

  async update(id: string, dto: UpdateSettingOperatorDto) {
    const existing = await this.repository.findById(BigInt(id));
    if (!existing) {
      throw new NotFoundException(`Setting operator with ID '${id}' not found`);
    }
    const data: Prisma.daily_setting_operatorUncheckedUpdateInput = {};
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
    const isoDate = match ? `${match[3]}-${match[2]}-${match[1]}` : dateValue;
    const parsedDate = new Date(isoDate);

    if (isNaN(parsedDate.getTime())) return undefined;
    return isoDate;
  }

  /**
   * Normalisasi tanggal dari file import menjadi Date (UTC midnight)
   * agar konsisten saat dibandingkan dengan tanggal hari ini.
   */
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

    // Format hasil import YYYY/MM/DD atau YYYY-MM-DD.
    const ymd = str.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
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

  private buildImportKey(
    date_at: Date | null,
    shift: string | null,
    equipment_code: string | null,
  ): string {
    return `${date_at?.toISOString().slice(0, 10)}|${shift?.trim()}|${equipment_code?.trim()}`;
  }
}
