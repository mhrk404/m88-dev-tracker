# Migrations

Clean, authoritative migrations for **m88-dev-tracker** — rewritten to match the updated schema diagram.

## Run Order

| File | Description | Tables Created |
|------|-------------|----------------|
| `001_foundation.sql` | Trigger helper, users, role_permission, brands, seasons | `users`, `role_permission`, `brands`, `seasons` |
| `002_styles.sql` | Style master | `styles` |
| `003_sample_request.sql` | Core parent + team assignment | `sample_request`, `team_assignment` |
| `004_stage_tables.sql` | All 6 stage child tables | `psi`, `sample_development`, `pc_review`, `costing`, `scf`, `shipment_to_brand` |
| `005_audit_log.sql` | Field-level change log | `stage_audit_log` |
| `006_seed_role_permission.sql` | Permission seed data | *(seeds `role_permission`)* |

## Apply to a Fresh Database

```bash
psql -U <user> -d <db> -f migrations/001_foundation.sql
psql -U <user> -d <db> -f migrations/002_styles.sql
psql -U <user> -d <db> -f migrations/003_sample_request.sql
psql -U <user> -d <db> -f migrations/004_stage_tables.sql
psql -U <user> -d <db> -f migrations/005_audit_log.sql
psql -U <user> -d <db> -f migrations/006_seed_role_permission.sql
```

Or in one shot:
```bash
for f in migrations/00{1..6}*.sql; do psql -U <user> -d <db> -f "$f"; done
```

## Key Design Decisions

- **`users.role`** is a Postgres ENUM (`user_role_enum`): `PBD`, `TD`, `FTY`, `MD`, `COSTING`, `BRAND`, `ADMIN`. No separate roles lookup table.
- **`role_permission`** encodes the full access matrix per role × stage.
- **`sample_request ↔ team_assignment`** circular FK is resolved by creating `sample_request` first (without the FK), then `team_assignment`, then adding the FK via `ALTER TABLE`.
- **`SCF` and `SHIPMENT_TO_BRAND`** are *not* `UNIQUE` on `sample_id` (multiple shipments/SCFs per sample allowed).
- All stage tables cascade-delete when `sample_request` is deleted.
- `stage_audit_log` uses a `CHECK` constraint on both `stage` and `action` columns.

## Archive

Previous migrations (`001`–`011` + `seed.sql`) are preserved in `archive/` for historical reference.
