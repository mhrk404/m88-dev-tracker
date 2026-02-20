import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Edit, ChevronDown, FileEdit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DetailSkeleton } from "@/components/ui/skeletons"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { STAGES } from "@/lib/constants"
import { getSampleFull } from "@/api/samples"
import type { SampleFull, StageData } from "@/types/sample"
import { useAuth } from "@/contexts/auth"
import { canEditSample, stageForRole } from "@/lib/rbac"
import type { RoleCode } from "@/lib/constants"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { getStatusColor } from "@/lib/statusColors"

const stageSteps = [
  { key: STAGES.PSI, label: "PSI", name: "Product / Business Dev" },
  { key: STAGES.SAMPLE_DEVELOPMENT, label: "DEV", name: "Sample Development" },
  { key: STAGES.PC_REVIEW, label: "PC", name: "PC Review" },
  { key: STAGES.COSTING, label: "COST", name: "Costing" },
  { key: STAGES.SCF, label: "SCF", name: "SCF" },
  { key: STAGES.SHIPMENT_TO_BRAND, label: "SHIP", name: "Shipment to Brand" },
] as const

type StepKey = (typeof stageSteps)[number]["key"]

const STAGE_FIELD_LABELS: Record<string, string> = {
  sample_due_denver: "Due (Denver)",
  sample_sent_brand_date: "Sent to brand",
  sample_status: "Status",
  kickoff_date: "Kickoff date",
  reference_m88_dev: "Reference M88 Dev",
  reference_ship_to_fty: "Reference ship to FTY",
  additional_notes: "Additional notes",
  awb_to_brand: "AWB to brand",
  unfree_status: "Unfree status",
  owner_id: "Owner",
  estimated_arrival: "Estimated arrival",
  actual_arrival: "Actual arrival",
  fty_md2: "FTY MD2",
  td_to_md_comment: "TD to MD comment",
  modified_by_log: "Modified by (log)",
  sent_status: "Costing Sent to Brand Status",
  cost_sheet_date: "Cost Sheet Entered Date",
}

function formatStageFieldLabel(key: string): string {
  return STAGE_FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStageFieldValue(key: string, value: unknown): string {
  if (value == null || value === "") return "-"
  if (key === "modified_by_log" && Array.isArray(value)) return `${value.length} entry(ies)`
  if (key === "is_checked") return value === true || value === "true" ? "Yes (Verified)" : "No (Unverified)"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
  }
  return String(value)
}

function hasStageFieldValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function currentStageIndex(stage: string | null | undefined): number {
  if (!stage) return 0
  const normalizedStage = stage.toLowerCase()
  const idx = stageSteps.findIndex((s) => s.key.toLowerCase() === normalizedStage)
  return idx === -1 ? 0 : idx
}

