# Updated Stage Schema (UI-aligned)

This schema reflects active stage form fields and API save behavior after migration `023_align_stage_schema_with_ui.sql`.

## Stage Model Notes

- `delivered_confirmation` is a **virtual stage** in UI/API.
- `delivered_confirmation.sent_date` is stored in `shipment_to_brand.sent_date`.
- `shipment_to_brand` is now **one row per sample** (`UNIQUE(sample_id)`).

## Tables

### `psi`
- `psi_id` UUID PK
- `sample_id` UUID FK UNIQUE
- `tp_handoff_td` DATE
- `sent_date` DATE
- `p3_remake_reason` TEXT
- `is_checked` BOOLEAN
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### `sample_development`
- `dev_id` UUID PK
- `sample_id` UUID FK UNIQUE
- `fty_md_user_id` INTEGER FK users(id)
- `fty_machine` TEXT
- `fty_target_sample` DATE
- `target_xfty` DATE
- `sample_proceeded` DATE
- `fty_remark` TEXT
- `fty_psi_btp_discrepancy` TEXT
- `actual_send` DATE
- `awb` TEXT
- `target_1pc_review_date` DATE
- `actual_cbd_submitted_date` DATE
- `is_checked` BOOLEAN
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### `pc_review`
- `pc_id` UUID PK
- `sample_id` UUID FK UNIQUE
- `confirm_date` DATE
- `reject_by_md` TEXT
- `review_comp` TEXT
- `md_int_review` TEXT
- `td_fit_log_review_status` TEXT
- `scf_shared_date` DATE
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### `costing`
- `cost_id` UUID PK
- `sample_id` UUID FK UNIQUE
- `team_member_user_id` INTEGER FK users(id)
- `sent_status` TEXT
- `cost_sheet_date` DATE
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### `shipment_to_brand`
- `shipment_id` UUID PK
- `sample_id` UUID FK UNIQUE
- `sent_date` DATE *(written by Delivered Confirmation)*
- `awb_number` TEXT
- `pkg_eta_denver` DATE
- `is_checked` BOOLEAN
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

## Save Contract by Stage

- `psi` → `tp_handoff_td`, `sent_date`, `is_checked`, `p3_remake_reason`
- `sample_development` → `fty_md_user_id`, `fty_machine`, `fty_target_sample`, `target_xfty`, `sample_proceeded`, `fty_remark`, `fty_psi_btp_discrepancy`, `actual_send`, `awb`, `target_1pc_review_date`, `actual_cbd_submitted_date`, `is_checked`
- `pc_review` → `confirm_date`, `reject_by_md`, `review_comp`, `md_int_review`, `td_fit_log_review_status`, `scf_shared_date`
- `costing` → `team_member_user_id`, `sent_status`, `cost_sheet_date`
- `shipment_to_brand` → `awb_number`, `pkg_eta_denver`, `is_checked`
- `delivered_confirmation` (virtual) → `sent_date` (stored in `shipment_to_brand`)
