import { useEffect, useMemo, useState, Fragment } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { TableSkeleton } from "@/components/ui/skeletons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import RoleGate from "@/components/protected/RoleGate"
import { ROLES } from "@/lib/constants"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth"
import { listBrands, createBrand, updateBrand, deleteBrand } from "@/api/brands"
import { listSeasons, createSeason, updateSeason, deleteSeason } from "@/api/seasons"
import {
  listDivisions,
  createDivision,
  updateDivision,
  deleteDivision,
} from "@/api/divisions"
import {
  listProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from "@/api/productCategories"
import {
  listSampleTypes,
  createSampleType,
  updateSampleType,
  deleteSampleType,
} from "@/api/sampleTypes"
import { listRoles, createRole, updateRole, deleteRole } from "@/api/roles"
import type {
  Brand,
  Season,
  Division,
  ProductCategory,
  SampleType,
  Role,
} from "@/types/lookups"

type LookupKind = "brands" | "seasons" | "divisions" | "product_categories" | "sample_types" | "roles"

export default function LookupsPage() {
  useAuth()
  const [kind, setKind] = useState<LookupKind>("brands")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [brands, setBrands] = useState<Brand[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [year, setYear] = useState<number | "">("")
  const [group, setGroup] = useState("")
  const [code, setCode] = useState("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  async function refresh() {
    setLoading(true)
    try {
      const [b, s, d, c, t, r] = await Promise.all([
        listBrands(),
        listSeasons(),
        listDivisions(),
        listProductCategories(),
        listSampleTypes(),
        listRoles(),
      ])
      setBrands(b)
      setSeasons(s)
      setDivisions(d)
      setCategories(c)
      setSampleTypes(t)
      setRoles(r)
    } catch (err) {
      console.error("Failed to load lookups:", err)
      toast.error("Failed to load lookup data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filterByName = <T extends { name: string }>(rows: T[]): T[] =>
      !q ? rows : rows.filter((r) => r.name.toLowerCase().includes(q))

    switch (kind) {
      case "brands":
        return filterByName(brands)
      case "seasons":
        return !q
          ? seasons
          : seasons.filter(
              (s) =>
                (s.code ?? "").toLowerCase().includes(q) ||
                String(s.year).includes(q)
            )
      case "divisions":
        return filterByName(divisions)
      case "product_categories":
        return filterByName(categories)
      case "sample_types":
        return !q
          ? sampleTypes
          : sampleTypes.filter(
              (t) =>
                t.name.toLowerCase().includes(q) ||
                (t.group ?? "").toLowerCase().includes(q)
            )
      case "roles":
        return !q
          ? roles
          : roles.filter(
              (r) =>
                r.name.toLowerCase().includes(q) ||
                r.code.toLowerCase().includes(q)
            )
      default:
        return []
    }
  }, [kind, search, brands, seasons, divisions, categories, sampleTypes, roles])

  const totalPages = Math.ceil(items.length / pageSize)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return items.slice(start, end)
  }, [items, currentPage, pageSize])

  // Reset to page 1 when search or kind changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, kind])

  function openCreate() {
    setEditingId(null)
    setName("")
    setYear("")
    setGroup("")
    setCode("")
    setStartDate("")
    setEndDate("")
    setDialogOpen(true)
  }

  function openEdit(row: any) {
    setEditingId(row.id)
    setName(kind === "seasons" ? "" : row.name ?? "")
    setYear(kind === "seasons" ? row.year ?? "" : "")
    setGroup(kind === "sample_types" ? row.group ?? "" : "")
    setCode(kind === "roles" ? row.code ?? "" : kind === "seasons" ? row.code ?? "" : "")
    setStartDate(
      kind === "seasons" && row.start_date
        ? String(row.start_date).slice(0, 10)
        : ""
    )
    setEndDate(
      kind === "seasons" && row.end_date
        ? String(row.end_date).slice(0, 10)
        : ""
    )
    setDialogOpen(true)
  }

  async function handleSave() {
    if (kind === "seasons") {
      if (!code.trim()) {
        toast.error("Code is required")
        return
      }
    } else {
      if (!name.trim()) {
        toast.error("Name is required")
        return
      }
    }

    setSaving(true)
    try {
      if (kind === "brands") {
        if (editingId) {
          await updateBrand(editingId, { name: name.trim() })
        } else {
          await createBrand({ name: name.trim() })
        }
      } else if (kind === "seasons") {
        if (!year || Number.isNaN(Number(year))) {
          toast.error("Year is required")
          setSaving(false)
          return
        }
        const payload = {
          code: code.trim(),
          year: Number(year),
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }
        if (editingId) {
          await updateSeason(editingId, payload)
        } else {
          await createSeason(payload)
        }
      } else if (kind === "divisions") {
        if (editingId) {
          await updateDivision(editingId, { name: name.trim() })
        } else {
          await createDivision({ name: name.trim() })
        }
      } else if (kind === "product_categories") {
        if (editingId) {
          await updateProductCategory(editingId, { name: name.trim() })
        } else {
          await createProductCategory({ name: name.trim() })
        }
      } else if (kind === "sample_types") {
        const payload = { name: name.trim(), group: group.trim() || undefined }
        if (editingId) {
          await updateSampleType(editingId, payload)
        } else {
          await createSampleType(payload)
        }
      } else if (kind === "roles") {
        if (!code.trim()) {
          toast.error("Code is required")
          setSaving(false)
          return
        }
        const payload = { code: code.trim().toUpperCase(), name: name.trim() }
        if (editingId) {
          await updateRole(editingId, payload)
        } else {
          await createRole(payload)
        }
      }

      toast.success(editingId ? "Updated successfully" : "Created successfully")
      setDialogOpen(false)
      await refresh()
    } catch (err: any) {
      console.error("Save lookup failed:", err)
      toast.error(err?.response?.data?.error || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: any) {
    if (!window.confirm("Delete this item?")) return
    try {
      if (kind === "brands") {
        await deleteBrand(row.id)
      } else if (kind === "seasons") {
        await deleteSeason(row.id)
      } else if (kind === "divisions") {
        await deleteDivision(row.id)
      } else if (kind === "product_categories") {
        await deleteProductCategory(row.id)
      } else if (kind === "sample_types") {
        await deleteSampleType(row.id)
      } else if (kind === "roles") {
        await deleteRole(row.id)
      }
      toast.success("Deleted")
      await refresh()
    } catch (err: any) {
      console.error("Delete lookup failed:", err)
      toast.error(err?.response?.data?.error || "Failed to delete")
    }
  }

  const titleMap: Record<LookupKind, string> = {
    brands: "Brands",
    seasons: "Seasons",
    divisions: "Divisions",
    product_categories: "Product Categories",
    sample_types: "Sample Types",
    roles: "Roles",
  }

  if (loading) {
    return (
      <div className="p-6">
        <TableSkeleton />
      </div>
    )
  }

  return (
    <RoleGate
      allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}
      fallback={
        <div className="p-6">
          <div className="text-sm text-muted-foreground">You don’t have access to manage lookups.</div>
        </div>
      }
    >
      <div className="space-y-6 p-6">

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Lookup Management</CardTitle>
              <CardDescription>Manage brands, seasons, divisions, categories, types, and roles.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
                {(
                  [
                    ["brands", "Brands"],
                    ["seasons", "Seasons"],
                    ["divisions", "Divisions"],
                    ["product_categories", "Categories"],
                    ["sample_types", "Sample Types"],
                    ["roles", "Roles"],
                  ] as [LookupKind, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKind(key)}
                    className={
                      "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors " +
                      (kind === key
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[220px] flex-1">
                <Input
                  placeholder={`Search ${titleMap[kind].toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add {titleMap[kind].slice(0, -1)}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No {titleMap[kind].toLowerCase()} found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    {kind === "seasons" && (
                      <>
                        <TableHead>Year</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                      </>
                    )}
                    {kind === "sample_types" && <TableHead>Group</TableHead>}
                    {kind === "roles" && <TableHead>Code</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground">{row.id}</TableCell>
                      <TableCell>{kind === 'seasons' ? row.code : row.name}</TableCell>
                      {kind === "seasons" && (
                        <>
                          <TableCell>{row.year}</TableCell>
                          <TableCell>
                            {row.start_date ? String(row.start_date).slice(0, 10) : "-"}
                          </TableCell>
                          <TableCell>
                            {row.end_date ? String(row.end_date).slice(0, 10) : "-"}
                          </TableCell>
                        </>
                      )}
                      {kind === "sample_types" && <TableCell>{row.group || "-"}</TableCell>}
                      {kind === "roles" && <TableCell>{row.code}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {items.length > pageSize && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, items.length)} of {items.length} {titleMap[kind].toLowerCase()}
                </div>
                <Pagination className="m-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (totalPages <= 7) return true
                        if (page === 1 || page === totalPages) return true
                        if (page >= currentPage - 1 && page <= currentPage + 1) return true
                        return false
                      })
                      .map((page, idx, arr) => {
                        if (idx > 0 && page > arr[idx - 1] + 1) {
                          return (
                            <Fragment key={`ellipsis-${page}`}>
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPage === page}
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </Fragment>
                          )
                        }
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={currentPage === page}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit" : "Add"} {titleMap[kind].slice(0, -1)}
              </DialogTitle>
              <DialogDescription>
                {kind === "seasons"
                  ? "Set the season code and year."
                  : kind === "sample_types"
                  ? "Set sample type name and optional group."
                  : kind === "roles"
                  ? "Set the role code and display name."
                  : "Set the lookup name."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {kind === "roles" && (
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs">
                    Code
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-8 text-sm uppercase"
                  />
                </div>
              )}

              {kind === "seasons" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs">
                    Code
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-8 text-sm uppercase"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {kind === "seasons" && (
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-xs">
                    Year
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) =>
                      setYear(e.target.value ? Number(e.target.value) : "")
                    }
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {kind === "seasons" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-xs">
                      Start date (optional)
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end_date" className="text-xs">
                      End date (optional)
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}

              {kind === "sample_types" && (
                <div className="space-y-1.5">
                  <Label htmlFor="group" className="text-xs">
                    Group (optional)
                  </Label>
                  <Input
                    id="group"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  )
}

