import { Injectable } from '@nestjs/common';

@Injectable()
export class TeltonikaParserService {
  parseImei(data: Buffer): string {
    const length = data.readUInt16BE(0);
    const imei = data.slice(2, 2 + length).toString();

    // console.log('========================================');
    // console.log('[TELTONIKA] IMEI PACKET');
    // console.log('IMEI Length :', length);
    // console.log('IMEI        :', imei);
    // console.log('========================================');

    return imei;
  }

  parseData(data: Buffer) {
    // console.log('\n');
    // console.log('============================================================');
    // console.log('                TELTONIKA AVL PACKET');
    // console.log('============================================================');

    // console.log('[RAW] Packet Length :', data.length);
    // console.log('[RAW] Packet HEX    :');
    // console.log(data.toString('hex'));

    // console.log('\n[HEADER]');
    // console.log('Preamble          :', data.slice(0, 4).toString('hex'));

    // console.log('Data Length Bytes :', data.slice(4, 8).toString('hex'));

    // console.log('Data Length Value :', data.readUInt32BE(4));

    let offset = 8;

    // ========================================================
    // CODEC
    // ========================================================

    if (offset >= data.length) {
      // console.error('[ERROR] Tidak ada Codec ID');
      return {
        total: 0,
        records: [],
      };
    }

    const codecId = data.readUInt8(offset);
    offset += 1;

    // console.log('\n[CODEC]');
    // console.log(
    //   'Codec ID :',
    //   codecId,
    //   `(0x${codecId.toString(16).padStart(2, '0')})`,
    // );

    // console.log(
    //   'Codec Type:',
    //   codecId === 0x08
    //     ? 'Codec 8'
    //     : codecId === 0x8e
    //       ? 'Codec 8 Extended'
    //       : 'UNKNOWN',
    // );

    // ========================================================
    // NUMBER OF DATA
    // ========================================================

    if (offset >= data.length) {
      // console.error('[ERROR] Tidak ada Number of Data');
      return {
        total: 0,
        records: [],
      };
    }

    const numberOfData = data.readUInt8(offset);
    offset += 1;

    // console.log('\n[AVL DATA]');
    // console.log('Number Of Data :', numberOfData);

    const results: any[] = [];

    // CRC = 4 byte terakhir
    const limit = data.length - 4;

    // console.log('Data Limit     :', limit);
    // console.log('CRC HEX        :', data.slice(limit).toString('hex'));

    // ========================================================
    // RECORD LOOP
    // ========================================================

    for (let i = 0; i < numberOfData; i++) {
      // console.log('\n');
      // console.log(
      //   '------------------------------------------------------------',
      // );
      // console.log(`                 RECORD ${i + 1}/${numberOfData}`);
      // console.log(
      //   '------------------------------------------------------------',
      // );

      // GPS section membutuhkan 24 byte
      if (offset + 24 > limit) {
        // console.error(
        //   '[ERROR] GPS data tidak cukup. Offset:',
        //   offset,
        //   'Limit:',
        //   limit,
        // );
        break;
      }

      // ======================================================
      // TIMESTAMP
      // ======================================================

      const timestampRaw = data.readBigUInt64BE(offset);
      const timestamp = Number(timestampRaw);
      offset += 8;

      // console.log('\n[TIMESTAMP]');
      // console.log('Raw       :', timestampRaw.toString());
      // console.log('Date      :', new Date(timestamp).toISOString());

      // ======================================================
      // PRIORITY
      // ======================================================

      const priority = data.readUInt8(offset);
      offset += 1;

      // console.log('\n[PRIORITY]');
      // console.log('Priority  :', priority);

      // ======================================================
      // LONGITUDE
      // ======================================================

      const longitudeRaw = data.readInt32BE(offset);
      const longitude = longitudeRaw / 10000000;
      offset += 4;

      // ======================================================
      // LATITUDE
      // ======================================================

      const latitudeRaw = data.readInt32BE(offset);
      const latitude = latitudeRaw / 10000000;
      offset += 4;

      // ======================================================
      // ALTITUDE
      // ======================================================

      const altitude = data.readInt16BE(offset);
      offset += 2;

      // ======================================================
      // ANGLE / HEADING
      // ======================================================

      const heading = data.readUInt16BE(offset);
      offset += 2;

      // ======================================================
      // SATELLITES
      // ======================================================

      const satellites = data.readUInt8(offset);
      offset += 1;

      // ======================================================
      // SPEED
      // ======================================================

      const speed = data.readUInt16BE(offset);
      offset += 2;

      // console.log('\n[GPS]');
      // console.log('Latitude  :', latitude);
      // console.log('Longitude :', longitude);
      // console.log('Altitude  :', altitude, 'm');
      // console.log('Heading   :', heading);
      // console.log('Satellites:', satellites);
      // console.log('Speed     :', speed, 'km/h');

      // console.log('\n[GPS RAW]');
      // console.log('Longitude RAW:', longitudeRaw);
      // console.log('Latitude RAW :', latitudeRaw);

      // ======================================================
      // IO ELEMENTS
      // ======================================================

      const { ioData, nextOffset } = this.parseIOElements(
        data,
        offset,
        codecId,
        limit,
      );

      offset = nextOffset;

      // console.log('\n[ALL AVL IO DATA]');
      // console.log(JSON.stringify(ioData, null, 2));

      // ======================================================
      // SPECIFIC AVL IDS
      // ======================================================

      // console.log('\n[IMPORTANT AVL IDs]');

      // console.log('ID 9   Analog Input 1    :', ioData['9']);
      // console.log('ID 16  Odometer          :', ioData['16']);

      // console.log('ID 17  Accelerometer X   :', ioData['17']);
      // console.log('ID 18  Accelerometer Y   :', ioData['18']);
      // console.log('ID 19  Accelerometer Z   :', ioData['19']);

      // console.log('ID 21  GSM Signal        :', ioData['21']);

      // console.log('ID 66  External Voltage  :', ioData['66']);
      // console.log('ID 67  Battery Voltage   :', ioData['67']);
      // console.log('ID 68  Battery Current   :', ioData['68']);

      // console.log('ID 69  GNSS Status       :', ioData['69']);

      // console.log('ID 181 PDOP              :', ioData['181']);
      // console.log('ID 182 HDOP              :', ioData['182']);

      // console.log('ID 200 Sleep Mode        :', ioData['200']);

      // console.log('ID 201 Fuel Level        :', ioData['201']);
      // console.log('ID 202 Fuel Temperature  :', ioData['202']);

      // console.log('ID 239 Ignition          :', ioData['239']);
      // console.log('ID 240 Movement Runtime  :', ioData['240']);
      // console.log('ID 241 GSM Operator      :', ioData['241']);

      // console.log('ID 327 UL202             :', ioData['327']);

      // ======================================================
      // ACCELEROMETER
      // ======================================================

      // console.log('\n[ACCELEROMETER]');
      // console.log('Axis X (ID 17):', ioData['17'], 'mg');

      // console.log('Axis Y (ID 18):', ioData['18'], 'mg');

      // console.log('Axis Z (ID 19):', ioData['19'], 'mg');

      // ======================================================
      // RESULT
      // ======================================================

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

        // UL202
        ul202: ioData['327'] ?? null,

        // Raw AVL
        all_params: ioData,
      });

