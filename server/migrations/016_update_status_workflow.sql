-- =============================================================================
-- Migration 016: Update Status Workflow
-- Changes current_status to: PENDING | PROCESSING | DELIVERED | REJECTED | HOLD
-- New samples default to PENDING (not touched yet)
-- When stage is edited, status becomes PROCESSING
-- =============================================================================

-- Update the comment to reflect new valid status values
COMMENT ON COLUMN sample_request.current_status IS 'App-managed: status workflow — PENDING (new, untouched) | PROCESSING (in progress) | DELIVERED | REJECTED | HOLD';

-- No data migration needed as we're allowing flexible status values
-- The application layer will enforce the workflow
