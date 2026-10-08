// Kode kategori di tabel alert_categories yang dipakai oleh detector telemetry.
export const ALERT_CODES = {
  OFF_TRACK: 'OFT',
  OVERSPEED: 'OVS',
  UNDERSPEED: 'UVS',
  FUEL_DECREASE_ENGINE_ON: 'FUD',
  FUEL_DECREASE_ENGINE_OFF: 'FUO',
} as const;

export type AlertCode = (typeof ALERT_CODES)[keyof typeof ALERT_CODES];

export interface AlertRule {
  categoryId: string;
  durationMinutes: number;
  speedLimit: number;
  fuelThreshold: number;
}

export type ResolvedAlertRules = Record<AlertCode, AlertRule>;

// Fallback ketika tabel alert_rules belum ada / kosong / gagal dibaca.
// Nilai ini sama persis dengan threshold yang sebelumnya ditulis di kode.
export const DEFAULT_ALERT_RULES: ResolvedAlertRules = {
  [ALERT_CODES.OFF_TRACK]: {
    categoryId: 'a9bd6aa2-94d5-4266-9135-0fff314a6714',
    durationMinutes: 3,
    speedLimit: 0,
    fuelThreshold: 0,
  },
  [ALERT_CODES.OVERSPEED]: {
    categoryId: 'ac85c75e-39ee-4cd9-ba7d-2822948d6022',
    durationMinutes: 1,
    speedLimit: 50,
    fuelThreshold: 0,
  },
  [ALERT_CODES.UNDERSPEED]: {
    categoryId: '8d41e23c-f91b-4ec9-807d-1ebe1a3ec669',
    durationMinutes: 2,
    speedLimit: 10,
    fuelThreshold: 0,
  },
  [ALERT_CODES.FUEL_DECREASE_ENGINE_ON]: {
    categoryId: '5c6e755c-28fb-4058-8180-0e887f98cd5a',
    durationMinutes: 2,
    speedLimit: 0,
    fuelThreshold: -5,
  },
  [ALERT_CODES.FUEL_DECREASE_ENGINE_OFF]: {
    categoryId: 'e2c35eaa-9679-4f09-83be-b95b9ab6a5d7',
    durationMinutes: 0,
    speedLimit: 0,
    fuelThreshold: -5,
  },
};

// Rule dibaca setiap paket telemetry, jadi disimpan di memory.
export const ALERT_RULES_CACHE_TTL_MS = 60_000;
