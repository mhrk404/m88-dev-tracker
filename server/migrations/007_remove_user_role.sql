-- Migration 007: Remove USER role (replaced by ADMIN/SUPER_ADMIN)
-- Run after 004_roles.sql. Use when upgrading from a DB that had USER role.

-- Reassign any users with USER role to ADMIN
UPDATE users
SET role_id = (SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1)
WHERE role_id = (SELECT id FROM roles WHERE code = 'USER' LIMIT 1);

-- Remove USER role
DELETE FROM roles WHERE code = 'USER';
