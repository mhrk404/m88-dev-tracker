-- =============================================================================
-- Migration 020: Normalize per-sample role owners
-- Creates: sample_role_owner
-- Depends on: 001_foundation.sql (users), 003_sample_request.sql (sample_request)
--
-- One sample can store one assigned user per normalized role_key.
-- This supports additional details display and stage ownership tracking.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sample_role_owner (
  sample_role_owner_id BIGSERIAL PRIMARY KEY,
  sample_id            UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  role_key             TEXT NOT NULL CHECK (role_key IN (
    'PBD_SAMPLE_CREATION',
    'TD_PSI_INTAKE',
    'FTY_MD_DEVELOPMENT',
    'MD_M88_DECISION',
    'COSTING_TEAM_COST_SHEET',
    'PBD_BRAND_TRACKING'
  )),
  user_id              INTEGER REFERENCES users (id),
  entered_by           INTEGER REFERENCES users (id),
  entered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sample_id, role_key)
);

CREATE TRIGGER sample_role_owner_updated_at
  BEFORE UPDATE ON sample_role_owner
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sample_role_owner_sample_id ON sample_role_owner (sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_role_owner_user_id   ON sample_role_owner (user_id);
CREATE INDEX IF NOT EXISTS idx_sample_role_owner_role_key  ON sample_role_owner (role_key);

COMMENT ON TABLE sample_role_owner IS 'Normalized per-sample role owner assignments (one row per sample+role key).';
