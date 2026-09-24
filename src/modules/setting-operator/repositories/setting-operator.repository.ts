import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Prisma, daily_setting_operator } from '@prisma/client';

@Injectable()
export class SettingOperatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.daily_setting_operatorUncheckedCreateInput,
  ): Promise<daily_setting_operator> {
    return await this.prisma.daily_setting_operator.create({ data });
  }

  async createMany(
    data: Prisma.daily_setting_operatorUncheckedCreateInput[],
  ): Promise<{ count: number }> {
    return await this.prisma.daily_setting_operator.createMany({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.daily_setting_operatorWhereInput;
    orderBy?: Prisma.daily_setting_operatorOrderByWithRelationInput;
  }): Promise<[daily_setting_operator[], number]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.$transaction([
      this.prisma.daily_setting_operator.findMany({
        skip,
        take,
        where,
        orderBy,
      }),
      this.prisma.daily_setting_operator.count({ where }),
    ]);
  }

  async findById(id: bigint): Promise<daily_setting_operator | null> {
    return await this.prisma.daily_setting_operator.findUnique({
      where: { id },
    });
  }

  /**
   * Mencari `operator_name` berdasarkan `date`, `equipment_id`, dan `shift`.
   *
   * `daily_setting_operator` tidak punya kolom yang bisa di-relasikan langsung
   * ke `equipments`, sehingga join dilakukan lewat kolom `equipment_code`:
   * `equipments.id` -> `equipments.equipment_code`
   * -> `daily_setting_operator.equipment_code`.
   *
   * Filter `date` dan `shift` diterapkan pada tabel `daily_setting_operator`.
   * Bila ada lebih dari satu baris, dipakai data yang terakhir dimasukkan.
   */
  async findOperatorNameByEquipmentID(params: {
    equipment_id: string;
    date: Date | string;
    shift?: string;
  }): Promise<string | null> {
    const { equipment_id, date, shift } = params;
    if (!equipment_id) return null;

    const normalizedDate = this.toDateOnlyString(date);
    if (!normalizedDate) return null;

    const normalizedShift = typeof shift === 'string' ? shift.trim() : shift;

    const result = await this.prisma.$queryRaw<
      { operator_name: string | null }[]
    >`
      SELECT dso.operator_name
      FROM equipments e
      INNER JOIN daily_setting_operator dso
        ON dso.equipment_code = e.equipment_code
      WHERE e.id = ${equipment_id}::uuid
        AND dso.date_at = ${normalizedDate}::date
        ${
          normalizedShift
            ? Prisma.sql`AND dso.shift = ${normalizedShift}`
            : Prisma.empty
        }
      ORDER BY dso.id DESC
      LIMIT 1
    `;

    return result[0]?.operator_name ?? null;
  }

  /**
   * Normalisasi nilai tanggal menjadi string `YYYY-MM-DD` agar aman
   * dikirim sebagai parameter date ke PostgreSQL.
   */
  private toDateOnlyString(value: Date | string): string | null {
    if (!value) return null;

    let date: Date;
    if (value instanceof Date) {
      date = new Date(value);
    } else {
      const str = value.trim();

      // Format YYYY-MM-DD / YYYY/MM/DD.
      const ymd = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
      if (ymd) {
        date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      } else {
        // Format DD/MM/YYYY atau D/M/YYYY (dengan pemisah / - .).
        const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
        date = dmy
          ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
          : new Date(str);
      }
    }

    if (Number.isNaN(date.getTime())) return null;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async update(
    id: bigint,
    data: Prisma.daily_setting_operatorUncheckedUpdateInput,
  ): Promise<daily_setting_operator> {
    return await this.prisma.daily_setting_operator.update({
      where: { id },
      data,
    });
  }

  async delete(id: bigint): Promise<daily_setting_operator> {
    return await this.prisma.daily_setting_operator.delete({ where: { id } });
  }
}
