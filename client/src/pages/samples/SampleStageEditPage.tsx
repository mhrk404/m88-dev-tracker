import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Loading } from "@/components/ui/loading"
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import { STAGES } from "@/lib/constants"
import { stageForRole } from "@/lib/rbac"
import { getStageFields, stagePayloadFromForm, type StageFieldConfig } from "@/lib/stageFields"
import { getSample, updateSample } from "@/api/samples"
import { getStages, updateStage, type StagesResponse } from "@/api/stages"
import type { Sample } from "@/types/sample"
import type { StageName } from "@/lib/constants"
import type { RoleCode } from "@/lib/constants"
import { useAuth } from "@/contexts/auth"
import { toast } from "sonner"
import { getStatusColor } from "@/lib/statusColors"

const STAGE_LABELS: Record<StageName, string> = {
  [STAGES.PSI]: "Product / Business Dev (PSI)",
  [STAGES.SAMPLE_DEVELOPMENT]: "Sample Development",
  [STAGES.PC_REVIEW]: "PC Review",
  [STAGES.COSTING]: "Costing",
  [STAGES.SCF]: "SCF",
  [STAGES.SHIPMENT_TO_BRAND]: "Shipment to Brand",
}

const STAGE_OPTIONS: StageName[] = [
  STAGES.PSI,
  STAGES.SAMPLE_DEVELOPMENT,
  STAGES.PC_REVIEW,
  STAGES.COSTING,
  STAGES.SCF,
  STAGES.SHIPMENT_TO_BRAND,
]

const STAGE_ORDER: StageName[] = [
  STAGES.PSI,
  STAGES.SAMPLE_DEVELOPMENT,
  STAGES.PC_REVIEW,
  STAGES.COSTING,
  STAGES.SCF,
  STAGES.SHIPMENT_TO_BRAND,
]

function getNextStage(currentStage: StageName | null | undefined): StageName | null {
  if (!currentStage) return STAGE_ORDER[0] ?? null
  const idx = STAGE_ORDER.indexOf(currentStage)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1] ?? null
}

function valueToString(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "boolean") return v ? "true" : "false"
  if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0, 10)
  return String(v)
}

function fieldValueToForm(value: unknown, type: StageFieldConfig["type"]): string {
  if (value == null || value === "") return ""
  if (type === "boolean") return value ? "true" : "false"
  if (type === "date" && typeof value === "string") return value.slice(0, 10)
  return String(value)
}

