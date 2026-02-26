import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Edit,
  FileEdit,
  CircleDot,
  ClipboardList,
  FlaskConical,
  MessageSquareWarning,
  Calculator,
  Truck,
  PackageCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import ActivityLogs from "@/components/activity/ActivityLogs"

const stageSteps = [
  { key: STAGES.PSI, label: "PSI", name: "PSI Intake (Business Development)", icon: ClipboardList },
  { key: STAGES.SAMPLE_DEVELOPMENT, label: "DEV", name: "Factory Development Updates", icon: FlaskConical },
  { key: STAGES.PC_REVIEW, label: "PC", name: "MD / Product Review Decision", icon: MessageSquareWarning },
  { key: STAGES.COSTING, label: "COST", name: "Cost Sheet Processing", icon: Calculator },
  { key: STAGES.SHIPMENT_TO_BRAND, label: "SHIP", name: "Brand Delivery Tracking", icon: Truck },
  { key: STAGES.DELIVERED_CONFIRMATION, label: "DLV", name: "Delivered Confirmation", icon: PackageCheck },
] as const

function currentStageIndex(stage: string | null | undefined): number {
  if (!stage) return 0
  const normalizedStage = stage.toLowerCase()
  const idx = stageSteps.findIndex((s) => s.key.toLowerCase() === normalizedStage)
  return idx === -1 ? 0 : idx
}

function effectiveStageIndex(stage: string | null | undefined, status: string | null | undefined): number {
  const normalizedStatus = (status || "").trim().toUpperCase()
  if (normalizedStatus === "COMPLETED" || normalizedStatus === "DELIVERED") {
    return stageSteps.findIndex((s) => s.key === STAGES.DELIVERED_CONFIRMATION)
  }
  if (normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED" || normalizedStatus === "DROPPED") {
    return stageSteps.length - 1
  }
  return currentStageIndex(stage)
}

function formatStatusDisplay(status: string | null | undefined, stage: string | null | undefined): string {
  if (!status) return "-"
  if (status.trim().toUpperCase() === "PROCESSING" && stage) {
    const stageStep = stageSteps.find((s) => s.key.toLowerCase() === stage.toLowerCase())
    const stageName = stageStep?.name || stage
    return `Processing / ${stageName}`
  }
  return status
}

const STAGE_LABELS: Record<string, string> = {
  [STAGES.PSI]: "PSI Intake (Business Development)",
  [STAGES.SAMPLE_DEVELOPMENT]: "Factory Development Updates",
  [STAGES.PC_REVIEW]: "MD / Product Review Decision",
  [STAGES.COSTING]: "Cost Sheet Processing",
  [STAGES.SHIPMENT_TO_BRAND]: "Brand Delivery Tracking",
}

