-- =============================================================================
-- fuel_calibrations.calibration_type: jenis kalibrasi per equipment.
--
--   LLS        : fuel_level = nilai mentah sensor LLS (counts)   [default]
--   PERCENTAGE : fuel_level = persen 0-100 (mis. dari ECU)
--
-- Baris lama otomatis LLS sehingga perilaku equipment_logs tidak berubah.
-- =============================================================================

ALTER TABLE fuel_calibrations
  ADD COLUMN IF NOT EXISTS calibration_type VARCHAR(20) NOT NULL DEFAULT 'LLS';

ALTER TABLE fuel_calibrations
  DROP CONSTRAINT IF EXISTS chk_fuel_calibration_type;
ALTER TABLE fuel_calibrations
  ADD CONSTRAINT chk_fuel_calibration_type
  CHECK (calibration_type IN ('LLS', 'PERCENTAGE'));
