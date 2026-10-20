-- =============================================================================
-- Index parsial untuk EquipmentLogsRepository.findLastKnownSegment:
-- log terakhir equipment yang berada di dalam polygon (orig_fid <> 0).
-- Dipakai menentukan vessel_status setelah unit keluar polygon.
--
-- OPSIONAL: tanpa index ini query tetap benar (memakai idx_logs_equipment_time),
-- hanya bisa lambat bila unit sangat lama berada di luar polygon.
-- Jalankan di luar transaksi (CONCURRENTLY).
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_equipment_time_in_polygon
  ON equipment_logs (equipment_id, time DESC)
  WHERE orig_fid IS NOT NULL AND orig_fid <> 0;
