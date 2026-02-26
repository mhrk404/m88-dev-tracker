-- =============================================================================
-- Migration 025: Sample realtime presence + edit locks
-- - Tracks active users currently editing a sample
-- - Supports optimistic lock checks to prevent overlapping writes
-- =============================================================================

CREATE TABLE IF NOT EXISTS sample_presence (
  sample_presence_id BIGSERIAL PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES sample_request(sample_id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  role_code TEXT,
  context TEXT NOT NULL DEFAULT 'view',
  lock_type TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '25 seconds'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sample_presence_context_check CHECK (context IN ('view', 'sample_list', 'sample_edit', 'stage_edit')),
  CONSTRAINT sample_presence_lock_type_check CHECK (lock_type IS NULL OR lock_type IN ('sample_edit', 'stage_edit')),
  CONSTRAINT sample_presence_unique UNIQUE (sample_id, user_id, context)
);

CREATE INDEX IF NOT EXISTS idx_sample_presence_sample_expiry
  ON sample_presence(sample_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_sample_presence_user
  ON sample_presence(user_id, expires_at DESC);
