-- =============================================================================
-- Migration 011: Add SUPER_ADMIN role
-- Ensures SUPER_ADMIN exists and has full role permissions across stages.
-- =============================================================================

INSERT INTO roles (code, name)
VALUES ('SUPER_ADMIN', 'Super Admin')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = now();

INSERT INTO role_permission (role, stage, can_read, can_write, can_approve) VALUES
  ('SUPER_ADMIN', 'PSI',                true, true, true),
  ('SUPER_ADMIN', 'SAMPLE_DEVELOPMENT', true, true, true),
  ('SUPER_ADMIN', 'PC_REVIEW',          true, true, true),
  ('SUPER_ADMIN', 'COSTING',            true, true, true),
  ('SUPER_ADMIN', 'SCF',                true, true, true),
  ('SUPER_ADMIN', 'SHIPMENT_TO_BRAND',  true, true, true)
ON CONFLICT (role, stage) DO UPDATE SET
  can_read    = EXCLUDED.can_read,
  can_write   = EXCLUDED.can_write,
  can_approve = EXCLUDED.can_approve,
  updated_at  = now();
