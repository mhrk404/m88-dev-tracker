-- =============================================================================
-- Migration 003: Sample Request + Team Assignment
-- Creates: sample_request, team_assignment
-- Depends on: 002_styles.sql (styles), 001_foundation.sql (users)
--
-- SAMPLE_REQUEST — FILLED BY PBD at sample kickoff:
--   unfree_status, kickoff_date, sample_status, sample_type, sample_type_group,
--   sample_due_denver, ref_from_m88, ref_sample_to_fty, additional_notes
--
-- current_stage / current_status are updated by the app on every stage transition.
-- They are the single source of truth for "where is this sample right now?".
-- Valid current_stage values:  PSI | SAMPLE_DEV | PC_REVIEW | COSTING | SCF | SHIPMENT
-- Valid current_status values: INITIATED | PSI_SENT | IN_DEVELOPMENT | FIT_REVIEW
--                              PENDING_REVIEW | APPROVED | REJECTED
--                              COSTING_RECEIVED | COSTING_COMPLETE
--                              SCF_SHARED | SHIPPED | DELIVERED
--
-- NOTE: sample_request.assignment_id references team_assignment, and
--       team_assignment.sample_id references sample_request — a circular FK.
--       Resolved by: create both tables, add the FK to sample_request after
--       team_assignment exists, using ALTER TABLE with NOT VALID + VALIDATE.
-- =============================================================================

-- ── sample_request (core / parent) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_request (
  sample_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id              INTEGER NOT NULL REFERENCES styles (style_id),
  assignment_id         INTEGER,           -- FK added after team_assignment is created
  unfree_status         TEXT,              -- Col 1 in spreadsheet
  sample_type           TEXT,              -- PBD: Sample Type  (P2, Proto, TOP, etc.)
  sample_type_group     TEXT,              -- PBD: Sample Type Group (SAMPLE)
  sample_status         TEXT,              -- PBD: Sample Status (Active, Hold, Complete)
  kickoff_date          DATE,              -- PBD: Sample Kick off from Brand to PBD
  sample_due_denver     DATE,              -- PBD: Sample Due in Denver Office
  requested_lead_time   INTEGER,
  lead_time_type        TEXT,              -- STND, RUSH
  ref_from_m88          TEXT,              -- PBD: Sample Referenced from M88 Development (Y/N)
  ref_sample_to_fty     TEXT,              -- PBD: Reference Sample to ship to FTY (Y/N)
  additional_notes      TEXT,              -- PBD: Additional notes to proceed to sampling
  key_date              DATE,
  current_stage         TEXT,              -- active stage (app-managed): PSI | SAMPLE_DEV | PC_REVIEW | COSTING | SCF | SHIPMENT
  current_status        TEXT,              -- transition status (app-managed): INITIATED | PSI_SENT | IN_DEVELOPMENT | FIT_REVIEW | PENDING_REVIEW | APPROVED | REJECTED | COSTING_RECEIVED | COSTING_COMPLETE | SCF_SHARED | SHIPPED | DELIVERED
  created_by            INTEGER REFERENCES users (id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN sample_request.kickoff_date        IS 'PBD: Sample Kick off from Brand to PBD';
COMMENT ON COLUMN sample_request.sample_status       IS 'PBD: Sample Status (Active, Hold, Complete)';
COMMENT ON COLUMN sample_request.sample_type         IS 'PBD: Sample Type (P2, Proto, TOP, SMS, etc.)';
COMMENT ON COLUMN sample_request.sample_type_group   IS 'PBD: Sample Type Group (SAMPLE)';
COMMENT ON COLUMN sample_request.sample_due_denver   IS 'PBD: Sample Due in Denver Office';
COMMENT ON COLUMN sample_request.ref_from_m88        IS 'PBD: Sample Referenced from M88 Development (Y/N)';
COMMENT ON COLUMN sample_request.ref_sample_to_fty   IS 'PBD: Reference Sample to ship to FTY (Y/N)';
COMMENT ON COLUMN sample_request.additional_notes    IS 'PBD: Additional notes to proceed to sampling';
COMMENT ON COLUMN sample_request.unfree_status       IS 'PBD: Unfree status (Col 1 in spreadsheet)';

CREATE TRIGGER sample_request_updated_at
  BEFORE UPDATE ON sample_request
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sample_request_style_id      ON sample_request (style_id);
CREATE INDEX IF NOT EXISTS idx_sample_request_created_by    ON sample_request (created_by);
CREATE INDEX IF NOT EXISTS idx_sample_request_status        ON sample_request (sample_status);
CREATE INDEX IF NOT EXISTS idx_sample_request_current_stage  ON sample_request (current_stage);
CREATE INDEX IF NOT EXISTS idx_sample_request_current_status ON sample_request (current_status);

COMMENT ON COLUMN sample_request.current_stage  IS 'App-managed: active pipeline stage — PSI | SAMPLE_DEV | PC_REVIEW | COSTING | SCF | SHIPMENT';
COMMENT ON COLUMN sample_request.current_status IS 'App-managed: transition status — INITIATED | PSI_SENT | IN_DEVELOPMENT | FIT_REVIEW | PENDING_REVIEW | APPROVED | REJECTED | COSTING_RECEIVED | COSTING_COMPLETE | SCF_SHARED | SHIPPED | DELIVERED';

-- ── team_assignment ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_assignment (
  assignment_id    SERIAL PRIMARY KEY,
  sample_id        UUID NOT NULL UNIQUE REFERENCES sample_request (sample_id) ON DELETE CASCADE,
  pbd_user_id      INTEGER REFERENCES users (id),
  td_user_id       INTEGER REFERENCES users (id),
  fty_user_id      INTEGER REFERENCES users (id),
  fty_md2_user_id  INTEGER REFERENCES users (id),      -- Spreadsheet Col 46 (Secondary FTY MD)
  md_user_id       INTEGER REFERENCES users (id),
  costing_user_id  INTEGER REFERENCES users (id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER team_assignment_updated_at
  BEFORE UPDATE ON team_assignment
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE INDEX IF NOT EXISTS idx_team_assignment_sample_id ON team_assignment (sample_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_pbd       ON team_assignment (pbd_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_td        ON team_assignment (td_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_fty       ON team_assignment (fty_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_fty2      ON team_assignment (fty_md2_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_md        ON team_assignment (md_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignment_costing   ON team_assignment (costing_user_id);

-- ── Close the circular FK: sample_request → team_assignment ───────────────────
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

CREATE INDEX IF NOT EXISTS idx_sample_request_assignment_id ON sample_request (assignment_id);
