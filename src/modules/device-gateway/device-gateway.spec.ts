import { TeltonikaCodecParser } from './protocols/teltonika/teltonika-codec.parser';
import { DeviceAdapterRegistry } from './adapters/adapter.registry';
import { Fmc125Adapter } from './adapters/fmc125.adapter';
import { Fmc150Adapter } from './adapters/fmc150.adapter';
import { GenericDeviceAdapter } from './adapters/generic.adapter';

type IoSpec = Record<number, [size: 1 | 2 | 4 | 8, value: number]>;

/** Membangun paket AVL Codec 8 / 8E dengan satu atau lebih record. */
function buildPacket(
  codec: 0x08 | 0x8e,
  records: IoSpec[],
  nx: Array<[id: number, text: string]> = [],
): Buffer {
  const ext = codec === 0x8e;
  const idw = ext ? 2 : 1;
  const num = (n: number) => {
    const b = Buffer.alloc(idw);
    if (ext) b.writeUInt16BE(n);
    else b.writeUInt8(n);
    return b;
  };

  const parts: Buffer[] = [];
  records.forEach((io, i) => {
    const gps = Buffer.alloc(24);
    gps.writeBigUInt64BE(BigInt(Date.UTC(2026, 5, 1, 0, 0, i)), 0);
    gps.writeUInt8(1, 8);
    gps.writeInt32BE(Math.round(116.1234567 * 1e7), 9);
    gps.writeInt32BE(Math.round(-1.2345678 * 1e7), 13);
    gps.writeInt16BE(25, 17);
    gps.writeUInt16BE(180, 19);
    gps.writeUInt8(9, 21);
    gps.writeUInt16BE(33, 22);
    parts.push(gps);

    const bySize: Record<number, Array<[number, number]>> = {
      1: [],
      2: [],
      4: [],
      8: [],
    };
    for (const [id, [size, value]] of Object.entries(io)) {
      bySize[size].push([Number(id), value]);
    }
    const total = Object.values(bySize).reduce((n, a) => n + a.length, 0);
    parts.push(num(1), num(total));
    for (const size of [1, 2, 4, 8]) {
      parts.push(num(bySize[size].length));
      for (const [id, value] of bySize[size]) {
        const v = Buffer.alloc(size);
        if (size === 1) v.writeInt8(value);
        else if (size === 2) v.writeInt16BE(value);
        else if (size === 4) v.writeInt32BE(value);
        else v.writeBigInt64BE(BigInt(value));
        parts.push(num(id), v);
      }
    }

    // Codec 8E selalu punya bagian NX (elemen panjang-variabel)
    if (ext) {
      parts.push(num(nx.length));
      for (const [id, text] of nx) {
        const v = Buffer.from(text, 'latin1');
        const len = Buffer.alloc(2);
        len.writeUInt16BE(v.length);
        parts.push(num(id), len, v);
      }
    }
  });

  const body = Buffer.concat([
    Buffer.from([codec, records.length]),
    ...parts,
    Buffer.from([records.length]),
  ]);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 4);
  return Buffer.concat([head, body, Buffer.alloc(4)]);
}

const IO: IoSpec = {
  239: [1, 1], // ignition
  16: [4, 123456], // odometer
  66: [2, 24100], // external voltage
  201: [2, 3500], // fuel level
  202: [1, 31], // fuel temperature
  21: [1, 5], // gsm signal
  17: [2, -12], // accel x
  9: [2, 800], // analog 1
};

