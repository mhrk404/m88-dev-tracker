# Schema: revised model (010) and legacy

M88 sample tracker database. **Revised model** (migration 010) introduces STYLE, SAMPLE_REQUEST, TEAM_ASSIGNMENT, ROLE_PERMISSION, and stage tables PSI, SAMPLE_DEVELOPMENT, PC_REVIEW, COSTING, SCF, SHIPMENT_TO_BRAND, and STAGE_AUDIT_LOG. Legacy tables (samples, product_business_dev, etc.) remain for migration or parallel use.

---

## Revised model (migration 010+)

### Level 0 — User and role

| Entity | Primary key | Notes |
|--------|-------------|--------|
| **users** | `id` (serial) | name, email, `app_role` (enum: PBD, TD, FTY, MD, COSTING, BRAND, ADMIN), is_active. Legacy: role_id → roles still present. |
| **role_permission** | `permission_id` (serial) | role (text), stage (text), can_read, can_write, can_approve. One row per (role, stage). |

### Level 0 — Lookups

| Entity | Primary key | Notes |
|--------|-------------|--------|
| **brands** | `id` (serial) | name, contact, is_active |
| **seasons** | `id` (serial) | code (e.g. S27), year, name, start_date, end_date |
| **divisions** | `id` (serial) | (legacy lookup; style uses division text in revised) |
| **sample_types** | `id` (serial) | (legacy; sample_request uses sample_type text) |
| **product_categories** | `id` (serial) | (legacy; style uses product_category text in revised) |

### Level 1 — Style (brand + season)

| Entity | Primary key | Parents |
|--------|-------------|--------|
| **styles** | `style_id` (serial) | brands, seasons |

Columns: style_number, style_name, division, product_category, color, qty, coo. UNIQUE (style_number, color, season_id).

### Level 2 — Sample request (core) and team assignment

| Entity | Primary key | Parents |
|--------|-------------|--------|
| **sample_request** | `sample_id` (uuid) | styles, team_assignment (optional), users (created_by) |
| **team_assignment** | `assignment_id` (serial) | sample_request (sample_id), users (pbd/td/fty/md/costing_user_id) |

**sample_request** columns: style_id, assignment_id, sample_type, sample_type_group, sample_status, kickoff_date, sample_due_denver, requested_lead_time, lead_time_type, ref_from_m88, ref_sample_to_fty, additional_notes, key_date. Created by PBD; viewed by all.

**team_assignment**: one row per sample; pbd_user_id, td_user_id, fty_user_id, md_user_id, costing_user_id.

### Level 3 — Stage tables (1:1 with sample_request)

| Table | Owner | PK |
|-------|--------|-----|
| **psi** | PBD | psi_id |
| **sample_development** | FTY/TD | dev_id |
| **pc_review** | MD | pc_id |
| **costing** | COSTING | cost_id |
| **scf** | FTY | scf_id |
| **shipment_to_brand** | PBD | shipment_id (1:many per sample) |

- **psi**: sent_date, work_week, turn_time, month, year, sent_status, disc_status, btp_disc.
- **sample_development**: tp_handoff_td, fit_log_review, fty_md, fty_machine, p3_reason, remake_reason, target_xfty, actual_send, fty_remark, proceeded, est_xfty, denver_status, fty_lead_time, delivery_perf, proto_eff, target_xfty_wk.
- **pc_review**: target_1pc, awb_inbound, cbd_actual, confirm_date, reject_by_md, review_comp, reject_status, md_int_review, td_md_compare.
- **costing**: est_due_date, fty_due_date, due_week, cbd_month, cbd_year, submit_perf, team_member, ng_entry_date, ownership, sent_to_brand, cost_lead_time, sent_status.
- **scf**: shared_date, month, year, performance, pkg_eta_denver.
- **shipment_to_brand**: sent_date, awb_number, awb_status, week_num, arrival_week, arrival_month, arrival_year, sent_status, lead_time_to_brand.

### Audit (revised)

| Entity | Primary key | Notes |
|--------|-------------|--------|
| **stage_audit_log** | `log_id` (uuid) | sample_id, user_id, stage, action (CREATE, UPDATE, APPROVE, REJECT), field_changed, old_value, new_value, timestamp |

---

## Legacy schema (pre-010)

- **samples** — core sample (style_number, style_name, color, qty, season_id, brand_id, division_id, category_id, sample_type_id, coo, current_status, current_stage, created_by).
- **product_business_dev**, **technical_design**, **factory_execution**, **merchandising_review**, **costing_analysis** — stage tables (1:1 with samples).
- **shipping_tracking** — many per sample.
- **sample_history**, **status_transitions** — audit.
- **roles** — lookup (SUPER_ADMIN, ADMIN, PD, MD, TD, COSTING, FACTORY). users.role_id → roles.

Delete order (legacy): sample_history, status_transitions, shipping_tracking → stage tables → samples → users → lookups.

Delete order (revised): stage_audit_log, psi, sample_development, pc_review, costing, scf, shipment_to_brand → team_assignment → sample_request → styles → role_permission → users → lookups.
