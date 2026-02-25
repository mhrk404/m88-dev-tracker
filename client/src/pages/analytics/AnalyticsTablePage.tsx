import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { exportDeliveryPerformance, getDeliveryPerformance } from "@/api/analytics"
import { listBrands } from "@/api/brands"
import { listProductCategories } from "@/api/productCategories"
import { listSeasons } from "@/api/seasons"
import type { DeliveryPerformanceResponse, PerformanceByBrand } from "@/types/analytics"
import type { Brand, ProductCategory, Season } from "@/types/lookups"
import { Download, Loader2 } from "lucide-react"
import { AnalyticsSkeleton } from "@/components/ui/skeletons"

const THRESHOLD_OPTIONS = ["90", "80", "70", "60", "50", "40", "30"]

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

const EXPORT_SECTION_OPTIONS = [
  { key: "filters", label: "Applied Filters" },
  { key: "table", label: "Delivery Table" },
] as const

type ExportSectionKey = (typeof EXPORT_SECTION_OPTIONS)[number]["key"]

type BrandRow = PerformanceByBrand & {
  totalCompleted: number
  onTimePct: number
  totalStyles: number
}

const formatPct = (value: number) => `${value.toFixed(1)}%`

const onTimePercentFor = (row: PerformanceByBrand) => {
  const completed = row.early + row.on_time + row.delay
  return completed ? Math.round((row.on_time / completed) * 1000) / 10 : 0
}


