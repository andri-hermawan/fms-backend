-- =============================================================================
-- alert_rules: ganti scope segment dari orig_fid ke nama segment
-- (attribute_geo.segment). Untuk DB yang sudah menjalankan
-- 20261008_create_alert_rules.sql versi awal (kolom orig_fid).
-- Pencocokan segment tidak membedakan huruf besar/kecil & spasi di ujung.
-- =============================================================================

ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS segment VARCHAR(50) NULL;

ALTER TABLE alert_rules DROP CONSTRAINT IF EXISTS chk_alert_rules_segment_scope;
DROP INDEX IF EXISTS uq_alert_rules_scope;
ALTER TABLE alert_rules DROP COLUMN IF EXISTS orig_fid;

ALTER TABLE alert_rules
  ADD CONSTRAINT chk_alert_rules_segment_scope
  CHECK (segment IS NULL OR project_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_rules_scope
  ON alert_rules (
    alert_category_id,
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(LOWER(BTRIM(segment)), '')
  );