export default function SampleStageEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sample, setSample] = useState<Sample | null>(null)
  const [stagesData, setStagesData] = useState<StagesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const userStage = user ? stageForRole(user.roleCode as RoleCode) : null
  const isAdmin = user?.roleCode === "ADMIN"
  const defaultStage: StageName | null = userStage ?? (isAdmin ? STAGES.PSI : null)

  const [selectedStage, setSelectedStage] = useState<StageName | null>(defaultStage)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const currentStage = selectedStage ?? userStage

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [sampleRes, stagesRes] = await Promise.all([
        getSample(id),
        getStages(id),
      ])
      setSample(sampleRes)
      setStagesData(stagesRes)
    } catch (e: unknown) {
      console.error("Failed to load sample/stages:", e)
      const err = e as { response?: { status?: number; data?: { error?: string } } }
      const msg = err?.response?.status === 403
        ? (err.response?.data?.error ?? "You can only access samples at your stage.")
        : "Failed to load sample or stage data."
      setError(msg)
      toast.error(msg)
      if (err?.response?.status === 403) navigate("/samples")
    } finally {
      setLoading(false)
    }
  }, [id, userStage])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!currentStage || !stagesData) return
    const row = stagesData.stages[currentStage]
    const fields = getStageFields(currentStage)
    const initial: Record<string, string> = {}
    for (const f of fields) {
      initial[f.key] = fieldValueToForm(row?.[f.key], f.type)
    }
    setFormValues(initial)
    
    // Find first incomplete section based on loaded data and open only that one
    const sectionFields: Record<string, typeof fields> = {}
    fields.forEach((f) => {
      const sectionName = f.section || "default"
      if (!sectionFields[sectionName]) sectionFields[sectionName] = []
      sectionFields[sectionName].push(f)
    })

    const sectionOrder = ["Setup", "Status", "Shipping", "Finalize"]
    const orderedSections = sectionOrder.filter(name => sectionFields[name])

    // Find first incomplete section based on loaded data
    const firstIncomplete = orderedSections.find((name) => {
      const fields = sectionFields[name]
      return !fields.every((f) => {
        const value = fieldValueToForm(row?.[f.key], f.type)
        return value !== undefined && value !== null && String(value).trim() !== ""
      })
    })

    // Set initial expanded state: only first incomplete section is open
    const initialExpanded: Record<string, boolean> = {}
    orderedSections.forEach((name) => {
      initialExpanded[name] = name === firstIncomplete
    })
    setExpandedSections(initialExpanded)
  }, [currentStage, stagesData])

  function toggleSection(sectionName: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }))
  }

  function isSectionComplete(sectionFields: typeof fields): boolean {
    // Check if ALL fields are filled (regardless of optional status)
    return sectionFields.every((f) => {
      const value = formValues[f.key]
      return value !== undefined && value !== null && String(value).trim() !== ""
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !currentStage) return
    const ok = validateForm()
    if (ok) setShowConfirm(true)
  }

  function validateForm(): boolean {
    if (!currentStage) return false
    const fields = getStageFields(currentStage)
    const errs: Record<string, string> = {}
    
    // Validate filled fields for type correctness
    for (const f of fields) {
      const v = formValues[f.key]
      const hasValue = v !== undefined && v !== null && String(v).trim() !== ""

      if (!f.optional && !hasValue) {
        errs[f.key] = `${f.label} is required`
        continue
      }
      if (!hasValue) continue

      // Validate field types
      if (f.type === "number") {
        const n = Number(v)
        if (Number.isNaN(n)) {
          errs[f.key] = `${f.label} must be a number`
        }
      }
      if (f.type === "date") {
        const t = Date.parse(String(v))
        if (!Number.isFinite(t)) {
          errs[f.key] = `${f.label} must be a valid date`
        }
      }
      if (f.type === "boolean") {
        const s = String(v)
        if (s !== "true" && s !== "false" && s !== "") {
          errs[f.key] = `${f.label} must be Yes or No`
        }
      }
    }

    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) {
      const first = Object.values(errs)[0]
      toast.error(first)
      return false
    }

    // Check if at least one section is completely filled (using existing isSectionComplete logic)
    const sections: Record<string, typeof fields> = {}
    fields.forEach((f) => {
      const sectionName = f.section || "default"
      if (!sections[sectionName]) sections[sectionName] = []
      sections[sectionName].push(f)
    })

    const hasCompleteSection = Object.entries(sections).some(([sectionName, sectionFields]) => {
      if (sectionName === "default") return true // Skip default section
      return isSectionComplete(sectionFields)
    })

    if (!hasCompleteSection) {
      toast.error("Complete at least one section (all fields) before saving")
      return false
    }

    return true
  }

  function canAdvanceStage(): boolean {
    if (!currentStage) return false
    const fields = getStageFields(currentStage)

    const finalizeFields = fields.filter((f) => f.section === "Finalize")
    if (finalizeFields.length > 0) {
      const allFinalizeFilled = finalizeFields.every((f) => {
        const value = formValues[f.key]
        return value !== undefined && value !== null && String(value).trim() !== ""
      })
      const hasFinalizeCheck = finalizeFields.some((f) => f.key === "is_checked")
      const isChecked = formValues["is_checked"] === "true"
      return allFinalizeFilled && (!hasFinalizeCheck || isChecked)
    }

    const sentDate = formValues["sent_date"]
    if (sentDate !== undefined && sentDate !== null && String(sentDate).trim() !== "") {
      return true
    }

    return fields.some((f) => {
      if (f.key === "is_checked") return false
      const value = formValues[f.key]
      return value !== undefined && value !== null && String(value).trim() !== ""
    })
  }

  function getAdvanceRequirementMessage(): string {
    if (!currentStage) return "Complete required fields to enable advancing."
    const fields = getStageFields(currentStage)
    const hasFinalize = fields.some((f) => f.section === "Finalize")
    if (hasFinalize) return "Complete Finalize section and verify to enable advancing."
    if (fields.some((f) => f.key === "sent_date")) return "Fill PSI Sent to FTY Date to enable advancing."
    return "Complete required fields to enable advancing."
  }

  function confirmAndSave(moveToNext: boolean) {
    if (!id || !currentStage) return

    // Validate Finalize section if trying to advance
    if (moveToNext && !canAdvanceStage()) {
      toast.error(`Cannot advance: ${getAdvanceRequirementMessage()}`)
      setShowConfirm(false)
      return
    }

    const sampleId = id
    const stage = currentStage
    const payload = stagePayloadFromForm(stage, formValues as unknown as Record<string, unknown>)
    const stageLabel = STAGE_LABELS[stage] ?? stage
    const nextStage = getNextStage(stage)

    setShowConfirm(false)
    setError(null)

    const DELAY = 7
    let remaining = DELAY
    let cancelled = false

    let intervalId: ReturnType<typeof setInterval>
    let timeoutId: ReturnType<typeof setTimeout>

    const actionLabel = moveToNext && nextStage
      ? `Saving & advancing to ${STAGE_LABELS[nextStage] ?? nextStage}`
      : `Saving ${stageLabel}`

    function cancel() {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      toast.dismiss(toastId)
      toast.info("Save cancelled — you can continue editing")
    }

    const toastId = toast.loading(`${actionLabel} in ${remaining}s — click Undo to cancel`, {
      action: { label: "Undo", onClick: cancel },
      duration: Infinity,
    })

    intervalId = setInterval(() => {
      remaining--
      if (remaining > 0) {
        toast.loading(`${actionLabel} in ${remaining}s — click Undo to cancel`, {
          id: toastId,
          action: { label: "Undo", onClick: cancel },
          duration: Infinity,
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      clearInterval(intervalId)
      if (cancelled) return
      toast.dismiss(toastId)
      setSaving(true)
      try {
        await updateStage(sampleId, stage, payload)

        const sampleUpdatePayload: Record<string, unknown> = {}
        if (stage === STAGES.PC_REVIEW) {
          const reviewStatus = valueToString(payload["review_comp"]).trim()
          const internalStatus = valueToString(payload["md_int_review"]).trim()
          const resolvedStatus = reviewStatus || internalStatus
          if (resolvedStatus) {
            sampleUpdatePayload.current_status = resolvedStatus.toUpperCase()
          }
        }

        if (moveToNext && nextStage) {
          sampleUpdatePayload.current_stage = nextStage
        }

        if (Object.keys(sampleUpdatePayload).length > 0) {
          await updateSample(sampleId, sampleUpdatePayload)
        }

        if (moveToNext && nextStage) {
          toast.success(`${stageLabel} saved — sample advanced to ${STAGE_LABELS[nextStage] ?? nextStage}`)
        } else {
          toast.success(`${stageLabel} stage saved`)
        }
        navigate(`/samples/${sampleId}`)
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : "Failed to update stage"
        setError(message ?? "Failed to update stage")
        toast.error(message ?? "Failed to update stage")
      } finally {
        setSaving(false)
      }
    }, DELAY * 1000)
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please log in to edit stages.</p>
      </div>
    )
  }

  if (userStage === null && !isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Your role does not have a stage to edit.</p>
        <Button variant="link" className="mt-2" onClick={() => navigate("/samples")}>
          Back to samples
        </Button>
      </div>
    )
  }

  if (loading && !sample) {
    return <Loading fullScreen text="Loading..." />
  }

  if (!id || !sample) {
    return (
      <div className="p-6">
        <p className="text-destructive">Sample not found.</p>
        <Button variant="link" className="mt-2" onClick={() => navigate("/samples")}>
          Back to samples
        </Button>
      </div>
    )
  }

  const fields = currentStage ? getStageFields(currentStage) : []

  // Determine context card styling based on status
  const getStatusCardStyle = () => {
    const status = sample?.current_status?.toUpperCase() || ""
    if (status === "REJECTED" || status === "HOLD" || status === "CANCELLED") {
      return "border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/10"
    }
    if (
      status === "APPROVED" ||
      status === "PARTIAL_APPROVED" ||
      status.includes("COMPLETE") ||
      status.includes("SENT") ||
      status.includes("SHARED") ||
      status.includes("DELIVERED")
    ) {
      return "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10"
    }
    if (status.includes("PENDING") || status.includes("REVIEW")) {
      return "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10"
    }
    if (status === "INITIATED" || status.includes("DEVELOPMENT") || status.includes("PROGRESS")) {
      return "border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
    }
    return "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10" // fallback
  }

  return (
    <div className="space-y-3 p-3 md:p-4">
      <PageBreadcrumbs />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/samples/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Edit Stage</h1>
            <p className="text-xs text-muted-foreground">
              {sample.style_number}
              {sample.style_name ? ` • ${sample.style_name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <Card className={`border-l-4 ${getStatusCardStyle()}`}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Style #</div>
              <div className="font-medium">{sample.style_number}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Color</div>
              <div className="font-medium">{sample.color ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
              {sample.current_status ? (
                <Badge variant="outline" className={`${getStatusColor(sample.current_status)} text-white border-0`}>
                  {sample.current_status}
                </Badge>
              ) : (
                <div className="font-medium">-</div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Current Stage</div>
              <div className="font-medium">{sample.current_stage ?? "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-3">
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Select Stage to Edit</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedStage ?? ""}
                onValueChange={(v) => setSelectedStage(v as StageName)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {currentStage && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{STAGE_LABELS[currentStage]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              {(() => {
                // Group fields by section
                const sections: Record<string, typeof fields> = {}
                fields.forEach((f) => {
                  const sectionName = f.section || "default"
                  if (!sections[sectionName]) sections[sectionName] = []
                  sections[sectionName].push(f)
                })

                // Define section order for chronological expansion
                const sectionOrder = ["Setup", "Status", "Shipping", "Finalize", "default"]
                const orderedSections = sectionOrder
                  .filter(name => sections[name])
                  .map(name => [name, sections[name]] as const)

                return orderedSections.map(([sectionName, sectionFields]) => {
                  // Default section always expanded, others managed by expandedSections state
                  const isExpanded = sectionName === "default" 
                    ? true 
                    : (expandedSections[sectionName] ?? false)
                  const isComplete = isSectionComplete(sectionFields)
                  
                  if (sectionName === "default") {
                    return (
                      <div key={sectionName} className="grid gap-3 sm:grid-cols-2">
                        {sectionFields.map((f) => (
                          <div key={f.key} className="space-y-1.5">
                            <Label htmlFor={f.key} className="text-xs font-medium">
                              {f.label}
                              {!f.optional && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            {f.type === "text" && (
                              <Input
                                id={f.key}
                                value={formValues[f.key] ?? ""}
                                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            )}
                            {f.type === "date" && (
                              <Input
                                id={f.key}
                                type="date"
                                value={valueToString(formValues[f.key]).slice(0, 10)}
                                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                className="h-8"
                              />
                            )}
                            {f.type === "number" && (
                              <Input
                                id={f.key}
                                type="number"
                                value={formValues[f.key] ?? ""}
                                onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            )}
                            {f.type === "boolean" && (
                              <Select
                                value={formValues[f.key] || "none"}
                                onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                              >
                                <SelectTrigger id={f.key} className="h-8">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">—</SelectItem>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {f.type === "select" && (
                              <Select
                                value={formValues[f.key] || "none"}
                                onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                              >
                                <SelectTrigger id={f.key} className="h-8">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">—</SelectItem>
                                  {(f.options ?? []).map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {fieldErrors[f.key] && (
                              <p className="text-destructive text-xs">{fieldErrors[f.key]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  }
                  
                  return (
                    <Collapsible
                      key={sectionName}
                      open={isExpanded}
                      onOpenChange={() => toggleSection(sectionName)}
                      className="space-y-3"
                    >
                      <CollapsibleTrigger className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground border-b pb-1 w-full hover:text-primary transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                          />
                          {sectionName}
                        </div>
                        {isComplete && (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-normal">Complete</span>
                          </div>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {sectionFields.map((f) => (
                            <div key={f.key} className="space-y-1.5">
                              <Label htmlFor={f.key} className="text-xs font-medium">
                                {f.label}
                                {!f.optional && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {f.type === "text" && (
                                <Input
                                  id={f.key}
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              )}
                              {f.type === "date" && (
                                <Input
                                  id={f.key}
                                  type="date"
                                  value={valueToString(formValues[f.key]).slice(0, 10)}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8"
                                />
                              )}
                              {f.type === "number" && (
                                <Input
                                  id={f.key}
                                  type="number"
                                  value={formValues[f.key] ?? ""}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              )}
                              {f.type === "boolean" && (
                                <Select
                                  value={formValues[f.key] || "none"}
                                  onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger id={f.key} className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {f.type === "select" && (
                                <Select
                                  value={formValues[f.key] || "none"}
                                  onValueChange={(v) => setFormValues((prev) => ({ ...prev, [f.key]: v === "none" ? "" : v }))}
                                >
                                  <SelectTrigger id={f.key} className="h-8">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {(f.options ?? []).map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {fieldErrors[f.key] && (
                                <p className="text-destructive text-xs">{fieldErrors[f.key]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })
              })()}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving} size="sm">
                  {saving ? "Saving..." : "Save Stage"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/samples/${id}`)} size="sm">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm update</AlertDialogTitle>
            <AlertDialogDescription>
              Update <span className="font-medium text-foreground">{currentStage ? (STAGE_LABELS[currentStage] ?? currentStage) : "stage"}</span> data? You have 7 seconds to undo.
              {currentStage && getNextStage(currentStage) && canAdvanceStage() && (
                <div className="mt-2 text-sm text-foreground">
                  You can advance to <span className="font-medium">{STAGE_LABELS[getNextStage(currentStage)!] ?? getNextStage(currentStage)}</span>.
                </div>
              )}
              {currentStage && getNextStage(currentStage) && !canAdvanceStage() && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {getAdvanceRequirementMessage()}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={() => confirmAndSave(false)}
            >
              Save Only
            </AlertDialogAction>
            {currentStage && getNextStage(currentStage) && (
              <AlertDialogAction 
                onClick={() => confirmAndSave(true)}
                disabled={!canAdvanceStage()}
              >
                Complete &amp; Advance
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
