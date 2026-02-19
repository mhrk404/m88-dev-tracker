-- Migration 009: Add missing fields identified from CSV comparison
-- Run after 008_stage_modified_by_log.sql
--
-- 1. factory_execution.fty_md2        – second FTY MD person (nullable user reference)
-- 2. factory_execution.fty_costing_due_date – factory costing due date
-- 3. merchandising_review.td_to_md_comment  – TD-to-MD comment / comparison notes

ALTER TABLE factory_execution
  ADD COLUMN IF NOT EXISTS fty_md2 INTEGER REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS fty_costing_due_date DATE;

ALTER TABLE merchandising_review
  ADD COLUMN IF NOT EXISTS td_to_md_comment TEXT;

COMMENT ON COLUMN factory_execution.fty_md2 IS 'Second FTY MD person assigned to this sample (nullable)';
COMMENT ON COLUMN factory_execution.fty_costing_due_date IS 'Factory costing due date';
COMMENT ON COLUMN merchandising_review.td_to_md_comment IS 'TD-to-MD comment or comparison notes';
