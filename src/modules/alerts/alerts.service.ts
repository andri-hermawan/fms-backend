import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertsRepository } from './repositories/alerts.repository';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(private readonly repository: AlertsRepository) {}

  // Helper untuk serialisasi BigInt ke String
  private serialize(data: any) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async create(dto: CreateAlertDto) {
    return await this.repository.create(dto);
  }

  async findAll(query: QueryAlertDto) {
    const {
      page = 1,
      limit = 10,
      search,
      id,
      created_at,
      created_at_end,
      alert_category_id,
      is_read,
      shift,
    } = query;
    // console.log('DEBUG findAll query:', JSON.stringify(query));
    // console.log('DEBUG is_read value:', is_read, typeof is_read);
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.alertsWhereInput = {};
    if (search) {
      where.OR = [
        {
          equipments: {
            equipment_code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          alert_categories: {
            alert_category_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }
    if (alert_category_id) {
      where.alert_category_id = alert_category_id;
    }
    if (shift) {
      where.shift = shift;
    }
    if (is_read !== undefined) {
      if (is_read === false) {
        where.OR = [...(where.OR ?? []), { is_read: false }, { is_read: null }];
      } else {
        where.is_read = true;
      }
    }
    if (id) where.id = BigInt(id);
    if (created_at || created_at_end) {
      where.created_at = {};

      if (created_at) {
        where.created_at.gte = new Date(`${created_at}T00:00:00.000Z`);
      }

      if (created_at_end) {
        where.created_at.lte = new Date(`${created_at_end}T23:59:59.999Z`);
      }
    }

    const [total, data] = await this.repository.findAll({
      skip,
      take: Number(limit),
      where,
    });

    return {
      data: this.serialize(data),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(total) / Number(limit)),
      },
    };
  }

  async findAlertSummary(query: QueryAlertDto) {
    const { search, created_at, created_at_end, alert_category_id, shift } =
      query;

    const rows = await this.repository.findAlertSummary({
      search,
      created_at_start: created_at ? new Date(created_at) : undefined,
      created_at_end: created_at_end ? new Date(created_at_end) : undefined,
      alert_category_id,
      shift,
    });

    return rows.map((item) => ({
      alert_category_name: item.alert_category_name,
      equipment_code: item.equipment_code,
      alert_count: Number(item.alert_count),
      duration: item.duration ?? '00:00',
    }));
  }

  async findSummaryByDateShift(date: string, shift: string) {
    const rows = await this.repository.findSummaryByDateShift({ date, shift });

    const vesselStatuses = ['empty', 'loaded', 'unknown'];

    // Normalisasi judul: gabungkan "Fuel Decrease Engine On" & "Fuel Decrease Engine Off"
    // menjadi satu kategori "Fuel Decrease".
    const normalizeTitle = (title: string): string => {
      if (title && title.toLowerCase().startsWith('fuel decrease')) {
        return 'Fuel Decrease';
      }
      return title;
    };

    // Urutan kategori tetap: keempat kategori selalu tampil meskipun kosong.
    const order = ['Fuel Decrease', 'Off Track', 'Overspeed', 'Underspeed'];

    const emptySummary = () =>
      Object.fromEntries(vesselStatuses.map((s) => [s, { events: 0, dt: 0 }]));

    const grouped = new Map<
      string,
      Record<string, { events: number; dt: number }>
    >(order.map((title) => [title, emptySummary()]));

    for (const row of rows) {
      const title = normalizeTitle(row.title ?? '');
      if (!title) continue;

      const status = row.vessel_status ?? 'unknown';
      if (!vesselStatuses.includes(status)) continue;

      const summary = grouped.get(title);
      if (!summary) continue; // Kategori di luar daftar tetap diabaikan

      summary[status].events += Number(row.events ?? 0);
      summary[status].dt += Number(row.dt ?? 0);
    }

    return order.map((title) => ({
      title,
      ...grouped.get(title)!,
    }));
  }

  async findAbnormalActivity(date: string, shift: string) {
    const [hourlyRows, segmentRows, geoSegments, startHour] = await Promise.all(
      [
        this.repository.findAbnormalHourly({ date, shift }),
        this.repository.findAbnormalBySegment({ date, shift }),
        this.repository.findAttributeGeoSegments(),
        this.repository.findShiftStartHour(shift),
      ],
    );

    const categories = [
      { key: 'fuelDecrease', label: 'Fuel Decrease' },
      { key: 'offTrack', label: 'Off Track' },
      { key: 'overspeed', label: 'Overspeed' },
      { key: 'underspeed', label: 'Underspeed' },
    ];

    // ---- abnormalEventLocation ----
    const segmentKeys = [
      'Unknown',
      ...geoSegments.map((row) => row.segment),
    ].filter((segment, index, arr) => arr.indexOf(segment) === index);

    const segmentMap = new Map<
      string,
      {
        fuelDecrease: number;
        offTrack: number;
        overspeed: number;
        underspeed: number;
      }
    >();
    for (const segment of segmentKeys) {
      segmentMap.set(segment, {
        fuelDecrease: 0,
        offTrack: 0,
        overspeed: 0,
        underspeed: 0,
      });
    }

    const categoryKey = (label: string) =>
      categories.find((c) => c.label === label)?.key;

    for (const row of segmentRows) {
      const key = categoryKey(row.category);
      if (!key) continue;

      const segment = segmentKeys.includes(row.segment)
        ? row.segment
        : 'Unknown';
      const entry = segmentMap.get(segment);
      if (!entry) continue;
      entry[key as keyof typeof entry] += Number(row.events ?? 0);
    }

    const abnormalEventLocation = segmentKeys.map((segment) => ({
      segment,
      ...segmentMap.get(segment)!,
    }));

    // ---- hourlyFrequency & equipmentQuantity ----
    // 12 slot jam mengikuti jam mulai shift (timezone kolom shifts).
    const beginHour = startHour ?? 7;

    const buildHourly = (valueField: 'events' | 'equipment_count') => {
      const result: Record<string, number[]> = {};
      for (const category of categories) {
        const buckets = new Array<number>(12).fill(0);

        for (const row of hourlyRows) {
          if (row.category !== category.label) continue;

          const index = (Number(row.hour) - beginHour + 24) % 24;
          if (index >= 0 && index < 12) {
            buckets[index] += Number(row[valueField] ?? 0);
          }
        }

        result[category.label] = buckets;
      }
      return result;
    };

    const hourlyFrequency = buildHourly('events');
    const equipmentQuantity = buildHourly('equipment_count');

    return {
      abnormalEventLocation,
      hourlyFrequency,
      equipmentQuantity,
    };
  }

  async findOne(id: string) {
    const alert = await this.repository.findById(BigInt(id));
    if (!alert) throw new NotFoundException(`Alert with ID '${id}' not found`);
    return this.serialize(alert);
  }

  async update(id: string, dto: UpdateAlertDto, userId: string) {
    await this.findOne(id); // Validasi keberadaan data
    const result = await this.repository.update(BigInt(id), {
      ...dto,
      updated_by: userId,
      updated_at: new Date(),
    });
    return this.serialize(result);
  }

  async markAsRead(id: string) {
    await this.findOne(id); // Validasi keberadaan data
    const result = await this.repository.markAsRead(BigInt(id));
    return this.serialize(result);
  }

  async remove(id: string) {
    await this.findOne(id); // Validasi keberadaan data
    return await this.repository.delete(BigInt(id));
  }
}
