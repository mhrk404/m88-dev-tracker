-- =============================================================================
-- Migration 005: Stage Audit Log
-- Creates: stage_audit_log
-- Depends on: 003_sample_request.sql (sample_request), 001_foundation.sql (users)
--
-- Records field-level changes and stage actions.
-- Stages: PSI, SAMPLE_DEVELOPMENT, PC_REVIEW, COSTING, SCF, SHIPMENT_TO_BRAND
-- Actions: CREATE, UPDATE, APPROVE, REJECT
-- =============================================================================

CREATE TABLE IF NOT EXISTS stage_audit_log (
  log_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id     UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users (id),
  stage         TEXT NOT NULL CHECK (stage IN (
                  'PSI', 'SAMPLE_DEVELOPMENT', 'PC_REVIEW',
                  'COSTING', 'SCF', 'SHIPMENT_TO_BRAND'
                )),
  action        TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'APPROVE', 'REJECT')),
  field_changed TEXT,
  old_value     TEXT,
  new_value     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_audit_log_sample_id ON stage_audit_log (sample_id);
CREATE INDEX IF NOT EXISTS idx_stage_audit_log_user_id   ON stage_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_stage_audit_log_stage     ON stage_audit_log (stage);
CREATE INDEX IF NOT EXISTS idx_stage_audit_log_timestamp ON stage_audit_log (timestamp);
