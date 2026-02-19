-- Migration 010: Revised schema (USER/ROLE, STYLE, SAMPLE_REQUEST, stage tables, TEAM_ASSIGNMENT, STAGE_AUDIT_LOG)
-- Run after 009. Creates new tables; existing samples/stage tables are left in place for data migration or parallel run.
-- Roles: PBD, TD, FTY, MD, COSTING, BRAND, ADMIN. Stage tables: PSI, SAMPLE_DEVELOPMENT, PC_REVIEW, COSTING, SCF, SHIPMENT_TO_BRAND.

-- 1. User role enum (app-level role for permissions)
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Optional: add app_role to users for new permission model (nullable; can backfill from roles table)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS app_role user_role_enum;

COMMENT ON COLUMN users.app_role IS 'Application role for RBAC: PBD, TD, FTY, MD, COSTING, BRAND, ADMIN. Used with role_permission.';

-- 2. Role permission (per-role, per-stage can_read/can_write/can_approve)
CREATE TABLE IF NOT EXISTS role_permission (
  permission_id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('PBD', 'TD', 'FTY', 'MD', 'COSTING', 'BRAND', 'ADMIN')),
  stage TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, stage)
);

CREATE TRIGGER role_permission_updated_at
  BEFORE UPDATE ON role_permission
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission (role);
CREATE INDEX IF NOT EXISTS idx_role_permission_stage ON role_permission (stage);

-- 3. Brands: add contact if missing
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS contact TEXT;

-- 4. Seasons: add code (e.g. S27) if missing
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_code_year ON seasons (code, year) WHERE code IS NOT NULL;

-- 5. Style (brand + season + style attributes)
CREATE TABLE IF NOT EXISTS styles (
  style_id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands (id),
  season_id INTEGER NOT NULL REFERENCES seasons (id),
  style_number TEXT NOT NULL,
  style_name TEXT,
  division TEXT,
  product_category TEXT,
  color TEXT,
  qty INTEGER,
  coo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (style_number, color, season_id)
);

CREATE TRIGGER styles_updated_at
  BEFORE UPDATE ON styles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_styles_brand_id ON styles (brand_id);
CREATE INDEX IF NOT EXISTS idx_styles_season_id ON styles (season_id);
CREATE INDEX IF NOT EXISTS idx_styles_style_number ON styles (style_number);

-- 6. Sample request (core/parent); assignment_id is set after team_assignment row is created
CREATE TABLE IF NOT EXISTS sample_request (
  sample_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id INTEGER NOT NULL REFERENCES styles (style_id),
  assignment_id INTEGER,
  sample_type TEXT,
  sample_type_group TEXT,
  sample_status TEXT,
  kickoff_date DATE,
  sample_due_denver DATE,
  requested_lead_time INTEGER,
  lead_time_type TEXT,
  ref_from_m88 TEXT,
  ref_sample_to_fty TEXT,
  additional_notes TEXT,
  key_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INTEGER REFERENCES users (id)
);

CREATE TRIGGER sample_request_updated_at
  BEFORE UPDATE ON sample_request
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sample_request_style_id ON sample_request (style_id);
CREATE INDEX IF NOT EXISTS idx_sample_request_created_by ON sample_request (created_by);

