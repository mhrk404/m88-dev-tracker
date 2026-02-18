-- Migration 008: Track who modified each stage (on the stage tables)
-- Run after 003. Adds modified_by_log JSONB to each stage table.
-- Format: [{ "user_id": 1, "modified_at": "2024-02-01T12:00:00Z" }, ...]
-- Multiple users (e.g. multiple MDs) who assign or update are all recorded.

ALTER TABLE product_business_dev
  ADD COLUMN IF NOT EXISTS modified_by_log JSONB NOT NULL DEFAULT '[]';

ALTER TABLE technical_design
  ADD COLUMN IF NOT EXISTS modified_by_log JSONB NOT NULL DEFAULT '[]';

ALTER TABLE factory_execution
  ADD COLUMN IF NOT EXISTS modified_by_log JSONB NOT NULL DEFAULT '[]';

ALTER TABLE merchandising_review
  ADD COLUMN IF NOT EXISTS modified_by_log JSONB NOT NULL DEFAULT '[]';

ALTER TABLE costing_analysis
  ADD COLUMN IF NOT EXISTS modified_by_log JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN product_business_dev.modified_by_log IS 'Array of { user_id, modified_at } for everyone who modified this stage row';
COMMENT ON COLUMN technical_design.modified_by_log IS 'Array of { user_id, modified_at } for everyone who modified this stage row';
COMMENT ON COLUMN factory_execution.modified_by_log IS 'Array of { user_id, modified_at } for everyone who modified this stage row';
COMMENT ON COLUMN merchandising_review.modified_by_log IS 'Array of { user_id, modified_at } for everyone who modified this stage row';
COMMENT ON COLUMN costing_analysis.modified_by_log IS 'Array of { user_id, modified_at } for everyone who modified this stage row';
