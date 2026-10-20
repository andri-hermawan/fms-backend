export interface Iso6709Location {
  latitude: number;
  longitude: number;
  /** meter, null jika tidak ada di string */
  altitude: number | null;
}

// ±DDMMSS.SSSS±DDDMMSS.SSSS±AAA.AAA/  (format Teltonika AVL ID 387)
const DMS =
  /^([+-])(\d{2})(\d{2})(\d{2}(?:\.\d+)?)([+-])(\d{3})(\d{2})(\d{2}(?:\.\d+)?)(?:([+-]\d+(?:\.\d+)?))?/;

// ±DD.DDDD±DDD.DDDD[±AAA.AAA]  (ISO6709 derajat desimal)
const DECIMAL =
  /^([+-]\d{1,2}(?:\.\d+)?)([+-]\d{1,3}(?:\.\d+)?)(?:([+-]\d+(?:\.\d+)?))?/;

function dmsToDegrees(
  sign: string,
  deg: string,
  min: string,
  sec: string,
): number {
  const value = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  return sign === '-' ? -value : value;
}

/** Mengembalikan null jika bukan string ISO6709 yang valid. */
export function parseIso6709(value: unknown): Iso6709Location | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();

  let latitude: number;
  let longitude: number;
  let altitude: number | null;

  const dms = DMS.exec(text);
  if (dms) {
    latitude = dmsToDegrees(dms[1], dms[2], dms[3], dms[4]);
    longitude = dmsToDegrees(dms[5], dms[6], dms[7], dms[8]);
    altitude = dms[9] !== undefined ? Number(dms[9]) : null;
  } else {
    const dec = DECIMAL.exec(text);
    if (!dec) return null;
    latitude = Number(dec[1]);
    longitude = Number(dec[2]);
    altitude = dec[3] !== undefined ? Number(dec[3]) : null;
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude, altitude };
}