-- 7. Team assignment (one per sample; links sample to PBD/TD/FTY/MD/COSTING users)
CREATE TABLE IF NOT EXISTS team_assignment (
  assignment_id SERIAL PRIMARY KEY,
  sample_id UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  pbd_user_id INTEGER REFERENCES users (id),
  td_user_id INTEGER REFERENCES users (id),
  fty_user_id INTEGER REFERENCES users (id),
  md_user_id INTEGER REFERENCES users (id),
  costing_user_id INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER team_assignment_updated_at
  BEFORE UPDATE ON team_assignment
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Link sample_request.assignment_id → team_assignment (optional; set when assignment row exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sample_request_assignment'
  ) THEN
    ALTER TABLE sample_request
      ADD CONSTRAINT fk_sample_request_assignment
      FOREIGN KEY (assignment_id) REFERENCES team_assignment (assignment_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_assignment_sample_id ON team_assignment (sample_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_pbd ON team_assignment (pbd_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_td ON team_assignment (td_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_fty ON team_assignment (fty_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_md ON team_assignment (md_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_costing ON team_assignment (costing_user_id);

-- 8. PSI (owner PBD)
CREATE TABLE IF NOT EXISTS psi (
  psi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  sent_date DATE,
  work_week TEXT,
  turn_time TEXT,
  month INTEGER,
  year INTEGER,
  sent_status TEXT,
  disc_status TEXT,
  btp_disc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER psi_updated_at
  BEFORE UPDATE ON psi
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_psi_sample_id ON psi (sample_id);

-- 9. Sample development (owner FTY/TD)
CREATE TABLE IF NOT EXISTS sample_development (
  dev_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  tp_handoff_td DATE,
  fit_log_review TEXT,
  fty_md TEXT,
  fty_machine TEXT,
  p3_reason TEXT,
  remake_reason TEXT,
  target_xfty DATE,
  actual_send DATE,
  fty_remark TEXT,
  proceeded BOOLEAN,
  est_xfty DATE,
  denver_status TEXT,
  fty_lead_time TEXT,
  delivery_perf TEXT,
  proto_eff TEXT,
  target_xfty_wk TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER sample_development_updated_at
  BEFORE UPDATE ON sample_development
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sample_development_sample_id ON sample_development (sample_id);

-- 10. PC Review (owner MD)
CREATE TABLE IF NOT EXISTS pc_review (
  pc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  target_1pc DATE,
  awb_inbound TEXT,
  cbd_actual DATE,
  confirm_date DATE,
  reject_by_md TEXT,
  review_comp TEXT,
  reject_status TEXT,
  md_int_review TEXT,
  td_md_compare TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER pc_review_updated_at
  BEFORE UPDATE ON pc_review
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pc_review_sample_id ON pc_review (sample_id);

-- 11. Costing (owner COSTING)
CREATE TABLE IF NOT EXISTS costing (
  cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  est_due_date DATE,
  fty_due_date DATE,
  due_week TEXT,
  cbd_month INTEGER,
  cbd_year INTEGER,
  submit_perf TEXT,
  team_member TEXT,
  ng_entry_date DATE,
  ownership TEXT,
  sent_to_brand TEXT,
  cost_lead_time TEXT,
  sent_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER costing_updated_at
  BEFORE UPDATE ON costing
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_costing_sample_id ON costing (sample_id);

-- 12. SCF (owner FTY)
CREATE TABLE IF NOT EXISTS scf (
  scf_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  shared_date DATE,
  month INTEGER,
  year INTEGER,
  performance TEXT,
  pkg_eta_denver DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER scf_updated_at
  BEFORE UPDATE ON scf
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scf_sample_id ON scf (sample_id);

-- 13. Shipment to brand (owner PBD)
CREATE TABLE IF NOT EXISTS shipment_to_brand (
  shipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  sent_date DATE,
  awb_number TEXT,
  awb_status TEXT,
  week_num TEXT,
  arrival_week TEXT,
  arrival_month INTEGER,
  arrival_year INTEGER,
  sent_status TEXT,
  lead_time_to_brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER shipment_to_brand_updated_at
  BEFORE UPDATE ON shipment_to_brand
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_shipment_to_brand_sample_id ON shipment_to_brand (sample_id);

-- 14. Stage audit log (field-level changes and actions per stage)
CREATE TABLE IF NOT EXISTS stage_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users (id),
  stage TEXT NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_audit_log_sample_id ON stage_audit_log (sample_id);
CREATE INDEX IF NOT EXISTS idx_stage_audit_log_user_id ON stage_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_stage_audit_log_timestamp ON stage_audit_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_stage_audit_log_stage ON stage_audit_log (stage);
