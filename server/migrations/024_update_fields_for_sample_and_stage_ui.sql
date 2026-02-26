-- =============================================================================
-- Migration 024: Align sample/stage fields with updated UI
-- - Ensure sample_request receives reference sample-to-FTY value
-- - Remove deprecated stage columns no longer used by UI/API
-- =============================================================================

-- Ensure create-sample field exists (safe for existing databases)
ALTER TABLE sample_request
  ADD COLUMN IF NOT EXISTS ref_sample_to_fty TEXT;

COMMENT ON COLUMN sample_request.ref_sample_to_fty
  IS 'PBD: Reference Sample to ship to FTY (Y/N)';

-- Factory stage: remove deprecated target date field
ALTER TABLE sample_development
  DROP COLUMN IF EXISTS fty_target_sample;

-- MD stage: remove deprecated TD fit-log field
ALTER TABLE pc_review
  DROP COLUMN IF EXISTS td_fit_log_review_status;
