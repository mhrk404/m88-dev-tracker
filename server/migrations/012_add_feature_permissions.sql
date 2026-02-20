-- =============================================================================
-- Migration 012: Add feature-level role permissions
-- Adds non-stage RBAC permissions for system modules (users, lookups, etc.).
-- =============================================================================

CREATE TABLE IF NOT EXISTS role_feature_permission (
  permission_id SERIAL PRIMARY KEY,
  role          TEXT NOT NULL,
  feature       TEXT NOT NULL CHECK (feature IN (
                  'USERS',
                  'ROLES',
                  'BRANDS',
                  'SEASONS',
                  'DIVISIONS',
                  'PRODUCT_CATEGORIES',
                  'SAMPLE_TYPES',
                  'ANALYTICS',
                  'EXPORT'
                )),
  can_read      BOOLEAN NOT NULL DEFAULT false,
  can_write     BOOLEAN NOT NULL DEFAULT false,
  can_approve   BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, feature)
);

CREATE TRIGGER role_feature_permission_updated_at
  BEFORE UPDATE ON role_feature_permission
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO role_feature_permission (role, feature, can_read, can_write, can_approve) VALUES
  -- ADMIN + SUPER_ADMIN: full access
  ('ADMIN',       'USERS',              true, true, true),
  ('ADMIN',       'ROLES',              true, true, true),
  ('ADMIN',       'BRANDS',             true, true, true),
  ('ADMIN',       'SEASONS',            true, true, true),
  ('ADMIN',       'DIVISIONS',          true, true, true),
  ('ADMIN',       'PRODUCT_CATEGORIES', true, true, true),
  ('ADMIN',       'SAMPLE_TYPES',       true, true, true),
  ('ADMIN',       'ANALYTICS',          true, true, true),
  ('ADMIN',       'EXPORT',             true, true, true),
  ('SUPER_ADMIN', 'USERS',              true, true, true),
  ('SUPER_ADMIN', 'ROLES',              true, true, true),
  ('SUPER_ADMIN', 'BRANDS',             true, true, true),
  ('SUPER_ADMIN', 'SEASONS',            true, true, true),
  ('SUPER_ADMIN', 'DIVISIONS',          true, true, true),
  ('SUPER_ADMIN', 'PRODUCT_CATEGORIES', true, true, true),
  ('SUPER_ADMIN', 'SAMPLE_TYPES',       true, true, true),
  ('SUPER_ADMIN', 'ANALYTICS',          true, true, true),
  ('SUPER_ADMIN', 'EXPORT',             true, true, true),

  -- Other roles: read-only for common lookups and reporting modules
  ('PBD',         'BRANDS',             true, false, false),
  ('PBD',         'SEASONS',            true, false, false),
  ('PBD',         'DIVISIONS',          true, false, false),
  ('PBD',         'PRODUCT_CATEGORIES', true, false, false),
  ('PBD',         'SAMPLE_TYPES',       true, false, false),
  ('PBD',         'ANALYTICS',          true, false, false),
  ('PBD',         'EXPORT',             true, false, false),
  ('TD',          'BRANDS',             true, false, false),
  ('TD',          'SEASONS',            true, false, false),
  ('TD',          'DIVISIONS',          true, false, false),
  ('TD',          'PRODUCT_CATEGORIES', true, false, false),
  ('TD',          'SAMPLE_TYPES',       true, false, false),
  ('TD',          'ANALYTICS',          true, false, false),
  ('TD',          'EXPORT',             true, false, false),
  ('FTY',         'BRANDS',             true, false, false),
  ('FTY',         'SEASONS',            true, false, false),
  ('FTY',         'DIVISIONS',          true, false, false),
  ('FTY',         'PRODUCT_CATEGORIES', true, false, false),
  ('FTY',         'SAMPLE_TYPES',       true, false, false),
  ('FTY',         'ANALYTICS',          true, false, false),
  ('FTY',         'EXPORT',             true, false, false),
  ('MD',          'BRANDS',             true, false, false),
  ('MD',          'SEASONS',            true, false, false),
  ('MD',          'DIVISIONS',          true, false, false),
  ('MD',          'PRODUCT_CATEGORIES', true, false, false),
  ('MD',          'SAMPLE_TYPES',       true, false, false),
  ('MD',          'ANALYTICS',          true, false, false),
  ('MD',          'EXPORT',             true, false, false),
  ('COSTING',     'BRANDS',             true, false, false),
  ('COSTING',     'SEASONS',            true, false, false),
  ('COSTING',     'DIVISIONS',          true, false, false),
  ('COSTING',     'PRODUCT_CATEGORIES', true, false, false),
  ('COSTING',     'SAMPLE_TYPES',       true, false, false),
  ('COSTING',     'ANALYTICS',          true, false, false),
  ('COSTING',     'EXPORT',             true, false, false),
  ('BRAND',       'BRANDS',             true, false, false),
  ('BRAND',       'SEASONS',            true, false, false),
  ('BRAND',       'DIVISIONS',          true, false, false),
  ('BRAND',       'PRODUCT_CATEGORIES', true, false, false),
  ('BRAND',       'SAMPLE_TYPES',       true, false, false),
  ('BRAND',       'ANALYTICS',          true, false, false),
  ('BRAND',       'EXPORT',             true, false, false)

ON CONFLICT (role, feature) DO UPDATE SET
  can_read    = EXCLUDED.can_read,
  can_write   = EXCLUDED.can_write,
  can_approve = EXCLUDED.can_approve,
  updated_at  = now();
