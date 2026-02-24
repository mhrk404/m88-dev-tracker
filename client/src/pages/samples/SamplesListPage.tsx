import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Edit, Download, Trash2, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { TableSkeleton } from "@/components/ui/skeletons"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { listSamples, getSampleFull, updateSample, deleteSample } from "@/api/samples"
import { getLookups } from "@/api/lookups"
import { exportSamples, type ExportFormat } from "@/api/export"
import type { Sample, UpdateSampleInput } from "@/types/sample"
import type { Lookups } from "@/types/lookups"
import type { SampleFilters } from "@/types/sample"
import { useAuth } from "@/contexts/auth"
import { canEditSample, stageForRole } from "@/lib/rbac"
import { STAGES } from "@/lib/constants"
import type { RoleCode } from "@/lib/constants"
import { toast } from "sonner"
import { paginationRange } from "@/lib/pagination"

const SAMPLES_PAGE_SIZE = 10

const STAGE_LABELS: Record<string, string> = {
  [STAGES.PSI]: "PSI Intake (Business Development)",
  [STAGES.SAMPLE_DEVELOPMENT]: "Factory Development Updates",
  [STAGES.PC_REVIEW]: "MD / Product Review Decision",
  [STAGES.COSTING]: "Cost Sheet Processing",
  [STAGES.SHIPMENT_TO_BRAND]: "Brand Delivery Tracking",
  [STAGES.DELIVERED_CONFIRMATION]: "Delivered Confirmation",
}

const STAGE_OPTIONS = [
  { value: STAGES.PSI, label: "PSI Intake (Business Development)" },
  { value: STAGES.SAMPLE_DEVELOPMENT, label: "Factory Development Updates" },
  { value: STAGES.PC_REVIEW, label: "MD / Product Review Decision" },
  { value: STAGES.COSTING, label: "Cost Sheet Processing" },
  { value: STAGES.SHIPMENT_TO_BRAND, label: "Brand Delivery Tracking" },
  { value: STAGES.DELIVERED_CONFIRMATION, label: "Delivered Confirmation" },
] as const

const STAGE_ORDER: string[] = [
  STAGES.PSI,
  STAGES.SAMPLE_DEVELOPMENT,
  STAGES.PC_REVIEW,
  STAGES.COSTING,
  STAGES.SHIPMENT_TO_BRAND,
  STAGES.DELIVERED_CONFIRMATION,
]

function isDatePast(dateLike: string | null | undefined): boolean {
  if (!dateLike) return false
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function getNextStage(currentStage: string | null | undefined): string | null {
  if (!currentStage) return STAGE_ORDER[0] ?? null
  const idx = STAGE_ORDER.indexOf(currentStage)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1] ?? null
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_")
}