      // console.log('\n[RECORD PARSED]');
      // console.log(JSON.stringify(results[results.length - 1], null, 2));
    }

    // ========================================================
    // FINAL
    // ========================================================

    // console.log('\n');
    // console.log('============================================================');
    // console.log('                  PACKET FINISHED');
    // console.log('============================================================');

    // console.log('[FINAL]');
    // console.log('Records Parsed :', results.length);
    // console.log('Final Offset   :', offset);
    // console.log('Packet Limit   :', limit);

    if (offset + 4 <= data.length) {
      // console.log('CRC HEX        :', data.slice(-4).toString('hex'));
    }

    // console.log('============================================================');
    // console.log('\n');

    return {
      total: results.length,
      records: results,
    };
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

    // console.log('\n');
    // console.log('================ IO ELEMENTS =================');

    // console.log('IO Start Offset:', offset);
    // console.log('Extended Codec :', isExtended);

    // ========================================================
    // EVENT ID
    // ========================================================

    const eventId = isExtended
      ? data.readUInt16BE(offset)
      : data.readUInt8(offset);

    offset += isExtended ? 2 : 1;

    // console.log('\n[IO HEADER]');
    // console.log('Event ID:', eventId);

    // ========================================================
    // TOTAL IO
    // ========================================================

    const totalIo = isExtended
      ? data.readUInt16BE(offset)
      : data.readUInt8(offset);

    offset += isExtended ? 2 : 1;

    // console.log('Total IO:', totalIo);

    // ========================================================
    // IO TYPES
    // ========================================================

    const ioTypes = [1, 2, 4, 8];

    for (const size of ioTypes) {
      if (offset >= limit) {
        // console.warn(`[IO ${size} BYTE] Offset sudah melewati limit`);
        break;
      }

      const count = isExtended
        ? data.readUInt16BE(offset)
        : data.readUInt8(offset);

      offset += isExtended ? 2 : 1;

      // console.log('\n');
      // console.log(`---------- IO ${size} BYTE ----------`);
      // console.log('Count:', count);

      for (let i = 0; i < count; i++) {
        const idSize = isExtended ? 2 : 1;

        if (offset + idSize + size > limit) {
          // console.error('[ERROR] IO element melebihi packet limit');
          break;
        }

        const id = isExtended
          ? data.readUInt16BE(offset)
          : data.readUInt8(offset);

        offset += idSize;

        const valueOffset = offset;

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

        const rawValue = data
          .slice(valueOffset, valueOffset + size)
          .toString('hex');

        ioData[id.toString()] = value;

        // console.log({
        //   id,
        //   size: `${size} byte`,
        //   raw: rawValue,
        //   value,
        //   offset: valueOffset,
        // });

        // Khusus accelerometer
        if (id === 17 || id === 18 || id === 19) {
          // console.log(`>>> ACCELEROMETER DETECTED: ID ${id} = ${value} mg`);
        }

        offset += size;
      }
    }

    // console.log('\n[IO END]');
    // console.log('Next Offset:', offset);
    // console.log('Total IO Parsed:', Object.keys(ioData).length);

    return {
      ioData,
      nextOffset: offset,
    };
  }
}
