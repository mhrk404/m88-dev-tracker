# Sample → Stages → Modifications → Users: Process Flow

How samples, the five stage tables, modifications/audit, and required users (roles) are interconnected.

---

## 1. High-level flow

```
Lookups (brands, seasons, divisions, categories, sample_types, roles)
         │
         ▼
   User (PD/Admin) creates SAMPLE ──► samples table
         │                              (current_status, current_stage, created_by)
         │
         ▼
   Sample gets one row per STAGE (1:1) as people work on it:
         Stage 1: product_business_dev   (PD)
         Stage 2: technical_design       (TD)
         Stage 3: factory_execution      (FACTORY)
         Stage 4: merchandising_review   (MD)
         Stage 5: costing_analysis       (COSTING)
         │
         ├── Each stage: owner_id / analyst_id / brand_communication_owner_id (users)
         ├── Each stage update: modified_by_log (who touched it, when)
         │
         ▼
   Status/stage changes on the SAMPLE record
         │
         ├── sample_history (field-level: old_value → new_value, changed_by)
         └── status_transitions (from_status → to_status, stage, transitioned_by)
         │
         ▼
   shipping_tracking (many per sample); audit_log (login, mutations)
```

---

## 2. Who creates the sample

| Role        | Can create sample? | Can update/delete sample record? |
|-------------|--------------------|-----------------------------------|
| SUPER_ADMIN | ✅                 | ✅                                |
| ADMIN       | ✅                 | ✅                                |
| PD          | ✅                 | ✅                                |
| MD, TD, COSTING, FACTORY | ❌ | ❌ (read-only on `samples` table) |

- **Table:** `samples`
- **Set at create:** `created_by` → `users.id` (the PD/Admin who created it).
- **Sample record fields:** `current_status`, `current_stage` are the “headline” status; changing them (via PUT `/api/samples/:id`) writes to **sample_history** and **status_transitions** (see below).

---

## 3. The five stages (1:1 with sample)

Each sample has **at most one row** in each stage table. Rows are created on first update (insert) or can exist as empty placeholders.

| Order | Stage table             | Typical role | User refs on stage row |
|-------|-------------------------|-------------|-------------------------|
| 1     | product_business_dev    | **PD**      | owner_id                |
| 2     | technical_design       | **TD**      | owner_id                |
| 3     | factory_execution      | **FACTORY** | owner_id, fty_md2       |
| 4     | merchandising_review   | **MD**      | owner_id                |
| 5     | costing_analysis       | **COSTING** | analyst_id, brand_communication_owner_id |

- **Who can edit which stage:**  
  - **ADMIN / SUPER_ADMIN:** any stage.  
  - **PD:** only `product_business_dev`.  
  - **MD:** only `merchandising_review`.  
  - **TD:** only `technical_design`.  
  - **COSTING:** only `costing_analysis`.  
  - **FACTORY:** only `factory_execution`.  
- **API:** `PUT /api/samples/:sampleId/stages` with `body.stage = <table name>`.

---

## 4. Stage modifications (who touched the stage)

- Every update to a stage row (create or update) appends to **modified_by_log** on that row.
- **Format:** `[{ "user_id": <users.id>, "modified_at": "ISO8601" }, ...]`
- So: **required user** for “modification” = the authenticated user making the request; they are recorded in `modified_by_log` and (for mutations) in **audit_log**.

---

## 5. Sample-level “status” and “stage” changes (audit)

When the **sample record** is created or updated (only by PD/Admin):

- **sample_history**  
  - One row per field change (e.g. `current_status`, `current_stage`).  
  - Stores: `sample_id`, `table_name` (e.g. `samples`), `field_name`, `old_value`, `new_value`, `changed_by` (user), `changed_at`, `change_notes`.

- **status_transitions**  
  - One row per status/stage transition.  
  - Stores: `sample_id`, `from_status`, `to_status`, `stage`, `transitioned_by` (user), `transitioned_at`, `notes`.

