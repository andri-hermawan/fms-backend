import { locateInGeofence } from './geofence-locator';
import { resolveOperationalStatus } from './operational-status';
import { needsLastKnownLookup, resolveVesselStatus } from './vessel-status';
import { isInvalidFuelReading } from './fuel-reading';

describe('resolveOperationalStatus', () => {
  // Salinan logika lama di EquipmentLogsService.create (STEP 6) sebagai acuan.
  const legacy = (
    gsmSignal: number,
    gsmOperator: number | undefined,
    isEngineOn: boolean,
    currentSpeed: number,
    diffMinutes: number,
    idleThreshold: number,
  ) => {
    let opStatus = 'OFFLINE';
    if (gsmSignal <= 0 || !gsmOperator) {
      opStatus = 'OFFLINE';
    } else if (isEngineOn && currentSpeed > 0) {
      opStatus = 'RUNNING';
    } else if (
      isEngineOn &&
      currentSpeed === 0 &&
      diffMinutes >= idleThreshold
    ) {
      opStatus = 'IDLE';
    } else if (!isEngineOn && currentSpeed === 0) {
      opStatus = 'STOP';
    } else if (isEngineOn) {
      opStatus = currentSpeed > 0 ? 'RUNNING' : 'IDLE';
    } else {
      opStatus = 'STOP';
    }
    return opStatus;
  };

  it('menghasilkan status yang sama dengan logika lama untuk semua kombinasi', () => {
    for (const gsmSignal of [-1, 0, 1, 20])
      for (const gsmOperator of [undefined, 0, 51010])
        for (const isEngineOn of [true, false])
          for (const currentSpeed of [-1, 0, 0.5, 9, 10, 51, NaN])
            for (const diffMinutes of [0, 4.9, 5, 10, Number.MAX_SAFE_INTEGER])
              for (const idleThreshold of [5, 10]) {
                expect(
                  resolveOperationalStatus({
                    gsmSignal,
                    gsmOperator,
                    isEngineOn,
                    currentSpeed,
                    diffMinutes,
                    idleThreshold,
                  }),
                ).toBe(
                  legacy(
                    gsmSignal,
                    gsmOperator,
                    isEngineOn,
                    currentSpeed,
                    diffMinutes,
                    idleThreshold,
                  ),
                );
              }
  });
});

describe('resolveVesselStatus', () => {
  // Logika lama (STEP 5) sebagai acuan untuk alur normal di dalam polygon.
  const legacy = (
    origFid: number,
    lastLog: { vessel_status: string | null; orig_fid: number | null },
  ) => {
    let current: string = lastLog.vessel_status ?? 'UNKNOWN';
    if (origFid > lastLog.orig_fid!) current = 'EMPTY';
    else if (origFid < lastLog.orig_fid!) current = 'LOADED';
    return current;
  };

  it('di dalam polygon setelah log di dalam polygon: sama dengan logika lama', () => {
    for (const vessel_status of ['EMPTY', 'LOADED'])
      for (const orig_fid of [1, 3, 7])
        for (const origFid of [1, 3, 5, 7, 9]) {
          const lastLog = { vessel_status, orig_fid };
          expect(resolveVesselStatus(origFid, lastLog)).toBe(
            legacy(origFid, lastLog),
          );
        }
  });

  it('arah segment: naik = EMPTY, turun = LOADED, sama = tetap', () => {
    expect(
      resolveVesselStatus(4, { vessel_status: 'LOADED', orig_fid: 3 }),
    ).toBe('EMPTY');
    expect(
      resolveVesselStatus(3, { vessel_status: 'EMPTY', orig_fid: 4 }),
    ).toBe('LOADED');
    expect(
      resolveVesselStatus(4, { vessel_status: 'LOADED', orig_fid: 4 }),
    ).toBe('LOADED');
    expect(
      resolveVesselStatus(4, { vessel_status: 'EMPTY', orig_fid: 4 }),
    ).toBe('EMPTY');
  });

  it('di luar polygon: status terakhir dipertahankan (tidak UNKNOWN)', () => {
    expect(
      resolveVesselStatus(0, { vessel_status: 'LOADED', orig_fid: 4 }),
    ).toBe('LOADED');
    expect(
      resolveVesselStatus(0, { vessel_status: 'EMPTY', orig_fid: 4 }),
    ).toBe('EMPTY');
    // log sebelumnya juga di luar tetapi sudah membawa status
    expect(
      resolveVesselStatus(0, { vessel_status: 'LOADED', orig_fid: 0 }),
    ).toBe('LOADED');
  });

  it('LOADED -> keluar polygon -> masuk lagi di segment sama: tetap LOADED', () => {
    // acuan = log terakhir di dalam polygon (fid 4, LOADED), bukan log di luar
    const lastKnown = { vessel_status: 'LOADED', orig_fid: 4 };
    expect(resolveVesselStatus(0, lastKnown)).toBe('LOADED');
    expect(resolveVesselStatus(4, lastKnown)).toBe('LOADED');
  });

  it('masuk lagi di segment berbeda: arah dihitung dari segment terakhir yang valid', () => {
    expect(
      resolveVesselStatus(5, { vessel_status: 'LOADED', orig_fid: 4 }),
    ).toBe('EMPTY');
    expect(
      resolveVesselStatus(3, { vessel_status: 'EMPTY', orig_fid: 4 }),
    ).toBe('LOADED');
  });

  it('tanpa riwayat: EMPTY (tidak pernah UNKNOWN)', () => {
    expect(resolveVesselStatus(0, null)).toBe('EMPTY');
    expect(resolveVesselStatus(3, null)).toBe('EMPTY');
    expect(
      resolveVesselStatus(3, { vessel_status: null, orig_fid: null }),
    ).toBe('EMPTY');
  });

  it('data lama berstatus UNKNOWN / kosong tidak ikut terbawa', () => {
    expect(
      resolveVesselStatus(0, { vessel_status: 'UNKNOWN', orig_fid: 0 }),
    ).toBe('EMPTY');
    expect(
      resolveVesselStatus(4, { vessel_status: 'UNKNOWN', orig_fid: 4 }),
    ).toBe('EMPTY');
    expect(resolveVesselStatus(4, { vessel_status: null, orig_fid: 4 })).toBe(
      'EMPTY',
    );
  });

  it('tidak pernah menghasilkan UNKNOWN untuk kombinasi apa pun', () => {
    const lastKnowns: Array<{
      vessel_status: string | null;
      orig_fid: number | null;
    } | null> = [null];
    for (const vessel_status of [null, 'EMPTY', 'LOADED', 'UNKNOWN'])
      for (const orig_fid of [null, 0, 3, 7])
        lastKnowns.push({ vessel_status, orig_fid });

    for (const origFid of [0, 1, 3, 5, 7, 9])
      for (const lastKnown of lastKnowns) {
        const status = resolveVesselStatus(origFid, lastKnown);
        expect(['EMPTY', 'LOADED']).toContain(status);
      }
  });
});

