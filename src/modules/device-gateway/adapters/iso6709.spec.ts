import { parseIso6709 } from './iso6709';

describe('parseIso6709', () => {
  it('format Teltonika DMS (±DDMMSS.SSSS±DDDMMSS.SSSS±AAA.AAA/)', () => {
    const r = parseIso6709('-011404.4442+1160724.4442+025.000/');
    expect(r?.latitude).toBeCloseTo(-1.234568, 5);
    expect(r?.longitude).toBeCloseTo(116.123457, 5);
    expect(r?.altitude).toBe(25);
  });

  it('format derajat desimal ISO6709', () => {
    const r = parseIso6709('+37.7749-122.4194+12.5CRSWGS_84/');
    expect(r).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 12.5,
    });
  });

  it('altitude opsional', () => {
    expect(parseIso6709('+37.7749-122.4194/')?.altitude).toBeNull();
  });

  it.each([undefined, null, 123, '', 'rusak', '+95.0+010.0/'])(
    'tidak valid: %p -> null',
    (v) => {
      expect(parseIso6709(v)).toBeNull();
    },
  );
});
