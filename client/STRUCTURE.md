# Client file and folder structure

This structure is aligned with the M88 server API and roles. **No code**—paths and purpose only.

---

## Server alignment summary

| Server area | API base | Client mapping |
|-------------|----------|----------------|
| Auth | `/api/auth` | `api/auth`, `contexts/auth`, `pages/login`, `pages/register` |
| Users | `/api/users` | `api/users`, `pages/users`, `types/user` |
| Lookups | `/api/lookups`, `/api/brands`, etc. | `api/lookups`, `hooks/useLookups`, `types/lookups` |
| Samples | `/api/samples`, nested stages/shipping/audit | `api/samples`, `pages/samples`, `types/sample` |
| Analytics | `/api/analytics` | `api/analytics`, `pages/analytics` (dashboard) |
| Export | `/api/export` | `api/export` |
| RBAC | Roles: SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY | `lib/rbac`, `components/protected` |

---

## Proposed structure

```
client/
├── public/
│   └── (static assets)
│
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── App.tsx
│   ├── vite-env.d.ts
│   │
│   ├── api/                          # One module per server resource
│   │   ├── client.ts                  # Base HTTP client (axios instance: base URL, auth header)
│   │   ├── auth.ts                    # POST login, register; GET me
│   │   ├── users.ts                   # GET/POST/PUT/DELETE /api/users
│   │   ├── lookups.ts                 # GET /api/lookups, ?type=
│   │   ├── brands.ts                  # GET/POST/PUT/DELETE /api/brands
│   │   ├── seasons.ts                 # GET/POST/PUT/DELETE /api/seasons
│   │   ├── divisions.ts               # GET/POST/PUT/DELETE /api/divisions
│   │   ├── productCategories.ts       # GET/POST/PUT/DELETE /api/product-categories
│   │   ├── sampleTypes.ts             # GET/POST/PUT/DELETE /api/sample-types
│   │   ├── roles.ts                   # GET/POST/PUT/DELETE /api/roles
│   │   ├── samples.ts                 # GET/POST/PUT/DELETE /api/samples, getFull
│   │   ├── stages.ts                  # GET/PUT /api/samples/:id/stages
│   │   ├── shipping.ts                # GET/POST/PUT/DELETE /api/samples/:id/shipping
│   │   ├── audit.ts                   # GET /api/samples/:id/audit
│   │   ├── analytics.ts               # GET dashboard, submission-performance, delivery-performance, streams
│   │   └── export.ts                  # GET /api/export/samples, pipeline, analytics
│   │
│   ├── types/                         # Match server response shapes
│   │   ├── auth.ts                    # User + token, login/register payloads
│   │   ├── user.ts                    # User, role
│   │   ├── lookups.ts                 # Brands, seasons, divisions, product_categories, sample_types, roles
│   │   ├── sample.ts                  # Sample, SampleFull
│   │   ├── stages.ts                  # Stage union, product_business_dev, technical_design, etc.
│   │   ├── shipping.ts                # ShippingTracking
│   │   ├── audit.ts                   # sample_history, status_transitions
│   │   └── analytics.ts              # Dashboard, submission/delivery performance
│   │
│   ├── contexts/
│   │   ├── auth.tsx                   # Auth state, login/logout/register, me
│   │   └── (optional) lookups.tsx     # Cached lookups for forms/filters
│   │
│   ├── hooks/
│   │   ├── useLookups.ts              # Fetch/cache lookups (brands, seasons, etc.)
│   │   ├── useAuth.ts                 # Consume auth context
│   │   └── (optional) useRole.ts      # Current role, canCreateSample, canEditStage, etc.
│   │
│   ├── lib/
│   │   ├── utils.ts                   # (existing) cn, etc.
│   │   ├── rbac.ts                    # Role checks: canManageUsers, canCreateSample, canEditSample, stageForRole
│   │   └── constants.ts               # API_BASE_URL, role codes, stage names
│   │
│   ├── components/
│   │   ├── ui/                        # (existing) button, etc. — shadcn
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx          # Shell: sidebar/nav + outlet
│   │   │   ├── Sidebar.tsx            # Nav links by role
│   │   │   └── Header.tsx             # User menu, logout
│   │   ├── protected/
│   │   │   ├── ProtectedRoute.tsx     # Require auth; redirect to login
│   │   │   └── RoleGate.tsx           # Require specific role(s); 403 or hide
│   │   └── shared/                    # Reusable across features
│   │       ├── DataTable.tsx          # Generic table (samples, users)
│   │       ├── Filters.tsx            # Brand/season/division filters
│   │       └── Loading.tsx
│   │
│   ├── pages/
│   │   ├── login/
│   │   │   └── LoginPage.tsx
│   │   ├── register/
│   │   │   └── RegisterPage.tsx       # Admin-only or public per product choice
│   │   ├── dashboard/                 # Analytics dashboard
│   │   │   └── DashboardPage.tsx       # Uses analytics API (dashboard, submission/delivery)
│   │   ├── samples/
│   │   │   ├── SamplesListPage.tsx    # List samples, filters, link to detail
│   │   │   ├── SampleDetailPage.tsx   # Full sample: stages, shipping, audit
│   │   │   └── SampleFormPage.tsx     # Create/edit sample (PD/Admin)
│   │   ├── users/                     # Admin only
│   │   │   └── UsersPage.tsx          # List/create/edit users
│   │   ├── lookups/                   # Admin only — manage brands, seasons, etc.
│   │   │   └── LookupsPage.tsx        # Or separate tabs: Brands, Seasons, Divisions, etc.
│   │   └── not-found/
│   │       └── NotFoundPage.tsx
│   │
│   └── routes/
│       └── index.tsx                  # Route config: /login, /register, /, /samples, /samples/:id, /users, /lookups, /dashboard
│
├── components.json                    # (existing) shadcn
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
└── STRUCTURE.md                       # This file
```

---

## Route → page mapping (for router)

| Route | Page | Auth | Role note |
|-------|------|------|-----------|
| `/login` | LoginPage | No | — |
| `/register` | RegisterPage | Yes | ADMIN / SUPER_ADMIN |
| `/` | Redirect or Dashboard | Yes | All |
| `/dashboard` | DashboardPage | Yes | All |
| `/samples` | SamplesListPage | Yes | All |
| `/samples/new` | SampleFormPage | Yes | PD, ADMIN, SUPER_ADMIN |
| `/samples/:id` | SampleDetailPage | Yes | All (stage edit by role) |
| `/samples/:id/edit` | SampleFormPage | Yes | PD, ADMIN, SUPER_ADMIN |
| `/users` | UsersPage | Yes | ADMIN, SUPER_ADMIN |
| `/lookups` | LookupsPage | Yes | ADMIN, SUPER_ADMIN |
| `*` | NotFoundPage | — | — |

---

## Naming conventions

- **API modules**: Match server path segment (e.g. `product-categories` → `productCategories.ts`).
- **Types**: Singular for entity types (`User`, `Sample`); file names singular (`user.ts`, `sample.ts`).
- **Pages**: `*Page.tsx`; one folder per area (e.g. `samples/`, `users/`).
- **Components**: PascalCase; `layout/` for shell, `protected/` for auth/role gates, `shared/` for reuse.

This structure stays in sync with the server’s `/api` routes, RBAC (API_ROLES.md), and the sample→stages→shipping→audit flow (SAMPLE_TO_STAGE_FLOW.md) without adding implementation yet.
