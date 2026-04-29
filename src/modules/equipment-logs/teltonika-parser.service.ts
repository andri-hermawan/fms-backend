import { Injectable } from '@nestjs/common';

@Injectable()
export class TeltonikaParserService {
  // 1. Logika Handshake IMEI
  parseImei(data: Buffer): string {
    const length = data.readInt16BE(0);
    return data.slice(2, 2 + length).toString();
  }

  // 2. Logika Utama Parsing Data (Codec 8)
  parseData(data: Buffer) {
    const codecId = data.readInt8(8);
    if (codecId !== 0x08) {
      throw new Error('Hanya mendukung Codec 8');
    }

    const numberOfData = data.readInt8(9);

    // SOLUSI ERROR 'never': Berikan tipe eksplisit any[] pada array results
    const results: any[] = [];
    let offset = 10;

    for (let i = 0; i < numberOfData; i++) {
      const timestamp = Number(data.readBigInt64BE(offset));
      offset += 8;

      // SOLUSI ERROR 'priority': Gunakan underscore (_) untuk variabel yang sengaja dilewati
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _priority = data.readInt8(offset);
      offset += 1;

      const longitude = data.readInt32BE(offset) / 10000000;
      offset += 4;

      const latitude = data.readInt32BE(offset) / 10000000;
      offset += 4;

      const altitude = data.readInt16BE(offset);
      offset += 2;

      const heading = data.readInt16BE(offset);
      offset += 2;

      const speed = data.readInt16BE(offset);
      offset += 2;

      const { ioData, nextOffset } = this.parseIOElements(data, offset);
      offset = nextOffset;

      results.push({
        timestamp: new Date(timestamp),
        latitude,
        longitude,
        altitude,
        heading,
        speed,
        ignition: ioData['239'] === 1,
        fuel_raw: ioData['9'],
        all_params: ioData,
      });
    }

    return { total: numberOfData, records: results };
  }

  // 3. Helper untuk bongkar data sensor (I/O)
  private parseIOElements(data: Buffer, startOffset: number) {
    let offset = startOffset;

    // VALIDASI: Pastikan buffer masih cukup untuk dibaca (minimal 2 byte untuk eventId & totalIO)
    if (offset + 2 > data.length) return { ioData: {}, nextOffset: offset };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _eventId = data.readInt8(offset);
    offset += 1;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _totalIO = data.readInt8(offset);
    offset += 1;

    const ioData: Record<string, any> = {};
    const ioTypes = [1, 2, 4, 8];

    for (const size of ioTypes) {
      // Validasi sebelum membaca jumlah elemen untuk tipe size ini
      if (offset >= data.length) break;

      const count = data.readInt8(offset);
      offset += 1;

      for (let i = 0; i < count; i++) {
        // Validasi sebelum membaca ID dan Value (ID: 1 byte + Value: 'size' byte)
        if (offset + 1 + size > data.length) break;

        const id = data.readInt8(offset);
        offset += 1;

        let value: number;
        if (size === 1) value = data.readInt8(offset);
        else if (size === 2) value = data.readInt16BE(offset);
        else if (size === 4) value = data.readInt32BE(offset);
        else value = Number(data.readBigInt64BE(offset));

        ioData[id.toString()] = value;
        offset += size;
      }
    }

    // NextOffset biasanya +4 untuk CRC di paket terakhir,
    // tapi untuk tiap record, ini adalah posisi awal record berikutnya
    return { ioData, nextOffset: offset };
  }
}
