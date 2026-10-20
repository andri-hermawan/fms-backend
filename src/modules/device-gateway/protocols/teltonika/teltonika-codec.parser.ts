import { Injectable } from '@nestjs/common';
import {
  ParsedAvlPacket,
  RawAvlRecord,
} from '../../types/device-gateway.types';

/**
 * Membaca "bungkus" paket Teltonika (Codec 8 / 8 Extended) menjadi record mentah.
 * Tidak mengetahui arti ID sensor, itu tugas adapter per model.
 */
@Injectable()
export class TeltonikaCodecParser {
  parseImei(data: Buffer): string {
    const length = data.readUInt16BE(0);
    return data.slice(2, 2 + length).toString();
  }

  /**
   * @param options.variableLengthIo baca juga elemen IO panjang-variabel (NX,
   *   khusus Codec 8E). Default false = perilaku lama (NX diabaikan).
   */
  parsePacket(
    data: Buffer,
    options: { variableLengthIo?: boolean } = {},
  ): ParsedAvlPacket {
    let offset = 8;

    if (offset >= data.length) {
      return { total: 0, records: [] };
    }

    const codecId = data.readUInt8(offset);
    offset += 1;

    if (offset >= data.length) {
      return { total: 0, records: [] };
    }

    const numberOfData = data.readUInt8(offset);
    offset += 1;

    const results: RawAvlRecord[] = [];

    // CRC = 4 byte terakhir
    const limit = data.length - 4;

    for (let i = 0; i < numberOfData; i++) {
      // GPS section membutuhkan 24 byte
      if (offset + 24 > limit) {
        break;
      }

      const timestamp = Number(data.readBigUInt64BE(offset));
      offset += 8;

      // Priority (tidak dipakai)
      data.readUInt8(offset);
      offset += 1;

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
        options.variableLengthIo === true,
      );
      offset = nextOffset;

      results.push({
        timestamp,
        latitude,
        longitude,
        altitude,
        heading,
        satellites,
        speed,
        ioData,
      });
    }

    return { total: results.length, records: results };
  }

  private parseIOElements(
    data: Buffer,
    startOffset: number,
    codecId: number,
    limit: number,
    variableLengthIo: boolean,
  ) {
    let offset = startOffset;

    const isExtended = codecId === 0x8e;

    const ioData: Record<string, any> = {};

    // Event ID & Total IO tidak dipakai, tetap dibaca agar offset dan
    // perilaku saat buffer terpotong sama dengan parser sebelumnya.
    const eventId = isExtended
      ? data.readUInt16BE(offset)
      : data.readUInt8(offset);
    offset += isExtended ? 2 : 1;

    const totalIo = isExtended
      ? data.readUInt16BE(offset)
      : data.readUInt8(offset);
    offset += isExtended ? 2 : 1;

    void eventId;
    void totalIo;

    const ioTypes = [1, 2, 4, 8];

    for (const size of ioTypes) {
      if (offset >= limit) {
        break;
      }

      const count = isExtended
        ? data.readUInt16BE(offset)
        : data.readUInt8(offset);

      offset += isExtended ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const idSize = isExtended ? 2 : 1;

        if (offset + idSize + size > limit) {
          break;
        }

        const id = isExtended
          ? data.readUInt16BE(offset)
          : data.readUInt8(offset);

        offset += idSize;

        let value: any;

        if (size === 1) {
          value = data.readInt8(offset);
        } else if (size === 2) {
          value = data.readInt16BE(offset);
        } else if (size === 4) {
          value = data.readInt32BE(offset);
        } else {
          value = data.readBigInt64BE(offset).toString();
        }

        ioData[id.toString()] = value;

        offset += size;
      }
    }

    // NX: elemen panjang-variabel (hanya Codec 8E): id(2) + length(2) + value
    if (isExtended && variableLengthIo && offset + 2 <= limit) {
      const nxCount = data.readUInt16BE(offset);
      offset += 2;

      for (let i = 0; i < nxCount; i++) {
        if (offset + 4 > limit) {
          offset = limit;
          break;
        }

        const id = data.readUInt16BE(offset);
        const length = data.readUInt16BE(offset + 2);
        offset += 4;

        if (offset + length > limit) {
          offset = limit;
          break;
        }

        ioData[id.toString()] = this.decodeVariableValue(
          data.slice(offset, offset + length),
        );
        offset += length;
      }
    }

    return { ioData, nextOffset: offset };
  }

  /** ASCII yang dapat dibaca -> string; selain itu -> hex. */
  private decodeVariableValue(value: Buffer): string {
    const printable = value.every((b) => b >= 0x20 && b <= 0x7e);
    return printable ? value.toString('latin1') : value.toString('hex');
  }
}
