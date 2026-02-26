import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { listSamples } from "@/api/samples"
import type { Sample } from "@/types/sample"
import { PackageCheck, Truck, CheckCircle2, ExternalLink, Search, X } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { formatDistanceToNow, format, differenceInDays } from "date-fns"
import { Link } from "react-router-dom"

export default function BrandMonitoringPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [inTransitSearchTerm, setInTransitSearchTerm] = useState("")
  const [inTransitBrandFilter, setInTransitBrandFilter] = useState("all")

  const [deliveredSearchTerm, setDeliveredSearchTerm] = useState("")
  const [deliveredBrandFilter, setDeliveredBrandFilter] = useState("all")
  const [deliveredStatusFilter, setDeliveredStatusFilter] = useState("all")

  const [upcomingSearchTerm, setUpcomingSearchTerm] = useState("")
  const [upcomingBrandFilter, setUpcomingBrandFilter] = useState("all")

  const loadSamples = useCallback(async () => {
    try {
      const list = await listSamples()
      setSamples(list || [])
    } catch (e) {
      console.error("Failed to load samples:", e)
      setError("Failed to load samples. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSamples()
  }, [loadSamples])

  useEffect(() => {
    const onHeaderRefresh = () => {
      setLoading(true)
      setError(null)
      loadSamples()
    }
    window.addEventListener("monitoring:refresh", onHeaderRefresh)
    return () => window.removeEventListener("monitoring:refresh", onHeaderRefresh)
  }, [loadSamples])

  const categorizedSamples = useMemo(() => {
    // In Transit - samples at SHIPMENT_TO_BRAND stage (not yet delivered)
    const inTransit = samples.filter((sample) => {
      const stage = String(sample.current_stage || "").trim().toUpperCase()
      const status = String(sample.current_status || "").trim().toLowerCase()
      return stage === "SHIPMENT_TO_BRAND" && !status.includes("deliver")
    })

    // Delivered - samples with delivered status
    const delivered = samples.filter((sample) => {
      const status = String(sample.current_status || "").trim().toLowerCase()
      return status.includes("deliver")
    })

    // Upcoming - samples at COSTING stage (next will go to shipment)
    const upcoming = samples.filter((sample) => {
      const stage = String(sample.current_stage || "").trim().toUpperCase()
      const status = String(sample.current_status || "").trim().toLowerCase()
      return stage === "COSTING" && !status.includes("deliver") && !status.includes("drop")
    })

    return { inTransit, delivered, upcoming }
  }, [samples])

  const filterOptions = useMemo(() => {
    const brands = new Set<string>()
    const statuses = new Set<string>()

    samples.forEach((sample) => {
      if (sample.brands?.name) brands.add(sample.brands.name)
      if (sample.current_status) statuses.add(sample.current_status)
    })

    return {
      brands: Array.from(brands).sort(),
      statuses: Array.from(statuses).sort(),
    }
  }, [samples])

  const filteredSamples = useMemo(() => {
    const applyFilters = (
      sampleList: Sample[],
      searchTerm: string,
      brandFilter: string,
      statusFilter: string = "all"
    ) => {
      return sampleList.filter((sample) => {
        if (searchTerm) {
          const search = searchTerm.toLowerCase()
          const matchesSearch =
            sample.style_number?.toLowerCase().includes(search) ||
            sample.style_name?.toLowerCase().includes(search)
          if (!matchesSearch) return false
        }

        if (brandFilter !== "all" && sample.brands?.name !== brandFilter) {
          return false
        }

        if (statusFilter !== "all" && sample.current_status !== statusFilter) {
          return false
        }

        return true
      })
    }

    return {
      inTransit: applyFilters(categorizedSamples.inTransit, inTransitSearchTerm, inTransitBrandFilter),
      delivered: applyFilters(categorizedSamples.delivered, deliveredSearchTerm, deliveredBrandFilter, deliveredStatusFilter),
      upcoming: applyFilters(categorizedSamples.upcoming, upcomingSearchTerm, upcomingBrandFilter),
    }
  }, [
    categorizedSamples,
    inTransitSearchTerm,
    inTransitBrandFilter,
    deliveredSearchTerm,
    deliveredBrandFilter,
    deliveredStatusFilter,
    upcomingSearchTerm,
    upcomingBrandFilter,
  ])

  if (loading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Brand Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track sample shipments, deliveries, and upcoming samples.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.inTransit.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Being shipped</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.delivered.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <PackageCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In costing</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="intransit" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="intransit" className="gap-2">
            <Truck className="h-4 w-4" />
            In Transit
            {categorizedSamples.inTransit.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                {categorizedSamples.inTransit.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Delivered
            {categorizedSamples.delivered.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {categorizedSamples.delivered.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <PackageCheck className="h-4 w-4" />
            Upcoming
            {categorizedSamples.upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {categorizedSamples.upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* In Transit Tab */}
        <TabsContent value="intransit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Samples In Transit</CardTitle>
              <CardDescription>
                Samples currently being shipped to brand
                {filteredSamples.inTransit.length !== categorizedSamples.inTransit.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.inTransit.length} of {categorizedSamples.inTransit.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by style # or name..."
                    value={inTransitSearchTerm}
                    onChange={(e) => setInTransitSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {inTransitSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setInTransitSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={inTransitBrandFilter} onValueChange={setInTransitBrandFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {filterOptions.brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(inTransitSearchTerm || inTransitBrandFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInTransitSearchTerm("")
                      setInTransitBrandFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.inTransit.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.inTransit.length === 0
                      ? "No samples in transit."
                      : "No samples match your filters."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Style Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expected Arrival</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamples.inTransit.map((sample) => {
                        const dueDate = sample.sample_due_denver ? new Date(sample.sample_due_denver) : null
                        const daysUntil = dueDate ? differenceInDays(dueDate, new Date()) : null

                        return (
                          <TableRow key={sample.id}>
                            <TableCell className="font-medium">{sample.style_number}</TableCell>
                            <TableCell>{sample.style_name || "—"}</TableCell>
                            <TableCell>{sample.brands?.name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{sample.current_status || "In Transit"}</Badge>
                            </TableCell>
                            <TableCell>
                              {dueDate ? (
                                <div className="flex flex-col">
                                  <span className="text-sm">{format(dueDate, "MMM dd, yyyy")}</span>
                                  {daysUntil !== null && (
                                    <span className="text-xs text-muted-foreground">
                                      {daysUntil > 0 ? `in ${daysUntil} days` : daysUntil === 0 ? "today" : `${Math.abs(daysUntil)} days ago`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                to={`/samples/${sample.id}`}
                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivered Tab */}
        <TabsContent value="delivered" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Samples</CardTitle>
              <CardDescription>
                Successfully delivered samples
                {filteredSamples.delivered.length !== categorizedSamples.delivered.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.delivered.length} of {categorizedSamples.delivered.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by style # or name..."
                    value={deliveredSearchTerm}
                    onChange={(e) => setDeliveredSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {deliveredSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setDeliveredSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={deliveredBrandFilter} onValueChange={setDeliveredBrandFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {filterOptions.brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={deliveredStatusFilter} onValueChange={setDeliveredStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {filterOptions.statuses.filter(s => s.toLowerCase().includes("deliver")).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(deliveredSearchTerm || deliveredBrandFilter !== "all" || deliveredStatusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeliveredSearchTerm("")
                      setDeliveredBrandFilter("all")
                      setDeliveredStatusFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.delivered.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.delivered.length === 0
                      ? "No delivered samples."
                      : "No samples match your filters."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Style Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivered Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamples.delivered.map((sample) => (
                        <TableRow key={sample.id}>
                          <TableCell className="font-medium">{sample.style_number}</TableCell>
                          <TableCell>{sample.style_name || "—"}</TableCell>
                          <TableCell>{sample.brands?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              {sample.current_status || "Delivered"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{format(new Date(sample.updated_at), "MMM dd, yyyy")}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(sample.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to={`/samples/${sample.id}`}
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Samples</CardTitle>
              <CardDescription>
                Samples in costing that will be shipped soon
                {filteredSamples.upcoming.length !== categorizedSamples.upcoming.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.upcoming.length} of {categorizedSamples.upcoming.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by style # or name..."
                    value={upcomingSearchTerm}
                    onChange={(e) => setUpcomingSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {upcomingSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setUpcomingSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={upcomingBrandFilter} onValueChange={setUpcomingBrandFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {filterOptions.brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(upcomingSearchTerm || upcomingBrandFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUpcomingSearchTerm("")
                      setUpcomingBrandFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.upcoming.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <PackageCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.upcoming.length === 0
                      ? "No upcoming samples."
                      : "No samples match your filters."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Style Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamples.upcoming.map((sample) => (
                        <TableRow key={sample.id}>
                          <TableCell className="font-medium">{sample.style_number}</TableCell>
                          <TableCell>{sample.style_name || "—"}</TableCell>
                          <TableCell>{sample.brands?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sample.current_status || "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{format(new Date(sample.updated_at), "MMM dd, yyyy")}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(sample.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to={`/samples/${sample.id}`}
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
