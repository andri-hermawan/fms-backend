import { ResolvedAlertRules } from '../../alert-rules/alert-rule.constants';
import { EquipmentLogsRepository } from '../repositories/equipment-logs.repository';
import { CalibrationLookup } from './fuel-calibration-lookup';

export type LastLog = NonNullable<
  Awaited<ReturnType<EquipmentLogsRepository['findByIdLastEquip']>>
>;

export type SavedLog = Awaited<ReturnType<EquipmentLogsRepository['create']>>;

/**
 * Data telemetry yang sudah dinormalisasi dan dibagikan ke alert & fuel.
 * Field fuel_* dan mileage diteruskan apa adanya dari log tersimpan
 * (Prisma.Decimal / number / null) sehingga nilainya identik dengan DB.
 */
export interface AlertInfo {
  is_inside: boolean;
  equipment_code: string;
  breakdown: boolean;
  vessel: any;
  segment: string;
  category_location: string;
  orig_fid: number;
  longitude: number;
  latitude: number;
  speed: number;
  fuel_level: any;
  fuel_volume: any;
  fuel_percentage: any;
  fuel_difference: any;
  fuel_temperature: any;
  engine_status: boolean;
  mileage: any;
  vessel_status: string;
  shift: string | null;
  alert_period_date: string;
  status_engine: string;
  operator_name: string | null;
}

// Konteks satu paket telemetry yang dipakai semua detector alert.
export interface TelemetryContext {
  equipmentId: string;
  logId: bigint;
  // created_at log tersimpan; acuan waktu semua perhitungan durasi alert.
  time: Date;
  info: AlertInfo;
  rules: ResolvedAlertRules;
  lookupCalibration: CalibrationLookup;
}
