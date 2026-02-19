# Database migrations

PostgreSQL migrations for the M88 sample tracker. Run in order against your Supabase (or any Postgres) database.

**Schema overview:** See [SCHEMA.md](./SCHEMA.md) for parent → child entity relationships and dependency order.

## Order

1. **001_lookup_and_users.sql** – brands, seasons, divisions, product_categories, sample_types, users
2. **002_samples.sql** – samples (core table)
3. **003_stage_shipping_audit.sql** – stage tables, shipping_tracking, sample_history, status_transitions
4. **004_roles.sql** – roles lookup (SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY); migrates `users.role` → `users.role_id`
5. **005_users_password.sql** – adds `users.password_hash` for local JWT login
6. **006_audit_log.sql** – global audit log (login, logout, and all mutations)
7. **007_remove_user_role.sql** – optional; removes USER role and reassigns users to ADMIN (run when upgrading from a DB that had USER)
8. **008_stage_modified_by_log.sql** – adds `modified_by_log` JSONB to each stage table (array of `{ user_id, modified_at }` for everyone who modified that stage)
9. **009_missing_csv_fields.sql** – adds `fty_md2` (second FTY MD user) and `fty_costing_due_date` to `factory_execution`; adds `td_to_md_comment` to `merchandising_review`
10. **010_revised_schema.sql** – revised model: `user_role_enum`, `role_permission`, `team_assignment`, `styles`, `sample_request`, stage tables `psi`, `sample_development`, `pc_review`, `costing`, `scf`, `shipment_to_brand`, `stage_audit_log`. Does not drop legacy tables.
11. **011_seed_role_permission.sql** – seed `role_permission` for PBD, TD, FTY, MD, COSTING, BRAND, ADMIN and stages PSI, SAMPLE_DEVELOPMENT, PC_REVIEW, COSTING, SCF, SHIPMENT_TO_BRAND.
12. **seed.sql** – optional reference data (brands, seasons, roles/users, divisions, categories, sample types, samples + stages)

## How to run

**Option A: Supabase Dashboard**  
In Supabase → SQL Editor, paste and run each file in order.

**Option B: Supabase CLI**  
If using a local Supabase project, copy these into `supabase/migrations/` with timestamp prefixes (e.g. `20240218000001_lookup_and_users.sql`) and run:

```bash
supabase db push
```

**Option C: psql**  
From the project root:

```bash
psql $DATABASE_URL -f server/migrations/001_lookup_and_users.sql
psql $DATABASE_URL -f server/migrations/002_samples.sql
psql $DATABASE_URL -f server/migrations/003_stage_shipping_audit.sql
psql $DATABASE_URL -f server/migrations/004_roles.sql
psql $DATABASE_URL -f server/migrations/005_users_password.sql
psql $DATABASE_URL -f server/migrations/006_audit_log.sql
psql $DATABASE_URL -f server/migrations/007_remove_user_role.sql
psql $DATABASE_URL -f server/migrations/008_stage_modified_by_log.sql
psql $DATABASE_URL -f server/migrations/009_missing_csv_fields.sql
psql $DATABASE_URL -f server/migrations/010_revised_schema.sql
psql $DATABASE_URL -f server/migrations/011_seed_role_permission.sql
psql $DATABASE_URL -f server/migrations/seed.sql
```

Use your actual connection string for `DATABASE_URL` (e.g. from Supabase → Settings → Database).

## Auth (JWT) and RBAC

After running **005** and **006**, the API supports:

- **POST /api/auth/register** – create user (**ADMIN only**; requires `Authorization: Bearer <token>`). Body: `username`, `email`, `password`, optional `full_name`, `department`, `role_id` or `role_code`.
- **POST /api/auth/login** – login (public). Body: `username` or `email`, `password`. Returns `{ user, token, expiresIn }`. Login success/failure and logout are written to `audit_log`.
- **POST /api/auth/logout** – logout (requires auth). Audits logout and returns 204.
- **GET /api/auth/me** – current user (requires auth).

All other endpoints require authentication. Role-based access: **SUPER_ADMIN / ADMIN** (full access); **PD / PBD** (create/edit samples + own stage); **MD, TD, FTY, COSTING, FACTORY, BRAND** (read samples, edit own stage per `role_permission`, shipping, analytics, export). Revised schema (010): set `USE_REVISED_SCHEMA=true` to use stage tables `psi`, `sample_development`, `pc_review`, `costing`, `scf`, `shipment_to_brand` and roles PBD, TD, FTY, MD, COSTING, BRAND, ADMIN. Mutations are audited to `audit_log` (and optionally `stage_audit_log` in revised model).
