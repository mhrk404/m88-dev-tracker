import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboard } from "@/api/analytics"
import type { DashboardStats } from "@/types/analytics"
import { Users, Package, TrendingUp, Clock, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Loading } from "@/components/ui/loading"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getDashboard()
        setStats(data)
      } catch (error) {
        console.error("Failed to load dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return <Loading fullScreen text="Loading dashboard..." />
  }

  if (!stats || !stats.submission || !stats.delivery) {
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

  return (
    <div className="space-y-6 p-6 bg-background">
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Submission Performance</CardTitle>
            <CardDescription className="text-sm">Breakdown of submission status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Early</span>
              <span className="text-sm font-semibold text-foreground">{stats.submission.early.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">On Time</span>
              <span className="text-sm font-semibold text-foreground">{stats.submission.on_time.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Delayed</span>
              <span className="text-sm font-semibold text-destructive">{stats.submission.delay.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
              <span className="text-sm font-semibold text-foreground">{stats.submission.pending.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Delivery Performance</CardTitle>
            <CardDescription className="text-sm">Breakdown of delivery status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Early</span>
              <span className="text-sm font-semibold text-foreground">{stats.delivery.early.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">On Time</span>
              <span className="text-sm font-semibold text-foreground">{stats.delivery.on_time.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Delayed</span>
              <span className="text-sm font-semibold text-destructive">{stats.delivery.delay.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
              <span className="text-sm font-semibold text-foreground">{stats.delivery.pending.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
