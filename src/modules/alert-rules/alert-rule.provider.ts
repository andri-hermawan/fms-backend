import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AlertRulesRepository } from './repositories/alert-rules.repository';
import {
  ALERT_CODES,
  ALERT_RULES_CACHE_TTL_MS,
  AlertCode,
  AlertRule,
  DEFAULT_ALERT_RULES,
  ResolvedAlertRules,
} from './alert-rule.constants';

// Field rule yang boleh kosong (null) dan diturunkan dari level di atasnya.
interface PartialRule {
  durationMinutes: number | null;
  speedLimit: number | null;
  fuelThreshold: number | null;
}

interface RuleSnapshot {
  categoryIds: Map<AlertCode, string>;
  global: Map<AlertCode, PartialRule>;
  project: Map<string, PartialRule>; // key: code|project_id
  segment: Map<string, PartialRule>; // key: code|project_id|segment (normalized)
}

const ALL_CODES = Object.values(ALERT_CODES) as AlertCode[];

// Nama segment dicocokkan tanpa membedakan huruf besar/kecil & spasi di ujung
// (sama dengan unique index uq_alert_rules_scope).
const normalizeSegment = (segment: string) => segment.trim().toLowerCase();

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

@Injectable()
export class AlertRuleProvider {
  private readonly logger = new Logger(AlertRuleProvider.name);
  private snapshot: RuleSnapshot | null = null;
  private loadedAt = 0;
  private loading: Promise<RuleSnapshot> | null = null;

  constructor(private readonly repository: AlertRulesRepository) {}

  /**
   * Threshold efektif untuk satu paket telemetry.
   * Urutan: default kode -> global -> project -> segment (per kolom, null diabaikan).
   * Tidak pernah throw: jika DB gagal, default kode yang dipakai.
   */
  async resolve(
    projectId: string | null | undefined,
    segmentName: string,
  ): Promise<ResolvedAlertRules> {
    const snapshot = await this.getSnapshot();
    const resolved = {} as ResolvedAlertRules;
    const segmentKey = normalizeSegment(segmentName);

    for (const code of ALL_CODES) {
      const layers = [
        snapshot.global.get(code),
        projectId ? snapshot.project.get(`${code}|${projectId}`) : undefined,
        projectId
          ? snapshot.segment.get(`${code}|${projectId}|${segmentKey}`)
          : undefined,
      ];

      const rule: AlertRule = {
        ...DEFAULT_ALERT_RULES[code],
        categoryId:
          snapshot.categoryIds.get(code) ??
          DEFAULT_ALERT_RULES[code].categoryId,
      };
      for (const layer of layers) {
        if (!layer) continue;
        if (layer.durationMinutes !== null)
          rule.durationMinutes = layer.durationMinutes;
        if (layer.speedLimit !== null) rule.speedLimit = layer.speedLimit;
        if (layer.fuelThreshold !== null)
          rule.fuelThreshold = layer.fuelThreshold;
      }
      resolved[code] = rule;
    }

    return resolved;
  }

  // Dipanggil setelah create/update/delete agar perubahan dari frontend langsung berlaku.
  invalidate() {
    this.loadedAt = 0;
  }

  private async getSnapshot(): Promise<RuleSnapshot> {
    const isFresh =
      this.snapshot && Date.now() - this.loadedAt < ALERT_RULES_CACHE_TTL_MS;
    if (isFresh) return this.snapshot!;

    // Satu query untuk banyak paket telemetry yang datang bersamaan.
    this.loading ??= this.load().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private async load(): Promise<RuleSnapshot> {
    const snapshot: RuleSnapshot = {
      categoryIds: new Map(),
      global: new Map(),
      project: new Map(),
      segment: new Map(),
    };

    try {
      const [categories, rules] = await Promise.all([
        this.repository.findCategoriesByCodes(ALL_CODES),
        this.repository.findActiveWithCategoryCode(),
      ]);

      for (const category of categories) {
        snapshot.categoryIds.set(
          category.alert_category_code as AlertCode,
          category.id,
        );
      }

      for (const rule of rules) {
        const code = rule.alert_categories.alert_category_code as AlertCode;
        if (!ALL_CODES.includes(code)) continue;

        const partial: PartialRule = {
          durationMinutes: toNumber(rule.duration_minutes),
          speedLimit: toNumber(rule.speed_limit),
          fuelThreshold: toNumber(rule.fuel_threshold),
        };

        if (!rule.project_id) {
          snapshot.global.set(code, partial);
        } else if (!rule.segment?.trim()) {
          snapshot.project.set(`${code}|${rule.project_id}`, partial);
        } else {
          snapshot.segment.set(
            `${code}|${rule.project_id}|${normalizeSegment(rule.segment)}`,
            partial,
          );
        }
      }
    } catch (e: unknown) {
      // Tabel belum dibuat / DB error: tetap jalan dengan snapshot terakhir atau default.
      this.logger.warn(
        `Alert rules gagal dimuat, memakai ${this.snapshot ? 'cache terakhir' : 'default'}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      // Simpan juga saat gagal supaya DB tidak di-query ulang di setiap paket.
      this.snapshot ??= snapshot;
      this.loadedAt = Date.now();
      return this.snapshot;
    }

    this.snapshot = snapshot;
    this.loadedAt = Date.now();
    return snapshot;
  }
}
