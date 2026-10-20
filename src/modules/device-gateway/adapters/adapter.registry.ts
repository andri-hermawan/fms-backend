import { Injectable, Logger } from '@nestjs/common';
import { DeviceAdapter } from '../types/device-gateway.types';
import { Fmc125Adapter } from './fmc125.adapter';
import { Fmc150Adapter } from './fmc150.adapter';
import { GenericDeviceAdapter } from './generic.adapter';

@Injectable()
export class DeviceAdapterRegistry {
  private readonly logger = new Logger(DeviceAdapterRegistry.name);
  private readonly byModel = new Map<string, DeviceAdapter>();
  private readonly warnedModels = new Set<string>();

  constructor(
    fmc125: Fmc125Adapter,
    fmc150: Fmc150Adapter,
    private readonly generic: GenericDeviceAdapter,
  ) {
    for (const adapter of [fmc125, fmc150]) {
      for (const model of adapter.models) {
        this.byModel.set(this.normalizeModel(model), adapter);
      }
    }
  }

  /** Pilih adapter dari `devices.device_model`; model kosong/tak dikenal -> generic. */
  resolve(deviceModel?: string | null): DeviceAdapter {
    const key = this.normalizeModel(deviceModel);
    if (!key) return this.generic;

    const exact = this.byModel.get(key);
    if (exact) return exact;

    // Toleran terhadap nama seperti "Teltonika FMC-125"
    for (const [model, adapter] of this.byModel) {
      if (key.includes(model)) return adapter;
    }

    if (!this.warnedModels.has(key)) {
      this.warnedModels.add(key);
      this.logger.warn(
        `device_model '${deviceModel}' belum punya adapter, memakai adapter generic`,
      );
    }
    return this.generic;
  }

  private normalizeModel(model?: string | null): string {
    return (model ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}