describe('Teltonika parsing', () => {
  const codec = new TeltonikaCodecParser();
  const registry = new DeviceAdapterRegistry(
    new Fmc125Adapter(),
    new Fmc150Adapter(),
    new GenericDeviceAdapter(),
  );

  it('parseImei membaca IMEI dari handshake', () => {
    const imei = '356307042441013';
    const buf = Buffer.concat([
      Buffer.from([0, imei.length]),
      Buffer.from(imei),
    ]);
    expect(codec.parseImei(buf)).toBe(imei);
  });

  it.each([0x08, 0x8e] as const)(
    'codec 0x%s -> record standar (bentuk output tidak berubah)',
    (c) => {
      const parsed = codec.parsePacket(buildPacket(c, [IO]));
      expect(parsed.total).toBe(1);

      const rec = registry.resolve('FMC125').normalize(parsed.records[0]);
      expect(rec.longitude).toBeCloseTo(116.1234567, 6);
      expect(rec.latitude).toBeCloseTo(-1.2345678, 6);
      expect(rec).toMatchObject({
        altitude: 25,
        heading: 180,
        satellites: 9,
        speed: 33,
        ignition: true,
        odometer: 123456,
        external_voltage: 24100,
        lls_fuel_level_1: 3500,
        lls_temperature_1: 31,
        gsm_signal: 5,
        accelerometer_x: -12,
        analog_input_1: 800,
        // ID yang tidak ada -> null
        internal_battery_voltage: null,
        battery_current: null,
        pdop: null,
        sleep_mode: null,
      });
      expect(rec.timestamp).toEqual(new Date(Date.UTC(2026, 5, 1, 0, 0, 0)));
      expect(rec.all_params['201']).toBe(3500);
      expect('ul202' in rec).toBe(false);
    },
  );

  it('ignition false bila ID 239 tidak bernilai 1 / tidak ada', () => {
    const parsed = codec.parsePacket(buildPacket(0x08, [{ 201: [2, 1] }]));
    const rec = registry.resolve('FMC125').normalize(parsed.records[0]);
    expect(rec.ignition).toBe(false);
  });

  it('banyak record dalam satu paket', () => {
    const parsed = codec.parsePacket(buildPacket(0x08, [IO, IO, IO]));
    expect(parsed.total).toBe(3);
  });

  it('paket terpotong tidak membuat record palsu', () => {
    const full = buildPacket(0x08, [IO, IO]);
    expect(codec.parsePacket(full.slice(0, 9)).total).toBe(0);
  });

  describe('FMC150', () => {
    const ISO = '-011404.4442+1160724.4442+099.000/';
    const io150: IoSpec = {
      ...IO,
      24: [2, 41], // speed
      87: [4, 987654], // total mileage (CAN)
      16: [4, 111], // odometer
    };
    const packet = buildPacket(0x8e, [io150], [[387, ISO]]);

    it('tanpa opsi variableLengthIo, elemen NX diabaikan (perilaku lama)', () => {
      const raw = codec.parsePacket(packet).records[0];
      expect(raw.ioData['387']).toBeUndefined();
    });

    it('membaca elemen NX (ID 387) bila variableLengthIo aktif', () => {
      const raw = codec.parsePacket(packet, { variableLengthIo: true })
        .records[0];
      expect(raw.ioData['387']).toBe(ISO);
      expect(raw.ioData['201']).toBe(3500);
    });

    it('banyak record 8E + NX tetap terbaca benar', () => {
      const multi = buildPacket(0x8e, [io150, io150, io150], [[387, ISO]]);
      const parsed = codec.parsePacket(multi, { variableLengthIo: true });
      expect(parsed.total).toBe(3);
      for (const r of parsed.records) expect(r.ioData['387']).toBe(ISO);
    });

    it('memetakan ID sesuai tabel FMC150', () => {
      const adapter = registry.resolve('FMC150');
      expect(adapter.readVariableLengthIo).toBe(true);

      const raw = codec.parsePacket(packet, { variableLengthIo: true })
        .records[0];
      const rec = adapter.normalize(raw);

      expect(rec.latitude).toBeCloseTo(-1.234568, 5);
      expect(rec.longitude).toBeCloseTo(116.123457, 5);
      expect(rec.altitude).toBe(25); // raw GPS, bukan 99 dari ID 387
      expect(rec.heading).toBe(180); // raw
      expect(rec.speed).toBe(41); // ID 24, bukan speed GPS (33)
      expect(rec.mileage).toBe(987654); // ID 87
      expect(rec.odometer).toBe(111); // ID 16
      expect(rec.lls_fuel_level_1).toBeNull(); // belum diketahui
      expect(rec.lls_temperature_1).toBeNull(); // tidak tersedia

      // ID yang sama dengan FMC125
      expect(rec.ignition).toBe(true);
      expect(rec.external_voltage).toBe(24100);
      expect(rec.gsm_signal).toBe(5);
      expect(rec.accelerometer_x).toBe(-12);
      expect(rec.analog_input_1).toBe(800);
    });

    it('jatuh ke field GPS bila ID 387 / 24 tidak ada atau tidak valid', () => {
      const noExtras = buildPacket(0x8e, [IO], [[387, 'rusak']]);
      const raw = codec.parsePacket(noExtras, { variableLengthIo: true })
        .records[0];
      const rec = registry.resolve('FMC150').normalize(raw);

      expect(rec.latitude).toBeCloseTo(-1.2345678, 6);
      expect(rec.longitude).toBeCloseTo(116.1234567, 6);
      expect(rec.altitude).toBe(25);
      expect(rec.speed).toBe(33);
    });
  });

  describe('registry adapter', () => {
    const raw = codec.parsePacket(buildPacket(0x8e, [IO])).records[0];

    it('FMC125 dan model kosong/tak dikenal menghasilkan output yang sama', () => {
      const expected = registry.resolve('FMC125').normalize(raw);
      for (const model of [
        'fmc-125',
        'Teltonika FMC125',
        '',
        null,
        undefined,
        'XYZ',
      ]) {
        expect(registry.resolve(model).normalize(raw)).toEqual(expected);
      }
    });

    it('FMC125: mileage = odometer, speed & lokasi dari field GPS', () => {
      const rec = registry.resolve('FMC125').normalize(raw);
      expect(rec.mileage).toBe(123456);
      expect(rec.mileage).toBe(rec.odometer);
      expect(rec.speed).toBe(33);
      expect(rec.lls_fuel_level_1).toBe(3500);
    });

    it('memilih adapter sesuai device_model', () => {
      expect(registry.resolve('FMC125')).toBeInstanceOf(Fmc125Adapter);
      expect(registry.resolve('FMC-150')).toBeInstanceOf(Fmc150Adapter);
      expect(registry.resolve(null)).toBeInstanceOf(GenericDeviceAdapter);
      expect(registry.resolve('XYZ')).toBeInstanceOf(GenericDeviceAdapter);
    });
  });
});
