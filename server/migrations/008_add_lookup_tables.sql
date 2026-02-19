-- =============================================================================
-- Migration 008: Lookup tables
-- Creates: divisions, product_categories, sample_types
-- =============================================================================

CREATE TABLE IF NOT EXISTS divisions (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_divisions_name ON divisions (name);

CREATE TABLE IF NOT EXISTS product_categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories (name);

CREATE TABLE IF NOT EXISTS sample_types (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  "group"   TEXT,
  description TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER sample_types_updated_at
  BEFORE UPDATE ON sample_types
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sample_types_name ON sample_types (name);
