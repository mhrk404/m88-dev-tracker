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
import { exportDeliveryPerformance, getDeliveryPerformance } from "@/api/analytics"
import { listBrands } from "@/api/brands"
import type {
  DeliveryPerformanceResponse,
  PerformanceByBrand,
  PerformanceTrendPoint,
} from "@/types/analytics"
import type { Brand } from "@/types/lookups"
import { BarChart3, Send, Loader2, CheckCircle2, Clock3, Gauge, TrendingUp, Table, Download } from "lucide-react"
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

function DeliveryStatusByBrandChart({ rows, statusFilter }: { rows: BrandRow[]; statusFilter: string }) {
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
    <div className="h-[380px] w-full rounded-lg border p-3 md:h-[440px]">
      <Bar data={filteredData} options={options} />
      <div className="mt-2 text-xs text-muted-foreground">
        Stacked by count for quick comparisons across brands.
      </div>
    </div>
  )
}

function OnTimePerformanceChart({ rows }: { rows: BrandRow[] }) {
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
    <div className="h-[360px] w-full rounded-lg border p-3 md:h-[420px]">
      <Bar data={chartData} options={options} />
      <div className="mt-2 text-xs text-muted-foreground">
        Rank brands by on-time performance.
      </div>
    </div>
  )
}

function TrendOverTimeChart({ trend, statusFilter }: { trend: PerformanceTrendPoint[]; statusFilter: string }) {
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
    <div className="h-[320px] w-full rounded-lg border p-3 md:h-[380px]">
      <Line data={chartData} options={options} />
      <div className="mt-2 text-xs text-muted-foreground">
        Track delivery performance trends over time.
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandId, setBrandId] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
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
    brandId: brandId ? Number(brandId) : undefined,
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
  }, [params.brandId])

  useEffect(() => {
    async function loadBrands() {
      try {
        const list = await listBrands()
        setBrands(list)
      } catch (e) {
        console.error("Failed to load brands:", e)
      }
    }
    loadBrands()
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
    const early = rowsWithPct.reduce((sum, row) => sum + row.early, 0)
    const onTime = rowsWithPct.reduce((sum, row) => sum + row.on_time, 0)
    const delay = rowsWithPct.reduce((sum, row) => sum + row.delay, 0)
    const total = early + onTime + delay

    return {
      total,
      efficiency: total ? (onTime / total) * 100 : 0,
      earlyPct: total ? (early / total) * 100 : 0,
      delayedPct: total ? (delay / total) * 100 : 0,
    }
  }, [rowsWithPct])

  const clearFilters = () => {
    setBrandId("")
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
        const blob = await exportDeliveryPerformance({
          brandId: brandId ? Number(brandId) : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          threshold: threshold !== "all" ? threshold : undefined,
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        const suffix = [
          brandId ? `brand-${brandId}` : "all-brands",
          statusFilter !== "all" ? `status-${statusFilter}` : null,
          threshold !== "all" ? `threshold-${threshold}` : null,
        ].filter(Boolean).join("_")
        link.download = `delivery-performance_${suffix || "all"}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } else {
        const selectedBrandName = brandId
          ? brands.find((brand) => String(brand.id) === brandId)?.name ?? `Brand ${brandId}`
          : "All brands"

        const formatRow = (label: string, value: string | number) =>
          `<tr><td style=\"padding:6px 10px;border:1px solid #ddd;\">${label}</td><td style=\"padding:6px 10px;border:1px solid #ddd;\">${value}</td></tr>`

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
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Brand</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Early</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Delayed</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRows.map((row) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.brand_name}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.early.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.on_time.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.delay.toLocaleString()}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `)
        }

        if (selectedSections.includes("onTime")) {
          sections.push(`
            <h2>On-Time Delivery Performance</h2>
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
                    <td style="padding:6px 10px;border:1px solid #ddd;">${row.brand_name}</td>
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
            <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
              <thead>
                <tr>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Period</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Early</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Delayed</th>
                </tr>
              </thead>
              <tbody>
                ${(delivery.trend ?? []).map((point) => `
                  <tr>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${point.label}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${point.early.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${point.on_time.toLocaleString()}</td>
                    <td style="padding:6px 10px;border:1px solid #ddd;">${point.delay.toLocaleString()}</td>
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
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Early</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">On-Time</th>
                  <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Delayed</th>
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
              <title>Delivery Performance Export</title>
            </head>
            <body style="font-family:Arial,sans-serif;color:#111;padding:20px;">
              <h1 style="margin:0 0 8px 0;">Delivery Performance Report</h1>
              <p style="margin:0 0 16px 0;color:#444;">Brand: ${selectedBrandName} | Status: ${statusFilter === "all" ? "All" : STATUS_LABELS[statusFilter]} | Threshold: ${threshold === "all" ? "All" : `<= ${threshold}%`}</p>
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
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setExportOpen(true)}
            disabled={!delivery || loading}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Refresh
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
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Delivery Status Breakdown by Brand
          </CardTitle>
          <CardDescription>
            Compare early, on-time, and delayed deliveries across brands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery ? (
            <DeliveryStatusByBrandChart rows={filteredRows} statusFilter={statusFilter} />
          ) : (
            !loading && <div className="text-muted-foreground py-4">No delivery data for the selected filters.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            On-Time Delivery Performance (%)
          </CardTitle>
          <CardDescription>
            Rank brands by reliability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery ? (
            <OnTimePerformanceChart rows={filteredRows} />
          ) : (
            !loading && <div className="text-muted-foreground py-4">No on-time data for the selected filters.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Over Time
          </CardTitle>
          <CardDescription>
            Delivery performance across weeks and months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery ? (
            <TrendOverTimeChart trend={delivery.trend ?? []} statusFilter={statusFilter} />
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

    </div>
  )
}
