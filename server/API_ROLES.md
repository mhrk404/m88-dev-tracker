# API Access by Role

Base URL: `/api` (e.g. `http://localhost:5000/api`).

**Roles:** `ADMIN` | `PBD` | `TD` | `FTY` | `MD` | `COSTING` | `BRAND`

---

## Role Definitions & Permissions

### 1. ADMIN
*   **Access**: Full system access.
*   **Capabilities**: User management, brand/season CRUD, style CRUD, sample CRUD, any stage update, analytics, export.

### 2. PBD (Product Business Development)
*   **Definition**: Internal Owner / PD.
*   **Sample Control**: Can create samples and update basic sample info.
*   **Stage Control**: Writes to **PSI**, **COSTING**, and **SHIPMENT_TO_BRAND**.
*   **Data Scope**: Sees all samples.

### 3. TD (Technical Design)
*   **Stage Control**: Writes to **SAMPLE_DEVELOPMENT** and **PC_REVIEW**.
*   **Data Scope**: Sees all samples.

### 4. FTY (Factory Execution)
*   **Stage Control**: Writes to **SAMPLE_DEVELOPMENT** (Actual Send), **COSTING** (Submit), and **SCF**.
*   **Data Scope**: Sees only samples where they are assigned in `team_assignment`.

### 5. MD (Merchandising)
*   **Stage Control**: Writes to **PC_REVIEW** (MD Internal Review).
*   **Data Scope**: Sees all samples.

### 6. COSTING (Costing Analysis)
*   **Stage Control**: Writes to **COSTING**.
*   **Data Scope**: Sees all samples.

### 7. BRAND
*   **Access**: Read-only access to samples they own.
*   **Data Scope**: Sees only samples where their brand is assigned to the style.

---

## Stage Ownership Matrix

| Stage | Owner (Write) |
|-------|---------------|
| **PSI** | PBD |
| **SAMPLE_DEVELOPMENT** | TD, FTY |
| **PC_REVIEW** | TD, MD |
| **COSTING** | PBD, FTY, COSTING |
| **SCF** | FTY |
| **SHIPMENT_TO_BRAND** | PBD |

---

## Endpoint Permissions

| Group | Endpoint | ADMIN | PBD | TD | FTY | MD | COSTING | BRAND |
|-------|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Auth** | `/auth/register` (Admin ONLY) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Users** | `/users/**` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Brands**| `/brands/**` (Write) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Seasons**| `/seasons/**` (Write) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Styles** | `/styles` (Create) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Samples**| `/samples` (Create) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Stages** | `/stages/:id` (Update) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Analytics**| `/analytics/**` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ = Full Access | ❌ = No Access | 👁️ = Read Only
