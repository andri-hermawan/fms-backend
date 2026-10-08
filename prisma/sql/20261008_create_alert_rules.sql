-- =============================================================================
-- alert_rules: threshold alert yang dapat diubah dari frontend.
--
-- Prioritas (paling spesifik menang, per kolom):
--   1. Segment : project_id + segment terisi (segment = attribute_geo.segment)
--   2. Project : project_id terisi, segment NULL
--   3. Global  : project_id NULL, segment NULL
--   4. Default di kode (src/modules/alert-rules/alert-rule.constants.ts)
--
-- Kolom yang NULL akan diturunkan dari level di atasnya, sehingga rule segment
-- cukup mengisi speed_limit saja (contoh: overspeed per segment).
-- =============================================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_category_id UUID NOT NULL
                    REFERENCES alert_categories (id) ON DELETE CASCADE,
  project_id        UUID NULL
                    REFERENCES projects (id) ON DELETE CASCADE,
  segment           VARCHAR(50) NULL,
  duration_minutes  DECIMAL(10, 2) NULL,
  speed_limit       DECIMAL(10, 2) NULL,
  fuel_threshold    DECIMAL(10, 2) NULL,
  description       VARCHAR(255) NULL,
  status            VARCHAR(20) DEFAULT 'active',
  created_at        TIMESTAMPTZ(6) DEFAULT NOW(),
  created_by        UUID NULL,
  updated_at        TIMESTAMPTZ(6) NULL,
  updated_by        UUID NULL,
  -- Rule segment wajib terikat ke project.
  CONSTRAINT chk_alert_rules_segment_scope
    CHECK (segment IS NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_category
  ON alert_rules (alert_category_id, status);

CREATE INDEX IF NOT EXISTS idx_alert_rules_project
  ON alert_rules (project_id);

-- Satu rule per kombinasi kategori + scope (NULL dianggap sama).
CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_rules_scope
  ON alert_rules (
    alert_category_id,
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(LOWER(BTRIM(segment)), '')
  );

-- -----------------------------------------------------------------------------
-- Seed rule global = threshold yang berlaku saat ini (tidak mengubah perilaku).
-- -----------------------------------------------------------------------------
INSERT INTO alert_rules (alert_category_id, duration_minutes, speed_limit, fuel_threshold, description)
SELECT c.id, v.duration_minutes, v.speed_limit, v.fuel_threshold, v.description
FROM (
  VALUES
    ('OFT', 3.00, NULL::numeric, NULL::numeric, 'Off Track: di luar track & speed = 0 selama durasi'),
    ('OVS', 1.00, 50.00,         NULL::numeric, 'Overspeed: speed > speed_limit selama durasi'),
    ('UVS', 2.00, 10.00,         NULL::numeric, 'Underspeed: 0 < speed < speed_limit selama durasi'),
    ('FUD', 2.00, NULL::numeric, -5.00,         'Fuel Decrease Engine On: engine ON & berhenti, penurunan kumulatif <= fuel_threshold selama durasi'),
    ('FUO', NULL::numeric, NULL::numeric, -5.00, 'Fuel Decrease Engine Off: penurunan <= fuel_threshold terdeteksi saat engine OFF -> ON')
) AS v (code, duration_minutes, speed_limit, fuel_threshold, description)
JOIN alert_categories c ON c.alert_category_code = v.code
WHERE NOT EXISTS (
  SELECT 1
  FROM alert_rules r
  WHERE r.alert_category_id = c.id
    AND r.project_id IS NULL
    AND r.segment IS NULL
);
