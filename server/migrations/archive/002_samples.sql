-- Migration 002: Core samples table
-- Depends on: 001_lookup_and_users.sql

CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_number TEXT NOT NULL,
  style_name TEXT,
  color TEXT,
  qty INTEGER,
  season_id INTEGER NOT NULL REFERENCES seasons (id),
  brand_id INTEGER NOT NULL REFERENCES brands (id),
  division_id INTEGER NOT NULL REFERENCES divisions (id),
  category_id INTEGER NOT NULL REFERENCES product_categories (id),
  sample_type_id INTEGER NOT NULL REFERENCES sample_types (id),
  coo TEXT,
  current_status TEXT,
  current_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INTEGER NOT NULL REFERENCES users (id),
  UNIQUE (style_number, color, season_id)
);

CREATE TRIGGER samples_updated_at
  BEFORE UPDATE ON samples
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_samples_season_id ON samples (season_id);
CREATE INDEX IF NOT EXISTS idx_samples_brand_id ON samples (brand_id);
CREATE INDEX IF NOT EXISTS idx_samples_created_by ON samples (created_by);
CREATE INDEX IF NOT EXISTS idx_samples_style_number ON samples (style_number);
