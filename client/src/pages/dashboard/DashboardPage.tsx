import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getDashboard } from "@/api/analytics"
import { listSamples } from "@/api/samples"
import type { DashboardStats } from "@/types/analytics"
import type { Sample } from "@/types/sample"
import { Users, Package, TrendingUp, Clock, ArrowUp, ArrowDown, Activity, Truck, Calculator, FileText, Factory, ClipboardCheck, PackageCheck, ArrowRight, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth"
import { buttonVariants } from "@/components/ui/button"
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
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const [watchlistTitle, setWatchlistTitle] = useState("")
  const [watchlistSamples, setWatchlistSamples] = useState<Sample[]>([])

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [data, samples] = await Promise.all([
          getDashboard(),
          listSamples(),
        ])
        setStats(data)
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

  const userRole = user?.roleCode
  const isPBD = userRole === "PBD"
  const isCosting = userRole === "COSTING"
  const isTD = userRole === "TD"
  const isFTY = userRole === "FTY"
  const isMD = userRole === "MD"
  const isBRAND = userRole === "BRAND"
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"

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
  const earlyPercentage = submissionTotal > 0
    ? Math.round((stats.submission.early / submissionTotal) * 100)
    : 0
  const onTimeTrend = onTimePercentage >= 70 ? "up" : "down"
  const delayTrend = delayPercentage <= 20 ? "down" : "up"
  const earlyTrend = earlyPercentage >= 10 ? "up" : "down"

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

  const deliveredSamples = allSamples.filter((sample) =>
    String(sample.current_status || "").trim().toLowerCase().includes("deliver")
  )
  const processingSamples = allSamples.filter((sample) => !String(sample.current_status || "").trim().toLowerCase().includes("deliver"))

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

  // Role-specific calculations
  // PBD - Shipment tracking
  const samplesAtShipment = allSamples.filter(s => s.current_stage === "SHIPMENT_TO_BRAND")
  const missingDates = samplesAtShipment.filter(s => !s.sample_due_denver)
  const delayedShipments = samplesAtShipment.filter(s => 
    s.sample_due_denver && new Date(s.sample_due_denver) < now
  )
  const upcomingShipments = samplesAtShipment.filter(s => 
    s.sample_due_denver && new Date(s.sample_due_denver) >= now
  )
  const shippedSamples = deliveredSamples

  // COSTING - Costing workflow
  const samplesAtCosting = allSamples.filter(s => s.current_stage === "COSTING")
  const upcomingCosting = allSamples.filter(s => 
    s.current_stage === "PC_REVIEW" || s.current_stage === "SAMPLE_DEVELOPMENT"
  )

  // TD - PSI work
  const samplesAtPSI = allSamples.filter(s => s.current_stage === "PSI")
  const upcomingPSI = allSamples.filter(s => !s.current_stage || s.current_stage === "")

  // FTY - Factory development
  const samplesInDevelopment = allSamples.filter(s => s.current_stage === "SAMPLE_DEVELOPMENT")
  const upcomingFactory = allSamples.filter(s => s.current_stage === "PSI")

  // MD - PC Review
  const samplesAtPCReview = allSamples.filter(s => s.current_stage === "PC_REVIEW")
  const upcomingReview = allSamples.filter(s => s.current_stage === "SAMPLE_DEVELOPMENT")

  // BRAND - Deliveries
  const samplesInTransit = allSamples.filter(s => s.current_stage === "SHIPMENT_TO_BRAND")
  const samplesDelivered = deliveredSamples
  const upcomingBrand = allSamples.filter(s => s.current_stage === "COSTING")

  function openWatchlist(title: string, samples: Sample[]) {
    setWatchlistTitle(title)
    setWatchlistSamples(samples)
    setWatchlistOpen(true)
  }

  const brandRows = deliveredSamples
    .reduce((acc, sample) => {
      const brandName = sample.brands?.name?.trim() || "Unknown Brand"
      acc.set(brandName, (acc.get(brandName) || 0) + 1)
      return acc
    }, new Map<string, number>())
  const deliveredBrandRows = Array.from(brandRows.entries())
    .map(([label, delivered]) => ({
      label,
      delivered,
      total: delivered,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const baseDataset = {
    borderWidth: 1,
    borderRadius: 4,
    barPercentage: 0.6,
    categoryPercentage: 0.6,
    maxBarThickness: 36,
  }

  const deliveredValues = deliveredBrandRows.map((row) => Math.round(row.delivered))

  const datasets = [
    {
      label: "Delivered",
      data: deliveredValues,
      backgroundColor: "rgba(16, 185, 129, 0.85)",
      borderColor: "rgba(16, 185, 129, 1)",
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
    labels: deliveredBrandRows.map((row) => row.label),
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
            const suffix = ""
            const displayValue = Math.round(Number(value || 0))
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
          <p className="text-sm text-muted-foreground">
            {isPBD && "Track sample shipments and delivery schedules"}
            {isCosting && "Monitor costing data entry workflow"}
            {isTD && "Manage PSI submissions and technical design work"}
            {isFTY && "Track factory sample development"}
            {isMD && "Review samples at PC Review stage"}
            {isBRAND && "Monitor sample deliveries and shipments"}
            {isAdmin && "Overview of all system activity"}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live
        </div>
      </div>

      {/* PBD Dashboard */}
      {isPBD && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Missing Dates</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{missingDates.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">At shipment stage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delayed</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{delayedShipments.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
                <Truck className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{upcomingShipments.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Ready to ship</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{shippedSamples.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shipment Monitoring</CardTitle>
                  <CardDescription>Quick access to your monitoring dashboard</CardDescription>
                </div>
                <Link to="/pbd/monitoring" className={buttonVariants({ variant: "default" })}>
                  View Full Monitoring <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Missing/Delayed Shipments</p>
                      <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{missingDates.length + delayedShipments.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Upcoming Shipments</p>
                      <p className="text-xs text-muted-foreground">Scheduled for dispatch</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{upcomingShipments.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* COSTING Dashboard */}
      {isCosting && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">To Enter in NG</CardTitle>
                <Calculator className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{samplesAtCosting.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">At costing stage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Work</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{upcomingCosting.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In earlier stages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{deliveredSamples.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Completed samples</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Costing Monitoring</CardTitle>
                  <CardDescription>Track costing data entry workflow</CardDescription>
                </div>
                <Link to="/costing/monitoring" className={buttonVariants({ variant: "default" })}>
                  View Full Monitoring <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Awaiting Costing Data</p>
                      <p className="text-xs text-muted-foreground">Ready for entry in NG</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{samplesAtCosting.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Upcoming Costing</p>
                      <p className="text-xs text-muted-foreground">In development pipeline</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{upcomingCosting.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* TD Dashboard */}
      {isTD && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current PSI Work</CardTitle>
                <FileText className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{samplesAtPSI.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">At PSI stage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Work</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{upcomingPSI.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">New submissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{deliveredSamples.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Delivered samples</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>TD Monitoring</CardTitle>
                  <CardDescription>Track PSI submissions and technical design work</CardDescription>
                </div>
                <Link to="/td/monitoring" className={buttonVariants({ variant: "default" })}>
                  View Full Monitoring <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Active PSI Work</p>
                      <p className="text-xs text-muted-foreground">Samples at PSI stage</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{samplesAtPSI.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">New Submissions</p>
                      <p className="text-xs text-muted-foreground">Awaiting PSI start</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{upcomingPSI.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* FTY Dashboard */}
      {isFTY && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Development</CardTitle>
                <Factory className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{samplesInDevelopment.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Active production</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Orders</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{upcomingFactory.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From PSI stage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{deliveredSamples.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Delivered samples</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Factory Monitoring</CardTitle>
                  <CardDescription>Track sample development and production</CardDescription>
                </div>
                <Link to="/fty/monitoring" className={buttonVariants({ variant: "default" })}>
                  View Full Monitoring <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Factory className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">In Production</p>
                      <p className="text-xs text-muted-foreground">Active sample development</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{samplesInDevelopment.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Upcoming Orders</p>
                      <p className="text-xs text-muted-foreground">Ready for production</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{upcomingFactory.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* MD Dashboard */}
      {isMD && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">For PC Review</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{samplesAtPCReview.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Review</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{upcomingReview.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In development</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{deliveredSamples.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Delivered samples</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>MD Monitoring</CardTitle>
                  <CardDescription>Track PC review workflow</CardDescription>
                </div>
                <Link to="/md/monitoring" className={buttonVariants({ variant: "default" })}>
                  View Full Monitoring <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Awaiting PC Review</p>
                      <p className="text-xs text-muted-foreground">Ready for review</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{samplesAtPCReview.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">In Development</p>
                      <p className="text-xs text-muted-foreground">Upcoming for review</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{upcomingReview.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* BRAND Dashboard */}
      {isBRAND && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
                <Truck className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{samplesInTransit.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Being shipped</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{samplesDelivered.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{upcomingBrand.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In costing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{allSamples.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All samples</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Brand Monitoring</CardTitle>
                  <CardDescription>Track sample shipments and deliveries</CardDescription>
                </div>
                <Link to="/brand/monitoring" className={buttonVariants({ variant: "default" })}>
                  View Full Monitoring <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">In Transit</p>
                      <p className="text-xs text-muted-foreground">Currently being shipped</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{samplesInTransit.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <PackageCheck className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Delivered</p>
                      <p className="text-xs text-muted-foreground">Successfully received</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold">{samplesDelivered.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ADMIN Dashboard */}
      {isAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Samples</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold text-foreground">{submissionTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Delivered samples in system</p>
                <p className="text-xs text-muted-foreground">Analytics focused on Delivered status</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Early Submissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">{stats.submission.early.toLocaleString()}</div>
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                earlyTrend === "up" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {earlyTrend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {earlyPercentage}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Early delivery count</p>
            <p className="text-xs text-muted-foreground">Delivered before due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing Samples</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold text-foreground">{processingSamples.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Not yet delivered</p>
            <p className="text-xs text-muted-foreground">Processing samples count</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold">Brand Performance</CardTitle>
                <CardDescription className="text-sm">Delivered sample count by brand</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {deliveredBrandRows.length === 0 || datasets.length === 0 ? (
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
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
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
        </>
      )}

      {/* Common Section - Recent Activities (shown to non-admin roles) */}
      {!isAdmin && (
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
              <CardDescription className="text-sm">Latest updates across samples</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentSamples.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent activity found.</div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
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
      )}

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
