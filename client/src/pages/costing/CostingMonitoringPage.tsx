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
import { AlertCircle, Clock, ExternalLink, Search, X } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { formatDistanceToNow, format } from "date-fns"
import { Link } from "react-router-dom"

export default function CostingMonitoringPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states for To Enter tab
  const [toEnterSearchTerm, setToEnterSearchTerm] = useState("")
  const [toEnterBrandFilter, setToEnterBrandFilter] = useState("all")
  const [toEnterStatusFilter, setToEnterStatusFilter] = useState("all")

  // Filter states for Upcoming tab
  const [upcomingSearchTerm, setUpcomingSearchTerm] = useState("")
  const [upcomingBrandFilter, setUpcomingBrandFilter] = useState("all")
  const [upcomingStageFilter, setUpcomingStageFilter] = useState("all")

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
    // Filter out delivered/dropped samples
    const activeSamples = samples.filter((sample) => {
      const status = String(sample.current_status || "").trim().toLowerCase()
      return !status.includes("deliver") && !status.includes("drop")
    })

    // 1. Costing to Enter in NG - Samples currently at COSTING stage
    const toEnter = activeSamples.filter((sample) => {
      const stage = String(sample.current_stage || "").trim().toUpperCase()
      return stage === "COSTING"
    })

    // 2. Upcoming Costing - Samples that will reach costing (at PC_REVIEW or earlier stages)
    const upcoming = activeSamples.filter((sample) => {
      const stage = String(sample.current_stage || "").trim().toUpperCase()
      // Samples at stages before COSTING
      return ["PSI", "SAMPLE_DEVELOPMENT", "PC_REVIEW"].includes(stage)
    })

    return {
      toEnter,
      upcoming,
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
    const applyFilters = (
      sampleList: Sample[],
      searchTerm: string,
      brandFilter: string,
      stageOrStatusFilter: string,
      isStatusFilter = false
    ) => {
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
      toEnter: applyFilters(
        categorizedSamples.toEnter,
        toEnterSearchTerm,
        toEnterBrandFilter,
        toEnterStatusFilter,
        true
      ),
      upcoming: applyFilters(
        categorizedSamples.upcoming,
        upcomingSearchTerm,
        upcomingBrandFilter,
        upcomingStageFilter
      ),
    }
  }, [
    categorizedSamples,
    toEnterSearchTerm,
    toEnterBrandFilter,
    toEnterStatusFilter,
    upcomingSearchTerm,
    upcomingBrandFilter,
    upcomingStageFilter,
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Costing Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track samples requiring costing data entry and upcoming work.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">To Enter in NG</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.toEnter.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Samples at costing stage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Costing</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Samples in pipeline</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="toenter" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="toenter" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Costing to Enter in NG
            {categorizedSamples.toEnter.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100">
                {categorizedSamples.toEnter.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="h-4 w-4" />
            Upcoming Costing
            {categorizedSamples.upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {categorizedSamples.upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Costing to Enter in NG Tab */}
        <TabsContent value="toenter" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Costing to Enter in NG</CardTitle>
              <CardDescription>
                Samples currently at costing stage requiring data entry
                {filteredSamples.toEnter.length !== categorizedSamples.toEnter.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.toEnter.length} of {categorizedSamples.toEnter.length})
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
                    value={toEnterSearchTerm}
                    onChange={(e) => setToEnterSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {toEnterSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setToEnterSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={toEnterBrandFilter} onValueChange={setToEnterBrandFilter}>
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
                <Select value={toEnterStatusFilter} onValueChange={setToEnterStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {filterOptions.statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(toEnterSearchTerm || toEnterBrandFilter !== "all" || toEnterStatusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setToEnterSearchTerm("")
                      setToEnterBrandFilter("all")
                      setToEnterStatusFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.toEnter.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.toEnter.length === 0
                      ? "No samples at costing stage."
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
                      {filteredSamples.toEnter.map((sample) => (
                        <TableRow key={sample.id}>
                          <TableCell className="font-medium">{sample.style_number}</TableCell>
                          <TableCell>{sample.style_name || "—"}</TableCell>
                          <TableCell>{sample.brands?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{sample.current_status || "—"}</Badge>
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

        {/* Upcoming Costing Tab */}
        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Costing</CardTitle>
              <CardDescription>
                Samples in pipeline that will require costing work
                {filteredSamples.upcoming.length !== categorizedSamples.upcoming.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.upcoming.length} of {categorizedSamples.upcoming.length})
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

              {filteredSamples.upcoming.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.upcoming.length === 0
                      ? "No upcoming samples in pipeline."
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
                        <TableHead>Current Stage</TableHead>
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
                            <Badge variant="outline">{sample.current_stage || "No stage"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{sample.current_status || "—"}</Badge>
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
