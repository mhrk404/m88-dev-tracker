# Database migrations

PostgreSQL migrations for the M88 sample tracker. Run in order against your Supabase (or any Postgres) database.

**Schema overview:** See [SCHEMA.md](./SCHEMA.md) for parent → child entity relationships and dependency order.

## Order

1. **001_lookup_and_users.sql** – brands, seasons, divisions, product_categories, sample_types, users
2. **002_samples.sql** – samples (core table)
3. **003_stage_shipping_audit.sql** – stage tables, shipping_tracking, sample_history, status_transitions
4. **004_roles.sql** – roles lookup (USER, ADMIN, PD, MD, TD, COSTING, FACTORY); migrates `users.role` → `users.role_id`
5. **005_users_password.sql** – adds `users.password_hash` for local JWT login
6. **006_audit_log.sql** – global audit log (login, logout, and all mutations)
7. **seed.sql** – optional reference data (brands, seasons, roles/users, divisions, categories, sample types, samples + stages)

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
psql $DATABASE_URL -f server/migrations/seed.sql
```

Use your actual connection string for `DATABASE_URL` (e.g. from Supabase → Settings → Database).

## Auth (JWT) and RBAC

After running **005** and **006**, the API supports:

- **POST /api/auth/register** – create user (**ADMIN only**; requires `Authorization: Bearer <token>`). Body: `username`, `email`, `password`, optional `full_name`, `department`, `role_id` or `role_code`.
- **POST /api/auth/login** – login (public). Body: `username` or `email`, `password`. Returns `{ user, token, expiresIn }`. Login success/failure and logout are written to `audit_log`.
- **POST /api/auth/logout** – logout (requires auth). Audits logout and returns 204.
- **GET /api/auth/me** – current user (requires auth).

All other endpoints require authentication. Role-based access: **ADMIN** (full access); **PD, MD, TD, COSTING, FACTORY** (samples, stages, shipping, lookups, analytics, export; no users/roles management); **USER** (lookups, samples read-only scoped to own + where they are owner). Mutations are audited to `audit_log`.
