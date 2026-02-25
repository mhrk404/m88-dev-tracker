-- =============================================================================
-- Migration 021: System Audit Log
-- Creates: audit_log table for system-wide activity tracking
-- Depends on: 001_foundation.sql (users)
--
-- Records all system activities: login, logout, CRUD operations on resources
-- Used for compliance, debugging, and activity monitoring
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action             TEXT NOT NULL,
  resource           TEXT NOT NULL,
  resource_id        TEXT,
  details            JSONB,
  ip                 TEXT,
  user_agent         TEXT,
  "timestamp"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log (resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log (resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log ("timestamp" DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON audit_log (user_id, "timestamp" DESC);
