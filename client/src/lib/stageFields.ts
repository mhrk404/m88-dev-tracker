import type { StageName } from "./constants"
import { STAGES } from "./constants"

export type StageFieldType = "text" | "textarea" | "date" | "number" | "boolean" | "select" | "user_select"

export interface StageFieldConfig {
  key: string
  label: string
  type: StageFieldType
  optional?: boolean
  section?: string
  options?: string[]
}

const SKIP_KEYS = new Set(["id", "sample_id", "created_at", "updated_at", "modified_by_log"])

export const STAGE_FIELDS: Record<StageName, StageFieldConfig[]> = {
  // PSI
  [STAGES.PSI]: [
    { key: "tp_handoff_td", label: "Date TP Hand-off to TD", type: "date", optional: true },
    { key: "sent_date", label: "Date PSI Details Sent to Factory", type: "date", optional: true },
    { key: "p3_remake_reason", label: "P3+ Sample Reason / Remake Reason", type: "textarea", optional: true },
    { key: "is_checked", label: "Mark PSI Stage as Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.SAMPLE_DEVELOPMENT]: [
    // Setup
    { key: "fty_md_user_id", label: "Factory Merchandiser (FTY MD)", type: "user_select", optional: true, section: "Setup" },
    { key: "fty_machine", label: "Factory Machine / Line Used", type: "text", optional: true, section: "Setup" },
    { key: "fty_target_sample", label: "Factory Target Date to Complete Sample", type: "date", optional: true, section: "Setup" },
    { key: "target_xfty", label: "Target Ex-Factory (XFTY) Date", type: "date", optional: true, section: "Setup" },
    // Status
    { key: "sample_proceeded", label: "Factory Development Proceeded", type: "date", optional: true, section: "Status" },
    { key: "fty_remark", label: "Factory Remarks / Updates (Include Date)", type: "text", optional: true, section: "Status" },
    { key: "fty_psi_btp_discrepancy", label: "Factory PSI vs BTP Discrepancy Details", type: "text", optional: true, section: "Status" },
    // Shipping
    { key: "actual_send", label: "Actual Date Sample Sent", type: "date", optional: true, section: "Shipping" },
    { key: "awb", label: "Dispatch AWB Number", type: "text", optional: true, section: "Shipping" },
    // Finalize
    { key: "target_1pc_review_date", label: "Target Date for 1st PC Review", type: "date", optional: true, section: "Finalize" },
    { key: "actual_cbd_submitted_date", label: "Actual Date CBD Was Submitted", type: "date", optional: true, section: "Finalize" },
    { key: "is_checked", label: "Mark Factory Development Stage as Checked / Verified", type: "boolean", optional: true, section: "Finalize" },
  ],
  [STAGES.PC_REVIEW]: [
    { key: "confirm_date", label: "Confirmed Date of 1st PC Review", type: "date", optional: true },
    {
      key: "reject_by_md",
      label: "Rejection Round by MD (1st PC)",
      type: "select",
      optional: true,
      options: ["0.0", "1.0", "2.0", "3.0", "Completed"],
    },
    {
      key: "review_comp",
      label: "1st PC Review Completion Status",
      type: "select",
      optional: true,
      options: ["Completed", "Pending", "Declined"],
    },
    {
      key: "md_int_review",
      label: "M88 MD Internal Review Outcome",
      type: "select",
      optional: true,
      options: ["Okay", "Conditionally Okay", "Dropped", "Rejected"],
    },
    { key: "td_fit_log_review_status", label: "TD Fit Log Review Status", type: "text", optional: true },
    { key: "scf_shared_date", label: "Date SCF Was Shared", type: "date", optional: true },
  ],
  [STAGES.COSTING]: [
    { key: "team_member_user_id", label: "Costing Team Member", type: "user_select", optional: true },
    {
      key: "sent_status",
      label: "Costing Package Sent to Brand Status",
      type: "select",
      optional: true,
      options: ["Pending", "Sent"],
    },
    { key: "cost_sheet_date", label: "Date Cost Sheet Was Entered", type: "date", optional: true },
  ],
  [STAGES.SHIPMENT_TO_BRAND]: [
    { key: "sent_date", label: "Date Package Was Sent to Brand", type: "date", optional: true },
    { key: "awb_number", label: "Package AWB Number", type: "text", optional: true },
    { key: "pkg_eta_denver", label: "Package ETA in Denver", type: "date", optional: true },
    { key: "is_checked", label: "Mark Brand Delivery Stage as Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.DELIVERED_CONFIRMATION]: [],
}

export function getStageFields(stage: StageName): StageFieldConfig[] {
  return STAGE_FIELDS[stage] ?? []
}

export function stagePayloadFromForm(
  stage: StageName,
  formValues: Record<string, unknown>
): Record<string, unknown> {
  const fields = getStageFields(stage)
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (formValues[f.key] !== undefined && formValues[f.key] !== "") {
      let v = formValues[f.key]
      if (f.type === "number" && v !== "") out[f.key] = Number(v)
      else if (f.type === "user_select" && v !== "") out[f.key] = Number(v)
      else if (f.type === "boolean") {
        if (typeof v === "string") out[f.key] = v === "true"
        else out[f.key] = Boolean(v)
      }
      else if (f.type === "date" && v) out[f.key] = v
      else if (f.type === "text" || f.type === "textarea" || f.type === "select") out[f.key] = v == null ? "" : String(v)
      else out[f.key] = v
    }
  }
  return out
}

export function isSystemKey(key: string): boolean {
  return SKIP_KEYS.has(key)
}
