import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AlertRuleProvider } from '../../alert-rules/alert-rule.provider';
import {
  WhatsappService,
  normalizePhoneNumber,
} from '../../whatsapp/whatsapp.service';
import type { AlertDispatchParams } from './alert-dispatcher.service';

const TIMEZONE = 'Asia/Jakarta';

// 15-10-2026 14:32 (WIB)
const formatWib = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`;
};

// Angka dari Decimal / string / number; null jika tidak valid.
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatNumber = (value: unknown, unit: string) => {
  const n = toNumber(value);
  return n === null ? '-' : `${Number(n.toFixed(1))} ${unit}`;
};

/**
 * Kirim notifikasi WhatsApp untuk alert baru ke penerima di alert rule.
 * Fire-and-forget: tidak pernah throw dan tidak ditunggu pipeline telemetry,
 * sehingga server WA mati/lambat tidak mempengaruhi penyimpanan alert.
 */
@Injectable()
export class AlertNotifierService {
  private readonly logger = new Logger(AlertNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleProvider: AlertRuleProvider,
    private readonly whatsapp: WhatsappService,
  ) {}

  async notify(params: AlertDispatchParams): Promise<void> {
    try {
      if (!this.whatsapp.isEnabled) return;

      const equipment = await this.prisma.equipments.findUnique({
        where: { id: params.equipmentId },
        select: {
          project_id: true,
          projects: { select: { project_name: true } },
        },
      });

      const recipients = await this.ruleProvider.resolveRecipients(
        params.categoryId,
        equipment?.project_id,
        params.info.segment,
      );
      // Satu nomor cukup satu pesan walau dipakai beberapa user.
      const phones = [
        ...new Set(
          recipients
            .map((r) => normalizePhoneNumber(r.phoneNumber))
            .filter((p): p is string => !!p),
        ),
      ];
      if (!phones.length) return;

      const message = this.buildMessage(
        params,
        equipment?.projects?.project_name,
      );
      const results = await Promise.all(
        phones.map((phone) => this.whatsapp.send(phone, message)),
      );
      const sent = results.filter(Boolean).length;
      this.logger.log(
        `WA alert "${params.status}" ${params.info.equipment_code}: ${sent}/${phones.length} terkirim`,
      );
    } catch (e: unknown) {
      this.logger.error(
        `WA Alert Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private buildMessage(
    { status, createdAt, info, event }: AlertDispatchParams,
    projectName?: string | null,
  ) {
    const location = [projectName, info.segment].filter(Boolean).join(' / ');
    const shift = info.shift ? ` (${info.shift})` : '';
    // Volume fuel dari event (hasil kalibrasi) bila ada.
    const fuel = toNumber(event.fuel_volume) ?? toNumber(info.fuel_volume);

    return [
      `⚠️ FMS ALERT – ${status}`,
      `Equipment : ${info.equipment_code}`,
      `Project   : ${location || '-'}`,
      `Speed     : ${formatNumber(info.speed, 'km/h')}`,
      `Fuel      : ${formatNumber(fuel, 'liter')}`,
      `Operator  : ${info.operator_name || '-'}`,
      `Waktu     : ${formatWib(createdAt)} WIB${shift}`,
      `Lokasi    : https://maps.google.com/?q=${info.latitude},${info.longitude}`,
    ].join('\n');
  }
}
