-- =============================================================================
-- Migration 017: Add region scope for multi-region administration
-- Adds users.region with allowed values: US, PH, INDONESIA
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS region TEXT;

UPDATE users
SET region = 'US'
WHERE region IS NULL OR btrim(region) = '';

ALTER TABLE users
  ALTER COLUMN region SET DEFAULT 'US';

ALTER TABLE users
  ALTER COLUMN region SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_region_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_region_check
      CHECK (region IN ('US', 'PH', 'INDONESIA'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_region ON users (region);

COMMENT ON COLUMN users.region IS 'Administrative scope region: US | PH | INDONESIA';
