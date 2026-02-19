import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSubmissionPerformance, getDeliveryPerformance } from "@/api/analytics"
import { listBrands } from "@/api/brands"
import type {
  SubmissionPerformanceResponse,
  DeliveryPerformanceResponse,
  PerformanceSummary,
  PerformanceByBrand,
} from "@/types/analytics"
import type { Brand } from "@/types/lookups"
import { BarChart3, Send, Truck, Loader2 } from "lucide-react"
import { Loading } from "@/components/ui/loading"

const MONTHS = [
  { value: "", label: "All months" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
  })),
]

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  })),
]

function SummaryCards({ summary }: { summary: PerformanceSummary }) {
  const pct = summary.percentage

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Early</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.early.toLocaleString()}
          </div>
          {pct && <p className="text-xs text-muted-foreground">{pct.early}% of completed</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">On Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary.on_time.toLocaleString()}
          </div>
          {pct && <p className="text-xs text-muted-foreground">{pct.on_time}% of completed</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Delayed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{summary.delay.toLocaleString()}</div>
          {pct && <p className="text-xs text-muted-foreground">{pct.delay}% of completed</p>}
        </CardContent>
      </Card>
      <Card className="sm:col-span-2 md:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.pending.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Awaiting completion</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ByBrandTable({ rows }: { rows: PerformanceByBrand[] }) {
  if (!rows.length) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Brand</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Early</TableHead>
          <TableHead className="text-right">On Time</TableHead>
          <TableHead className="text-right">Delayed</TableHead>
          <TableHead className="text-right">Pending</TableHead>
          {rows.some((r) => r.percentage) && (
            <TableHead className="text-right">On time %</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={String(row.brand_id)}>
            <TableCell className="font-medium">{row.brand_name}</TableCell>
            <TableCell className="text-right">{(row.total ?? row.early + row.on_time + row.delay + row.pending).toLocaleString()}</TableCell>
            <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
              {row.early.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-blue-600 dark:text-blue-400">
              {row.on_time.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-destructive">{row.delay.toLocaleString()}</TableCell>
            <TableCell className="text-right text-amber-600 dark:text-amber-400">
              {row.pending.toLocaleString()}
            </TableCell>
            {row.percentage && (
              <TableCell className="text-right text-muted-foreground">
                {row.percentage.on_time}%
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function AnalyticsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandId, setBrandId] = useState<string>("")
  const [month, setMonth] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const [submission, setSubmission] = useState<SubmissionPerformanceResponse | null>(null)
  const [delivery, setDelivery] = useState<DeliveryPerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = {
    brandId: brandId ? Number(brandId) : undefined,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subRes, delRes] = await Promise.all([
        getSubmissionPerformance(params),
        getDeliveryPerformance(params),
      ])
      setSubmission(subRes)
      setDelivery(delRes)
    } catch (e) {
      console.error("Analytics load failed:", e)
      setError("Failed to load analytics. Please try again.")
      setSubmission(null)
      setDelivery(null)
    } finally {
      setLoading(false)
    }
  }, [params.brandId, params.month, params.year])

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

  if (loading && !submission && !delivery) {
    return <Loading fullScreen text="Loading analytics..." />
  }

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
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
          <Select value={month || "all"} onValueChange={(v) => setMonth(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTHS.filter((m) => m.value).map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year || "all"} onValueChange={(v) => setYear(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y.value || "all"} value={y.value || "all"}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submission Performance
          </CardTitle>
          <CardDescription>
            Due date vs actual send date (product_business_dev). Filter by brand, month, and year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission ? (
            <>
              <SummaryCards summary={submission.summary} />
              {submission.byBrand.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">By brand</h4>
                  <ByBrandTable rows={submission.byBrand} />
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="text-muted-foreground py-4">No submission data for the selected filters.</div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Performance
          </CardTitle>
          <CardDescription>
            Estimated vs actual arrival (shipping_tracking). Filter by brand, month, and year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {delivery ? (
            <>
              <SummaryCards summary={delivery.summary} />
              {delivery.byBrand.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">By brand</h4>
                  <ByBrandTable rows={delivery.byBrand} />
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="text-muted-foreground py-4">No delivery data for the selected filters.</div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
