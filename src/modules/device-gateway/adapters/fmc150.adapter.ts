import { Injectable } from '@nestjs/common';
import { IoIdMap } from '../types/device-gateway.types';
import { BaseDeviceAdapter, DEFAULT_IO_IDS } from './base.adapter';

/** Teltonika FMC150. Selain yang ditimpa di bawah, memakai ID standar. */
@Injectable()
export class Fmc150Adapter extends BaseDeviceAdapter {
  override readonly models = ['FMC150'] as const;

  /** ID 387 (ISO6709) adalah elemen panjang-variabel (NX) di Codec 8E. */
  override readonly readVariableLengthIo = true;

  protected override readonly ids: IoIdMap = {
    ...DEFAULT_IO_IDS,
    location: '387', // lat & long (ISO6709); altitude & heading tetap raw
    speed: '24',
    mileage: '87', // Total Mileage (CAN)
    lls_fuel_level_1: null, // Fuel Level (CAN): ID belum diketahui
    lls_temperature_1: null, // tidak tersedia
  };
}
