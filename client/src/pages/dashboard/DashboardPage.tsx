import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getDashboard, getSubmissionPerformance } from "@/api/analytics"
import { listSamples } from "@/api/samples"
import type { DashboardStats, PerformanceByBrand } from "@/types/analytics"
import type { Sample } from "@/types/sample"
import { Users, Package, TrendingUp, Clock, ArrowUp, ArrowDown, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentSamples, setRecentSamples] = useState<Sample[]>([])
  const [allSamples, setAllSamples] = useState<Sample[]>([])
  const [brandPerformance, setBrandPerformance] = useState<PerformanceByBrand[]>([])
  const [chartMode, setChartMode] = useState<"count" | "percent">("count")
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const [watchlistTitle, setWatchlistTitle] = useState("")
  const [watchlistSamples, setWatchlistSamples] = useState<Sample[]>([])

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [data, samples, submission] = await Promise.all([
          getDashboard(),
          listSamples(),
          getSubmissionPerformance(),
        ])
        setStats(data)
        setBrandPerformance(submission?.byBrand || [])
        const list = samples || []
        setAllSamples(list)
        const sorted = list
          .slice()
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 6)
        setRecentSamples(sorted)
      } catch (error) {
        console.error("Failed to load dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])


  if (loading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!stats || !stats.submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Dashboard data incomplete or failed to load</div>
      </div>
    )
  }

  const submissionTotal =
    stats.submission.early +
    stats.submission.on_time +
    stats.submission.delay +
    stats.submission.pending

  const onTimePercentage = submissionTotal > 0
    ? Math.round((stats.submission.on_time / submissionTotal) * 100)
    : 0
  const delayPercentage = submissionTotal > 0
    ? Math.round((stats.submission.delay / submissionTotal) * 100)
    : 0
  const onTimeTrend = onTimePercentage >= 70 ? "up" : "down"
  const delayTrend = delayPercentage <= 20 ? "down" : "up"

  const now = new Date()
  const dueSoon7 = new Date(now)
  dueSoon7.setDate(now.getDate() + 7)
  const greeting = (() => {
    const hour = now.getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  })()
  const displayName = user?.full_name || user?.username || "there"
  const dueSoon14 = new Date(now)
  dueSoon14.setDate(now.getDate() + 14)

  const withDueDate = allSamples.filter((s) => s.sample_due_denver)
  const overdue = withDueDate.filter((s) => new Date(s.sample_due_denver as string) < now)
  const dueIn7 = withDueDate.filter((s) => {
    const due = new Date(s.sample_due_denver as string)
    return due >= now && due <= dueSoon7
  })
  const dueIn14 = withDueDate.filter((s) => {
    const due = new Date(s.sample_due_denver as string)
    return due > dueSoon7 && due <= dueSoon14
  })

  function openWatchlist(title: string, samples: Sample[]) {
    setWatchlistTitle(title)
    setWatchlistSamples(samples)
    setWatchlistOpen(true)
  }

  const brandRows = brandPerformance
    .map((row) => {
      const total = row.total ?? row.early + row.on_time + row.delay + row.pending
      const safeTotal = total > 0 ? total : 1
      return {
        label: row.brand_name,
        total,
        early: row.early,
        onTime: row.on_time,
        delay: row.delay,
        earlyPct: Number(((row.early / safeTotal) * 100).toFixed(1)),
        onTimePct: Number(((row.on_time / safeTotal) * 100).toFixed(1)),
        delayPct: Number(((row.delay / safeTotal) * 100).toFixed(1)),
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const baseDataset = {
    borderWidth: 1,
    borderRadius: 4,
    barPercentage: 0.6,
    categoryPercentage: 0.6,
    maxBarThickness: 36,
  }

  const earlyValues = brandRows.map((row) =>
    chartMode === "percent" ? row.earlyPct : Math.round(row.early)
  )
  const onTimeValues = brandRows.map((row) =>
    chartMode === "percent" ? row.onTimePct : Math.round(row.onTime)
  )
  const delayValues = brandRows.map((row) =>
    chartMode === "percent" ? row.delayPct : Math.round(row.delay)
  )

  const datasets = [
    {
      label: "Early",
      data: earlyValues,
      backgroundColor: "rgba(16, 185, 129, 0.85)",
      borderColor: "rgba(16, 185, 129, 1)",
      ...baseDataset,
    },
    {
      label: "On Time",
      data: onTimeValues,
      backgroundColor: "rgba(59, 130, 246, 0.85)",
      borderColor: "rgba(59, 130, 246, 1)",
      ...baseDataset,
    },
    {
      label: "Delayed",
      data: delayValues,
      backgroundColor: "rgba(239, 68, 68, 0.85)",
      borderColor: "rgba(239, 68, 68, 1)",
      ...baseDataset,
    },
  ].filter((dataset) => dataset.data.some((value) => Number(value) > 0))

  const singleSeries = datasets.length === 1
  const tunedDatasets = datasets.map((dataset) => ({
    ...dataset,
    barPercentage: singleSeries ? 0.35 : dataset.barPercentage,
    categoryPercentage: singleSeries ? 0.5 : dataset.categoryPercentage,
    maxBarThickness: singleSeries ? 48 : dataset.maxBarThickness,
  }))

  const chartData = {
    labels: brandRows.map((row) => row.label),
    datasets: tunedDatasets,
  }

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 6, right: 8, bottom: 0, left: 8 } },
    plugins: {
      legend: {
        position: "top",
        align: "start",
        labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8 },
      },
      tooltip: {
        callbacks: {
          title(items) {
            return items[0]?.label || ""
          },
          label(context) {
            const value = context.parsed.y
            const suffix = chartMode === "percent" ? "%" : ""
            const displayValue = chartMode === "percent" ? value : Math.round(Number(value || 0))
            return `${context.dataset.label}: ${displayValue}${suffix}`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        offset: singleSeries,
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkip: false, padding: 6 },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        ticks: {
          callback(value) {
            if (chartMode === "percent") return `${value}%`
            return Number(value).toLocaleString()
          },
        },
      },
    },
  }

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{greeting}, {displayName}</h1>
          <p className="text-sm text-muted-foreground">Snapshot of submission flow and recent activity.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Samples</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-foreground">{submissionTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active samples in system</p>
            <p className="text-xs text-muted-foreground">Total for the last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Time Submissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{stats.submission.on_time.toLocaleString()}</div>
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                onTimeTrend === "up" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {onTimeTrend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {onTimePercentage}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {onTimeTrend === "up" ? "Trending up this period" : "Needs attention"}
            </p>
            <p className="text-xs text-muted-foreground">On-time rate for submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delayed Submissions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{stats.submission.delay.toLocaleString()}</div>
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                delayTrend === "down" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {delayTrend === "down" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                {delayPercentage}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {delayTrend === "down" ? "Down from last period" : "Up this period"}
            </p>
            <p className="text-xs text-muted-foreground">Delayed submissions count</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-foreground">{stats.submission.pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting submission</p>
            <p className="text-xs text-muted-foreground">Samples pending review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold">Brand Performance</CardTitle>
                <CardDescription className="text-sm">Grouped view of early, on-time, and delayed counts</CardDescription>
              </div>
              <div className="inline-flex items-center rounded-full border p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode("count")}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors",
                    chartMode === "count" ? "bg-foreground text-background" : "text-muted-foreground"
                  )}
                >
                  Counts
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("percent")}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors",
                    chartMode === "percent" ? "bg-foreground text-background" : "text-muted-foreground"
                  )}
                >
                  Percent
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {brandRows.length === 0 || datasets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No brand data available.</div>
            ) : (
              <div className="h-[360px] w-full">
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Due Date Watchlist</CardTitle>
            <CardDescription className="text-sm">Overdue and upcoming sample due dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              onClick={() => openWatchlist("Overdue", overdue)}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </div>
              <span className="text-sm font-semibold text-destructive">{overdue.length.toLocaleString()}</span>
            </button>
            <button
              type="button"
              onClick={() => openWatchlist("Due in 7 days", dueIn7)}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">Due in 7 days</p>
                <p className="text-xs text-muted-foreground">Next week</p>
              </div>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{dueIn7.length.toLocaleString()}</span>
            </button>
            <button
              type="button"
              onClick={() => openWatchlist("Due in 14 days", dueIn14)}
              className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">Due in 14 days</p>
                <p className="text-xs text-muted-foreground">Next two weeks</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{dueIn14.length.toLocaleString()}</span>
            </button>
            {withDueDate.length === 0 && (
              <div className="text-sm text-muted-foreground">No due dates available.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
            <CardDescription className="text-sm">Latest updates across samples</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSamples.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity found.</div>
            ) : (
              <div className="space-y-3">
                {recentSamples.map((sample) => (
                  <div key={sample.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {sample.style_number} · {sample.style_name || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sample.current_status || "Status updated"} · {sample.current_stage || "Stage"}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(sample.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={watchlistOpen} onOpenChange={setWatchlistOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{watchlistTitle}</DialogTitle>
            <DialogDescription>Samples with due dates in this category.</DialogDescription>
          </DialogHeader>
          {watchlistSamples.length === 0 ? (
            <div className="text-sm text-muted-foreground">No samples in this bucket.</div>
          ) : (
            <div className="space-y-3">
              {watchlistSamples.map((sample) => (
                <div key={sample.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sample.style_number} · {sample.style_name || "Untitled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {sample.sample_due_denver ? formatDistanceToNow(new Date(sample.sample_due_denver), { addSuffix: true }) : "date not set"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sample.current_stage || "Stage"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
