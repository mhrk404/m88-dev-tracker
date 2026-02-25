-- Migration 022: Add is_checked flag to stage tables used by Edit Stage UI
-- Ensures "Mark Stage as Checked / Verified" persists and reloads after save.

ALTER TABLE psi
  ADD COLUMN IF NOT EXISTS is_checked BOOLEAN;

ALTER TABLE sample_development
  ADD COLUMN IF NOT EXISTS is_checked BOOLEAN;

ALTER TABLE shipment_to_brand
  ADD COLUMN IF NOT EXISTS is_checked BOOLEAN;

-- Keep existing rows explicit and predictable for UI reloads.
UPDATE psi
SET is_checked = FALSE
WHERE is_checked IS NULL;

UPDATE sample_development
SET is_checked = FALSE
WHERE is_checked IS NULL;

UPDATE shipment_to_brand
SET is_checked = FALSE
WHERE is_checked IS NULL;