export default function SampleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sample, setSample] = useState<SampleFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMilestone, setSelectedMilestone] = useState<StepKey | null>(null)

  useEffect(() => {
    if (!id) return
    const sampleId = id
    async function loadSample() {
      try {
        const data = await getSampleFull(sampleId)
        setSample(data)
      } catch (error: unknown) {
        console.error("Failed to load sample:", error)
        const err = error as { response?: { status?: number; data?: { error?: string } } }
        const message = err?.response?.status === 403
          ? (err.response?.data?.error ?? "You can only access samples that are at your stage.")
          : "Failed to load sample"
        toast.error(message)
        navigate("/samples")
      } finally {
        setLoading(false)
      }
    }
    loadSample()
  }, [id, navigate])

  const canEdit = user ? canEditSample(user.roleCode as RoleCode) : false
  const canEditStage =
    user &&
    (stageForRole(user.roleCode as RoleCode) !== null ||
      user.roleCode === "ADMIN" ||
      user.roleCode === "SUPER_ADMIN")

  if (loading) {
    return (
      <div className="p-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (!sample) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Sample not found</div>
      </div>
    )
  }

  const stageIdx = currentStageIndex(sample.current_stage)
  // Heuristic: if status is DELIVERED or CANCELLED, show it at the end regardless of current_stage
  const s = (sample.current_status || "").toUpperCase()
  const effectiveStageIdx = (s === "DELIVERED" || s === "CANCELLED")
    ? stageSteps.length - 1
    : stageIdx

  const progressPct =
    stageSteps.length > 1 ? (effectiveStageIdx / (stageSteps.length - 1)) * 100 : 0
  const currentStatusColor = getStatusColor(sample.current_status)

  // Lead time calculation for display
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const kickoffMs = sample.kickoff_date ? Date.parse(sample.kickoff_date) : null
  const dueMs = sample.sample_due_denver ? Date.parse(sample.sample_due_denver) : null
  let calcDays: number | null = null
  let calcWeeks: number | null = null
  let calcClass: string | null = null
  if (kickoffMs && dueMs && Number.isFinite(kickoffMs) && Number.isFinite(dueMs)) {
    const days = Math.ceil((dueMs - kickoffMs) / MS_PER_DAY)
    const weeks = Math.ceil(days / 7)
    calcDays = days
    calcWeeks = weeks
    if (weeks === 0) calcClass = null
    else if (weeks > 17) calcClass = 'STND'
    else if (weeks >= 1 && weeks <= 17) calcClass = 'RUSH'
    else calcClass = null
  }

  return (
    <div className="space-y-3 p-3 md:p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to="/samples"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-lg font-black leading-none text-foreground hover:bg-accent"
            >
              &larr;
            </Link>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/samples">Samples</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Details</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-1">
            {canEditStage && (
              <Button
                variant="outline"
                onClick={() => navigate(`/samples/${id}/stage-edit`)}
                size="sm"
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Edit stage
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/samples/${id}/edit`)} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold">{sample.style_number}</h1>
        </div>
      </div>


      <Dialog open={!!selectedMilestone} onOpenChange={(open) => !open && setSelectedMilestone(null)}>
        <DialogContent className="max-w-md">
          {selectedMilestone && sample && (() => {
            const step = stageSteps.find((s) => s.key === selectedMilestone)!
            const stageData = sample.stages[selectedMilestone] as StageData | null
            const idx = stageSteps.findIndex((s) => s.key === selectedMilestone)
            const isCompleted = idx < effectiveStageIdx
            const isCurrent = idx === effectiveStageIdx
            const statusLabel = isCompleted ? "Completed" : isCurrent ? "Current" : "Not started"
            const skipKeys = new Set(["id", "sample_id", "created_at", "updated_at"])
            const isIdKey = (key: string) => key === "id" || key.endsWith("_id")
            const entries = stageData
              ? Object.entries(stageData).filter(([k, v]) => !skipKeys.has(k) && !isIdKey(k) && hasStageFieldValue(v))
              : []
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span>{step.name}</span>
                    <Badge variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"} className="text-xs">
                      {statusLabel}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Stage</div>
                    <div className="text-sm">{step.label} — {step.name}</div>
                  </div>
                  {entries.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Details</div>
                      <div className="rounded-lg border bg-muted/20 divide-y">
                        {entries.map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-3 px-3 py-2 text-sm">
                            <span className="text-muted-foreground shrink-0">{formatStageFieldLabel(key)}</span>
                            <span className="text-right font-medium break-all">{formatStageFieldValue(key, value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No details recorded yet for this stage.</p>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Quick Status Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
              {sample.current_status ? (
                <Badge variant="outline" className={`${getStatusColor(sample.current_status)} text-white border-0`}>
                  {sample.current_status}
                </Badge>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Stage</div>
              {sample.current_stage ? (
                <Badge variant="secondary">{sample.current_stage}</Badge>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Kickoff</div>
              <span className="font-medium">{sample.kickoff_date ? new Date(sample.kickoff_date).toLocaleDateString() : "-"}</span>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Due (Denver)</div>
              <span className="font-medium">{sample.sample_due_denver ? new Date(sample.sample_due_denver).toLocaleDateString() : "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sample Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Style #</span>
                <span className="font-medium">{sample.style_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Style Name</span>
                <span className="font-medium">{sample.style_name || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Color</span>
                <span className="font-medium">{sample.color || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qty</span>
                <span className="font-medium">{sample.qty ?? "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">COO</span>
                <span className="font-medium">{sample.coo || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Classification & Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Season</span>
                <span className="font-medium">{sample.seasons ? (sample.seasons.name || sample.seasons.code) : "-"} {sample.seasons?.year}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{sample.brands?.name || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Division</span>
                <span className="font-medium">{sample.division || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{sample.product_category || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{sample.sample_type || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PBD & Timeline Info */}
      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">PBD Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unfree Status</span>
                <span className="font-semibold">{sample.unfree_status || "FREE"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lead Time</span>
                <span className="font-medium">
                  {calcWeeks != null ? (
                    calcWeeks === 0 ? "-" : `${calcWeeks} wk`
                  ) : sample.requested_lead_time != null ? (
                    sample.requested_lead_time === 0 ? "-" : `${sample.requested_lead_time}`
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{(calcWeeks != null ? (calcClass || '-') : (sample.lead_time_type || '-'))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ref from M88?</span>
                <span className="font-medium">{sample.ref_from_m88 || "No"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(sample.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">{new Date(sample.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Milestones & Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="relative pt-2">
            <div className="absolute left-3 right-3 top-7 hidden h-px bg-border md:block" />
            <div
              className={cn(
                "absolute left-3 top-7 hidden h-px md:block transition-colors duration-500",
                currentStatusColor === "bg-rose-500" ? "bg-rose-500/50" : "bg-emerald-500/50"
              )}
              style={{ width: `calc(${progressPct}% - 12px)` }}
            />

            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-1.5">
              {stageSteps.map((step, idx) => {
                const isCompleted = idx < effectiveStageIdx
                const isCurrent = idx === effectiveStageIdx
                const dotClass = isCompleted
                  ? "bg-emerald-500"
                  : isCurrent
                    ? currentStatusColor
                    : "bg-muted-foreground/40"

                const stageData = sample.stages[step.key] as StageData | null
                const isVerified = stageData?.is_checked === true || stageData?.is_checked === "true"

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setSelectedMilestone(step.key)}
                    className={cn(
                      "flex items-center gap-3 md:flex-col md:items-center md:gap-1.5",
                      "rounded-lg p-2 -m-2 text-left md:text-center",
                      "transition-all duration-200",
                      "hover:bg-muted/80 hover:shadow-sm hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 hover:ring-offset-background",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                    aria-label={`${step.name}, click for details`}
                  >
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                      {isVerified && (
                        <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 md:flex-initial">
                      <div className="text-xs font-semibold text-foreground">{step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.name}</div>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 md:mt-0.5" aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {(sample.shipping || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9">AWB</TableHead>
                  <TableHead className="h-9">Origin</TableHead>
                  <TableHead className="h-9">Destination</TableHead>
                  <TableHead className="h-9">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sample.shipping || []).map((ship) => (
                  <TableRow key={ship.id}>
                    <TableCell className="py-2">{ship.awb || "-"}</TableCell>
                    <TableCell className="py-2">{ship.origin || "-"}</TableCell>
                    <TableCell className="py-2">{ship.destination || "-"}</TableCell>
                    <TableCell className="py-2">{ship.status || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(sample.status_transitions || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status Transitions</CardTitle>
            <CardDescription className="text-xs">History of status and stage changes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9">From</TableHead>
                  <TableHead className="h-9">To</TableHead>
                  <TableHead className="h-9">Stage</TableHead>
                  <TableHead className="h-9">Date</TableHead>
                  <TableHead className="h-9">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sample.status_transitions || []).map((transition) => (
                  <TableRow key={transition.id}>
                    <TableCell className="py-2">{transition.from_status || "-"}</TableCell>
                    <TableCell className="py-2">{transition.to_status || "-"}</TableCell>
                    <TableCell className="py-2">{transition.stage || "-"}</TableCell>
                    <TableCell className="py-2 text-xs">{new Date(transition.transitioned_at).toLocaleString()}</TableCell>
                    <TableCell className="py-2">{transition.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