function formatStageDisplay(stage: string | null | undefined): string {
  if (!stage) return "-"
  return STAGE_LABELS[stage] || stage
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function addDays(dateLike: string | null | undefined, days: number): string | null {
  if (!dateLike) return null
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function subtractDays(dateLike: string | null | undefined, days: number): string | null {
  if (!dateLike) return null
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function dayDiffSafe(fromDate: string | null | undefined, toDate: string | null | undefined): number | null {
  if (!fromDate || !toDate) return null
  const from = new Date(fromDate)
  const to = new Date(toDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function toWeekRange(dateLike: string | null | undefined): string {
  if (!dateLike) return "-"
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return "-"
  const weekday = date.getDay()
  const mondayOffset = (weekday + 6) % 7
  const monday = new Date(date)
  monday.setDate(monday.getDate() - mondayOffset)
  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)
  const fmt = (x: Date) => `${String(x.getMonth() + 1).padStart(2, "0")}/${String(x.getDate()).padStart(2, "0")}`
  return `${fmt(monday)} - ${fmt(friday)}`
}

function monthShort(dateLike: string | null | undefined): string {
  if (!dateLike) return "-"
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("en-US", { month: "short" })
}

function yearNumber(dateLike: string | null | undefined): string {
  if (!dateLike) return "-"
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return "-"
  return String(d.getFullYear())
}

function classifyByDueDate(due: string | null | undefined, actual: string | null | undefined): string {
  const diff = dayDiffSafe(due, actual)
  if (diff == null) return "Pending"
  if (diff < 0) return "Early"
  if (diff === 0) return "On Time"
  return "Late"
}

function normalizeRejectFlag(value: unknown): boolean {
  if (value == null) return false
  const s = String(value).trim().toLowerCase()
  if (!s) return false
  return !["0", "false", "no", "none", "n/a"].includes(s)
}

function weekNum(dateLike: string | null | undefined): string {
  if (!dateLike) return "-"
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return "-"
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return String(Math.ceil(dayOfYear / 7))
}

function protoEfficiency(sampleType: string | null | undefined, hasReject: boolean, storedValue: unknown): string {
  if (storedValue && String(storedValue).trim()) return String(storedValue)
  const s = String(sampleType ?? "").toUpperCase()
  if (!s.includes("PROTO")) return "Exempt"
  return hasReject ? "Round 2+" : "Round 1"
}

function humanizeFieldKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStageFieldValue(value: unknown): string {
  if (value == null) return "-"
  if (typeof value === "boolean") return value ? "True" : "False"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value.trim() ? value : "-"
  return JSON.stringify(value, null, 2)
}

function isFilledStageField(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

export default function SampleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sample, setSample] = useState<SampleFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null)

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
  const canViewAdditionalInfo =
    user?.roleCode === "ADMIN" || user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "PBD"
  const canInspectMilestones =
    user?.roleCode === "ADMIN" || user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "PBD"

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

  const effectiveStageIdx = effectiveStageIndex(sample.current_stage, sample.current_status)
  const deliveredStageIdx = stageSteps.findIndex((s) => s.key === STAGES.DELIVERED_CONFIRMATION)
  const isDeliveredFlow = effectiveStageIdx === deliveredStageIdx

  const progressPct =
    stageSteps.length > 1 ? (effectiveStageIdx / (stageSteps.length - 1)) * 100 : 0
  const currentStatusColor = getStatusColor(sample.current_status)

  const assignment = getSingleRelation(sample.team_assignment)
  const roleOwnersMap = sample.sample_role_owners_map ?? {}
  const roleOwnerName = (roleKey: "PBD_SAMPLE_CREATION" | "TD_PSI_INTAKE" | "FTY_MD_DEVELOPMENT" | "MD_M88_DECISION" | "COSTING_TEAM_COST_SHEET" | "PBD_BRAND_TRACKING") => {
    const row = roleOwnersMap?.[roleKey]
    const fullName = row?.user?.full_name?.trim()
    return fullName || row?.user?.username || "-"
  }
  const pbdCreationOwner = roleOwnerName("PBD_SAMPLE_CREATION")
  const pbdTrackingOwner = roleOwnerName("PBD_BRAND_TRACKING")
  const pbdFallbackOwner = assignment?.pbd?.full_name || "-"
  const pbdRoleDisplay = (() => {
    const names = [pbdCreationOwner, pbdTrackingOwner].filter((name) => name !== "-")
    if (names.length === 0) return pbdFallbackOwner
    if (names.length === 1) return names[0]
    return names[0] === names[1] ? names[0] : `${names[0]} / ${names[1]}`
  })()
  const stageMap = sample.stages as Record<string, StageData | null | undefined>

  const responsibleByStage = (stageKey: string): string => {
    if (stageKey === STAGES.PSI) {
      const direct = roleOwnerName("TD_PSI_INTAKE")
      return direct !== "-" ? direct : (assignment?.td?.full_name || "-")
    }
    if (stageKey === STAGES.SAMPLE_DEVELOPMENT) {
      const direct = roleOwnerName("FTY_MD_DEVELOPMENT")
      return direct !== "-" ? direct : (assignment?.fty_md2?.full_name || "-")
    }
    if (stageKey === STAGES.PC_REVIEW) {
      const direct = roleOwnerName("MD_M88_DECISION")
      return direct !== "-" ? direct : (assignment?.md?.full_name || "-")
    }
    if (stageKey === STAGES.COSTING) {
      const direct = roleOwnerName("COSTING_TEAM_COST_SHEET")
      return direct !== "-" ? direct : (assignment?.costing?.full_name || "-")
    }
    if (stageKey === STAGES.SHIPMENT_TO_BRAND || stageKey === STAGES.DELIVERED_CONFIRMATION) {
      const direct = roleOwnerName("PBD_BRAND_TRACKING")
      return direct !== "-" ? direct : (assignment?.pbd?.full_name || "-")
    }
    return "-"
  }

  const selectedStageStep = stageSteps.find((s) => s.key === selectedStageKey) ?? null
  const selectedStageData = selectedStageKey ? stageMap[selectedStageKey] ?? null : null
  const selectedStageResponsible = selectedStageKey ? responsibleByStage(selectedStageKey) : "-"
  const selectedStageEntries = selectedStageData
    ? Object.entries(selectedStageData)
      .filter(([key]) => {
        const normalized = key.toLowerCase()
        if (normalized === "id" || normalized.endsWith("_id")) return false
        if (normalized === "created_at" || normalized === "updated_at") return false
        if (normalized.includes("sample_role_owner")) return false
        return true
      })
      .filter(([, value]) => isFilledStageField(value))
      .sort(([a], [b]) => a.localeCompare(b))
    : []
  const psi = sample.stages?.psi
  const dev = sample.stages?.sample_development
  const pc = sample.stages?.pc_review
  const costing = sample.stages?.costing
  const ship = sample.stages?.shipment_to_brand
  const scf = (sample.stages as Record<string, StageData | null | undefined>)?.scf ?? null
  const scfSharedDate = (pc?.scf_shared_date as string | undefined) ?? (scf?.shared_date as string | undefined) ?? null
  const scfPerformance = (scf?.performance as string | undefined) || classifyByDueDate(sample.sample_due_denver, scfSharedDate)

  const requestedLeadTime = sample.requested_lead_time ?? dayDiffSafe(sample.kickoff_date, sample.sample_due_denver)
  const psiSentDate = (psi?.sent_date as string | undefined) ?? null
  const actualShipDate = (dev?.actual_send as string | undefined) ?? null
  const targetXfactory = (dev?.target_xfty as string | undefined) ?? null
  const costSheetDate = (costing?.cost_sheet_date as string | undefined) ?? null
  const dueCosting = addDays(actualShipDate, 1)
  const estimateCostingDue = addDays(actualShipDate, 2)
  const estimateXfactoryForDen = requestedLeadTime != null ? subtractDays(sample.sample_due_denver, requestedLeadTime) : null
  const awbValue = (ship?.awb_number as string | undefined) || (dev?.awb as string | undefined) || ""
  const hasReject = normalizeRejectFlag(pc?.reject_status) || normalizeRejectFlag(pc?.reject_by_md)

  const additionalRows: Array<{ label: string; value: string }> = [
    { label: "PBD", value: pbdRoleDisplay },
    { label: "TD", value: roleOwnerName("TD_PSI_INTAKE") !== "-" ? roleOwnerName("TD_PSI_INTAKE") : (assignment?.td?.full_name || "-") },
    { label: "FTY MD", value: roleOwnerName("FTY_MD_DEVELOPMENT") !== "-" ? roleOwnerName("FTY_MD_DEVELOPMENT") : (assignment?.fty_md2?.full_name || "-") },
    { label: "MD M88", value: roleOwnerName("MD_M88_DECISION") !== "-" ? roleOwnerName("MD_M88_DECISION") : (assignment?.md?.full_name || "-") },
    { label: "Costing Team", value: roleOwnerName("COSTING_TEAM_COST_SHEET") !== "-" ? roleOwnerName("COSTING_TEAM_COST_SHEET") : (assignment?.costing?.full_name || "-") },
    { label: "Sample Type Group", value: sample.sample_type_group || sample.sample_type || "-" },
    { label: "PSI Creation Work Week", value: (psi?.work_week as string | undefined) || toWeekRange(psiSentDate) },
    { label: "PSI Turn Time (Days)", value: String(dayDiffSafe(sample.kickoff_date, psiSentDate) ?? 0) },
    { label: "PSI Month", value: (psi?.month as number | undefined)?.toString() || monthShort(psiSentDate) },
    { label: "PSI Year", value: (psi?.year as number | undefined)?.toString() || yearNumber(psiSentDate) },
    { label: "PSI Sent Status", value: psi?.sent_status ? String(psi.sent_status) : (psiSentDate ? "TRUE" : "FALSE") },
    { label: "PSI Discrepancy Status", value: psi?.disc_status ? "Has Discrepancy" : "No Discrepancy" },
    { label: "1st PC Reject Status MD", value: hasReject ? "Rejected" : "Not Rejected" },
    { label: "TD to MD Comment Compare", value: pc?.td_md_compare != null ? String(pc.td_md_compare) : String((pc?.review_comp ?? "").toString().trim() === (pc?.md_int_review ?? "").toString().trim()) },
    { label: "SCF Month", value: monthShort(scfSharedDate) },
    { label: "SCF Year", value: yearNumber(scfSharedDate) },
    { label: "SCF Performance", value: scfPerformance || "-" },
    { label: "Target Xfactory Week", value: (dev?.target_xfty_wk as string | undefined) || toWeekRange(targetXfactory) },
    { label: "Estimate FTY Costing Due Date", value: estimateCostingDue || "-" },
    { label: "FTY Costing Due Date", value: dueCosting || "-" },
    { label: "FTY Costing Due Week", value: toWeekRange(dueCosting) },
    { label: "CBD Month", value: monthShort(costSheetDate) },
    { label: "CBD Year", value: yearNumber(costSheetDate) },
    { label: "FTY Costing Submit Performance", value: costSheetDate ? classifyByDueDate(dueCosting, costSheetDate) : "Pending" },
    { label: "Estimate Xfactory for Sample due in Denver", value: estimateXfactoryForDen || "-" },
    { label: "Sample Due in Denver Status", value: classifyByDueDate(sample.sample_due_denver, actualShipDate) },
    { label: "AWB# Status", value: awbValue ? "Populated" : "Blank" },
    { label: "Sample Week Num", value: (ship?.week_num as string | undefined) || weekNum(actualShipDate) },
    { label: "Sample Arrival WEEK", value: (ship?.arrival_week as string | undefined) || toWeekRange(actualShipDate) },
    { label: "Sample Arrival Month", value: ship?.arrival_month ? String(ship.arrival_month) : monthShort(actualShipDate) },
    { label: "Sample Arrival Year", value: ship?.arrival_year ? String(ship.arrival_year) : yearNumber(actualShipDate) },
    { label: "Factory Lead Time", value: String(dayDiffSafe(psiSentDate, actualShipDate) ?? "-") },
    { label: "FTY Sample Delivery Performance", value: (dev?.delivery_perf as string | undefined) || classifyByDueDate(targetXfactory, actualShipDate) },
    { label: "Proto Efficiency", value: protoEfficiency(sample.sample_type, hasReject, dev?.proto_eff) },
    { label: "Costing Lead Time from FTY", value: dayDiffSafe(actualShipDate, costSheetDate) != null ? String(dayDiffSafe(actualShipDate, costSheetDate)) : "NA" },
    { label: "Costing sent to brand status", value: costing?.sent_status ? String(costing.sent_status).toLowerCase() : "-" },
    { label: "Sample Sent to Brand Status", value: ship?.sent_status ? String(ship.sent_status) : (ship?.sent_date ? "sent" : awbValue ? "awb created" : "pending") },
  ]

  // Lead time calculation for display
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const kickoffMs = sample.kickoff_date ? Date.parse(sample.kickoff_date) : null
  const dueMs = sample.sample_due_denver ? Date.parse(sample.sample_due_denver) : null
  let calcDays: number | null = null
  let calcClass: string | null = null
  if (kickoffMs && dueMs && Number.isFinite(kickoffMs) && Number.isFinite(dueMs)) {
    const days = Math.ceil((dueMs - kickoffMs) / MS_PER_DAY)
    calcDays = days
    if (days === 0) calcClass = null
    else if (days > 119) calcClass = 'STND'
    else if (days >= 1 && days <= 119) calcClass = 'RUSH'
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

      {/* Quick Status Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
              {sample.current_status ? (
                <Badge variant="outline" className={`${getStatusColor(sample.current_status)} text-white border-0`}>
                  {formatStatusDisplay(sample.current_status, sample.current_stage)}
                </Badge>
              ) : (
                <span className="text-sm">-</span>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Stage</div>
              {sample.current_stage ? (
                <Badge variant="secondary">{formatStageDisplay(sample.current_stage)}</Badge>
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
                <span className="font-medium">{sample.seasons ? (sample.seasons.code || sample.seasons.name) : "-"} {sample.seasons?.year}</span>
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
                  {calcDays != null ? (
                    calcDays === 0 ? "-" : `${calcDays} day${calcDays === 1 ? "" : "s"}`
                  ) : sample.requested_lead_time != null ? (
                    sample.requested_lead_time === 0 ? "-" : `${sample.requested_lead_time} day${sample.requested_lead_time === 1 ? "" : "s"}`
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{(calcDays != null ? (calcClass || '-') : (sample.lead_time_type || '-'))}</span>
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
              style={{ width: `${progressPct}%` }}
            />

            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-1.5">
              {stageSteps.map((step, idx) => {
                const isCompleted = idx < effectiveStageIdx
                const isCurrent = idx === effectiveStageIdx
                const isDeliveredStep = step.key === STAGES.DELIVERED_CONFIRMATION && isDeliveredFlow && isCurrent
                const StepIcon = step.icon
                const dotClass = isCompleted
                  ? "bg-emerald-500"
                  : isDeliveredStep
                    ? "bg-emerald-500"
                    : isCurrent
                    ? currentStatusColor
                    : "bg-muted-foreground/40"

                const stageData = (sample.stages as Record<string, StageData | null | undefined>)[step.key] ?? null
                const isVerified = stageData?.is_checked === true || stageData?.is_checked === "true"

                const milestoneBody = (
                  <>
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                      {isVerified && (
                        <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 md:flex-initial">
                      <div className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
                        <StepIcon className="h-3.5 w-3.5" />
                        <span>{step.label}</span>
                        {isCurrent && (
                          isDeliveredStep ? (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] leading-none bg-emerald-500 text-white">
                              <CircleDot className="mr-1 h-2.5 w-2.5" />
                              Delivered
                            </Badge>
                          ) : (
                            <Badge variant="default" className="h-4 px-1.5 text-[10px] leading-none">
                              <CircleDot className="mr-1 h-2.5 w-2.5" />
                              Current
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{step.name}</div>
                    </div>
                  </>
                )

                if (canInspectMilestones) {
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => setSelectedStageKey(step.key)}
                      className={cn(
                        "flex items-center gap-3 md:flex-col md:items-center md:gap-1.5",
                        "rounded-lg border border-transparent p-2 -m-2 text-left md:text-center",
                        "transition-all duration-200 hover:bg-muted/40 hover:border-border hover:-translate-y-0.5 hover:shadow-sm hover:scale-[1.01] cursor-pointer"
                      )}
                    >
                      {milestoneBody}
                    </button>
                  )
                }

                return (
                  <div
                    key={step.key}
                    className={cn(
                      "flex items-center gap-3 md:flex-col md:items-center md:gap-1.5",
                      "rounded-lg border border-transparent p-2 -m-2 text-left md:text-center",
                      "transition-all duration-200 hover:bg-muted/20 hover:border-border hover:-translate-y-0.5 hover:shadow-sm"
                    )}
                  >
                    {milestoneBody}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStageKey} onOpenChange={(open) => !open && setSelectedStageKey(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto p-0">
          <div className="space-y-4 p-4 sm:p-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base">{selectedStageStep?.name || "Stage details"}</DialogTitle>
              <DialogDescription className="text-xs">
                Filled stage fields only.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/10">
              <div className="flex items-start justify-between gap-4 px-3 py-2.5 text-xs sm:px-4">
                <span className="uppercase tracking-wide text-muted-foreground">Stage</span>
                <span className="font-medium text-right">{selectedStageStep?.name || "-"}</span>
              </div>
              {selectedStageResponsible !== "-" && (
                <div className="flex items-start justify-between gap-4 border-t px-3 py-2.5 text-xs sm:px-4">
                  <span className="uppercase tracking-wide text-muted-foreground">Responsible</span>
                  <span className="font-medium text-right">{selectedStageResponsible}</span>
                </div>
              )}
            </div>

            {selectedStageEntries.length > 0 ? (
              <div className="rounded-lg border bg-background p-3 sm:p-4">
                <ul className="space-y-2.5">
                  {selectedStageEntries.map(([key, rawValue]) => (
                    <li key={key} className="rounded-md border bg-muted/20 px-3 py-2">
                      <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{humanizeFieldKey(key)}</span>
                      <span className="mt-1 block text-xs font-medium break-words leading-relaxed">
                        {formatStageFieldValue(rawValue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                No filled fields yet for this stage.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {canViewAdditionalInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Additional Info</CardTitle>
            <CardDescription className="text-xs">Export-aligned fields (shown once, no duplicates)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto pr-1">
              <div className="grid gap-2 sm:grid-cols-2">
                {additionalRows.map((row) => (
                  <div key={row.label} className="rounded-md border bg-muted/20 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</div>
                    <div className="mt-1 text-sm font-medium break-words">{row.value || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Shipping, Status Transitions, and Activity Logs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          {(sample.shipping || []).length > 0 && <TabsTrigger value="shipping">Shipping</TabsTrigger>}
          {(sample.status_transitions || []).length > 0 && <TabsTrigger value="transitions">Status Changes</TabsTrigger>}
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <ActivityLogs sampleId={id!} />
        </TabsContent>

        {(sample.shipping || []).length > 0 && (
          <TabsContent value="shipping">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Shipping Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(sample.status_transitions || []).length > 0 && (
          <TabsContent value="transitions">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status Transitions</CardTitle>
                <CardDescription className="text-xs">History of status and stage changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9">From Stage</TableHead>
                        <TableHead className="h-9">To Stage</TableHead>
                        <TableHead className="h-9">From Status</TableHead>
                        <TableHead className="h-9">To Status</TableHead>
                        <TableHead className="h-9">Date</TableHead>
                        <TableHead className="h-9">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sample.status_transitions || []).map((transition) => (
                        <TableRow key={transition.id}>
                          <TableCell className="py-2">{transition.from_stage || "-"}</TableCell>
                          <TableCell className="py-2">{transition.to_stage || transition.stage || "-"}</TableCell>
                          <TableCell className="py-2">{transition.from_status || "-"}</TableCell>
                          <TableCell className="py-2">{transition.to_status || "-"}</TableCell>
                          <TableCell className="py-2 text-xs">{new Date(transition.transitioned_at).toLocaleString()}</TableCell>
                          <TableCell className="py-2">{transition.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