describe('needsLastKnownLookup', () => {
  it('tanpa log sebelumnya: tidak perlu query', () => {
    expect(needsLastKnownLookup(3, null)).toBe(false);
    expect(needsLastKnownLookup(0, null)).toBe(false);
  });

  it('log terakhir di dalam polygon: tidak perlu query', () => {
    expect(
      needsLastKnownLookup(3, { vessel_status: 'EMPTY', orig_fid: 3 }),
    ).toBe(false);
    expect(
      needsLastKnownLookup(0, { vessel_status: 'LOADED', orig_fid: 4 }),
    ).toBe(false);
  });

  it('masih di luar polygon dan log terakhir sudah membawa status: tidak perlu query', () => {
    expect(
      needsLastKnownLookup(0, { vessel_status: 'LOADED', orig_fid: 0 }),
    ).toBe(false);
    expect(
      needsLastKnownLookup(0, { vessel_status: 'EMPTY', orig_fid: null }),
    ).toBe(false);
  });

  it('masuk polygon setelah di luar: perlu query segment terakhir', () => {
    expect(
      needsLastKnownLookup(4, { vessel_status: 'LOADED', orig_fid: 0 }),
    ).toBe(true);
    expect(
      needsLastKnownLookup(4, { vessel_status: 'EMPTY', orig_fid: null }),
    ).toBe(true);
  });

  it('log terakhir di luar dengan data lama (UNKNOWN/kosong): perlu query', () => {
    expect(
      needsLastKnownLookup(0, { vessel_status: 'UNKNOWN', orig_fid: 0 }),
    ).toBe(true);
    expect(needsLastKnownLookup(0, { vessel_status: null, orig_fid: 0 })).toBe(
      true,
    );
    expect(
      needsLastKnownLookup(3, { vessel_status: 'UNKNOWN', orig_fid: 0 }),
    ).toBe(true);
  });
});

describe('locateInGeofence', () => {
  const square = (minX: number, props: Record<string, unknown>) => ({
    type: 'Feature',
    properties: props,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minX, 0],
          [minX + 1, 0],
          [minX + 1, 1],
          [minX, 1],
          [minX, 0],
        ],
      ],
    },
  });
  const geojson = {
    type: 'FeatureCollection',
    features: [
      square(0, { Segment: 'S1', Category: 'Hauling', ORIG_FID: 4 }),
      square(5, {}),
    ],
  };

  it('mengembalikan Unknown jika geojson kosong', () => {
    expect(locateInGeofence(null, 0.5, 0.5)).toEqual({
      segmentName: 'Unknown',
      categoryLocation: 'Unknown',
      origFid: 0,
      isInside: false,
    });
  });

  it('membaca properti feature yang memuat titik (termasuk geojson string)', () => {
    expect(locateInGeofence(JSON.stringify(geojson), 0.5, 0.5)).toEqual({
      segmentName: 'S1',
      categoryLocation: 'Hauling',
      origFid: 4,
      isInside: true,
    });
  });

  it('memakai default jika properti feature kosong', () => {
    expect(locateInGeofence(geojson, 5.5, 0.5)).toEqual({
      segmentName: 'No Segment Name',
      categoryLocation: 'No Category',
      origFid: 0,
      isInside: true,
    });
  });

  it('isInside false di luar semua polygon', () => {
    expect(locateInGeofence(geojson, 3, 0.5).isInside).toBe(false);
  });
});

describe('isInvalidFuelReading', () => {
  it('hanya -4 dan 0 yang dianggap tidak valid', () => {
    expect(isInvalidFuelReading(-4)).toBe(true);
    expect(isInvalidFuelReading(0)).toBe(true);
    expect(isInvalidFuelReading('0')).toBe(true);
    expect(isInvalidFuelReading(120)).toBe(false);
    expect(isInvalidFuelReading(-5)).toBe(false);
  });
});
