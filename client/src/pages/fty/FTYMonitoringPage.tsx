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
import { Factory, Clock, ExternalLink, Search, X } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { formatDistanceToNow, format } from "date-fns"
import { Link } from "react-router-dom"

export default function FTYMonitoringPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [currentSearchTerm, setCurrentSearchTerm] = useState("")
  const [currentBrandFilter, setCurrentBrandFilter] = useState("all")
  const [currentStatusFilter, setCurrentStatusFilter] = useState("all")

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
    const activeSamples = samples.filter((sample) => {
      const status = String(sample.current_status || "").trim().toLowerCase()
      return !status.includes("deliver") && !status.includes("drop")
    })

    // Current - samples at SAMPLE_DEVELOPMENT stage
    const current = activeSamples.filter((sample) => {
      const stage = String(sample.current_stage || "").trim().toUpperCase()
      return stage === "SAMPLE_DEVELOPMENT"
    })

    // Upcoming - samples at PSI stage (will come to factory next)
    const upcoming = activeSamples.filter((sample) => {
      const stage = String(sample.current_stage || "").trim().toUpperCase()
      return stage === "PSI"
    })

    return { current, upcoming }
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
      current: applyFilters(categorizedSamples.current, currentSearchTerm, currentBrandFilter, currentStatusFilter),
      upcoming: applyFilters(categorizedSamples.upcoming, upcomingSearchTerm, upcomingBrandFilter),
    }
  }, [
    categorizedSamples,
    currentSearchTerm,
    currentBrandFilter,
    currentStatusFilter,
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Factory Monitoring</h1>
          <p className="text-sm text-muted-foreground">Track samples in development and upcoming production.</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">In Development</CardTitle>
            <Factory className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.current.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Samples in production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Orders</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{categorizedSamples.upcoming.length}</div>
            <p className="text-xs text-muted-foreground mt-1">From PSI stage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current" className="gap-2">
            <Factory className="h-4 w-4" />
            In Development
            {categorizedSamples.current.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100">
                {categorizedSamples.current.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="h-4 w-4" />
            Upcoming Orders
            {categorizedSamples.upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {categorizedSamples.upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* In Development Tab */}
        <TabsContent value="current" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Samples In Development</CardTitle>
              <CardDescription>
                Samples currently in production at factory
                {filteredSamples.current.length !== categorizedSamples.current.length && (
                  <span className="ml-2 font-medium text-foreground">
                    (Showing {filteredSamples.current.length} of {categorizedSamples.current.length})
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
                    value={currentSearchTerm}
                    onChange={(e) => setCurrentSearchTerm(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {currentSearchTerm && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setCurrentSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={currentBrandFilter} onValueChange={setCurrentBrandFilter}>
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
                <Select value={currentStatusFilter} onValueChange={setCurrentStatusFilter}>
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
                {(currentSearchTerm || currentBrandFilter !== "all" || currentStatusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentSearchTerm("")
                      setCurrentBrandFilter("all")
                      setCurrentStatusFilter("all")
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {filteredSamples.current.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <Factory className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.current.length === 0
                      ? "No samples in development."
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
                      {filteredSamples.current.map((sample) => (
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

        {/* Upcoming Orders Tab */}
        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Orders</CardTitle>
              <CardDescription>
                Samples at PSI stage that will move to production
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
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>
                    {categorizedSamples.upcoming.length === 0
                      ? "No upcoming orders."
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
