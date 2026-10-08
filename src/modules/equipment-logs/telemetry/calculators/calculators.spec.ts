import { locateInGeofence } from './geofence-locator';
import { resolveOperationalStatus } from './operational-status';
import { resolveVesselStatus } from './vessel-status';
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
  // Salinan logika lama (STEP 5) sebagai acuan.
  const legacy = (
    origFid: number,
    lastLog: { vessel_status: string | null; orig_fid: number | null } | null,
  ) => {
    let current: string = lastLog?.vessel_status ?? 'UNKNOWN';
    if (origFid === 0) {
      current = 'UNKNOWN';
    } else if (lastLog && lastLog.orig_fid !== null && lastLog.orig_fid !== 0) {
      if (origFid > lastLog.orig_fid) current = 'EMPTY';
      else if (origFid < lastLog.orig_fid) current = 'LOADED';
    } else {
      current = 'EMPTY';
    }
    return current;
  };

  it('menghasilkan status yang sama dengan logika lama', () => {
    const lastLogs = [null];
    for (const vessel_status of [null, 'EMPTY', 'LOADED', 'UNKNOWN'])
      for (const orig_fid of [null, 0, 3, 7])
        lastLogs.push({ vessel_status, orig_fid } as never);

    for (const origFid of [0, 1, 3, 5, 7, 9])
      for (const lastLog of lastLogs) {
        expect(resolveVesselStatus(origFid, lastLog)).toBe(
          legacy(origFid, lastLog),
        );
      }
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
