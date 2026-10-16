-- =============================================================================
-- report_schedules: jadwal pengiriman report PDF via email (jam bisa diubah).
-- report_schedule_logs: riwayat eksekusi (anti kirim dobel + audit gagal/sukses).
--
-- report_type  : kunci report di registry backend (mis. 'alert_summary').
-- shift        : shift_name (mis. 'Shift 1'); satu jadwal = satu shift = satu PDF.
-- date_offset  : selisih hari dari tanggal kirim. -1 = data kemarin (H-1).
-- send_time    : 'HH:mm' pada timezone jadwal.
-- user_ids     : penerima, dipilih dari tabel users.
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(150) NOT NULL,
  report_type  VARCHAR(50)  NOT NULL,
  shift        VARCHAR(100) NOT NULL,
  date_offset  INT NOT NULL DEFAULT -1,
  send_time    VARCHAR(5)   NOT NULL DEFAULT '09:00',
  timezone     VARCHAR(50)  NOT NULL DEFAULT 'Asia/Jakarta',
  user_ids     UUID[] NOT NULL DEFAULT '{}',
  status       VARCHAR(20)  DEFAULT 'active',
  last_run_at  TIMESTAMPTZ(6) NULL,
  created_at   TIMESTAMPTZ(6) DEFAULT NOW(),
  created_by   UUID NULL,
  updated_at   TIMESTAMPTZ(6) NULL,
  updated_by   UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_status
  ON report_schedules (status, send_time);

CREATE TABLE IF NOT EXISTS report_schedule_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id   UUID NOT NULL REFERENCES report_schedules (id) ON DELETE CASCADE,
  run_date      DATE NOT NULL,          -- tanggal kirim (timezone jadwal)
  report_date   DATE NOT NULL,          -- tanggal data yang dilaporkan
  trigger       VARCHAR(20) NOT NULL DEFAULT 'schedule', -- schedule | manual
  status        VARCHAR(20) NOT NULL,   -- success | failed
  recipients    INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at    TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedule_logs_schedule
  ON report_schedule_logs (schedule_id, run_date);
