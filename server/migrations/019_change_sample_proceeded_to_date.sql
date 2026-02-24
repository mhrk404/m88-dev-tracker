-- ────────────────────────────────────────────────────────────────────────────
-- Migration 019: Change sample_proceeded from BOOLEAN to DATE
-- ────────────────────────────────────────────────────────────────────────────
-- Changes sample_proceeded column in sample_development table from BOOLEAN to DATE
-- This field will now store the date when factory development proceeded

-- Step 1: Drop the existing boolean column
-- (Any existing TRUE values will be lost - if you need to preserve dates, 
--  you would need to manually map boolean values to dates before running this)
ALTER TABLE sample_development 
  DROP COLUMN IF EXISTS sample_proceeded;

-- Step 2: Add the column back as DATE type
ALTER TABLE sample_development 
  ADD COLUMN sample_proceeded DATE;

-- Add index for frequently queried field
CREATE INDEX IF NOT EXISTS idx_sample_development_sample_proceeded ON sample_development (sample_proceeded);
