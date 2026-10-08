/**
 * Status muatan dari arah perpindahan segment:
 * orig_fid naik = EMPTY, turun = LOADED, sama = status sebelumnya.
 */
export function resolveVesselStatus(
  origFid: number,
  lastLog: { vessel_status: string | null; orig_fid: number | null } | null,
): string {
  if (origFid === 0) return 'UNKNOWN';

  if (lastLog && lastLog.orig_fid !== null && lastLog.orig_fid !== 0) {
    if (origFid > lastLog.orig_fid) return 'EMPTY';
    if (origFid < lastLog.orig_fid) return 'LOADED';
    return lastLog.vessel_status ?? 'UNKNOWN';
  }

  return 'EMPTY';
}
