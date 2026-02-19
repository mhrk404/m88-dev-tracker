-- =============================================================================
-- Migration 001: Foundation
-- Creates: set_updated_at trigger function, users, role_permission,
--          brands (+contact), seasons (+code)
-- Run first — no foreign key dependencies.
-- =============================================================================

-- ── Trigger helper ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── roles ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,          -- e.g. ADMIN, PBD, TD
  name       TEXT NOT NULL,                 -- e.g. Administrator, PD
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial roles
INSERT INTO roles (code, name) VALUES
  ('ADMIN',   'Administrator'),
  ('PBD',     'Product Business Dev'),
  ('TD',      'Technical Design'),
  ('FTY',     'Factory Execution'),
  ('MD',      'Merchandising'),
  ('COSTING', 'Costing Analysis'),
  ('BRAND',   'Brand Partner')
ON CONFLICT (code) DO NOTHING;

-- ── users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  department    TEXT,
  role_id       INTEGER REFERENCES roles (id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_username  ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role_id   ON users (role_id);

-- ── audit_log ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users (id),
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  details       JSONB,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log (created_at);

-- ── role_permission ────────────────────────────────────────────────────────────
-- Per-role, per-stage access matrix.
CREATE TABLE IF NOT EXISTS role_permission (
  permission_id SERIAL PRIMARY KEY,
  role          TEXT NOT NULL,                 -- Matches role.code
  stage         TEXT NOT NULL CHECK (stage IN (
                  'PSI', 'SAMPLE_DEVELOPMENT', 'PC_REVIEW',
                  'COSTING', 'SCF', 'SHIPMENT_TO_BRAND'
                )),
  can_read      BOOLEAN NOT NULL DEFAULT false,
  can_write     BOOLEAN NOT NULL DEFAULT false,
  can_approve   BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, stage)
);

CREATE TRIGGER role_permission_updated_at
  BEFORE UPDATE ON role_permission
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── brands ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  contact    TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── seasons ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id         SERIAL PRIMARY KEY,
  code       TEXT,
  year       INTEGER NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, year)
);

CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_seasons_code ON seasons (code);
