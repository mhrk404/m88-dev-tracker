-- =============================================================================
-- Migration 009: Add start_date and end_date to seasons
-- Adds optional date columns to seasons table used by the API and UI.
-- =============================================================================

ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;
