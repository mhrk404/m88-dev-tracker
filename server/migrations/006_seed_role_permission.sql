-- =============================================================================
-- Migration 006: Seed Role Permission
-- Seeds role_permission for all 7 roles × 6 stages (42 rows total).
-- Depends on: 001_foundation.sql (role_permission table)
--
-- Access matrix (from schema diagram):
--
-- Stage              PBD    TD     FTY    MD     COSTING  BRAND  ADMIN
-- ──────────────     ────── ────── ────── ────── ───────  ─────  ─────
-- PSI                R      RW     R      R      R        R      RWA
-- SAMPLE_DEVELOPMENT R      RW     RW     R      R        R      RWA
-- PC_REVIEW          R      RW     R      RW     R        R      RWA
-- COSTING            RW     R      R      R      RW       R      RWA
-- SCF                R      R      RW     R      R        R      RWA
-- SHIPMENT_TO_BRAND  RW     R      R      R      R        R      RWA
--
-- R=can_read, W=can_write, A=can_approve
-- =============================================================================

INSERT INTO role_permission (role, stage, can_read, can_write, can_approve) VALUES

  -- ADMIN: full access to all stages
  ('ADMIN', 'PSI',                true,  true,  true),
  ('ADMIN', 'SAMPLE_DEVELOPMENT', true,  true,  true),
  ('ADMIN', 'PC_REVIEW',          true,  true,  true),
  ('ADMIN', 'COSTING',            true,  true,  true),
  ('ADMIN', 'SCF',                true,  true,  true),
  ('ADMIN', 'SHIPMENT_TO_BRAND',  true,  true,  true),

  -- BRAND: read-only across all stages
  ('BRAND', 'PSI',                true,  false, false),
  ('BRAND', 'SAMPLE_DEVELOPMENT', true,  false, false),
  ('BRAND', 'PC_REVIEW',          true,  false, false),
  ('BRAND', 'COSTING',            true,  false, false),
  ('BRAND', 'SCF',                true,  false, false),
  ('BRAND', 'SHIPMENT_TO_BRAND',  true,  false, false),

  -- PBD: write COSTING + SHIPMENT_TO_BRAND; read rest
  ('PBD',   'PSI',                true,  false, false),
  ('PBD',   'SAMPLE_DEVELOPMENT', true,  false, false),
  ('PBD',   'PC_REVIEW',          true,  false, false),
  ('PBD',   'COSTING',            true,  true,  false),
  ('PBD',   'SCF',                true,  false, false),
  ('PBD',   'SHIPMENT_TO_BRAND',  true,  true,  false),

  -- TD: write PSI + SAMPLE_DEVELOPMENT + PC_REVIEW; read rest
  ('TD',    'PSI',                true,  true,  false),
  ('TD',    'SAMPLE_DEVELOPMENT', true,  true,  false),
  ('TD',    'PC_REVIEW',          true,  true,  false),
  ('TD',    'COSTING',            true,  false, false),
  ('TD',    'SCF',                true,  false, false),
  ('TD',    'SHIPMENT_TO_BRAND',  true,  false, false),

  -- FTY: write SAMPLE_DEVELOPMENT + COSTING(submit) + SCF; read rest
  -- COSTING write needed: [FTY submits] → status: COSTING_RECEIVED
  ('FTY',   'PSI',                true,  false, false),
  ('FTY',   'SAMPLE_DEVELOPMENT', true,  true,  false),
  ('FTY',   'PC_REVIEW',          true,  false, false),
  ('FTY',   'COSTING',            true,  true,  false),
  ('FTY',   'SCF',                true,  true,  false),
  ('FTY',   'SHIPMENT_TO_BRAND',  true,  false, false),

  -- MD: write PC_REVIEW; read rest
  ('MD',    'PSI',                true,  false, false),
  ('MD',    'SAMPLE_DEVELOPMENT', true,  false, false),
  ('MD',    'PC_REVIEW',          true,  true,  false),
  ('MD',    'COSTING',            true,  false, false),
  ('MD',    'SCF',                true,  false, false),
  ('MD',    'SHIPMENT_TO_BRAND',  true,  false, false),

  -- COSTING: write COSTING; read rest
  ('COSTING', 'PSI',                true,  false, false),
  ('COSTING', 'SAMPLE_DEVELOPMENT', true,  false, false),
  ('COSTING', 'PC_REVIEW',          true,  false, false),
  ('COSTING', 'COSTING',            true,  true,  false),
  ('COSTING', 'SCF',                true,  false, false),
  ('COSTING', 'SHIPMENT_TO_BRAND',  true,  false, false)

ON CONFLICT (role, stage) DO UPDATE SET
  can_read    = EXCLUDED.can_read,
  can_write   = EXCLUDED.can_write,
  can_approve = EXCLUDED.can_approve,
  updated_at  = now();
