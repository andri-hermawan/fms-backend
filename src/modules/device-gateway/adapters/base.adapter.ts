import {
  DeviceAdapter,
  IoIdMap,
  NormalizedRecord,
  RawAvlRecord,
} from '../types/device-gateway.types';
import { parseIso6709 } from './iso6709';

/** ID IO standar (dipakai FMC125 dan model lain yang belum punya pemetaan khusus). */
export const DEFAULT_IO_IDS: IoIdMap = {
  ignition: '239',
  odometer: '16',
  mileage: '16', // sama dengan odometer, seperti perilaku sebelumnya
  speed: null, // pakai speed dari field GPS paket
  location: null, // pakai lat/long/altitude dari field GPS paket
  external_voltage: '66',
  internal_battery_voltage: '67',
  battery_current: '68',
  gsm_signal: '21',
  gsm_operator: '241',
  pdop: '181',
  hdop: '182',
  gnss_status: '69',
  lls_fuel_level_1: '201',
  lls_temperature_1: '202',
  sleep_mode: '200',
  movement_runtime: '240',
  analog_input_1: '9',
  accelerometer_x: '17',
  accelerometer_y: '18',
  accelerometer_z: '19',
};

export class BaseDeviceAdapter implements DeviceAdapter {
  readonly models: readonly string[] = [];

  readonly readVariableLengthIo: boolean = false;

  protected readonly ids: IoIdMap = DEFAULT_IO_IDS;

  normalize(raw: RawAvlRecord): NormalizedRecord {
    const io = raw.ioData;
    const ids = this.ids;
    const read = (id: string | null) => (id ? (io[id] ?? null) : null);

    const location = ids.location ? parseIso6709(io[ids.location]) : null;

    return {
      timestamp: new Date(raw.timestamp),

      // GPS
      latitude: location?.latitude ?? raw.latitude,
      longitude: location?.longitude ?? raw.longitude,
      altitude: raw.altitude,
      heading: raw.heading,
      satellites: raw.satellites,
      speed: read(ids.speed) ?? raw.speed,

      // Vehicle
      ignition: ids.ignition ? io[ids.ignition] === 1 : false,
      odometer: read(ids.odometer),
      mileage: read(ids.mileage),

      // Power
      external_voltage: read(ids.external_voltage),
      internal_battery_voltage: read(ids.internal_battery_voltage),
      battery_current: read(ids.battery_current),

      // GSM
      gsm_signal: read(ids.gsm_signal),
      gsm_operator: read(ids.gsm_operator),

      // GPS Accuracy
      pdop: read(ids.pdop),
      hdop: read(ids.hdop),
      gnss_status: read(ids.gnss_status),

      // Fuel Sensor
      lls_fuel_level_1: read(ids.lls_fuel_level_1),
      lls_temperature_1: read(ids.lls_temperature_1),

      // Device
      sleep_mode: read(ids.sleep_mode),
      movement_runtime: read(ids.movement_runtime),

      // Analog
      analog_input_1: read(ids.analog_input_1),

      // Accelerometer
      accelerometer_x: read(ids.accelerometer_x),
      accelerometer_y: read(ids.accelerometer_y),
      accelerometer_z: read(ids.accelerometer_z),

      // Raw AVL
      all_params: io,
    };
  }
}
