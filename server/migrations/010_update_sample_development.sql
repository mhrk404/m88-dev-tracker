-- ────────────────────────────────────────────────────────────────────────────
-- Migration 010: Update sample_development table
-- ────────────────────────────────────────────────────────────────────────────
-- Adds new columns for updated SAMPLE_DEVELOPMENT stage form
-- Removes unused columns that were cleaned up in the UI

-- Add new columns for SAMPLE_DEVELOPMENT stage
ALTER TABLE sample_development 
  ADD COLUMN IF NOT EXISTS fty_target_sample DATE,
  ADD COLUMN IF NOT EXISTS sample_proceeded BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fty_psi_btp_discrepancy TEXT,
  ADD COLUMN IF NOT EXISTS target_1pc_review_date DATE,
  ADD COLUMN IF NOT EXISTS actual_cbd_submitted_date DATE;

-- Add field required by updated PC_REVIEW form
ALTER TABLE pc_review
  ADD COLUMN IF NOT EXISTS scf_shared_date DATE;

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
