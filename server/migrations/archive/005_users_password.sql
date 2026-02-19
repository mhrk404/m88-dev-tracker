-- Migration 005: Add password_hash to users for local JWT auth
-- Run after 004_roles.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN users.password_hash IS 'bcrypt hash for local login; NULL if using Supabase Auth only';
