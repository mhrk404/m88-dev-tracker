import type { StageName } from "./constants"
import { STAGES } from "./constants"

export type StageFieldType = "text" | "date" | "number" | "boolean" | "select"

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
    { key: "sent_date", label: "PSI Sent to FTY Date", type: "date", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.SAMPLE_DEVELOPMENT]: [
    // Setup
    { key: "fty_md", label: "FTY MD", type: "text", optional: true, section: "Setup" },
    { key: "fty_machine", label: "Machine", type: "text", optional: true, section: "Setup" },
    { key: "fty_target_sample", label: "FTY Target Sample", type: "date", optional: true, section: "Setup" },
    { key: "target_xfty", label: "Xfactory Date", type: "date", optional: true, section: "Setup" },
    // Status
    { key: "sample_proceeded", label: "Sample Proceeded", type: "boolean", optional: true, section: "Status" },
    { key: "fty_remark", label: "FTY REMARK (Add Date)", type: "text", optional: true, section: "Status" },
    { key: "fty_psi_btp_discrepancy", label: "FTY PSI/BTP Discrepancy", type: "text", optional: true, section: "Status" },
    // Shipping
    { key: "actual_send", label: "Actual Send Date", type: "date", optional: true, section: "Shipping" },
    { key: "awb", label: "AWB", type: "text", optional: true, section: "Shipping" },
    // Finalize
    { key: "target_1pc_review_date", label: "Target 1st PC Review Date", type: "date", optional: true, section: "Finalize" },
    { key: "actual_cbd_submitted_date", label: "Actual CBD Submitted Date", type: "date", optional: true, section: "Finalize" },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true, section: "Finalize" },
  ],
  [STAGES.PC_REVIEW]: [
    { key: "confirm_date", label: "1st PC Review Date Confirmed", type: "date", optional: true },
    {
      key: "reject_by_md",
      label: "1st PC Reject by MD",
      type: "select",
      optional: true,
      options: ["0.0", "1.0", "2.0", "3.0", "Completed"],
    },
    {
      key: "review_comp",
      label: "1st PC Review Status",
      type: "select",
      optional: true,
      options: ["Completed", "Pending", "Declined"],
    },
    {
      key: "md_int_review",
      label: "M88 MD Internal Review Status",
      type: "select",
      optional: true,
      options: ["Okay", "Conditionally Okay", "Dropped", "Rejected"],
    },
    { key: "scf_shared_date", label: "SCF Shared Date", type: "date", optional: true },
  ],
  [STAGES.COSTING]: [
    {
      key: "sent_status",
      label: "Costing Sent to Brand Status",
      type: "select",
      optional: true,
      options: ["Pending", "Sent"],
    },
    { key: "cost_sheet_date", label: "Cost Sheet Entered Date", type: "date", optional: true },
  ],
  // Sample Confirmation Form (SCF)
  [STAGES.SCF]: [
    { key: "shared_date", label: "Sample Confirmation Form Date", type: "date", optional: true },
    { key: "pkg_eta_denver", label: "PKG ETA Denver", type: "date", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.SHIPMENT_TO_BRAND]: [
    { key: "sent_date", label: "Sent date", type: "date", optional: true },
    { key: "awb_number", label: "AWB number", type: "text", optional: true },
    { key: "awb_status", label: "AWB status", type: "text", optional: true },
    { key: "arrival_week", label: "Arrival week", type: "text", optional: true },
    { key: "sent_status", label: "Sent status", type: "text", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
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
      else if (f.type === "boolean") out[f.key] = Boolean(v)
      else if (f.type === "date" && v) out[f.key] = v
      else if (f.type === "text" || f.type === "select") out[f.key] = v == null ? "" : String(v)
      else out[f.key] = v
    }
  }
  return out
}

export function isSystemKey(key: string): boolean {
  return SKIP_KEYS.has(key)
}