export default function AnalyticsTablePage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [brandId, setBrandId] = useState<string>("all")
  const [category, setCategory] = useState<string>("all")
  const [seasonId, setSeasonId] = useState<string>("all")
  const [month, setMonth] = useState<string>("all")
  const [year, setYear] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [threshold, setThreshold] = useState<string>("all")
  const [exportOpen, setExportOpen] = useState(false)
  const [exportType, setExportType] = useState<"csv" | "pdf">("pdf")
  const [selectedSections, setSelectedSections] = useState<ExportSectionKey[]>(
    EXPORT_SECTION_OPTIONS.map((section) => section.key)
  )
  const [exporting, setExporting] = useState(false)
  const [delivery, setDelivery] = useState<DeliveryPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = {
    brandId: brandId !== "all" ? Number(brandId) : undefined,
    productCategory: category !== "all" ? category : undefined,
    seasonId: seasonId !== "all" ? Number(seasonId) : undefined,
    month: month !== "all" ? Number(month) : undefined,
    year: year !== "all" ? Number(year) : undefined,
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const deliveryRes = await getDeliveryPerformance(params)
      setDelivery(deliveryRes)
    } catch (e) {
      console.error("Analytics load failed:", e)
      setError("Failed to load analytics. Please try again.")
      setDelivery(null)
    } finally {
      setLoading(false)
    }
  }, [params.brandId, params.productCategory, params.seasonId, params.month, params.year])

  useEffect(() => {
    async function loadBrands() {
      try {
        const list = await listBrands()
        setBrands(list)
      } catch (e) {
        console.error("Failed to load brands:", e)
      }
    }
    async function loadSeasons() {
      try {
        const list = await listSeasons()
        setSeasons(list)
      } catch (e) {
        console.error("Failed to load seasons:", e)
      }
    }
    async function loadCategories() {
      try {
        const list = await listProductCategories()
        setCategories(list)
      } catch (e) {
        console.error("Failed to load product categories:", e)
      }
    }
    loadBrands()
    loadSeasons()
    loadCategories()
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rowsWithPct = useMemo<BrandRow[]>(() => {
    if (!delivery?.byBrand) return []
    return delivery.byBrand.map((row) => {
      const totalCompleted = row.early + row.on_time + row.delay
      const totalStyles = row.style_count ?? totalCompleted
      return {
        ...row,
        totalCompleted,
        onTimePct: onTimePercentFor(row),
        totalStyles,
      }
    })
  }, [delivery])

  const filteredRows = useMemo(() => {
    let rows = rowsWithPct
    if (threshold !== "all") {
      const maxValue = Number(threshold)
      rows = rows.filter((row) => row.onTimePct <= maxValue)
    }
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase()
      rows = rows.filter((row) => row.brand_name.toLowerCase().includes(query))
    }
    return rows
  }, [rowsWithPct, threshold, searchTerm])

  const clearFilters = () => {
    setBrandId("all")
    setCategory("all")
    setSeasonId("all")
    setMonth("all")
    setYear("all")
    setSearchTerm("")
    setThreshold("all")
  }

  const toggleExportSection = (section: ExportSectionKey) => {
    setSelectedSections((prev) =>
      prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]
    )
  }

  const handleExport = async () => {
    if (!delivery || selectedSections.length === 0) return

    setExporting(true)
    try {
      if (exportType === "csv") {
        const blob = await exportDeliveryPerformance({
          ...params,
          threshold,
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        const suffix = [
          brandId !== "all" ? `brand-${brandId}` : "all-brands",
          category !== "all" ? `category-${category}` : null,
          seasonId !== "all" ? `season-${seasonId}` : null,
          month !== "all" ? `month-${month}` : null,
          year !== "all" ? `year-${year}` : null,
        ].filter(Boolean).join("_")
        link.download = `delivery-table_${suffix || "all"}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } else {
        const selectedBrandName = brandId !== "all"
          ? brands.find((brand) => String(brand.id) === brandId)?.name ?? `Brand ${brandId}`
          : "All brands"
        const selectedSeasonName = seasonId !== "all"
          ? seasons.find((season) => String(season.id) === seasonId)
          : null

        const sections: string[] = []

        if (selectedSections.includes("filters")) {
          sections.push(`
            <h2>Applied Filters</h2>
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <tbody>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Brand</td><td style="padding:6px 10px;border:1px solid #ddd;">${selectedBrandName}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Category</td><td style="padding:6px 10px;border:1px solid #ddd;">${category === "all" ? "All categories" : category}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Season</td><td style="padding:6px 10px;border:1px solid #ddd;">${selectedSeasonName ? `${selectedSeasonName.code} ${selectedSeasonName.year}` : "All seasons"}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Month</td><td style="padding:6px 10px;border:1px solid #ddd;">${month === "all" ? "All months" : (MONTHS.find((item) => item.value === month)?.label ?? month)}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Year</td><td style="padding:6px 10px;border:1px solid #ddd;">${year === "all" ? "All years" : year}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Threshold</td><td style="padding:6px 10px;border:1px solid #ddd;">${threshold === "all" ? "All performance" : `Below ${threshold}% on-time`}</td></tr>
                <tr><td style="padding:6px 10px;border:1px solid #ddd;">Search</td><td style="padding:6px 10px;border:1px solid #ddd;">${searchTerm.trim() || "None"}</td></tr>
              </tbody>
            </table>
          `)
        }

        if (selectedSections.includes("table")) {
          sections.push(`
            <h2>Delivery Table</h2>
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Brand</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Early</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Delayed</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Processing Samples</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Total Deliveries</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Total Styles</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time %</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRows.map((row) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.brand_name}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.early.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.on_time.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.delay.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.pending.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.totalCompleted.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.totalStyles.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${formatPct(row.onTimePct)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `)
        }

        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=800")
        if (!printWindow) {
          throw new Error("Unable to open print window")
        }

        printWindow.document.write(`
          <html>
            <head>
              <title>Delivery Table Export</title>
            </head>
            <body style="font-family:Arial,sans-serif;color:#111;padding:20px;">
              <h1 style="margin:0 0 8px 0;">Delivery Table Report</h1>
              ${sections.join("") || "<p>No sections selected.</p>"}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }

      setExportOpen(false)
    } catch (e) {
      console.error("Export failed:", e)
      setError("Failed to export. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  if (loading && !delivery) {
    return (
      <div className="p-6">
        <AnalyticsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to="/analytics"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-lg font-black leading-none text-foreground hover:bg-accent"
            >
              &larr;
            </Link>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/analytics">Analytics</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Table View</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setExportOpen(true)}
            disabled={!delivery || loading}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* Filters */}
          {rowsWithPct.length > 0 && (
            <div className="mb-6 border-b pb-6 flex justify-between items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filter tasks..."
                className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={seasonId} onValueChange={setSeasonId}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All seasons</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={String(season.id)}>
                        {season.code} {season.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-9 w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {YEAR_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={threshold} onValueChange={setThreshold}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Threshold" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All performance</SelectItem>
                    {THRESHOLD_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        Below {value}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={loading}
                  className="h-9"
                >
                  Clear filters
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => loadData()}
                  disabled={loading}
                  className="h-9"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Brand</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Early</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">On-Time</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Delayed</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Processing Samples</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Total Deliveries</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Total Styles</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">On-Time %</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.brand_id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="h-12 px-2 align-middle font-medium">{row.brand_name}</td>
                    <td className="h-12 px-2 align-middle">{row.early.toLocaleString()}</td>
                    <td className="h-12 px-2 align-middle">{row.on_time.toLocaleString()}</td>
                    <td className="h-12 px-2 align-middle">{row.delay.toLocaleString()}</td>
                    <td className="h-12 px-2 align-middle">{row.pending.toLocaleString()}</td>
                    <td className="h-12 px-2 align-middle">{row.totalCompleted.toLocaleString()}</td>
                    <td className="h-12 px-2 align-middle">{row.totalStyles.toLocaleString()}</td>
                    <td className="h-12 px-2 align-middle">{formatPct(row.onTimePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredRows.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No rows match the current filters.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Delivery Table</DialogTitle>
            <DialogDescription>Select file type and choose what to include.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">File type</Label>
              <Select value={exportType} onValueChange={(value) => setExportType(value as "csv" | "pdf") }>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Checklist: what to export</Label>
              <div className="space-y-2 rounded-md border p-3">
                {EXPORT_SECTION_OPTIONS.map((section) => (
                  <div key={section.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`export-section-${section.key}`}
                      checked={selectedSections.includes(section.key)}
                      onCheckedChange={() => toggleExportSection(section.key)}
                    />
                    <Label htmlFor={`export-section-${section.key}`} className="text-sm font-normal">
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExportOpen(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={exporting || selectedSections.length === 0 || !delivery}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
