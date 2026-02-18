# Schema: parent → child entities

M88 sample tracker database structure from root (mother) entities down to dependent (child) entities. Create/read order follows this hierarchy.

---

## Level 0 — Root lookups (no foreign keys to other app tables)

| Entity | Primary key | Notes |
|--------|-------------|--------|
| **roles** | `id` (serial) | SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY |
| **brands** | `id` (serial) | Brand name, unique |
| **seasons** | `id` (serial) | Unique (name, year), e.g. SS24, FW24 |
| **divisions** | `id` (serial) | Apparel, Footwear, etc. |
| **sample_types** | `id` (serial) | Proto, Fit, Salesman, etc. |
| **product_categories** | `id` (serial) | Optional self-ref via `parent_id` (parent category) |

---

## Level 1 — Depends on root lookups

| Entity | Primary key | Parent(s) | Child reference |
|--------|-------------|-----------|------------------|
| **users** | `id` (serial) | **roles** (`role_id`) | Referenced by samples, stage owners, audit |
| **product_categories** | — | **product_categories** (`parent_id` → self) | Hierarchical categories (e.g. Tops → Shirts) |

---

## Level 2 — Core entity (sample)

| Entity | Primary key | Parents |
|--------|-------------|---------|
| **samples** | `id` (uuid) | **seasons**, **brands**, **divisions**, **product_categories**, **sample_types**, **users** (`created_by`) |

One row per physical sample. Unique per `(style_number, color, season_id)`.

---

## Level 3 — Children of sample (all reference `samples.id`, many reference `users.id`)

### Stage tables (1:1 with sample, ON DELETE CASCADE)

| Entity | Parent(s) | Cardinality |
|--------|-----------|--------------|
| **product_business_dev** (Stage 1) | samples, users (`owner_id`) | One per sample |
| **technical_design** (Stage 2) | samples, users (`owner_id`) | One per sample |
| **factory_execution** (Stage 3) | samples, users (`owner_id`, `fty_md2`) | One per sample |
| **merchandising_review** (Stage 4) | samples, users (`owner_id`) | One per sample |
| **costing_analysis** (Stage 5) | samples, users (`analyst_id`, `brand_communication_owner_id`) | One per sample |

### Shipping (1:many with sample)

| Entity | Parent(s) | Cardinality |
|--------|-----------|--------------|
| **shipping_tracking** | samples | Many per sample (multiple shipments) |

### Audit (1:many with sample)

| Entity | Parent(s) | Cardinality |
|--------|-----------|--------------|
| **sample_history** | samples, users (`changed_by`) | Many per sample |
| **status_transitions** | samples, users (`transitioned_by`) | Many per sample |

---

## Diagram (mother → child)

```
roles
  └── users

brands
seasons
divisions
product_categories
  └── product_categories (parent_id, optional)
sample_types

     ┌──────────────┬──────────────┬─────────────────────┬──────────────────────┬───────────────┬───────┐
     ▼              ▼              ▼                     ▼                      ▼               ▼       ▼
  seasons      brands      divisions      product_categories      sample_types    users (created_by)
     └──────────────┴──────────────┴─────────────────────┴──────────────────────┴───────────────┴───────┘
                                                                   │
                                                                   ▼
                                                              samples
                                                                   │
     ┌──────────────────┬──────────────────┬──────────────────────┬─────────────────────┬──────────────────┬───────────────┬────────────────────┐
     ▼                   ▼                   ▼                      ▼                     ▼                  ▼               ▼                    ▼
product_business_dev  technical_design  factory_execution  merchandising_review  costing_analysis  shipping_tracking  sample_history  status_transitions
     │                   │                   │                      │                     │                  │               │                    │
     └───────────────────┴───────────────────┴──────────────────────┴─────────────────────┴──────────────────┴───────────────┴────────────────────┘
                                         (all reference users for owner_id / changed_by / transitioned_by where applicable)
```

---

## Delete order (reverse of create)

When deleting or resetting data, respect foreign keys by clearing children before parents:

1. **sample_history**, **status_transitions**, **shipping_tracking**
2. **product_business_dev**, **technical_design**, **factory_execution**, **merchandising_review**, **costing_analysis**
3. **samples**
4. **users**
5. **roles**, **brands**, **seasons**, **divisions**, **product_categories** (children before parents), **sample_types**

Deleting a **sample** cascades to all stage, shipping, and audit tables (where ON DELETE CASCADE is set).
