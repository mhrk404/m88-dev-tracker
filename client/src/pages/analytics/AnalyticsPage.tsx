import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getDeliveryPerformance } from "@/api/analytics"
import { listBrands } from "@/api/brands"
import { listSeasons } from "@/api/seasons"
import type {
  DeliveryPerformanceResponse,
  PerformanceByBrand,
  PerformanceTrendPoint,
} from "@/types/analytics"
import type { Brand, Season } from "@/types/lookups"
import logoUrl from "@/assets/logo.png"
import { BarChart3, Send, Loader2, CheckCircle2, Clock3, Gauge, TrendingUp, Table, Download, Maximize2, ImageDown } from "lucide-react"
import { AnalyticsSkeleton } from "@/components/ui/skeletons"
import { Link } from "react-router-dom"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { Bar, Line } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

type BrandRow = PerformanceByBrand & {
  totalCompleted: number
  onTimePct: number
  totalStyles: number
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "early", label: "Early" },
  { value: "on_time", label: "On Time" },
  { value: "delay", label: "Delayed" },
]

const THRESHOLD_OPTIONS = ["90", "80", "70", "60", "50", "40", "30"]

const MONTH_OPTIONS = [
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

const STATUS_LABELS: Record<string, string> = {
  early: "Early",
  on_time: "On Time",
  delay: "Delayed",
}

const EXPORT_SECTION_OPTIONS = [
  { key: "summary", label: "Summary KPIs" },
  { key: "brandBreakdown", label: "Delivery Status Breakdown by Brand" },
  { key: "onTime", label: "On-Time Delivery Performance" },
  { key: "trend", label: "Trend Over Time" },
  { key: "table", label: "Detailed Table" },
] as const

type ExportSectionKey = (typeof EXPORT_SECTION_OPTIONS)[number]["key"]

const formatPct = (value: number) => `${value.toFixed(1)}%`

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const escapeCsv = (value: string | number) => {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

const downloadTextFile = (content: string, fileName: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const toDataUrl = async (url: string) => {
  const response = await fetch(url)
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to read asset as data URL"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read asset as data URL"))
    reader.readAsDataURL(blob)
  })
}

const getCanvasImageData = (canvasId: string) => {
  const element = document.getElementById(canvasId)
  if (!(element instanceof HTMLCanvasElement)) return null
  return element.toDataURL("image/png", 1)
}

const colorForPercent = (value: number) => {
  const clamped = Math.min(100, Math.max(0, value)) / 100
  const r = Math.round(239 + (16 - 239) * clamped)
  const g = Math.round(68 + (185 - 68) * clamped)
  const b = Math.round(68 + (129 - 68) * clamped)
  return `rgba(${r}, ${g}, ${b}, 0.85)`
}

