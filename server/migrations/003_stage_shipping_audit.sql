-- Migration 003: Stage tracking, shipping, and audit tables
-- Depends on: 002_samples.sql

-- 8. product_business_dev (Stage 1)
CREATE TABLE IF NOT EXISTS product_business_dev (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES samples (id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users (id),
  unfree_status TEXT,
  kickoff_date DATE,
  sample_due_denver DATE,
  sample_sent_brand_date DATE,
  sample_status TEXT,
  reference_m88_dev BOOLEAN NOT NULL DEFAULT false,
  reference_ship_to_fty BOOLEAN NOT NULL DEFAULT false,
  additional_notes TEXT,
  awb_to_brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER product_business_dev_updated_at
  BEFORE UPDATE ON product_business_dev
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 9. technical_design (Stage 2)
CREATE TABLE IF NOT EXISTS technical_design (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES samples (id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users (id),
  handoff_date DATE,
  psi_sent_to_factory_date DATE,
  p3_remake_reason TEXT,
  fit_log_review_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER technical_design_updated_at
  BEFORE UPDATE ON technical_design
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 10. factory_execution (Stage 3)
CREATE TABLE IF NOT EXISTS factory_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES samples (id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users (id),
  machine TEXT,
  target_crossfactory_date DATE,
  actual_ship_date DATE,
  target_first_pc_review_date DATE,
  cost_breakdown_submit_date DATE,
  psi_discrepancy TEXT,
  factory_remarks TEXT,
  sample_proceeded BOOLEAN NOT NULL DEFAULT false,
  awb TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER factory_execution_updated_at
  BEFORE UPDATE ON factory_execution
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 11. merchandising_review (Stage 4)
CREATE TABLE IF NOT EXISTS merchandising_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES samples (id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES users (id),
  first_pc_review_confirmed_date DATE,
  first_pc_review_complete_date DATE,
  scf_shared_date DATE,
  first_pc_rejected BOOLEAN NOT NULL DEFAULT false,
  internal_review_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER merchandising_review_updated_at
  BEFORE UPDATE ON merchandising_review
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 12. costing_analysis (Stage 5)
CREATE TABLE IF NOT EXISTS costing_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL UNIQUE REFERENCES samples (id) ON DELETE CASCADE,
  analyst_id INTEGER REFERENCES users (id),
  brand_communication_owner_id INTEGER REFERENCES users (id),
  cost_sheet_entered_date DATE,
  costing_sent_to_brand_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER costing_analysis_updated_at
  BEFORE UPDATE ON costing_analysis
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 13. shipping_tracking
CREATE TABLE IF NOT EXISTS shipping_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES samples (id) ON DELETE CASCADE,
  awb TEXT,
  origin TEXT,
  destination TEXT,
  estimated_arrival DATE,
  actual_arrival DATE,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER shipping_tracking_updated_at
  BEFORE UPDATE ON shipping_tracking
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_shipping_tracking_sample_id ON shipping_tracking (sample_id);

-- 14. sample_history
CREATE TABLE IF NOT EXISTS sample_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES samples (id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER NOT NULL REFERENCES users (id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sample_history_sample_id ON sample_history (sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_history_changed_at ON sample_history (changed_at);

-- 15. status_transitions
CREATE TABLE IF NOT EXISTS status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES samples (id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  stage TEXT,
  transitioned_by INTEGER NOT NULL REFERENCES users (id),
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_transitions_sample_id ON status_transitions (sample_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_transitioned_at ON status_transitions (transitioned_at);
