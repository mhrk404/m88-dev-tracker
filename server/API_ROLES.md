# API access by role

Base URL: `/api` (e.g. `http://localhost:5000/api`).

**Roles:** `SUPER_ADMIN` | `ADMIN` | `PD` | `MD` | `TD` | `COSTING` | `FACTORY`

**Data scope notes:**
- **SUPER_ADMIN / ADMIN:** Full access to all endpoints and all data (users, lookups write, samples, stages, analytics, export).
- **PD / MD / TD / COSTING / FACTORY:** Can list and open all samples; when reading stages or full sample, only their stage is populated (others null). Can only update their own stage. Can access analytics and export.

---

## Public (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/auth/login`  | Login; returns JWT. |
| POST   | `/api/auth/logout`  | Logout (optional token); client should clear token. |

---

## ADMIN and SUPER_ADMIN only

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/auth/register` | Create new user (username, email, password, role_code). |
| GET    | `/api/users`        | List users. |
| GET    | `/api/users/:id`    | Get user by id. |
| POST   | `/api/users`        | Create user. |
| PUT    | `/api/users/:id`    | Update user. |
| DELETE | `/api/users/:id`    | Delete user (references reassigned). |
| POST   | `/api/brands`       | Create brand. |
| PUT    | `/api/brands/:id`   | Update brand. |
| DELETE | `/api/brands/:id`   | Delete brand. |
| POST   | `/api/seasons`      | Create season. |
| PUT    | `/api/seasons/:id`   | Update season. |
| DELETE | `/api/seasons/:id`   | Delete season. |
| POST   | `/api/divisions`    | Create division. |
| PUT    | `/api/divisions/:id`| Update division. |
| DELETE | `/api/divisions/:id`| Delete division. |
| POST   | `/api/product-categories`     | Create product category. |
| PUT    | `/api/product-categories/:id` | Update product category. |
| DELETE | `/api/product-categories/:id` | Delete product category. |
| POST   | `/api/sample-types` | Create sample type. |
| PUT    | `/api/sample-types/:id` | Update sample type. |
| DELETE | `/api/sample-types/:id` | Delete sample type. |
| POST   | `/api/roles`        | Create role. |
| PUT    | `/api/roles/:id`    | Update role. |
| DELETE | `/api/roles/:id`    | Delete role. |

---

## All authenticated roles (SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/auth/me`      | Current user and role. |
| GET    | `/api/lookups`      | All lookups (brands, seasons, divisions, product_categories, sample_types, roles). |
| GET    | `/api/lookups?type=...` | Single lookup type. |
| GET    | `/api/brands`       | List brands. |
| GET    | `/api/brands/:id`   | Get brand. |
| GET    | `/api/seasons`      | List seasons. |
| GET    | `/api/seasons/:id`  | Get season. |
| GET    | `/api/divisions`    | List divisions. |
| GET    | `/api/divisions/:id`| Get division. |
| GET    | `/api/product-categories`      | List product categories. |
| GET    | `/api/product-categories/:id` | Get product category. |
| GET    | `/api/sample-types` | List sample types. |
| GET    | `/api/sample-types/:id` | Get sample type. |
| GET    | `/api/roles`        | List roles. |
| GET    | `/api/roles/:id`    | Get role. |
| GET    | `/api/samples`     | List samples. |
| GET    | `/api/samples/:sampleId` | Get sample. |
| GET    | `/api/samples/:sampleId/full` | Sample + stages + shipping + history (ADMIN/SUPER_ADMIN: all stages; PD/MD/TD/COSTING/FACTORY: only their stage + shipping). |
| GET    | `/api/samples/:sampleId/stages` | Stage data (ADMIN/SUPER_ADMIN: all stages; PD/MD/TD/COSTING/FACTORY: only their stage populated). |
| GET    | `/api/samples/:sampleId/shipping` | List shipping for sample. |
| GET    | `/api/samples/:sampleId/shipping/:id` | Get shipping record. |
| GET    | `/api/samples/:sampleId/audit` | History + status_transitions for sample. |

---

## Sample editors (SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/samples` | Create sample. |
| PUT    | `/api/samples/:sampleId` | Update sample. |
| DELETE | `/api/samples/:sampleId` | Delete sample. |
| PUT/PATCH | `/api/samples/:sampleId/stages` | Update stage (body.stage required; each role can only update their own stage). |
| POST   | `/api/samples/:sampleId/shipping` | Create shipping record. |
| PUT    | `/api/samples/:sampleId/shipping/:id` | Update shipping record. |
| DELETE | `/api/samples/:sampleId/shipping/:id` | Delete shipping record. |

---

## Analytics & export (SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/analytics/submission-performance` | Submission performance (query: year, month, brandId). |
| GET    | `/api/analytics/submission-performance/stream` | SSE stream. |
| GET    | `/api/analytics/delivery-performance` | Delivery performance. |
| GET    | `/api/analytics/delivery-performance/stream` | SSE stream. |
| GET    | `/api/analytics/dashboard` | Dashboard. |
| GET    | `/api/analytics/pipeline` | Pipeline (legacy). |
| GET    | `/api/analytics/by-season` | By season (legacy). |
| GET    | `/api/analytics/by-brand` | By brand (legacy). |
| GET    | `/api/analytics/by-division` | By division (legacy). |
| GET    | `/api/analytics/delays` | Delays (legacy). |
| GET    | `/api/export/samples` | Export samples (JSON/CSV). |
| GET    | `/api/export/pipeline` | Export pipeline. |
| GET    | `/api/export/analytics` | Export analytics (JSON/CSV). |

---

## Summary by role

| Role        | Auth/Me | Lookups (read) | Users | Brands/Seasons/etc. (write) | Samples (read) | Samples (write) | Stages (read) | Stages (write) | Shipping | Audit (read) | Analytics & export |
|-------------|---------|----------------|-------|-----------------------------|----------------|-----------------|---------------|----------------|----------|--------------|--------------------|
| SUPER_ADMIN | ✅      | ✅             | ✅    | ✅                          | ✅ all         | ✅              | ✅ all        | ✅ any stage   | ✅       | ✅           | ✅                 |
| ADMIN       | ✅      | ✅             | ✅    | ✅                          | ✅ all         | ✅              | ✅ all        | ✅ any stage   | ✅       | ✅           | ✅                 |
| PD          | ✅      | ✅             | ❌    | ❌                          | ✅ all         | ✅              | ✅ PBD only   | ✅ PBD only    | ✅       | ✅           | ✅                 |
| MD          | ✅      | ✅             | ❌    | ❌                          | ✅ all         | ✅              | ✅ MR only    | ✅ MR only     | ✅       | ✅           | ✅                 |
| TD          | ✅      | ✅             | ❌    | ❌                          | ✅ all         | ✅              | ✅ TD only    | ✅ TD only     | ✅       | ✅           | ✅                 |
| COSTING     | ✅      | ✅             | ❌    | ❌                          | ✅ all         | ✅              | ✅ CA only    | ✅ CA only     | ✅       | ✅           | ✅                 |
| FACTORY     | ✅      | ✅             | ❌    | ❌                          | ✅ all         | ✅              | ✅ FE only    | ✅ FE only     | ✅       | ✅           | ✅                 |

**Abbreviations:** PBD = product_business_dev, MR = merchandising_review, TD = technical_design, CA = costing_analysis, FE = factory_execution.
