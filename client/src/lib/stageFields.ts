import type { StageName } from "./constants"
import { STAGES } from "./constants"

export type StageFieldType = "text" | "date" | "number" | "boolean"

export interface StageFieldConfig {
  key: string
  label: string
  type: StageFieldType
  optional?: boolean
}

const SKIP_KEYS = new Set(["id", "sample_id", "created_at", "updated_at", "modified_by_log"])

export const STAGE_FIELDS: Record<StageName, StageFieldConfig[]> = {
  [STAGES.PSI]: [
    { key: "sent_date", label: "Sent date", type: "date", optional: true },
    { key: "work_week", label: "Work week", type: "text", optional: true },
    { key: "turn_time", label: "Turn time", type: "text", optional: true },
    { key: "sent_status", label: "Sent status", type: "text", optional: true },
    { key: "disc_status", label: "Disc status", type: "text", optional: true },
    { key: "btp_disc", label: "BTP Disc", type: "text", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.SAMPLE_DEVELOPMENT]: [
    { key: "tp_handoff_td", label: "TP Handoff TD", type: "date", optional: true },
    { key: "fit_log_review", label: "Fit log review", type: "text", optional: true },
    { key: "fty_md", label: "FTY MD", type: "text", optional: true },
    { key: "fty_machine", label: "FTY machine", type: "text", optional: true },
    { key: "p3_reason", label: "P3 reason", type: "text", optional: true },
    { key: "remake_reason", label: "Remake reason", type: "text", optional: true },
    { key: "target_xfty", label: "Target X-FTY", type: "date", optional: true },
    { key: "actual_send", label: "Actual send", type: "date", optional: true },
    { key: "fty_remark", label: "FTY remark", type: "text", optional: true },
    { key: "proceeded_date", label: "Proceeded date", type: "date", optional: true },
    { key: "awb", label: "AWB", type: "text", optional: true },
    { key: "denver_status", label: "Denver status", type: "text", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.PC_REVIEW]: [
    { key: "target_1pc", label: "Target 1PC", type: "date", optional: true },
    { key: "awb_inbound", label: "AWB Inbound", type: "text", optional: true },
    { key: "cbd_actual", label: "CBD Actual", type: "date", optional: true },
    { key: "confirm_date", label: "Confirm date", type: "date", optional: true },
    { key: "reject_by_md", label: "Reject by MD", type: "text", optional: true },
    { key: "review_comp", label: "Review comp", type: "text", optional: true },
    { key: "md_int_review", label: "MD Int review", type: "text", optional: true },
    { key: "td_md_compare", label: "TD MD compare", type: "text", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.COSTING]: [
    { key: "est_due_date", label: "Est due date", type: "date", optional: true },
    { key: "fty_due_date", label: "FTY due date", type: "date", optional: true },
    { key: "due_week", label: "Due week", type: "text", optional: true },
    { key: "team_member", label: "Team member", type: "text", optional: true },
    { key: "ng_entry_date", label: "NG entry date", type: "date", optional: true },
    { key: "ownership", label: "Ownership", type: "text", optional: true },
    { key: "sent_to_brand", label: "Sent to brand", type: "text", optional: true },
    { key: "sent_status", label: "Sent status", type: "text", optional: true },
    { key: "is_checked", label: "Stage Checked / Verified", type: "boolean", optional: true },
  ],
  [STAGES.SCF]: [
    { key: "shared_date", label: "Shared date", type: "date", optional: true },
    { key: "performance", label: "Performance", type: "text", optional: true },
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
      else if (f.type === "text") out[f.key] = v == null ? "" : String(v)
      else out[f.key] = v
    }
  }
  return out
}

export function isSystemKey(key: string): boolean {
  return SKIP_KEYS.has(key)
}
