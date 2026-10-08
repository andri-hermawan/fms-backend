-- =============================================================================
-- equipment_logs: simpan deskripsi breakdown (dari breakdown_status.description)
-- bersama flag breakdown saat log dibuat.
-- =============================================================================

ALTER TABLE equipment_logs ADD COLUMN IF NOT EXISTS breakdown_desc VARCHAR(255) NULL;
