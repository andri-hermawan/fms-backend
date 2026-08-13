import { Injectable } from '@nestjs/common';

@Injectable()
export class TeltonikaParserService {
  parseImei(data: Buffer): string {
    const length = data.readUInt16BE(0);
    return data.slice(2, 2 + length).toString();
  }

  parseData(data: Buffer) {
    let offset = 8;
    const codecId = data.readUInt8(offset);
    offset += 1;
    const numberOfData = data.readUInt8(offset);
    offset += 1;
    const results: any[] = [];
    const limit = data.length - 4;

    for (let i = 0; i < numberOfData; i++) {
      if (offset + 15 > limit) break;

      const timestamp = Number(data.readBigUInt64BE(offset));
      offset += 8;
      offset += 1; // priority
      const longitude = data.readInt32BE(offset) / 10000000;
      offset += 4;
      const latitude = data.readInt32BE(offset) / 10000000;
      offset += 4;
      const altitude = data.readInt16BE(offset);
      offset += 2;
      const heading = data.readUInt16BE(offset);
      offset += 2;
      const satellites = data.readUInt8(offset);
      offset += 1;
      const speed = data.readUInt16BE(offset);
      offset += 2;

      const { ioData, nextOffset } = this.parseIOElements(
        data,
        offset,
        codecId,
        limit,
      );
      offset = nextOffset;

      results.push({
        timestamp: new Date(timestamp),

        // GPS
        latitude,
        longitude,
        altitude,
        heading,
        satellites,
        speed,

        // Vehicle
        ignition: ioData['239'] === 1,
        odometer: ioData['16'] ?? null,

        // Power
        external_voltage: ioData['66'] ?? null,
        internal_battery_voltage: ioData['67'] ?? null,
        battery_current: ioData['68'] ?? null,

        // GSM
        gsm_signal: ioData['21'] ?? null,
        gsm_operator: ioData['241'] ?? null,

        // GPS Accuracy
        pdop: ioData['181'] ?? null,
        hdop: ioData['182'] ?? null,
        gnss_status: ioData['69'] ?? null,

        // Fuel Sensor
        lls_fuel_level_1: ioData['201'] ?? null,
        lls_temperature_1: ioData['202'] ?? null,

        // Device
        sleep_mode: ioData['200'] ?? null,
        movement_runtime: ioData['240'] ?? null,

        // Analog
        analog_input_1: ioData['9'] ?? null,

        // Accelerometer
        accelerometer_x: ioData['17'] ?? null,
        accelerometer_y: ioData['18'] ?? null,
        accelerometer_z: ioData['19'] ?? null,

        // UL2022
        ul202: ioData['327'] ?? null,

        // Raw AVL
        all_params: ioData,
      });
    }

    return { total: results.length, records: results };
  }

  private parseIOElements(
    data: Buffer,
    startOffset: number,
    codecId: number,
    limit: number,
  ) {
    let offset = startOffset;
    const isExtended = codecId === 0x8e;
    const ioData: Record<string, any> = {};
    const headerSize = isExtended ? 4 : 2;
    if (offset + headerSize > limit) return { ioData, nextOffset: offset };

    offset += isExtended ? 2 : 1; // Event ID
    offset += isExtended ? 2 : 1; // Total IO

    const ioTypes = [1, 2, 4, 8];
    for (const size of ioTypes) {
      if (offset >= limit) break;
      const count = isExtended
        ? data.readUInt16BE(offset)
        : data.readUInt8(offset);
      offset += isExtended ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const elementSize = (isExtended ? 2 : 1) + size;
        if (offset + elementSize > limit) break;

        const id = isExtended
          ? data.readUInt16BE(offset)
          : data.readUInt8(offset);
        offset += isExtended ? 2 : 1;

        let value: any;
        if (size === 1) value = data.readInt8(offset);
        else if (size === 2) value = data.readInt16BE(offset);
        else if (size === 4) value = data.readInt32BE(offset);
        else value = data.readBigInt64BE(offset).toString();

        ioData[id.toString()] = value;
        offset += size;
      }
    }
    return { ioData, nextOffset: offset };
  }
}
