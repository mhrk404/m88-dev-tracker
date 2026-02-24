-- Migration 018: Add new stage fields, move pkg ETA to shipment, remove SCF stage

-- PSI additions
ALTER TABLE psi
  ADD COLUMN IF NOT EXISTS tp_handoff_td DATE,
  ADD COLUMN IF NOT EXISTS p3_remake_reason TEXT;

-- Sample development additions
ALTER TABLE sample_development
  ADD COLUMN IF NOT EXISTS fty_md_user_id INTEGER REFERENCES users (id);

-- PC review additions
ALTER TABLE pc_review
  ADD COLUMN IF NOT EXISTS td_fit_log_review_status TEXT;

-- Costing additions
ALTER TABLE costing
  ADD COLUMN IF NOT EXISTS team_member_user_id INTEGER REFERENCES users (id);

-- Shipment to brand additions
ALTER TABLE shipment_to_brand
  ADD COLUMN IF NOT EXISTS pkg_eta_denver DATE;

-- Backfill team member assignments from team_assignment
UPDATE psi
SET p3_remake_reason = CONCAT_WS(
  "\n",
  NULLIF(TRIM(p3_reason), ""),
  NULLIF(TRIM(remake_reason), "")
)
WHERE p3_remake_reason IS NULL
  AND (p3_reason IS NOT NULL OR remake_reason IS NOT NULL);

ALTER TABLE psi
  DROP COLUMN IF EXISTS p3_reason,
  DROP COLUMN IF EXISTS remake_reason;

UPDATE sample_development sd
SET fty_md_user_id = ta.fty_user_id
FROM team_assignment ta
WHERE sd.sample_id = ta.sample_id
  AND sd.fty_md_user_id IS NULL
  AND ta.fty_user_id IS NOT NULL;

UPDATE costing c
SET team_member_user_id = ta.costing_user_id
FROM team_assignment ta
WHERE c.sample_id = ta.sample_id
  AND c.team_member_user_id IS NULL
  AND ta.costing_user_id IS NOT NULL;

-- Migrate package ETA from SCF if SCF exists, then drop SCF table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'scf'
  ) THEN
    UPDATE shipment_to_brand stb
    SET pkg_eta_denver = scf.pkg_eta_denver
    FROM (
      SELECT DISTINCT ON (sample_id) sample_id, pkg_eta_denver
      FROM scf
      WHERE pkg_eta_denver IS NOT NULL
      ORDER BY sample_id, updated_at DESC
    ) scf
    WHERE stb.sample_id = scf.sample_id
      AND stb.pkg_eta_denver IS NULL;

    DROP TABLE scf;
  END IF;
END $$;

-- Update any samples still at SCF to shipment_to_brand
UPDATE sample_request
SET current_stage = 'shipment_to_brand'
WHERE current_stage = 'scf';

-- Remove SCF stage permissions
DELETE FROM role_permission WHERE stage = 'SCF';