function hashString(input: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const statusPalette = [
  {
    dot: "bg-violet-500",
    badge: "border-violet-200 text-violet-700 dark:border-violet-900/40 dark:text-violet-300",
  },
  {
    dot: "bg-fuchsia-500",
    badge: "border-fuchsia-200 text-fuchsia-700 dark:border-fuchsia-900/40 dark:text-fuchsia-300",
  },
  {
    dot: "bg-cyan-500",
    badge: "border-cyan-200 text-cyan-700 dark:border-cyan-900/40 dark:text-cyan-300",
  },
  {
    dot: "bg-teal-500",
    badge: "border-teal-200 text-teal-700 dark:border-teal-900/40 dark:text-teal-300",
  },
  {
    dot: "bg-sky-500",
    badge: "border-sky-200 text-sky-700 dark:border-sky-900/40 dark:text-sky-300",
  },
  {
    dot: "bg-indigo-500",
    badge: "border-indigo-200 text-indigo-700 dark:border-indigo-900/40 dark:text-indigo-300",
  },
  {
    dot: "bg-rose-500",
    badge: "border-rose-200 text-rose-700 dark:border-rose-900/40 dark:text-rose-300",
  },
  {
    dot: "bg-lime-500",
    badge: "border-lime-200 text-lime-700 dark:border-lime-900/40 dark:text-lime-300",
  },
] as const

function paletteForStatus(status: string) {
  const idx = hashString(normalizeStatus(status)) % statusPalette.length
  return statusPalette[idx]
}

function statusDotClass(status: string | null | undefined): string {
  if (!status) return "bg-muted-foreground/40"
  const s = normalizeStatus(status)
  if (s.includes("delay") || s.includes("late") || s.includes("blocked") || s.includes("hold")) return "bg-red-500"
  if (s.includes("pending") || s.includes("waiting") || s.includes("review")) return "bg-amber-500"
  if (s.includes("progress") || s.includes("development") || s.includes("active")) return "bg-blue-500"
  if (s.includes("delivered")) return "bg-sky-500"
  if (s.includes("complete") || s.includes("done")) return "bg-emerald-500"
  if (s.includes("approved")) return "bg-emerald-500"
  return paletteForStatus(status).dot
}

function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return "border-muted-foreground/20 text-muted-foreground"
  const s = normalizeStatus(status)
  if (s.includes("delay") || s.includes("late") || s.includes("blocked") || s.includes("hold")) return "border-red-200 text-red-700 dark:border-red-900/40 dark:text-red-300"
  if (s.includes("pending") || s.includes("waiting") || s.includes("review")) return "border-amber-200 text-amber-700 dark:border-amber-900/40 dark:text-amber-300"
  if (s.includes("progress") || s.includes("development") || s.includes("active")) return "border-blue-200 text-blue-700 dark:border-blue-900/40 dark:text-blue-300"
  if (s.includes("delivered")) return "border-sky-200 text-sky-700 dark:border-sky-900/40 dark:text-sky-300"
  if (s.includes("complete") || s.includes("done")) return "border-emerald-200 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
  if (s.includes("approved")) return "border-emerald-200 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
  return paletteForStatus(status).badge
}

function simplifyStatus(status: string | null | undefined): string {
  if (!status) return "-"
  const s = normalizeStatus(status)
  if (s.includes("deliver")) return "Delivered"
  if (s.includes("complete") || s.includes("done") || s.includes("approve")) return "Completed"
  if (s.includes("pending") || s.includes("waiting") || s.includes("review")) return "Pending"
  return "Processing"
}

function formatStatusDisplay(status: string | null | undefined): string {
  return simplifyStatus(status)
}

function formatStageDisplay(stage: string | null | undefined): string {
  if (!stage) return "-"
  return STAGE_LABELS[stage] || stage
}

