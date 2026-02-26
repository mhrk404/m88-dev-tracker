-- =============================================================================
-- Migration 023: Align stage schema with active UI stage fields
--
-- Goal:
-- 1) Keep only columns actively used by stage forms.
-- 2) Remove legacy/unused columns from stage tables.
-- 3) Enforce one shipment row per sample so stage saves are deterministic.
--
-- Notes:
-- - delivered_confirmation is a virtual stage in API/UI.
-- - Its sent_date is physically stored in shipment_to_brand.sent_date.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PSI: keep => tp_handoff_td, sent_date, p3_remake_reason, is_checked
-- -----------------------------------------------------------------------------
ALTER TABLE psi
  DROP COLUMN IF EXISTS work_week,
  DROP COLUMN IF EXISTS turn_time,
  DROP COLUMN IF EXISTS month,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS sent_status,
  DROP COLUMN IF EXISTS disc_status,
  DROP COLUMN IF EXISTS btp_disc,
  DROP COLUMN IF EXISTS stage_status;

-- -----------------------------------------------------------------------------
-- SAMPLE_DEVELOPMENT: keep active stage fields only
-- -----------------------------------------------------------------------------
ALTER TABLE sample_development
  DROP COLUMN IF EXISTS tp_handoff_td,
  DROP COLUMN IF EXISTS fit_log_review,
  DROP COLUMN IF EXISTS fty_md,
  DROP COLUMN IF EXISTS p3_reason,
  DROP COLUMN IF EXISTS remake_reason,
  DROP COLUMN IF EXISTS proceeded_date,
  DROP COLUMN IF EXISTS est_xfty,
  DROP COLUMN IF EXISTS denver_status,
  DROP COLUMN IF EXISTS fty_lead_time,
  DROP COLUMN IF EXISTS delivery_perf,
  DROP COLUMN IF EXISTS proto_eff,
  DROP COLUMN IF EXISTS target_xfty_wk,
  DROP COLUMN IF EXISTS stage_status,
  DROP COLUMN IF EXISTS revision_count;

-- -----------------------------------------------------------------------------
-- PC_REVIEW: keep active stage fields only
-- -----------------------------------------------------------------------------
ALTER TABLE pc_review
  DROP COLUMN IF EXISTS target_1pc,
  DROP COLUMN IF EXISTS awb_inbound,
  DROP COLUMN IF EXISTS cbd_actual,
  DROP COLUMN IF EXISTS reject_status,
  DROP COLUMN IF EXISTS td_md_compare,
  DROP COLUMN IF EXISTS stage_status;

-- -----------------------------------------------------------------------------
-- SHIPMENT_TO_BRAND:
-- keep => sent_date (used by Delivered Confirmation), awb_number, pkg_eta_denver, is_checked
-- -----------------------------------------------------------------------------
ALTER TABLE shipment_to_brand
  DROP COLUMN IF EXISTS awb_status,
  DROP COLUMN IF EXISTS week_num,
  DROP COLUMN IF EXISTS arrival_week,
  DROP COLUMN IF EXISTS arrival_month,
  DROP COLUMN IF EXISTS arrival_year,
  DROP COLUMN IF EXISTS sent_status,
  DROP COLUMN IF EXISTS lead_time_to_brand,
  DROP COLUMN IF EXISTS stage_status;

-- Deduplicate shipment rows before enforcing one-row-per-sample.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY sample_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, shipment_id DESC
    ) AS rn
  FROM shipment_to_brand
)
DELETE FROM shipment_to_brand s
USING ranked r
WHERE s.ctid = r.ctid
  AND r.rn > 1;

-- Enforce one shipment row per sample to match stage editor expectations.
DROP INDEX IF EXISTS idx_shipment_to_brand_sample_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_to_brand_sample_id ON shipment_to_brand (sample_id);

COMMIT;
