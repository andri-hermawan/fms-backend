-- =============================================================================
-- alert_rule_recipients: penerima notifikasi WhatsApp per alert rule.
--
-- Nomor diambil dari users.phone_number saat alert terjadi, sehingga perubahan
-- nomor di master user langsung berlaku tanpa mengubah rule.
--
-- Penerima digabung (union) dari semua level rule aktif yang cocok:
--   Global + Project (project equipment) + Segment (segment lokasi alert).
-- Tidak ada penerima = alert tetap tersimpan, hanya WhatsApp yang tidak dikirim.
-- =============================================================================

CREATE TABLE IF NOT EXISTS alert_rule_recipients (
  alert_rule_id UUID NOT NULL
                REFERENCES alert_rules (id) ON DELETE CASCADE,
  user_id       UUID NOT NULL
                REFERENCES users (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ(6) DEFAULT NOW(),
  PRIMARY KEY (alert_rule_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_rule_recipients_user
  ON alert_rule_recipients (user_id);
