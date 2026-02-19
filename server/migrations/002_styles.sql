-- =============================================================================
-- Migration 002: Styles
-- Creates: styles
-- Depends on: 001_foundation.sql (brands, seasons)
--
-- FILLED BY: PBD at sample kickoff
--   brand_id, season_id, style_number, style_name, division,
--   product_category, color, qty, coo
-- =============================================================================

CREATE TABLE IF NOT EXISTS styles (
  style_id         SERIAL PRIMARY KEY,
  brand_id         INTEGER NOT NULL REFERENCES brands (id),   -- PBD: Brand
  season_id        INTEGER NOT NULL REFERENCES seasons (id),  -- PBD: Season
  style_number     TEXT NOT NULL,                             -- PBD: Style#
  style_name       TEXT,                                      -- PBD: Style Name
  division         TEXT,                                      -- PBD: Division
  product_category TEXT,                                      -- PBD: Product Category
  color            TEXT,                                      -- PBD: Color
  qty              INTEGER,                                   -- PBD: QTY
  coo              TEXT,                                      -- PBD: COO (Indonesia/China)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (style_number, color, season_id)
);

CREATE TRIGGER styles_updated_at
  BEFORE UPDATE ON styles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_styles_brand_id     ON styles (brand_id);
CREATE INDEX IF NOT EXISTS idx_styles_season_id    ON styles (season_id);
CREATE INDEX IF NOT EXISTS idx_styles_style_number ON styles (style_number);

COMMENT ON COLUMN styles.brand_id         IS 'PBD: Brand';
COMMENT ON COLUMN styles.season_id        IS 'PBD: Season (e.g. S27 / 2027)';
COMMENT ON COLUMN styles.style_number     IS 'PBD: Style#';
COMMENT ON COLUMN styles.style_name       IS 'PBD: Style Name';
COMMENT ON COLUMN styles.division         IS 'PBD: Division';
COMMENT ON COLUMN styles.product_category IS 'PBD: Product Category';
COMMENT ON COLUMN styles.color            IS 'PBD: Color';
COMMENT ON COLUMN styles.qty              IS 'PBD: QTY';
COMMENT ON COLUMN styles.coo              IS 'PBD: Country of Origin (Indonesia / China)';
