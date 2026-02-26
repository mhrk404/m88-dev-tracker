# API Endpoints Reference

Base URL: **http://localhost:5000/api**

---

## Auth (`/api/auth`)

| Method | Endpoint | Auth | Body / Params | Description |
|--------|----------|------|---------------|-------------|
| **POST** | `/api/auth/register` | No/Admin | `username`, `email`, `password`, `full_name`, `role_code` | role_code: PBD, TD, FTY, MD, COSTING, BRAND, ADMIN |
| **POST** | `/api/auth/login` | No | `username` or `email`, `password` | Returns JWT token |
| **GET** | `/api/auth/me` | Yes | — | Returns current user profile |

---

## Styles (`/api/styles`)

| Method | Endpoint | Auth | Body / Params | Description |
|--------|----------|------|---------------|-------------|
| **GET** | `/api/styles` | Yes | `brand_id`, `season_id` (optional) | List styles |
| **POST** | `/api/styles` | Yes | `brand_id`, `season_id`, `style_number`, `style_name`, `division`, `product_category`, `color`, `qty`, `coo` | Create new style |

---

## Samples (`/api/samples`)

| Method | Endpoint | Auth | Body / Params | Description |
|--------|----------|------|---------------|-------------|
| **GET** | `/api/samples` | Yes | — | List all sample requests in scope |
| **GET** | `/api/samples/:id/full` | Yes | — | Get sample + all stages + assignments + audit |
| **POST** | `/api/samples` | Yes | `style_id` (or `style_data`), `sample_type`, `sample_status`, `kickoff_date`, `sample_due_denver`, `ref_sample_to_fty` | Create sample request |
| **PUT** | `/api/samples/:id` | Yes | `unfree_status`, `sample_status`, `current_stage`, `current_status` | Update sample request |

---

## Stages (`/api/stages`)

| Method | Endpoint | Auth | Body / Params | Description |
|--------|----------|------|---------------|-------------|
| **GET** | `/api/samples/:id/stages` | Yes | — | Get data for all stages of a sample |
| **PUT** | `/api/stages/:id` | Yes | `stage` (REQUIRED), + stage-specific fields | Update stage data. `stage` must be: `psi`, `sample_development`, `pc_review`, `costing`, `shipment_to_brand`. |

---

## Analytics (`/api/analytics`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/api/analytics/submission-performance` | Yes | On-time delivery metrics |
| **GET** | `/api/analytics/dashboard` | Yes | Summary counts |

---

## Export (`/api/export`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **GET** | `/api/export/samples?format=csv` | Yes | Export sample list as CSV |
