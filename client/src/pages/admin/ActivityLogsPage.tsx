import { useEffect, useState } from "react"
import { Loader2, SlidersHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import RoleGate from "@/components/protected/RoleGate"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { ROLES } from "@/lib/constants"
import { getAllActivityLogs, type AuditLog } from "@/api/audit"
import { paginationRange } from "@/lib/pagination"

const PAGE_SIZE = 50

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchFilter, setSearchFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [resourceFilter, setResourceFilter] = useState("")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [sortBy, setSortBy] = useState("timestamp")
  const [sortDir, setSortDir] = useState("desc")
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchFilter, actionFilter, resourceFilter, userIdFilter, dateStart, dateEnd, sortBy, sortDir])

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true)
        const offset = (currentPage - 1) * PAGE_SIZE
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset,
          sortBy,
          sortDir,
        }
        if (actionFilter) params.action = actionFilter
        if (resourceFilter) params.resource = resourceFilter
        if (userIdFilter) params.user_id = userIdFilter
        if (dateStart) params.start = dateStart
        if (dateEnd) params.end = dateEnd
        const data = await getAllActivityLogs(params)
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load activity logs"
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [currentPage, actionFilter, resourceFilter, userIdFilter, dateStart, dateEnd, sortBy, sortDir])

  const filteredLogs = logs.filter((log) => {
    if (!searchFilter) return true
    const searchLower = searchFilter.toLowerCase()
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource.toLowerCase().includes(searchLower) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
    )
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const hasActiveFilters =
    searchFilter.trim().length > 0 ||
    actionFilter.trim().length > 0 ||
    resourceFilter.trim().length > 0 ||
    userIdFilter.trim().length > 0 ||
    dateStart.length > 0 ||
    dateEnd.length > 0 ||
    sortBy !== "timestamp" ||
    sortDir !== "desc"

  function clearAllFilters() {
    setSearchFilter("")
    setActionFilter("")
    setResourceFilter("")
    setUserIdFilter("")
    setDateStart("")
    setDateEnd("")
    setSortBy("timestamp")
    setSortDir("desc")
    setCurrentPage(1)
  }

  function resetPanelFilters() {
    setActionFilter("")
    setResourceFilter("")
    setUserIdFilter("")
    setDateStart("")
    setDateEnd("")
    setSortBy("timestamp")
    setSortDir("desc")
    setCurrentPage(1)
  }

  const getActionColor = (action: string) => {
    if (action.includes("login")) return "bg-blue-500/20 text-blue-700 dark:text-blue-400"
    if (action.includes("create") || action === "insert") return "bg-green-500/20 text-green-700 dark:text-green-400"
    if (action.includes("update")) return "bg-amber-500/20 text-amber-700 dark:text-amber-400"
    if (action.includes("delete")) return "bg-red-500/20 text-red-700 dark:text-red-400"
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400"
  }

  return (
    <RoleGate allowedRoles={[ROLES.SUPER_ADMIN]}>
      <div className="space-y-4 p-4">
        <PageBreadcrumbs />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter & Sort Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-b pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search action, resource, details..."
                  value={searchFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchFilter(e.target.value)}
                  className="h-9 w-full sm:w-[320px]"
                />
                <div className="text-sm text-muted-foreground">
                  {hasActiveFilters ? "Filters applied" : "No active filters"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  disabled={!hasActiveFilters}
                  className="h-9"
                >
                  Clear filters
                </Button>
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-9">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[360px] p-0">
                    <div className="border-b px-4 py-3">
                      <h3 className="text-sm font-semibold">Filter</h3>
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Action</Label>
                        <Input
                          placeholder="Action"
                          value={actionFilter}
                          onChange={(e) => setActionFilter(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Resource</Label>
                        <Input
                          placeholder="Resource"
                          value={resourceFilter}
                          onChange={(e) => setResourceFilter(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">User ID</Label>
                        <Input
                          placeholder="User ID"
                          value={userIdFilter}
                          onChange={(e) => setUserIdFilter(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Start date</Label>
                        <Input
                          type="date"
                          value={dateStart}
                          onChange={(e) => setDateStart(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">End date</Label>
                        <Input
                          type="date"
                          value={dateEnd}
                          onChange={(e) => setDateEnd(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Sort by</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="timestamp">Date/Time</SelectItem>
                            <SelectItem value="action">Action</SelectItem>
                            <SelectItem value="resource">Resource</SelectItem>
                            <SelectItem value="user_id">User ID</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Sort direction</Label>
                        <Select value={sortDir} onValueChange={setSortDir}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Sort direction" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Descending</SelectItem>
                            <SelectItem value="asc">Ascending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <Button type="button" variant="outline" size="sm" onClick={resetPanelFilters}>
                        Reset all
                      </Button>
                      <Button type="button" size="sm" onClick={() => setFilterOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8 flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading activity logs...</span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-red-500">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <span className="text-xs text-muted-foreground">Total: {total.toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">Date/Time</TableHead>
                        <TableHead className="h-9 text-xs">User ID</TableHead>
                        <TableHead className="h-9 text-xs">Action</TableHead>
                        <TableHead className="h-9 text-xs">Resource</TableHead>
                        <TableHead className="h-9 text-xs">Resource ID</TableHead>
                        <TableHead className="h-9 text-xs">Details</TableHead>
                        <TableHead className="h-9 text-xs">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id} className="text-xs">
                            <TableCell className="py-2 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2">{log.user_id || "-"}</TableCell>
                            <TableCell className="py-2">
                              <Badge className={`text-xs font-semibold ${getActionColor(log.action)}`}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 font-medium">{log.resource}</TableCell>
                            <TableCell className="py-2 text-muted-foreground">{log.resource_id || "-"}</TableCell>
                            <TableCell className="py-2">
                              {log.details ? (
                                <details className="cursor-pointer">
                                  <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                                    View details
                                  </summary>
                                  <pre className="mt-2 bg-muted p-2 rounded text-[10px] overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground">{log.ip || "-"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            No activity logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}

                    {paginationRange(currentPage, totalPages).map((page, idx) => {
                      if (typeof page === "string" && page === "ellipsis") {
                        return (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <span className="text-muted-foreground">...</span>
                          </PaginationItem>
                        )
                      }
                      return (
                        <PaginationItem key={typeof page === "number" ? page : idx}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page as number)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}

                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGate>
  )
}
