-- Migration 004: Separate roles lookup (PD, MD, TD, etc.)
-- Depends on: 001_lookup_and_users.sql
-- Run before seed.sql so seed can use role_id.

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Seed role definitions (Admin, Super Admin, PD, MD, TD, etc.)
INSERT INTO roles (name, code) VALUES
  ('Super Admin', 'SUPER_ADMIN'),
  ('Admin', 'ADMIN'),
  ('Product Development', 'PD'),
  ('Merchandising', 'MD'),
  ('Technical Design', 'TD'),
  ('Costing', 'COSTING'),
  ('Factory', 'FACTORY')
ON CONFLICT (code) DO NOTHING;

-- Backfill: add role_id to users and migrate from role text (001 had users.role)
DO $$
DECLARE
  default_role_id INTEGER;
BEGIN
  default_role_id := (SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1);
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles (id);
    UPDATE users u SET role_id = COALESCE((SELECT id FROM roles WHERE code = u.role LIMIT 1), default_role_id);
    UPDATE users SET role_id = default_role_id WHERE role_id IS NULL;
    ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
    EXECUTE format('ALTER TABLE users ALTER COLUMN role_id SET DEFAULT %s', default_role_id);
    ALTER TABLE users DROP COLUMN role;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id') THEN
    ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles (id);
    UPDATE users SET role_id = default_role_id WHERE role_id IS NULL;
    ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
    EXECUTE format('ALTER TABLE users ALTER COLUMN role_id SET DEFAULT %s', default_role_id);
  END IF;
END $$;