So the **required user** for those changes is the one who performed the create/update on the sample (PD/Admin); they become `changed_by` and `transitioned_by`.

---

## 6. Interconnection summary

| Concept            | Where it lives                    | User / role connection |
|--------------------|-----------------------------------|-------------------------|
| Sample creation    | `samples`                         | `created_by` → user; only PD/Admin can create. |
| Sample headline    | `samples.current_status`, `current_stage` | Updated only by PD/Admin; every change → sample_history + status_transitions with that user as changed_by / transitioned_by. |
| Stage 1 (PBD)      | product_business_dev             | owner_id; PD (or Admin) edits; modified_by_log. |
| Stage 2 (TD)       | technical_design                 | owner_id; TD (or Admin) edits; modified_by_log. |
| Stage 3 (FE)       | factory_execution                | owner_id, fty_md2; FACTORY (or Admin) edits; modified_by_log. |
| Stage 4 (MR)       | merchandising_review             | owner_id; MD (or Admin) edits; modified_by_log. |
| Stage 5 (CA)       | costing_analysis                 | analyst_id, brand_communication_owner_id; COSTING (or Admin) edits; modified_by_log. |
| Stage “modification” | Any stage row update            | Requester’s user id appended to that row’s modified_by_log. |
| Field-level audit  | sample_history                   | changed_by → user. |
| Status transitions | status_transitions               | transitioned_by → user. |
| Global mutations   | audit_log                        | user_id (nullable for failed login), resource = e.g. sample, stage. |
| Shipping           | shipping_tracking                | Many per sample; no direct “owner” user column; access by any authenticated role that can see the sample. |

---

## 7. End-to-end flow (simplified)

1. **PD or Admin** creates a sample → `samples` row with `created_by`, optional `current_status` / `current_stage` → initial entries in **sample_history** and **status_transitions**.
2. **PD** updates Stage 1 (product_business_dev) → owner_id set/updated; **modified_by_log** gets current user + timestamp.
3. **TD** updates Stage 2 (technical_design) → same pattern.
4. **FACTORY** updates Stage 3 (factory_execution) → same.
5. **MD** updates Stage 4 (merchandising_review) → same.
6. **COSTING** updates Stage 5 (costing_analysis) → same.
7. **PD or Admin** can change the sample’s `current_status` / `current_stage` at any time → **sample_history** and **status_transitions** record who did it.
8. **Shipping** records can be added/updated by any role that can edit (per API_ROLES); they don’t have a dedicated “owner” user on the row.
9. **ADMIN/SUPER_ADMIN** can perform any of the above (create sample, update sample record, update any stage).

So: **sample** is the core entity; **stages** are 1:1 per sample and role-scoped; **modifications** are tracked per stage via **modified_by_log** and at sample level via **sample_history** and **status_transitions**; the **required user** at each step is the authenticated user (and, for sample create/update, must be PD or Admin).

---

## 8. API flow

**Base URL:** `/api` (e.g. `http://localhost:5000/api`)  
**Auth:** All endpoints below except `POST /auth/login` require `Authorization: Bearer <token>`.

### Typical sequence

```
1. POST   /api/auth/login          → get token (username, password)
2. GET    /api/auth/me            → optional: confirm user and role
3. GET    /api/lookups            → brands, seasons, divisions, product_categories, sample_types, roles (for dropdowns)
4. POST   /api/samples            → create sample (PD/Admin only); body: style_number, color, season_id, brand_id, division_id, category_id, sample_type_id, created_by, optional current_status, current_stage, ...
5. GET    /api/samples            → list samples (optional ?season_id= &brand_id= etc.)
6. GET    /api/samples/:sampleId   → one sample (summary)
7. GET    /api/samples/:sampleId/full    → sample + stages (role-scoped) + shipping + history + status_transitions
8. GET    /api/samples/:sampleId/stages  → stage rows only (role-scoped)
9. PUT    /api/samples/:sampleId/stages → update one stage; body: { stage: "product_business_dev"|"technical_design"|"factory_execution"|"merchandising_review"|"costing_analysis", ...fields }
10. PUT   /api/samples/:sampleId   → update sample record (PD/Admin only): current_status, current_stage, style_name, color, qty, coo, etc.
11. POST   /api/samples/:sampleId/shipping   → add shipping record
12. PUT    /api/samples/:sampleId/shipping/:id → update shipping
13. GET    /api/samples/:sampleId/audit      → sample_history + status_transitions for this sample
14. GET    /api/export/samples    → export (e.g. ?format=csv)
15. GET    /api/analytics/...     → dashboard, pipeline, submission-performance, etc.
16. POST   /api/auth/logout       → logout (token cleared client-side)
```

