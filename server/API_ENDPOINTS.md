# API Endpoints Reference

Base URL: **http://localhost:5000/api**

---

## Auth (`/api/auth`)

| Method | Endpoint | Auth | Body / Params | Description |
|--------|----------|------|---------------|-------------|
| **POST** | `/api/auth/register` | No | Body: `username`, `email`, `password` (min 8), optional: `full_name`, `department`, `role_id` or `role_code` (USER, ADMIN, PD, MD, TD, COSTING, FACTORY) | Create user; returns `user` + `token` |
| **POST** | `/api/auth/login` | No | Body: `username` or `email`, `password` | Login; returns `user` + `token` |
| **GET** | `/api/auth/me` | Bearer token | Header: `Authorization: Bearer <token>` | Current user from JWT |

---

## Analytics (`/api/analytics`)

| Method | Endpoint | Auth | Query params | Description |
|--------|----------|------|--------------|-------------|
| **GET** | `/api/analytics/submission-performance` | No | `brandId`, `month` (1–12), `year` | On-time submission (early / on_time / delay); filter by brand, month, year |
| **GET** | `/api/analytics/submission-performance/stream` | No | `brandId`, `month`, `year`, `intervalMs` (default 60000) | SSE stream of submission performance |
| **GET** | `/api/analytics/delivery-performance` | No | `brandId`, `month`, `year` | On-time delivery per brand; same filters |
| **GET** | `/api/analytics/delivery-performance/stream` | No | `brandId`, `month`, `year`, `intervalMs` | SSE stream of delivery performance |
| **GET** | `/api/analytics/dashboard` | No | — | Snapshot: submission + delivery counts (early, on_time, delay, pending) |
| **GET** | `/api/analytics/pipeline` | No | — | Legacy placeholder |
| **GET** | `/api/analytics/by-season` | No | — | Legacy placeholder |
| **GET** | `/api/analytics/by-brand` | No | — | Legacy placeholder |
| **GET** | `/api/analytics/by-division` | No | — | Legacy placeholder |
| **GET** | `/api/analytics/delays` | No | — | Legacy placeholder |

---

## Resource bases (mounted, no routes yet)

These prefixes are mounted but have no GET/POST handlers yet. Use for future CRUD:

- **Users:** `http://localhost:5000/api/users`
- **Brands:** `http://localhost:5000/api/brands`
- **Seasons:** `http://localhost:5000/api/seasons`
- **Divisions:** `http://localhost:5000/api/divisions`
- **Product categories:** `http://localhost:5000/api/product-categories`
- **Sample types:** `http://localhost:5000/api/sample-types`
- **Roles:** `http://localhost:5000/api/roles`
- **Samples:** `http://localhost:5000/api/samples`
  - Nested: `/api/samples/:sampleId/stages`, `/:sampleId/shipping`, `/:sampleId/audit`
- **Export:** `http://localhost:5000/api/export`
- **Lookups:** `http://localhost:5000/api/lookups`

---

## Postman quick reference

### 1. Register
- **POST** `http://localhost:5000/api/auth/register`
- Body (raw JSON):
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Password1!",
  "role_code": "USER"
}
```

### 2. Login
- **POST** `http://localhost:5000/api/auth/login`
- Body (raw JSON):
```json
{
  "username": "testuser",
  "password": "Password1!"
}
```
- Copy `token` from response for next request.

### 3. Me (authenticated)
- **GET** `http://localhost:5000/api/auth/me`
- Headers: `Authorization` = `Bearer <paste token here>`

### 4. Submission performance
- **GET** `http://localhost:5000/api/analytics/submission-performance`
- Optional params: `brandId`, `month`, `year` (e.g. `?year=2024&month=2`)

### 5. Delivery performance
- **GET** `http://localhost:5000/api/analytics/delivery-performance`
- Optional params: `brandId`, `month`, `year`

### 6. Dashboard
- **GET** `http://localhost:5000/api/analytics/dashboard`

### 7. Submission stream (SSE)
- **GET** `http://localhost:5000/api/analytics/submission-performance/stream?intervalMs=10000`
- Use in Postman with “Send” (streaming response).

### 8. Delivery stream (SSE)
- **GET** `http://localhost:5000/api/analytics/delivery-performance/stream?intervalMs=10000`
