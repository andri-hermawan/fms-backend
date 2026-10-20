import { Injectable } from '@nestjs/common';
import { BaseDeviceAdapter } from './base.adapter';

/** Teltonika FMC125. Sementara memakai ID standar; timpa `ids` jika berbeda. */
@Injectable()
export class Fmc125Adapter extends BaseDeviceAdapter {
  override readonly models = ['FMC125'] as const;
}
