-- Simplify costing table: keep only sent_status and cost_sheet_date
-- Drop old columns and add cost_sheet_date if not exists

ALTER TABLE costing
DROP COLUMN IF EXISTS est_due_date CASCADE,
DROP COLUMN IF EXISTS fty_due_date CASCADE,
DROP COLUMN IF EXISTS due_week CASCADE,
DROP COLUMN IF EXISTS cbd_month CASCADE,
DROP COLUMN IF EXISTS cbd_year CASCADE,
DROP COLUMN IF EXISTS submit_perf CASCADE,
DROP COLUMN IF EXISTS team_member CASCADE,
DROP COLUMN IF EXISTS ng_entry_date CASCADE,
DROP COLUMN IF EXISTS ownership CASCADE,
DROP COLUMN IF EXISTS sent_to_brand CASCADE,
DROP COLUMN IF EXISTS cost_lead_time CASCADE,
DROP COLUMN IF EXISTS stage_status CASCADE;

ALTER TABLE costing
ADD COLUMN IF NOT EXISTS cost_sheet_date DATE;
