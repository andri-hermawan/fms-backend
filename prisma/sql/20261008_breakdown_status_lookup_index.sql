-- =============================================================================
-- breakdown_status: index untuk lookup status terbaru dari pipeline telemetry
-- (equipment_code + date_at + shift, urut id terbesar).
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_breakdown_status_lookup
  ON breakdown_status (equipment_code, date_at, shift, id DESC);