function SummaryKpis({
  total,
  efficiency,
  earlyPct,
  delayedPct,
}: {
  total: number
  efficiency: number
  earlyPct: number
  delayedPct: number
}) {

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 divide-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Deliveries</p>
              <p className="text-2xl font-semibold leading-none">{total.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overall On-Time</p>
              <p className="text-2xl font-semibold leading-none">{formatPct(efficiency)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Early %</p>
              <p className="text-2xl font-semibold leading-none">
                {formatPct(earlyPct)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delayed %</p>
              <p className="text-2xl font-semibold leading-none">
                {formatPct(delayedPct)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeliveryStatusByBrandChart({
  rows,
  statusFilter,
  chartId,
  heightClass = "h-[380px] md:h-[440px]",
}: {
  rows: BrandRow[]
  statusFilter: string
  chartId?: string
  heightClass?: string
}) {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No brand breakdown available for the selected filters.</div>
  }

  const chartData = {
    labels: rows.map((row) => row.brand_name),
    datasets: [
      {
        label: "Delayed",
        data: rows.map((row) => row.delay),
        backgroundColor: "rgba(239, 68, 68, 0.85)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: "Early",
        data: rows.map((row) => row.early),
        backgroundColor: "rgba(16, 185, 129, 0.85)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false as const,
      },
      {
        label: "On Time",
        data: rows.map((row) => row.on_time),
        backgroundColor: "rgba(59, 130, 246, 0.85)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  }

  const filteredDatasets = statusFilter === "all"
    ? chartData.datasets
    : chartData.datasets.filter((dataset) => dataset.label === STATUS_LABELS[statusFilter])

  const filteredData = { ...chartData, datasets: filteredDatasets }

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        callbacks: {
          title(items) {
            return items[0]?.label || ""
          },
          label(context) {
            const value = context.raw as number
            const label = context.dataset.label || ""
            return `${label}: ${value.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { maxRotation: 35, minRotation: 0 },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback(value) {
            return Number(value).toLocaleString()
          },
        },
        title: { display: true, text: "Deliveries" },
      },
    },
  }

  return (
    <div className={`w-full rounded-lg border p-3 ${heightClass}`}>
      <Bar id={chartId} data={filteredData} options={options} />
      <div className="mt-2 text-xs text-muted-foreground">
        Stacked by count for quick comparisons across brands.
      </div>
    </div>
  )
}

function OnTimePerformanceChart({
  rows,
  chartId,
  heightClass = "h-[360px] md:h-[420px]",
}: {
  rows: BrandRow[]
  chartId?: string
  heightClass?: string
}) {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No on-time performance data for the selected filters.</div>
  }

  const chartData = {
    labels: rows.map((row) => row.brand_name),
    datasets: [
      {
        label: "On-Time %",
        data: rows.map((row) => row.onTimePct),
        backgroundColor: rows.map((row) => colorForPercent(row.onTimePct)),
        borderColor: rows.map((row) => colorForPercent(row.onTimePct).replace("0.85", "1")),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(context) {
            return `On-Time: ${formatPct(context.raw as number)}`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback(value) {
            return `${value}%`
          },
        },
        title: { display: true, text: "On-Time Percentage" },
      },
      y: {
        grid: { display: false },
      },
    },
  }

  return (
    <div className={`w-full rounded-lg border p-3 ${heightClass}`}>
      <Bar id={chartId} data={chartData} options={options} />
      <div className="mt-2 text-xs text-muted-foreground">
        Rank brands by on-time performance.
      </div>
    </div>
  )
}

function TrendOverTimeChart({
  trend,
  statusFilter,
  chartId,
  heightClass = "h-[320px] md:h-[380px]",
}: {
  trend: PerformanceTrendPoint[]
  statusFilter: string
  chartId?: string
  heightClass?: string
}) {
  if (!trend.length) {
    return <div className="text-sm text-muted-foreground">No trend data available for the selected range.</div>
  }

  const datasets = [
    {
      label: "Early",
      data: trend.map((row) => row.early),
      borderColor: "rgba(16, 185, 129, 1)",
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      tension: 0.3,
    },
    {
      label: "On Time",
      data: trend.map((row) => row.on_time),
      borderColor: "rgba(59, 130, 246, 1)",
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      tension: 0.3,
    },
    {
      label: "Delayed",
      data: trend.map((row) => row.delay),
      borderColor: "rgba(239, 68, 68, 1)",
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      tension: 0.3,
    },
  ]

  const filteredDatasets = statusFilter === "all"
    ? datasets
    : datasets.filter((dataset) => dataset.label === STATUS_LABELS[statusFilter])

  const chartData = {
    labels: trend.map((row) => row.label),
    datasets: filteredDatasets,
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback(value) {
            return Number(value).toLocaleString()
          },
        },
        title: { display: true, text: "Deliveries" },
      },
    },
  }

  return (
    <div className={`w-full rounded-lg border p-3 ${heightClass}`}>
      <Line id={chartId} data={chartData} options={options} />
      <div className="mt-2 text-xs text-muted-foreground">
        Track delivery performance trends over time.
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [brandId, setBrandId] = useState<string>("")
  const [seasonId, setSeasonId] = useState<string>("all")
  const [month, setMonth] = useState<string>("all")
  const [year, setYear] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [threshold, setThreshold] = useState<string>("all")
  const [exportOpen, setExportOpen] = useState(false)
  const [exportType, setExportType] = useState<"csv" | "pdf">("pdf")
  const [selectedSections, setSelectedSections] = useState<ExportSectionKey[]>(
    EXPORT_SECTION_OPTIONS.map((section) => section.key)
  )
  const [exporting, setExporting] = useState(false)
  const [expandedChart, setExpandedChart] = useState<ExportSectionKey | null>(null)
  const [delivery, setDelivery] = useState<DeliveryPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const deliveryRes = await getDeliveryPerformance({
        brandId: brandId ? Number(brandId) : undefined,
        seasonId: seasonId !== "all" ? Number(seasonId) : undefined,
        month: month !== "all" ? Number(month) : undefined,
        year: year !== "all" ? Number(year) : undefined,
      })
      setDelivery(deliveryRes)
    } catch (e) {
      console.error("Analytics load failed:", e)
      setError("Failed to load analytics. Please try again.")
      setDelivery(null)
    } finally {
      setLoading(false)
    }
  }, [brandId, seasonId, month, year])

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
    loadBrands()
    loadSeasons()
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onExport = () => {
      if (!loading && delivery) {
        setExportOpen(true)
      }
    }
    const onRefresh = () => {
      loadData()
    }

    window.addEventListener("analytics:export", onExport)
    window.addEventListener("analytics:refresh", onRefresh)
    return () => {
      window.removeEventListener("analytics:export", onExport)
      window.removeEventListener("analytics:refresh", onRefresh)
    }
  }, [loading, delivery, loadData])

  const rowsWithPct = useMemo<BrandRow[]>(() => {
    if (!delivery?.byBrand) return []
    return delivery.byBrand.map((row) => {
      const totalCompleted = row.early + row.on_time + row.delay
      const onTimePct = totalCompleted ? Math.round((row.on_time / totalCompleted) * 1000) / 10 : 0
      const totalStyles = row.style_count ?? totalCompleted
      return {
        ...row,
        totalCompleted,
        onTimePct,
        totalStyles,
      }
    })
  }, [delivery])

  const filteredRows = useMemo(() => {
    let rows = rowsWithPct.filter((row) => row.totalCompleted > 0)
    if (statusFilter !== "all") {
      rows = rows.filter((row) => row[statusFilter as "early" | "on_time" | "delay"] > 0)
    }
    if (threshold !== "all") {
      const maxValue = Number(threshold)
      rows = rows.filter((row) => row.onTimePct <= maxValue)
    }
    return rows
  }, [rowsWithPct, statusFilter, threshold])

  const completedSummary = useMemo(() => {
    const early = filteredRows.reduce((sum, row) => sum + row.early, 0)
    const onTime = filteredRows.reduce((sum, row) => sum + row.on_time, 0)
    const delay = filteredRows.reduce((sum, row) => sum + row.delay, 0)
    const total = early + onTime + delay

    return {
      total,
      efficiency: total ? (onTime / total) * 100 : 0,
      earlyPct: total ? (early / total) * 100 : 0,
      delayedPct: total ? (delay / total) * 100 : 0,
    }
  }, [filteredRows])

  const filteredTrend = useMemo(() => {
    const trend = delivery?.trend ?? []
    if (statusFilter === "all") return trend
    return trend.filter((point) => point[statusFilter as "early" | "on_time" | "delay"] > 0)
  }, [delivery, statusFilter])

  const currentFilterSummary = useMemo(() => {
    const selectedBrandName = brandId
      ? brands.find((brand) => String(brand.id) === brandId)?.name ?? `Brand ${brandId}`
      : "All brands"
    const selectedSeason = seasonId !== "all"
      ? seasons.find((season) => String(season.id) === seasonId)
      : null
    return {
      brand: selectedBrandName,
      season: selectedSeason ? `${selectedSeason.code} ${selectedSeason.year}` : "All seasons",
      month: month === "all" ? "All months" : (MONTH_OPTIONS.find((option) => option.value === month)?.label ?? month),
      year: year === "all" ? "All years" : year,
      status: statusFilter === "all" ? "All statuses" : STATUS_LABELS[statusFilter],
      threshold: threshold === "all" ? "All performance" : `Below ${threshold}% on-time`,
      generatedAt: new Date().toLocaleString(),
    }
  }, [brandId, brands, seasonId, seasons, month, year, statusFilter, threshold])

  const statusColumns = useMemo(() => {
    if (statusFilter === "all") {
      return [
        { key: "early", label: "Early" },
        { key: "on_time", label: "On-Time" },
        { key: "delay", label: "Delayed" },
      ] as const
    }
    return [{ key: statusFilter as "early" | "on_time" | "delay", label: STATUS_LABELS[statusFilter] }] as const
  }, [statusFilter])

  const createCsvContent = useCallback(() => {
    const lines: string[] = []
    const pushRow = (values: Array<string | number>) => {
      lines.push(values.map((item) => escapeCsv(item)).join(","))
    }

    pushRow(["Delivery Performance Report"])
    pushRow(["Generated At", currentFilterSummary.generatedAt])
    pushRow(["Brand", currentFilterSummary.brand])
    pushRow(["Season", currentFilterSummary.season])
    pushRow(["Month", currentFilterSummary.month])
    pushRow(["Year", currentFilterSummary.year])
    pushRow(["Status", currentFilterSummary.status])
    pushRow(["Threshold", currentFilterSummary.threshold])
    lines.push("")

    if (selectedSections.includes("summary")) {
      pushRow(["Summary KPIs"])
      pushRow(["Metric", "Value"])
      pushRow(["Total Deliveries", completedSummary.total])
      pushRow(["Overall On-Time", formatPct(completedSummary.efficiency)])
      pushRow(["Early %", formatPct(completedSummary.earlyPct)])
      pushRow(["Delayed %", formatPct(completedSummary.delayedPct)])
      lines.push("")
    }

    if (selectedSections.includes("brandBreakdown")) {
      pushRow(["Delivery Status Breakdown by Brand"])
      pushRow(["Brand", ...statusColumns.map((column) => column.label)])
      filteredRows.forEach((row) => {
        pushRow([row.brand_name, ...statusColumns.map((column) => row[column.key])])
      })
      lines.push("")
    }

    if (selectedSections.includes("onTime")) {
      pushRow(["On-Time Delivery Performance"])
      pushRow(["Brand", "On-Time %"])
      filteredRows.forEach((row) => {
        pushRow([row.brand_name, formatPct(row.onTimePct)])
      })
      lines.push("")
    }

    if (selectedSections.includes("trend")) {
      pushRow(["Trend Over Time"])
      pushRow(["Period", ...statusColumns.map((column) => column.label)])
      filteredTrend.forEach((point) => {
        pushRow([point.label, ...statusColumns.map((column) => point[column.key])])
      })
      lines.push("")
    }

    if (selectedSections.includes("table")) {
      pushRow(["Detailed Table"])
      pushRow([
        "Brand",
        ...statusColumns.map((column) => column.label),
        "Total Styles",
        "On-Time %",
      ])
      filteredRows.forEach((row) => {
        pushRow([
          row.brand_name,
          ...statusColumns.map((column) => row[column.key]),
          row.totalStyles,
          formatPct(row.onTimePct),
        ])
      })
      lines.push("")
    }

    return lines.join("\n")
  }, [currentFilterSummary, selectedSections, completedSummary, statusColumns, filteredRows, filteredTrend])

  const exportSingleSectionCsv = useCallback((section: ExportSectionKey) => {
    const sectionRows: string[] = []
    const push = (values: Array<string | number>) => {
      sectionRows.push(values.map((item) => escapeCsv(item)).join(","))
    }

    push(["Generated At", currentFilterSummary.generatedAt])
    push(["Brand", currentFilterSummary.brand])
    push(["Season", currentFilterSummary.season])
    push(["Month", currentFilterSummary.month])
    push(["Year", currentFilterSummary.year])
    push(["Status", currentFilterSummary.status])
    push(["Threshold", currentFilterSummary.threshold])
    sectionRows.push("")

    if (section === "brandBreakdown") {
      push(["Delivery Status Breakdown by Brand"])
      push(["Brand", ...statusColumns.map((column) => column.label)])
      filteredRows.forEach((row) => push([row.brand_name, ...statusColumns.map((column) => row[column.key])]))
    }

    if (section === "onTime") {
      push(["On-Time Delivery Performance"])
      push(["Brand", "On-Time %"])
      filteredRows.forEach((row) => push([row.brand_name, formatPct(row.onTimePct)]))
    }

    if (section === "trend") {
      push(["Trend Over Time"])
      push(["Period", ...statusColumns.map((column) => column.label)])
      filteredTrend.forEach((point) => push([point.label, ...statusColumns.map((column) => point[column.key])]))
    }

    const fileName = `analytics-${section}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadTextFile(sectionRows.join("\n"), fileName, "text/csv;charset=utf-8")
  }, [currentFilterSummary, statusColumns, filteredRows, filteredTrend])

  const clearFilters = () => {
    setBrandId("")
    setSeasonId("all")
    setMonth("all")
    setYear("all")
    setStatusFilter("all")
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
        const suffix = [
          brandId ? `brand-${brandId}` : "all-brands",
          seasonId !== "all" ? `season-${seasonId}` : null,
          month !== "all" ? `month-${month}` : null,
          year !== "all" ? `year-${year}` : null,
          statusFilter !== "all" ? `status-${statusFilter}` : null,
          threshold !== "all" ? `threshold-${threshold}` : null,
        ].filter(Boolean).join("_")
        downloadTextFile(
          createCsvContent(),
          `delivery-performance_${suffix || "all"}.csv`,
          "text/csv;charset=utf-8"
        )
      } else {
        let embeddedLogoUrl = logoUrl
        try {
          embeddedLogoUrl = await toDataUrl(logoUrl)
        } catch (assetError) {
          console.error("Failed to embed logo in export:", assetError)
        }

        const brandChartImage = selectedSections.includes("brandBreakdown")
          ? getCanvasImageData("analytics-brand-chart")
          : null
        const onTimeChartImage = selectedSections.includes("onTime")
          ? getCanvasImageData("analytics-ontime-chart")
          : null
        const trendChartImage = selectedSections.includes("trend")
          ? getCanvasImageData("analytics-trend-chart")
          : null

        const formatRow = (label: string, value: string | number) =>
          `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(label)}</td><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(String(value))}</td></tr>`

        const sections: string[] = []

        if (selectedSections.includes("summary")) {
          sections.push(`
            <h2>Summary KPIs</h2>
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              ${formatRow("Total Deliveries", completedSummary.total.toLocaleString())}
              ${formatRow("Overall On-Time", formatPct(completedSummary.efficiency))}
              ${formatRow("Early %", formatPct(completedSummary.earlyPct))}
              ${formatRow("Delayed %", formatPct(completedSummary.delayedPct))}
            </table>
          `)
        }

        if (selectedSections.includes("brandBreakdown")) {
          sections.push(`
            <h2>Delivery Status Breakdown by Brand</h2>
            ${brandChartImage ? `<div style="margin:8px 0 12px 0;border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fff;"><img src="${brandChartImage}" alt="Delivery Status Breakdown by Brand" style="display:block;width:100%;height:auto;max-height:360px;object-fit:contain;" /></div>` : ""}
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Brand</th>
                  ${statusColumns.map((column) => `<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">${escapeHtml(column.label)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${filteredRows.map((row) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(row.brand_name)}</td>
                    ${statusColumns.map((column) => `<td style="padding:6px 10px;border:1px solid #ddd;">${row[column.key].toLocaleString()}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `)
        }

        if (selectedSections.includes("onTime")) {
          sections.push(`
            <h2>On-Time Delivery Performance</h2>
            ${onTimeChartImage ? `<div style="margin:8px 0 12px 0;border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fff;"><img src="${onTimeChartImage}" alt="On-Time Delivery Performance" style="display:block;width:100%;height:auto;max-height:360px;object-fit:contain;" /></div>` : ""}
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Brand</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time %</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRows.map((row) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(row.brand_name)}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${formatPct(row.onTimePct)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `)
        }

        if (selectedSections.includes("trend")) {
          sections.push(`
            <h2>Trend Over Time</h2>
            ${trendChartImage ? `<div style="margin:8px 0 12px 0;border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fff;"><img src="${trendChartImage}" alt="Trend Over Time" style="display:block;width:100%;height:auto;max-height:360px;object-fit:contain;" /></div>` : ""}
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Period</th>
                  ${statusColumns.map((column) => `<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">${escapeHtml(column.label)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${filteredTrend.map((point) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(point.label)}</td>
                    ${statusColumns.map((column) => `<td style="padding:6px 10px;border:1px solid #ddd;">${point[column.key].toLocaleString()}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `)
        }

        if (selectedSections.includes("table")) {
          sections.push(`
            <h2>Detailed Table</h2>
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Brand</th>
                  ${statusColumns.map((column) => `<th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">${escapeHtml(column.label)}</th>`).join("")}
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Total Styles</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time %</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRows.map((row) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(row.brand_name)}</td>
                    ${statusColumns.map((column) => `<td style="padding:6px 10px;border:1px solid #ddd;">${row[column.key].toLocaleString()}</td>`).join("")}
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.totalStyles.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${formatPct(row.onTimePct)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `)
        }

        const printableHtml = `
          <html>
            <head>
              <title>Delivery Performance Export</title>
              <style>
                body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
                h2 { margin: 18px 0 8px 0; font-size: 16px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
                th, td { padding: 6px 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
                thead th { background: #f8fafc; }
                .header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 16px 0; padding:0 0 12px 0; border-bottom:1px solid #e5e7eb; }
                .brand { display:flex; align-items:center; gap:12px; }
                .meta { margin: 2px 0 0 0; color:#444; font-size:12px; }
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="brand">
                  <img src="${embeddedLogoUrl}" alt="M88" style="height:40px;width:auto;object-fit:contain;display:block;" />
                  <div>
                    <h1 style="margin:0;font-size:22px;line-height:1.2;">Delivery Performance Report</h1>
                    <p class="meta">Generated: ${escapeHtml(currentFilterSummary.generatedAt)}</p>
                  </div>
                </div>
              </div>
              <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
                <tbody>
                  ${formatRow("Brand", currentFilterSummary.brand)}
                  ${formatRow("Season", currentFilterSummary.season)}
                  ${formatRow("Month", currentFilterSummary.month)}
                  ${formatRow("Year", currentFilterSummary.year)}
                  ${formatRow("Status", currentFilterSummary.status)}
                  ${formatRow("Threshold", currentFilterSummary.threshold)}
                </tbody>
              </table>
              ${sections.join("") || "<p>No sections selected.</p>"}
            </body>
          </html>
        `

        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=800")
        if (!printWindow) {
          downloadTextFile(
            printableHtml,
            `delivery-performance-report_${new Date().toISOString().slice(0, 10)}.html`,
            "text/html;charset=utf-8"
          )
        } else {
          printWindow.document.write(printableHtml)
          printWindow.document.close()
          printWindow.focus()
          printWindow.print()
        }
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={brandId || "all"} onValueChange={(v) => setBrandId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px]">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={threshold} onValueChange={setThreshold}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Performance threshold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All performance</SelectItem>
              {THRESHOLD_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  Below {value}% on-time
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger className="w-[170px]">
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {YEAR_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      {delivery ? (
        <SummaryKpis
          total={completedSummary.total}
          efficiency={completedSummary.efficiency}
          earlyPct={completedSummary.earlyPct}
          delayedPct={completedSummary.delayedPct}
        />
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Delivery Status Breakdown by Brand
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exportSingleSectionCsv("brandBreakdown")}> 
                <ImageDown className="h-4 w-4" />
                Export
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setExpandedChart("brandBreakdown")}> 
                <Maximize2 className="h-4 w-4" />
                Expand
              </Button>
            </div>
          </div>
          <CardDescription>
            Compare early, on-time, and delayed deliveries across brands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery ? (
            <DeliveryStatusByBrandChart rows={filteredRows} statusFilter={statusFilter} chartId="analytics-brand-chart" />
          ) : (
            !loading && <div className="text-muted-foreground py-4">No delivery data for the selected filters.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                On-Time Delivery Performance (%)
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exportSingleSectionCsv("onTime")}> 
                <ImageDown className="h-4 w-4" />
                Export
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setExpandedChart("onTime")}> 
                <Maximize2 className="h-4 w-4" />
                Expand
              </Button>
            </div>
          </div>
          <CardDescription>
            Rank brands by reliability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery ? (
            <OnTimePerformanceChart rows={filteredRows} chartId="analytics-ontime-chart" />
          ) : (
            !loading && <div className="text-muted-foreground py-4">No on-time data for the selected filters.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trend Over Time
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exportSingleSectionCsv("trend")}> 
                <ImageDown className="h-4 w-4" />
                Export
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setExpandedChart("trend")}> 
                <Maximize2 className="h-4 w-4" />
                Expand
              </Button>
            </div>
          </div>
          <CardDescription>
            Delivery performance across weeks and months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery ? (
            <TrendOverTimeChart trend={filteredTrend} statusFilter={statusFilter} chartId="analytics-trend-chart" />
          ) : (
            !loading && <div className="text-muted-foreground py-4">No trend data for the selected filters.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Table View
              </CardTitle>
              <CardDescription>
                Expand for detailed brand-level delivery performance.
              </CardDescription>
            </div>
            <Link
              to="/analytics/table"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
            >
              <Table className="h-4 w-4" />
              Open full table
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Show detailed table</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-2">Brand</th>
                    <th className="pb-2">Early</th>
                    <th className="pb-2">On-Time</th>
                    <th className="pb-2">Delayed</th>
                    <th className="pb-2">Total Styles</th>
                    <th className="pb-2">On-Time %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((row) => (
                    <tr key={row.brand_id} className="text-foreground">
                      <td className="py-2 font-medium">{row.brand_name}</td>
                      <td className="py-2">{row.early.toLocaleString()}</td>
                      <td className="py-2">{row.on_time.toLocaleString()}</td>
                      <td className="py-2">{row.delay.toLocaleString()}</td>
                      <td className="py-2">{row.totalStyles.toLocaleString()}</td>
                      <td className="py-2">{formatPct(row.onTimePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredRows.length ? (
                <div className="py-3 text-sm text-muted-foreground">No rows match the current filters.</div>
              ) : null}
            </div>
          </details>
        </CardContent>
      </Card>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Delivery Performance</DialogTitle>
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

      <Dialog open={expandedChart !== null} onOpenChange={(open) => !open && setExpandedChart(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {expandedChart === "brandBreakdown"
                ? "Delivery Status Breakdown by Brand"
                : expandedChart === "onTime"
                  ? "On-Time Delivery Performance (%)"
                  : "Trend Over Time"}
            </DialogTitle>
            <DialogDescription>Expanded chart view with export option.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {expandedChart === "brandBreakdown" ? (
              <DeliveryStatusByBrandChart
                rows={filteredRows}
                statusFilter={statusFilter}
                heightClass="h-[520px]"
              />
            ) : null}
            {expandedChart === "onTime" ? (
              <OnTimePerformanceChart
                rows={filteredRows}
                heightClass="h-[520px]"
              />
            ) : null}
            {expandedChart === "trend" ? (
              <TrendOverTimeChart
                trend={filteredTrend}
                statusFilter={statusFilter}
                heightClass="h-[520px]"
              />
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExpandedChart(null)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (expandedChart) exportSingleSectionCsv(expandedChart)
              }}
              disabled={!expandedChart}
            >
              <ImageDown className="h-4 w-4" />
              Export Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
