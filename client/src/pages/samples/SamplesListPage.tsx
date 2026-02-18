import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Edit, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import { Loading } from "@/components/ui/loading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { listSamples } from "@/api/samples"
import { getLookups } from "@/api/lookups"
import { exportSamplesCsv } from "@/api/export"
import type { Sample } from "@/types/sample"
import type { Lookups } from "@/types/lookups"
import type { SampleFilters } from "@/types/sample"
import { useAuth } from "@/contexts/auth"
import { canEditSample } from "@/lib/rbac"
import type { RoleCode } from "@/lib/constants"
import { toast } from "sonner"
import { paginationRange } from "@/lib/pagination"

const SAMPLES_PAGE_SIZE = 10

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
  if (s.includes("complete") || s.includes("done") || s.includes("delivered") || s.includes("approved")) return "bg-emerald-500"
  return paletteForStatus(status).dot
}

function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return "border-muted-foreground/20 text-muted-foreground"
  const s = normalizeStatus(status)
  if (s.includes("delay") || s.includes("late") || s.includes("blocked") || s.includes("hold")) return "border-red-200 text-red-700 dark:border-red-900/40 dark:text-red-300"
  if (s.includes("pending") || s.includes("waiting") || s.includes("review")) return "border-amber-200 text-amber-700 dark:border-amber-900/40 dark:text-amber-300"
  if (s.includes("progress") || s.includes("development") || s.includes("active")) return "border-blue-200 text-blue-700 dark:border-blue-900/40 dark:text-blue-300"
  if (s.includes("complete") || s.includes("done") || s.includes("delivered") || s.includes("approved")) return "border-emerald-200 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300"
  return paletteForStatus(status).badge
}

export default function SamplesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [samples, setSamples] = useState<Sample[]>([])
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState<SampleFilters>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [filters, searchQuery, statusFilter])

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
      if (s.current_status && s.current_status.trim()) set.add(s.current_status.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [samples])

  const filteredSamples = samples.filter((sample) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !query ||
      sample.style_number?.toLowerCase().includes(query) ||
      sample.style_name?.toLowerCase().includes(query) ||
      sample.color?.toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === "all" ||
      (sample.current_status?.trim() || "") === statusFilter

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

  async function onExport() {
    try {
      setExporting(true)
      const { blob, filename } = await exportSamplesCsv({
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
    return <Loading fullScreen text="Loading samples..." />
  }

  return (
    <div className="space-y-6 p-6">
      <PageBreadcrumbs />
      <Card className="border-0 -mx-6 px-6">
        <CardHeader className="px-0 flex flex-row items-start justify-between space-y-0 gap-4">
          <div className="space-y-1.5">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter samples by various criteria</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exporting}
            className="shrink-0"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by style number, name, or color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Status">
                  {statusFilter === "all" ? (
                    <span className="text-muted-foreground">All Statuses</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(statusFilter)}`} />
                      <span>{statusFilter}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                    <span>All Statuses</span>
                  </span>
                </SelectItem>
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    {lookups.seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id.toString()}>
                        {season.name} {season.year}
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {lookups.brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.division_id?.toString() || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, division_id: value === "all" ? undefined : Number(value) })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {lookups.divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id.toString()}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Samples</CardTitle>
          <CardDescription>
            {filteredSamples.length} sample{filteredSamples.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSamples.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No samples found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style Number</TableHead>
                    <TableHead>Style Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSamples.map((sample) => (
                  <TableRow
                    key={sample.id}
                    className="cursor-pointer transition-colors hover:bg-muted/70"
                    onClick={() => navigate(`/samples/${sample.id}`)}
                  >
                    <TableCell className="font-medium">{sample.style_number}</TableCell>
                    <TableCell>{sample.style_name || "-"}</TableCell>
                    <TableCell>{sample.color || "-"}</TableCell>
                    <TableCell>
                      {sample.seasons ? `${sample.seasons.name} ${sample.seasons.year}` : "-"}
                    </TableCell>
                    <TableCell>{sample.brands?.name || "-"}</TableCell>
                    <TableCell>{sample.divisions?.name || "-"}</TableCell>
                    <TableCell>
                      {sample.current_status ? (
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(sample.current_status)}`} />
                          <Badge variant="outline" className={statusBadgeClass(sample.current_status)}>
                            {sample.current_status}
                          </Badge>
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {sample.current_stage ? (
                        <Badge variant="secondary">{sample.current_stage}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => navigate(`/samples/${sample.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => navigate(`/samples/${sample.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>

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
    </div>
  )
}