### Sample-centric endpoints (by flow)

| Method | Path | Purpose | Who |
|--------|------|---------|-----|
| POST | `/api/auth/login` | Get JWT | Anyone |
| GET | `/api/auth/me` | Current user + role | Authenticated |
| GET | `/api/lookups` | All dropdown data | Authenticated |
| POST | `/api/samples` | Create sample | PD, ADMIN, SUPER_ADMIN |
| GET | `/api/samples` | List samples (query: season_id, brand_id, …) | All roles |
| GET | `/api/samples/:sampleId` | One sample (summary) | All roles |
| GET | `/api/samples/:sampleId/full` | Sample + stages + shipping + history + transitions | All roles (stages filtered by role) |
| PUT | `/api/samples/:sampleId` | Update sample record (status, stage, style_name, …) | PD, ADMIN, SUPER_ADMIN |
| DELETE | `/api/samples/:sampleId` | Delete sample (cascades) | PD, ADMIN, SUPER_ADMIN |
| GET | `/api/samples/:sampleId/stages` | Get all stage rows (role-scoped) | All roles |
| PUT / PATCH | `/api/samples/:sampleId/stages` | Upsert one stage; body must include `stage` | Role that owns that stage, or ADMIN/SUPER_ADMIN |
| GET | `/api/samples/:sampleId/shipping` | List shipping records | All roles |
| GET | `/api/samples/:sampleId/shipping/:id` | One shipping record | All roles |
| POST | `/api/samples/:sampleId/shipping` | Create shipping record | All editor roles |
| PUT | `/api/samples/:sampleId/shipping/:id` | Update shipping | All editor roles |
| DELETE | `/api/samples/:sampleId/shipping/:id` | Delete shipping | All editor roles |
| GET | `/api/samples/:sampleId/audit` | sample_history + status_transitions | All roles |

### Other API groups

- **Auth:** `POST /api/auth/register` (Admin only), `POST /api/auth/logout`
- **Users:** `GET/POST/PUT/DELETE /api/users`, `/api/users/:id` (Admin only)
- **Lookups (CRUD):** `/api/brands`, `/api/seasons`, `/api/divisions`, `/api/product-categories`, `/api/sample-types`, `/api/roles` — list/get for all; create/update/delete for Admin only
- **Analytics:** `GET /api/analytics/dashboard`, `/api/analytics/pipeline`, `/api/analytics/submission-performance`, etc.
- **Export:** `GET /api/export/samples`, `/api/export/pipeline`, `/api/export/analytics` (e.g. `?format=csv`)

---

## 9. To-do list

- [ ] Run migrations 008 and 009 if not applied; align seed with schema
- [ ] Frontend: wire login → lookups → sample list → sample detail (full) → stage forms per role
- [ ] Frontend: sample create form (PD/Admin) with current_status / current_stage
- [ ] Frontend: stage update (PUT stages) with correct `stage` and role-scoped visibility
- [ ] Frontend: shipping CRUD and audit/history view for a sample
- [ ] API tests: auth, samples CRUD, stages update, shipping, audit
- [ ] Document or enforce allowed values for current_status / current_stage (e.g. enums or lookup)
- [ ] Optional: expose modified_by_log in API response or audit view
