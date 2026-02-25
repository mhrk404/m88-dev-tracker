import { useEffect, useState, useMemo } from "react"
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
import { AlertTriangle, Clock, CheckCircle2, ExternalLink, Search, X } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { formatDistanceToNow, format, differenceInDays } from "date-fns"
import { Link } from "react-router-dom"

export default function PBDMonitoringPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states for Missing/Delayed tab
  const [missingSearchTerm, setMissingSearchTerm] = useState("")
  const [missingBrandFilter, setMissingBrandFilter] = useState("all")
  const [missingStageFilter, setMissingStageFilter] = useState("all")

  // Filter states for Upcoming tab
  const [upcomingSearchTerm, setUpcomingSearchTerm] = useState("")
  const [upcomingBrandFilter, setUpcomingBrandFilter] = useState("all")
  const [upcomingStageFilter, setUpcomingStageFilter] = useState("all")

  // Filter states for Shipped tab
  const [shippedSearchTerm, setShippedSearchTerm] = useState("")
  const [shippedBrandFilter, setShippedBrandFilter] = useState("all")
  const [shippedStatusFilter, setShippedStatusFilter] = useState("all")

  useEffect(() => {
    async function loadSamples() {
      try {
        const list = await listSamples()
        setSamples(list || [])
      } catch (e) {
        console.error("Failed to load samples:", e)
        setError("Failed to load samples. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    loadSamples()
  }, [])

  const categorizedSamples = useMemo(() => {
    const now = new Date()
    
    // Filter out delivered/dropped samples for monitoring
    const activeSamples = samples.filter((sample) => {
      const status = String(sample.current_status || "").trim().toLowerCase()
      return !status.includes("deliver") && !status.includes("drop")
    })

    // 1. Missing Dates / Delayed to Denver Office
    const missingOrDelayed = activeSamples.filter((sample) => {
      const dueDate = sample.sample_due_denver ? new Date(sample.sample_due_denver) : null
      
      // Missing due date
      if (!dueDate) return true
      
      // Delayed (past due and not yet delivered)
      if (dueDate < now) return true
      
      return false
    })

    // 2. Upcoming Shipment (In Development / Not Shipped Yet)
    const inDevelopment = activeSamples.filter((sample) => {
      const dueDate = sample.sample_due_denver ? new Date(sample.sample_due_denver) : null
      const status = String(sample.current_status || "").trim().toLowerCase()
      
      // Has due date, not yet due, not delivered
      if (dueDate && dueDate >= now && !status.includes("deliver")) {
        return true
      }
      
      return false
    })

    // 3. Samples Shipped (delivered status)
    const shipped = samples.filter((sample) => {
      const status = String(sample.current_status || "").trim().toLowerCase()
      return status.includes("deliver")
    })

    return {
      missingOrDelayed,
      inDevelopment,
      shipped,
    }
  }, [samples])

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const brands = new Set<string>()
    const stages = new Set<string>()
    const statuses = new Set<string>()

    samples.forEach((sample) => {
      if (sample.brands?.name) brands.add(sample.brands.name)
      if (sample.current_stage) stages.add(sample.current_stage)
      if (sample.current_status) statuses.add(sample.current_status)
    })

    return {
      brands: Array.from(brands).sort(),
      stages: Array.from(stages).sort(),
      statuses: Array.from(statuses).sort(),
    }
  }, [samples])

  // Apply filters to categorized samples
  const filteredSamples = useMemo(() => {
    const applyFilters = (sampleList: Sample[], searchTerm: string, brandFilter: string, stageOrStatusFilter: string, isStatusFilter = false) => {
      return sampleList.filter((sample) => {
        // Search filter (style number or style name)
        if (searchTerm) {
          const search = searchTerm.toLowerCase()
          const matchesSearch =
            sample.style_number?.toLowerCase().includes(search) ||
            sample.style_name?.toLowerCase().includes(search)
          if (!matchesSearch) return false
        }

        // Brand filter
        if (brandFilter !== "all" && sample.brands?.name !== brandFilter) {
          return false
        }

        // Stage or Status filter
        if (stageOrStatusFilter !== "all") {
          if (isStatusFilter) {
            if (sample.current_status !== stageOrStatusFilter) return false
          } else {
            if (sample.current_stage !== stageOrStatusFilter) return false
          }
        }

        return true
      })
    }

    return {
      missingOrDelayed: applyFilters(
        categorizedSamples.missingOrDelayed,
        missingSearchTerm,
        missingBrandFilter,
        missingStageFilter
      ),
      inDevelopment: applyFilters(
        categorizedSamples.inDevelopment,
        upcomingSearchTerm,
        upcomingBrandFilter,
        upcomingStageFilter
      ),
      shipped: applyFilters(
        categorizedSamples.shipped,
        shippedSearchTerm,
        shippedBrandFilter,
        shippedStatusFilter,
        true
      ),
    }
  }, [
    categorizedSamples,
    missingSearchTerm,
    missingBrandFilter,
    missingStageFilter,
    upcomingSearchTerm,
    upcomingBrandFilter,
    upcomingStageFilter,
    shippedSearchTerm,
    shippedBrandFilter,
    shippedStatusFilter,
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">PBD Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track sample shipment status and plan upcoming deliveries.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Missing / Delayed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.missingOrDelayed.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Samples needing attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Development</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.inDevelopment.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.shipped.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="missing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="missing" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Missing / Delayed
            {categorizedSamples.missingOrDelayed.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {categorizedSamples.missingOrDelayed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="h-4 w-4" />
            Upcoming Shipment
            {categorizedSamples.inDevelopment.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {categorizedSamples.inDevelopment.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shipped" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Samples Shipped
            {categorizedSamples.shipped.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {categorizedSamples.shipped.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Missing / Delayed Tab */}
        <TabsContent value="missing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sample Shipping Missing Dates / Delayed to Denver Office</CardTitle>
              <CardDescription>
                Samples with missing due dates or past their due date
                {filteredSamples.missingOrDelayed.length !== categorizedSamples.missingOrDelayed.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.missingOrDelayed.length} of {categorizedSamples.missingOrDelayed.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by style # or name..."
                    value={missingSearchTerm}
                    onChange={(e) => setMissingSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {missingSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setMissingSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={missingBrandFilter} onValueChange={setMissingBrandFilter}>
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
                <Select value={missingStageFilter} onValueChange={setMissingStageFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {filterOptions.stages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(missingSearchTerm || missingBrandFilter !== "all" || missingStageFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMissingSearchTerm("")
                      setMissingBrandFilter("all")
                      setMissingStageFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.missingOrDelayed.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>{categorizedSamples.missingOrDelayed.length === 0 ? "No samples with missing dates or delays." : "No samples match your filters."}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Style Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Current Stage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-center">Days Overdue</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamples.missingOrDelayed.map((sample) => {
                        const dueDate = sample.sample_due_denver ? new Date(sample.sample_due_denver) : null
                        const daysOverdue = dueDate ? differenceInDays(new Date(), dueDate) : null
                        const isOverdue = daysOverdue !== null && daysOverdue > 0

                        return (
                          <TableRow key={sample.id}>
                            <TableCell className="font-medium">{sample.style_number}</TableCell>
                            <TableCell>{sample.style_name || "—"}</TableCell>
                            <TableCell>{sample.brands?.name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{sample.current_stage || "No stage"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{sample.current_status || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              {dueDate ? (
                                <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                  {format(dueDate, "MMM dd, yyyy")}
                                </span>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isOverdue ? (
                                <Badge variant="destructive">{daysOverdue} days</Badge>
                              ) : dueDate ? (
                                <span className="text-muted-foreground">—</span>
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

        {/* Upcoming Shipment Tab */}
        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sample Shipment</CardTitle>
              <CardDescription>
                Samples in development / not shipped yet
                {filteredSamples.inDevelopment.length !== categorizedSamples.inDevelopment.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.inDevelopment.length} of {categorizedSamples.inDevelopment.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
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
                <Select value={upcomingStageFilter} onValueChange={setUpcomingStageFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {filterOptions.stages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(upcomingSearchTerm || upcomingBrandFilter !== "all" || upcomingStageFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUpcomingSearchTerm("")
                      setUpcomingBrandFilter("all")
                      setUpcomingStageFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.inDevelopment.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>{categorizedSamples.inDevelopment.length === 0 ? "No samples in development." : "No samples match your filters."}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Style Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Current Stage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-center">Days Until Due</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamples.inDevelopment.map((sample) => {
                        const dueDate = sample.sample_due_denver ? new Date(sample.sample_due_denver) : null
                        const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null

                        return (
                          <TableRow key={sample.id}>
                            <TableCell className="font-medium">{sample.style_number}</TableCell>
                            <TableCell>{sample.style_name || "—"}</TableCell>
                            <TableCell>{sample.brands?.name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{sample.current_stage || "No stage"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{sample.current_status || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              {dueDate ? (
                                format(dueDate, "MMM dd, yyyy")
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {daysUntilDue !== null ? (
                                <Badge
                                  variant={daysUntilDue <= 7 ? "default" : "secondary"}
                                  className={daysUntilDue <= 7 ? "bg-amber-500 hover:bg-amber-600" : ""}
                                >
                                  {daysUntilDue} days
                                </Badge>
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

        {/* Samples Shipped Tab */}
        <TabsContent value="shipped" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Samples Shipped</CardTitle>
              <CardDescription>
                Successfully delivered samples
                {filteredSamples.shipped.length !== categorizedSamples.shipped.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.shipped.length} of {categorizedSamples.shipped.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by style # or name..."
                    value={shippedSearchTerm}
                    onChange={(e) => setShippedSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {shippedSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShippedSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={shippedBrandFilter} onValueChange={setShippedBrandFilter}>
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
                <Select value={shippedStatusFilter} onValueChange={setShippedStatusFilter}>
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
                {(shippedSearchTerm || shippedBrandFilter !== "all" || shippedStatusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShippedSearchTerm("")
                      setShippedBrandFilter("all")
                      setShippedStatusFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.shipped.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>{categorizedSamples.shipped.length === 0 ? "No shipped samples." : "No samples match your filters."}</p>
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
                      {filteredSamples.shipped.map((sample) => (
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
      </Tabs>
    </div>
  )
}
