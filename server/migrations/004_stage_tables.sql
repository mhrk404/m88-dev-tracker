-- =============================================================================
-- Migration 004: Stage Tables
-- Creates: psi, sample_development, pc_review, costing, scf, shipment_to_brand
-- Depends on: 003_sample_request.sql (sample_request)
--
-- All stage tables use sample_id UUID FK → sample_request (ON DELETE CASCADE).
-- PSI / PC_REVIEW / SCF / SHIPMENT_TO_BRAND: UNIQUE on sample_id (one row per sample).
-- SAMPLE_DEVELOPMENT / COSTING:              UNIQUE on sample_id (one row per sample).
-- =============================================================================

-- ── PSI (owner: PBD) ──────────────────────────────────────────────────────────
-- PBD: write  |  ALL: read
CREATE TABLE IF NOT EXISTS psi (
  psi_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id   UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  sent_date   DATE,
  work_week   TEXT,
  turn_time   TEXT,
  month       INTEGER,
  year        INTEGER,
  sent_status  TEXT,
  disc_status  TEXT,
  btp_disc     TEXT,
  stage_status TEXT,              -- PSI_SENT
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER psi_updated_at
  BEFORE UPDATE ON psi
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_psi_sample_id ON psi (sample_id);

-- ── SAMPLE_DEVELOPMENT (owner: FTY / TD) ──────────────────────────────────────
-- FTY + TD: write  |  PBD + MD: read
CREATE TABLE IF NOT EXISTS sample_development (
  dev_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id       UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  tp_handoff_td   DATE,
  fit_log_review  TEXT,
  fty_md          TEXT,
  fty_machine     TEXT,
  p3_reason       TEXT,
  remake_reason   TEXT,
  target_xfty     DATE,
  actual_send     DATE,
  fty_remark      TEXT,
  proceeded_date  DATE,              -- PBD: Date sample proceeded (Col 30 in spreadsheet)
  awb             TEXT,              -- FTY: AWB# for sample shipment (Col 32 in spreadsheet)
  est_xfty        DATE,
  denver_status   TEXT,
  fty_lead_time   TEXT,
  delivery_perf   TEXT,
  proto_eff       TEXT,
  target_xfty_wk  TEXT,
  stage_status    TEXT,              -- IN_DEVELOPMENT | FIT_REVIEW
  revision_count  INTEGER NOT NULL DEFAULT 0,  -- increments each time MD rejects back to SAMPLE_DEV
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER sample_development_updated_at
  BEFORE UPDATE ON sample_development
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sample_development_sample_id ON sample_development (sample_id);

-- ── PC_REVIEW (owner: MD / TD) ────────────────────────────────────────────────
-- MD + TD: write  |  PBD + TD: read
CREATE TABLE IF NOT EXISTS pc_review (
  pc_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id     UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  target_1pc    DATE,
  awb_inbound   TEXT,
  cbd_actual    DATE,
  confirm_date  DATE,
  reject_by_md  TEXT,
  review_comp   TEXT,
  reject_status TEXT,
  md_int_review TEXT,
  td_md_compare TEXT,
  stage_status  TEXT,              -- PENDING_REVIEW | APPROVED | REJECTED
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER pc_review_updated_at
  BEFORE UPDATE ON pc_review
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pc_review_sample_id ON pc_review (sample_id);

-- ── COSTING (owner: COSTING / PBD) ────────────────────────────────────────────
-- COSTING + PBD: write  |  ALL: read
CREATE TABLE IF NOT EXISTS costing (
  cost_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id         UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  sent_status       TEXT,
  cost_sheet_date   DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER costing_updated_at
  BEFORE UPDATE ON costing
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_costing_sample_id ON costing (sample_id);

-- ── SCF (owner: FTY) ──────────────────────────────────────────────────────────
-- FTY: write  |  ALL: read
CREATE TABLE IF NOT EXISTS scf (
  scf_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id     UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  shared_date   DATE,
  month         INTEGER,
  year          INTEGER,
  performance    TEXT,
  pkg_eta_denver DATE,
  stage_status   TEXT,              -- SCF_SHARED
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER scf_updated_at
  BEFORE UPDATE ON scf
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scf_sample_id ON scf (sample_id);

-- ── SHIPMENT_TO_BRAND (owner: PBD) ────────────────────────────────────────────
-- PBD: write  |  ALL: read
-- PBD fills: sent_date (Sample Sent to Brand), awb_number (AWB# Sample to Brand)
CREATE TABLE IF NOT EXISTS shipment_to_brand (
  shipment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id          UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  sent_date          DATE,               -- PBD: Sample Sent to Brand
  awb_number         TEXT,               -- PBD: AWB# Sample to Brand
  awb_status         TEXT,
  week_num           TEXT,
  arrival_week       TEXT,
  arrival_month      INTEGER,
  arrival_year       INTEGER,
  sent_status        TEXT,
  lead_time_to_brand TEXT,
  stage_status       TEXT,              -- SHIPPED | DELIVERED
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER shipment_to_brand_updated_at
  BEFORE UPDATE ON shipment_to_brand
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_shipment_to_brand_sample_id ON shipment_to_brand (sample_id);

COMMENT ON COLUMN shipment_to_brand.sent_date  IS 'PBD: Sample Sent to Brand';
COMMENT ON COLUMN shipment_to_brand.awb_number IS 'PBD: AWB# Sample to Brand';
