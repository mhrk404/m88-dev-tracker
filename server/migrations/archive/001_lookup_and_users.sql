-- Migration 001: Lookup tables and users
-- Run this first (no foreign key dependencies)

-- 1. brands
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. seasons
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, year)
);

-- 3. divisions
CREATE TABLE IF NOT EXISTS divisions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. product_categories (parent_id self-reference added in next statement)
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_categories_parent'
  ) THEN
    ALTER TABLE product_categories
      ADD CONSTRAINT fk_product_categories_parent
      FOREIGN KEY (parent_id) REFERENCES product_categories (id);
  END IF;
END $$;

-- 5. sample_types
CREATE TABLE IF NOT EXISTS sample_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "group" TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  supabase_user_id UUID UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger function: set updated_at on row update (reused in later migrations)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers for this migration
CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER sample_types_updated_at
  BEFORE UPDATE ON sample_types
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
