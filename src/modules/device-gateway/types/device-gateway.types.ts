/**
 * Satu AVL record hasil baca byte codec, SEBELUM diterjemahkan oleh adapter.
 * `ioData` berisi pasangan { ioId: nilaiMentah } tanpa arti.
 */
export interface RawAvlRecord {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  satellites: number;
  speed: number;
  ioData: Record<string, any>;
}

export interface ParsedAvlPacket {
  total: number;
  records: RawAvlRecord[];
}

/**
 * Kontrak output standar semua adapter. Konsumen (EquipmentLogsService, alert,
 * geofence, snapshot) hanya bergantung pada bentuk ini, bukan pada model FMC.
 */
export interface NormalizedRecord {
  timestamp: Date;

  // GPS
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  satellites: number;
  speed: number;

  // Vehicle
  ignition: boolean;
  odometer: number | null;
  mileage: number | null;

  // Power
  external_voltage: number | null;
  internal_battery_voltage: number | null;
  battery_current: number | null;

  // GSM
  gsm_signal: number | null;
  gsm_operator: number | null;

  // GPS Accuracy
  pdop: number | null;
  hdop: number | null;
  gnss_status: number | null;

  // Fuel Sensor
  lls_fuel_level_1: number | null;
  lls_temperature_1: number | null;

  // Device
  sleep_mode: number | null;
  movement_runtime: number | null;

  // Analog
  analog_input_1: number | null;

  // Accelerometer
  accelerometer_x: number | null;
  accelerometer_y: number | null;
  accelerometer_z: number | null;

  // Raw AVL
  all_params: Record<string, any>;
}

/**
 * Peta "ID IO Teltonika" untuk tiap nilai standar.
 * `null` = tidak tersedia di model tersebut (nilai jadi null / jatuh ke data GPS).
 */
export interface IoIdMap {
  ignition: string | null;
  odometer: string | null;
  /** Total mileage (mis. CAN). Model lama memakai ID yang sama dengan odometer. */
  mileage: string | null;
  /** Speed dari IO. null = pakai speed dari field GPS paket. */
  speed: string | null;
  /** Koordinat ISO6709 (hanya lat & long dipakai). null = pakai lat/long dari field GPS paket. */
  location: string | null;
  external_voltage: string | null;
  internal_battery_voltage: string | null;
  battery_current: string | null;
  gsm_signal: string | null;
  gsm_operator: string | null;
  pdop: string | null;
  hdop: string | null;
  gnss_status: string | null;
  lls_fuel_level_1: string | null;
  lls_temperature_1: string | null;
  sleep_mode: string | null;
  movement_runtime: string | null;
  analog_input_1: string | null;
  accelerometer_x: string | null;
  accelerometer_y: string | null;
  accelerometer_z: string | null;
}

export interface DeviceAdapter {
  /** Nama model (sudah dinormalisasi: huruf besar, tanpa spasi/tanda hubung). */
  readonly models: readonly string[];
  /** true = codec parser juga membaca elemen IO panjang-variabel (NX, Codec 8E). */
  readonly readVariableLengthIo: boolean;
  normalize(raw: RawAvlRecord): NormalizedRecord;
}
