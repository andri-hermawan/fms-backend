export interface SegmentLog {
  vessel_status: string | null;
  orig_fid: number | null;
}

const isKnownStatus = (status: string | null | undefined) =>
  status === 'EMPTY' || status === 'LOADED';

/**
 * Unit berhenti (status STOP) di tempat dengan orig_fid = 0 (area pemberhentian
 * pada attribute_geo / di luar segment): status muatan tidak diketahui.
 */
export const isParkedOutsideSegment = (
  origFid: number,
  operationalStatus?: string,
) => origFid === 0 && operationalStatus === 'STOP';

/**
 * Status muatan dari arah perpindahan segment:
 * orig_fid naik = EMPTY, turun = LOADED, sama = status sebelumnya.
 *
 * `lastKnown` = log terakhir yang masih berada di dalam polygon (orig_fid <> 0),
 * bukan sekadar log terakhir. Di luar polygon (origFid = 0) status muatan
 * dipertahankan dari `lastKnown`, karena muatan tidak berubah hanya karena
 * keluar jalur. Tanpa riwayat sama sekali dianggap EMPTY.
 *
 * Satu-satunya UNKNOWN: unit STOP dengan orig_fid = 0 (lihat
 * isParkedOutsideSegment).
 */
export function resolveVesselStatus(
  origFid: number,
  lastKnown: SegmentLog | null,
  operationalStatus?: string,
): string {
  if (isParkedOutsideSegment(origFid, operationalStatus)) return 'UNKNOWN';

  const previous = isKnownStatus(lastKnown?.vessel_status)
    ? lastKnown.vessel_status
    : null;

  if (origFid === 0) return previous ?? 'EMPTY';

  if (lastKnown && lastKnown.orig_fid !== null && lastKnown.orig_fid !== 0) {
    if (origFid > lastKnown.orig_fid) return 'EMPTY';
    if (origFid < lastKnown.orig_fid) return 'LOADED';
    return previous ?? 'EMPTY';
  }

  return 'EMPTY';
}

/**
 * Apakah perlu query "log terakhir di dalam polygon"? Tidak perlu bila:
 * - hasilnya pasti UNKNOWN (STOP dengan orig_fid = 0),
 * - log terakhir sendiri sudah di dalam polygon, atau
 * - paket ini juga di luar polygon sementara log terakhir sudah membawa status
 *   EMPTY/LOADED (hindari query berulang selama unit lama berada di luar).
 */
export function needsLastKnownLookup(
  origFid: number,
  lastLog: SegmentLog | null,
  operationalStatus?: string,
): boolean {
  if (isParkedOutsideSegment(origFid, operationalStatus)) return false;
  if (!lastLog) return false;
  if (lastLog.orig_fid !== null && lastLog.orig_fid !== 0) return false;
  if (origFid === 0 && isKnownStatus(lastLog.vessel_status)) return false;
  return true;
}