export default function SamplesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [samples, setSamples] = useState<Sample[]>([])
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx")
  const [filters, setFilters] = useState<SampleFilters>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<UpdateSampleInput>({})
  const [editFormLoading, setEditFormLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [editShipmentEta, setEditShipmentEta] = useState<string | null>(null)
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set())
  const [sampleToDelete, setSampleToDelete] = useState<Sample | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [filters, searchQuery, statusFilter])

  useEffect(() => {
    if (!editingSampleId || !lookups) return
    setEditFormLoading(true)
    getSampleFull(editingSampleId)
      .then((sample) => {
        setEditFormData({
          style_name: sample.style_name || "",
          color: sample.color || "",
          qty: sample.qty ?? undefined,
          season_id: sample.season_id,
          brand_id: sample.brand_id,
          division: sample.division || "",
          product_category: sample.product_category || "",
          sample_type: sample.sample_type || "",
          coo: sample.coo || "",
          current_status: sample.current_status || "",
          current_stage: sample.current_stage || "",
        })
        const ship = sample.stages?.shipment_to_brand as Record<string, unknown> | null | undefined
        setEditShipmentEta((ship?.pkg_eta_denver as string | undefined) ?? null)
      })
      .catch(() => toast.error("Failed to load sample"))
      .finally(() => setEditFormLoading(false))
  }, [editingSampleId, lookups])

  async function refreshSamples() {
    try {
      const data = await listSamples(filters)
      setSamples(data)
    } catch {
      // keep current list
    }
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowSaveConfirm(true)
  }

  function doSave(moveToNextStage: boolean) {
    if (!editingSampleId) return

    // Build payload now before closing dialogs
    let currentStage = editFormData.current_stage?.trim() || undefined
    if (moveToNextStage) {
      const next = getNextStage(editFormData.current_stage)
      if (next) currentStage = next
    }

    if (
      moveToNextStage &&
      currentStage === STAGES.DELIVERED_CONFIRMATION
    ) {
      if (!isDatePast(editShipmentEta)) {
        toast.error("Delivered confirmation is available only when ETA is already past.")
        return
      }
    }

    const payload: UpdateSampleInput = {
      ...editFormData,
      style_name: editFormData.style_name?.trim() || undefined,
      color: editFormData.color?.trim() || undefined,
      qty: editFormData.qty,
      coo: editFormData.coo?.trim() || undefined,
      current_status: editFormData.current_status?.trim() || undefined,
      current_stage: currentStage,
    }
    const sampleId = editingSampleId
    const successMsg = moveToNextStage && currentStage
      ? `Moved to next stage: ${STAGE_LABELS[currentStage] ?? currentStage}`
      : "Sample updated"

    // Close all dialogs immediately
    setShowSaveConfirm(false)
    setEditingSampleId(null)

    // Countdown undo toast
    const DELAY = 7
    let remaining = DELAY
    let cancelled = false

    let intervalId: ReturnType<typeof setInterval>
    let timeoutId: ReturnType<typeof setTimeout>

    function cancel() {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      toast.dismiss(toastId)
      toast.info("Save cancelled")
    }

    const toastId = toast.loading(`Saving in ${remaining}s — click Undo to cancel`, {
      action: { label: "Undo", onClick: cancel },
      duration: Infinity,
    })

    intervalId = setInterval(() => {
      remaining--
      if (remaining > 0) {
        toast.loading(`Saving in ${remaining}s — click Undo to cancel`, {
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
      setEditSaving(true)
      try {
        await updateSample(sampleId, payload)
        toast.success(successMsg)
        await refreshSamples()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update sample"
        toast.error(msg)
      } finally {
        setEditSaving(false)
      }
    }, DELAY * 1000)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [samplesData, lookupsData] = await Promise.all([
          listSamples(filters),
          getLookups(),
        ])
        setSamples(samplesData)
        setLookups(lookupsData)
      } catch (error) {
        console.error("Failed to load samples:", error)
        toast.error("Failed to load samples")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filters])

  const availableStatuses = useMemo(() => {
    const set = new Set<string>()
    for (const s of samples) {
      if (s.current_status && s.current_status.trim()) set.add(simplifyStatus(s.current_status))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [samples])

  const availableSeasons = useMemo(() => {
    const byId = new Map<number, string>()
    for (const sample of samples) {
      if (!sample.season_id) continue
      const label = sample.seasons
        ? `${sample.seasons.code || sample.seasons.name} ${sample.seasons.year}`
        : `Season ${sample.season_id}`
      byId.set(sample.season_id, label)
    }
    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [samples])

  const availableBrands = useMemo(() => {
    const byId = new Map<number, string>()
    for (const sample of samples) {
      if (!sample.brand_id || !sample.brands?.name) continue
      byId.set(sample.brand_id, sample.brands.name)
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [samples])

  const availableDivisions = useMemo(() => {
    const set = new Set<string>()
    for (const sample of samples) {
      if (sample.division && sample.division.trim()) set.add(sample.division.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [samples])

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    for (const sample of samples) {
      if (sample.product_category && sample.product_category.trim()) set.add(sample.product_category.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [samples])

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    filters.season_id !== undefined ||
    filters.brand_id !== undefined ||
    !!filters.division ||
    !!filters.product_category

  function clearAllFilters() {
    setSearchQuery("")
    setStatusFilter("all")
    setFilters({})
    setPage(1)
  }

  const filteredSamples = samples.filter((sample) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !query ||
      sample.style_number?.toLowerCase().includes(query) ||
      sample.style_name?.toLowerCase().includes(query) ||
      sample.color?.toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === "all" ||
      simplifyStatus(sample.current_status) === statusFilter

    return matchesQuery && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredSamples.length / SAMPLES_PAGE_SIZE))
  const safePage = Math.min(Math.max(page, 1), totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage])

  const pagedSamples = useMemo(() => {
    const start = (safePage - 1) * SAMPLES_PAGE_SIZE
    return filteredSamples.slice(start, start + SAMPLES_PAGE_SIZE)
  }, [filteredSamples, safePage])

  const canEdit = user ? canEditSample(user.roleCode as RoleCode) : false
  const canEditStage =
    user &&
    (stageForRole(user.roleCode as RoleCode) !== null ||
      user.roleCode === "ADMIN" ||
      user.roleCode === "SUPER_ADMIN")
  const userStage = user ? stageForRole(user.roleCode as RoleCode) : null
  const stageFilterLabel = userStage ? STAGE_LABELS[userStage] ?? userStage : null

  const toggleSelectSample = (sampleId: string) => {
    setSelectedSampleIds((prev) => {
      const next = new Set(prev)
      if (next.has(sampleId)) {
        next.delete(sampleId)
      } else {
        next.add(sampleId)
      }
      return next
    })
  }

  const toggleSelectAllOnPage = () => {
    const pageIds = pagedSamples.map((sample) => sample.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedSampleIds.has(id))

    if (allSelected) {
      setSelectedSampleIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedSampleIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  function openDeleteSample(sample: Sample) {
    setSampleToDelete(sample)
    setDeleteOpen(true)
  }

  function scheduleDeleteWithUndo(ids: string[], successMessage: string) {
    if (ids.length === 0) return

    const DELAY = 5
    let remaining = DELAY
    let cancelled = false

    setDeleteOpen(false)
    setBulkDeleteOpen(false)
    setSampleToDelete(null)

    let intervalId: ReturnType<typeof setInterval>
    let timeoutId: ReturnType<typeof setTimeout>

    function cancel() {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      toast.dismiss(toastId)
      toast.info("Delete cancelled")
    }

    const toastId = toast.loading(`Deleting in ${remaining}s — click Undo to cancel`, {
      action: { label: "Undo", onClick: cancel },
      duration: Infinity,
    })

    intervalId = setInterval(() => {
      remaining--
      if (remaining > 0) {
        toast.loading(`Deleting in ${remaining}s — click Undo to cancel`, {
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

      setDeleting(true)
      try {
        await Promise.all(ids.map((id) => deleteSample(id)))
        toast.success(successMessage)
        setSelectedSampleIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
        await refreshSamples()
      } catch (err: any) {
        console.error("Delete sample failed:", err)
        toast.error(err?.response?.data?.error || "Failed to delete sample(s)")
      } finally {
        setDeleting(false)
      }
    }, DELAY * 1000)
  }

  async function onDeleteSample() {
    if (!sampleToDelete) return
    scheduleDeleteWithUndo([sampleToDelete.id], "Sample deleted")
  }

  async function onBulkDeleteSamples() {
    if (selectedSampleIds.size === 0) return
    const ids = Array.from(selectedSampleIds)
    scheduleDeleteWithUndo(ids, `${ids.length} sample(s) deleted`)
  }

  async function onExport() {
    try {
      setExporting(true)
      const { blob, filename } = await exportSamples({
        format: exportFormat,
        season_id: filters.season_id,
        brand_id: filters.brand_id,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Export started")
    } catch (err: any) {
      console.error("Export samples failed:", err)
      toast.error(err?.response?.data?.error || "Failed to export samples")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 px-6 mt-5">
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-6 mt-5">
      <div className="flex items-center justify-between">
        <div>        </div>
        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              <SelectItem value="csv">CSV (.csv)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="mb-6 border-b pb-6 flex justify-between items-center gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by style number, name, or color..."
              className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Status">
                    {statusFilter === "all" ? (
                      <span className="text-muted-foreground">All</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusDotClass(statusFilter)}`} />
                        <span className="truncate">{statusFilter}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(status)}`} />
                        <span>{status}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lookups && (
                <>
                  <Select
                    value={filters.season_id?.toString() || "all"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, season_id: value === "all" ? undefined : Number(value) })
                    }
                  >
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Season" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Seasons</SelectItem>
                      {availableSeasons.map((season) => (
                        <SelectItem key={season.id} value={season.id.toString()}>
                          {season.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.brand_id?.toString() || "all"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, brand_id: value === "all" ? undefined : Number(value) })
                    }
                  >
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {availableBrands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.division || "all"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, division: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {availableDivisions.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.product_category || "all"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, product_category: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
                className="h-9"
              >
                Clear filters
              </Button>
            </div>
          </div>

          {/* Sample Count */}
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredSamples.length} sample{filteredSamples.length !== 1 ? "s" : ""} found
            {stageFilterLabel && ` • Showing only ${stageFilterLabel}`}
          </div>

          {/* Selection Banner */}
          {canEdit && selectedSampleIds.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/30">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {selectedSampleIds.size} sample{selectedSampleIds.size !== 1 ? "s" : ""} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSelectedSampleIds(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {filteredSamples.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No samples found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {canEdit && (
                        <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-12">
                          <Checkbox
                            checked={
                              pagedSamples.length > 0 &&
                              pagedSamples.every((sample) => selectedSampleIds.has(sample.id))
                            }
                            onCheckedChange={toggleSelectAllOnPage}
                          />
                        </th>
                      )}
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Style Number</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Style Name</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Color</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Season</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Brand</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Division</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Category</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Stage</th>
                      <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSamples.map((sample) => (
                      <tr key={sample.id} className="border-b transition-colors hover:bg-muted/50">
                        {canEdit && (
                          <td className="h-12 px-2 align-middle" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedSampleIds.has(sample.id)}
                              onCheckedChange={() => toggleSelectSample(sample.id)}
                            />
                          </td>
                        )}
                        <td className="h-12 px-2 align-middle font-medium">{sample.style_number}</td>
                        <td className="h-12 px-2 align-middle">{sample.style_name || "-"}</td>
                        <td className="h-12 px-2 align-middle">{sample.color || "-"}</td>
                        <td className="h-12 px-2 align-middle">
                          {sample.seasons ? `${sample.seasons.code || sample.seasons.name} ${sample.seasons.year}` : "-"}
                        </td>
                        <td className="h-12 px-2 align-middle">{sample.brands?.name || "-"}</td>
                        <td className="h-12 px-2 align-middle">{sample.division || "-"}</td>
                        <td className="h-12 px-2 align-middle">{sample.product_category || "-"}</td>
                        <td className="h-12 px-2 align-middle">
                          {sample.current_status ? (
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(formatStatusDisplay(sample.current_status))}`} />
                              <Badge variant="outline" className={statusBadgeClass(formatStatusDisplay(sample.current_status))}>
                                {formatStatusDisplay(sample.current_status)}
                              </Badge>
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="h-12 px-2 align-middle">
                          {sample.current_stage ? (
                            <Badge variant="secondary">{formatStageDisplay(sample.current_stage)}</Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="h-12 px-2 align-middle text-center" data-actions>
                          <div className="inline-flex items-center justify-center gap-2 min-w-[180px]" data-actions>
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label="View"
                              type="button"
                              className="transition-transform duration-150 hover:scale-110 hover:text-blue-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                navigate(`/samples/${sample.id}`)
                              }}
                            >
                              <Eye className="h-6 w-6" />
                            </Button>
                            {canEdit && (
                              <button
                                type="button"
                                aria-label="Edit sample"
                                className="inline-flex size-6 items-center justify-center rounded-md transition-transform duration-150 hover:scale-110 hover:text-green-600"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setEditingSampleId(sample.id)
                                }}
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                aria-label="Delete sample"
                                type="button"
                                className="transition-transform duration-150 hover:scale-110 hover:text-red-600"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  openDeleteSample(sample)
                                }}
                              >
                                <Trash2 className="h-6 w-6 text-destructive" />
                              </Button>
                            )}
                            {canEditStage && (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                aria-label="Edit stage"
                                type="button"
                                className="transition-transform duration-150 hover:scale-110 hover:text-blue-600 w-12"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  navigate(`/samples/${sample.id}/stage-edit`)
                                }}
                              >
                                <ArrowRight className="h-6 w-8 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const start = (safePage - 1) * SAMPLES_PAGE_SIZE
                      const end = Math.min(start + SAMPLES_PAGE_SIZE, filteredSamples.length)
                      return `Showing ${start + 1}-${end} of ${filteredSamples.length}`
                    })()}
                  </div>
                  <Pagination className="sm:mx-0 sm:w-auto sm:justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          disabled={safePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        />
                      </PaginationItem>

                      {paginationRange(safePage, totalPages).map((token, idx) => {
                        if (token === "ellipsis") {
                          return (
                            <PaginationItem key={`e-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )
                        }
                        const n = token
                        return (
                          <PaginationItem key={n}>
                            <PaginationLink isActive={n === safePage} onClick={() => setPage(n)}>
                              {n}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      <PaginationItem>
                        <PaginationNext
                          disabled={safePage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingSampleId} onOpenChange={(open) => !open && setEditingSampleId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit sample</DialogTitle>
            <DialogDescription>
              Update the sample details. Changes are saved to the list.
            </DialogDescription>
          </DialogHeader>
          {editFormLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : lookups ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Style name</Label>
                  <Input
                    value={editFormData.style_name ?? ""}
                    onChange={(e) => setEditFormData({ ...editFormData, style_name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <Input
                    value={editFormData.color ?? ""}
                    onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    value={editFormData.qty ?? ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        qty: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">COO</Label>
                  <Input
                    value={editFormData.coo ?? ""}
                    onChange={(e) => setEditFormData({ ...editFormData, coo: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Season</Label>
                  <Select
                    value={String(editFormData.season_id ?? "")}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, season_id: Number(v) })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Season" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.seasons.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.code} {s.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Brand</Label>
                  <Select
                    value={String(editFormData.brand_id ?? "")}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, brand_id: Number(v) })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Division</Label>
                  <Select
                    value={editFormData.division || ""}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, division: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.divisions.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={editFormData.product_category || ""}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, product_category: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.product_categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sample type</Label>
                  <Select
                    value={editFormData.sample_type || ""}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, sample_type: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sample type" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.sample_types.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Current status</Label>
                  <Select
                    value={editFormData.current_status ?? "none"}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, current_status: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Clear —</SelectItem>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Current stage</Label>
                  <Select
                    value={editFormData.current_stage ?? ""}
                    onValueChange={(v) =>
                      setEditFormData({ ...editFormData, current_stage: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingSampleId(null)}
                  disabled={editSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm update</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const current = editFormData.current_stage?.trim() || null
                const next = getNextStage(current)
                const currentLabel = current ? (STAGE_LABELS[current] ?? current) : "—"
                const nextLabel = next ? (STAGE_LABELS[next] ?? next) : "—"
                const isDeliveredStep = next === STAGES.DELIVERED_CONFIRMATION
                const canConfirmDelivered = !isDeliveredStep || isDatePast(editShipmentEta)
                if (next) {
                  return (
                    <>
                      {isDeliveredStep
                        ? "Confirm delivery and mark this sample as delivered?"
                        : "Save your changes and move this sample to the next stage?"}
                      <span className="mt-2 block font-medium text-foreground">
                        Current: {currentLabel} → Next: {nextLabel}
                      </span>
                      {isDeliveredStep && !canConfirmDelivered && (
                        <span className="mt-2 block text-muted-foreground">
                          Delivery confirmation is enabled only when Package ETA in Denver is already past.
                        </span>
                      )}
                    </>
                  )
                }
                return (
                  <>
                    Save your changes without moving to a new stage?
                    <span className="mt-2 block text-muted-foreground">
                      (Already at final stage: {currentLabel})
                    </span>
                  </>
                )
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editSaving}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={editSaving}
              onClick={() => doSave(false)}
            >
              {editSaving ? "Saving..." : "Save only"}
            </Button>
            <Button
              type="button"
              disabled={
                editSaving ||
                !getNextStage(editFormData.current_stage) ||
                (getNextStage(editFormData.current_stage) === STAGES.DELIVERED_CONFIRMATION && !isDatePast(editShipmentEta))
              }
              onClick={() => doSave(true)}
            >
              {editSaving
                ? "Saving..."
                : getNextStage(editFormData.current_stage) === STAGES.DELIVERED_CONFIRMATION
                  ? "Delivered"
                  : "Save & move to next stage"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sample?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {sampleToDelete?.style_number ? `sample ${sampleToDelete.style_number}` : "this sample"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteSample} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected samples?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedSampleIds.size} selected sample{selectedSampleIds.size !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onBulkDeleteSamples} disabled={deleting || selectedSampleIds.size === 0}>
              {deleting ? "Deleting..." : "Delete Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
