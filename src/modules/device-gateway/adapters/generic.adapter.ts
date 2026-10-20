import { Injectable } from '@nestjs/common';
import { BaseDeviceAdapter } from './base.adapter';

/** Cadangan untuk device_model kosong / belum terdaftar. Perilaku sama seperti sebelumnya. */
@Injectable()
export class GenericDeviceAdapter extends BaseDeviceAdapter {}
