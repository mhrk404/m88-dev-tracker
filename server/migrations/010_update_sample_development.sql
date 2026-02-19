-- ────────────────────────────────────────────────────────────────────────────
-- Migration 010: Update sample_development table and add is_checked to all stages
-- ────────────────────────────────────────────────────────────────────────────
-- Adds new columns for updated SAMPLE_DEVELOPMENT stage form
-- Removes unused columns that were cleaned up in the UI
-- Adds is_checked column to all stage tables

-- Add new columns for SAMPLE_DEVELOPMENT stage
ALTER TABLE sample_development 
  ADD COLUMN IF NOT EXISTS fty_target_sample DATE,
  ADD COLUMN IF NOT EXISTS sample_proceeded BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fty_psi_btp_discrepancy TEXT,
  ADD COLUMN IF NOT EXISTS target_1pc_review_date DATE,
  ADD COLUMN IF NOT EXISTS actual_cbd_submitted_date DATE,
  ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT NULL;

-- Add is_checked column to all other stage tables
ALTER TABLE psi ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT NULL;
ALTER TABLE pc_review ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT NULL;
ALTER TABLE costing ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT NULL;
ALTER TABLE scf ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT NULL;
ALTER TABLE shipment_to_brand ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT NULL;

-- Drop columns that are no longer used in the UI
-- (Optional: Comment out if you want to preserve data)
ALTER TABLE sample_development
  DROP COLUMN IF EXISTS tp_handoff_td,
  DROP COLUMN IF EXISTS fit_log_review,
  DROP COLUMN IF EXISTS p3_reason,
  DROP COLUMN IF EXISTS remake_reason,
  DROP COLUMN IF EXISTS denver_status;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_sample_development_fty_target_sample ON sample_development (fty_target_sample);
CREATE INDEX IF NOT EXISTS idx_sample_development_target_1pc_review_date ON sample_development (target_1pc_review_date);
