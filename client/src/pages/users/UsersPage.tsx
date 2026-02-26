import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Pencil, Trash2, X, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { TableSkeleton } from "@/components/ui/skeletons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { useAuth } from "@/contexts/auth"
import RoleGate from "@/components/protected/RoleGate"
import { ROLES } from "@/lib/constants"
import { getLookups } from "@/api/lookups"
import { createUser, deleteUser, listUsers, updateUser } from "@/api/users"
import { paginationRange } from "@/lib/pagination"
import type { Lookups } from "@/types/lookups"
import type { CreateUserInput, UpdateUserInput, User } from "@/types/user"

type ActiveFilter = "all" | "active" | "inactive"
type RegionCode = "US" | "PH" | "INDONESIA"
const USERS_PAGE_SIZE = 10
const REGION_OPTIONS: RegionCode[] = ["US", "PH", "INDONESIA"]

function isAdministrativeRole(roleCode?: string | null) {
  return roleCode === ROLES.ADMIN || roleCode === ROLES.SUPER_ADMIN
}

function emptyCreate(): CreateUserInput {
  return {
    username: "",
    email: "",
    full_name: "",
    region: "US",
    role_id: null,
    is_active: true,
  }
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [lookups, setLookups] = useState<Lookups | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all")
  const [regionFilter, setRegionFilter] = useState<string>("all")

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState<CreateUserInput>(emptyCreate())
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserInput>({})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [generatedPassword, setGeneratedPassword] = useState<string>("")
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canManageAllRegions = currentUser?.roleCode === ROLES.SUPER_ADMIN

  function generatePassword(username: string): string {
    if (!username.trim()) return ""
    const randomNum = Math.floor(Math.random() * 1000)
    return `${username}M@dison_88${randomNum}`
  }

  useEffect(() => {
    const newPassword = generatePassword(createForm.username)
    setGeneratedPassword(newPassword)
  }, [createForm.username])

  function copyPasswordToClipboard() {
    navigator.clipboard.writeText(generatedPassword)
    setCopiedPassword(true)
    toast.success("Password copied to clipboard")
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  async function refresh() {
    setLoading(true)
    try {
      const [usersData, lookupsData] = await Promise.all([listUsers(), getLookups()])
      setUsers(usersData)
      setLookups(lookupsData)
    } catch (err) {
      console.error("Failed to load users:", err)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete("create")
        return next
      }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (createOpen && !canManageAllRegions && currentUser?.region) {
      setCreateForm((prev) => ({ ...prev, region: currentUser.region as RegionCode }))
    }
  }, [createOpen, canManageAllRegions, currentUser?.region])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (!canManageAllRegions && u.region !== currentUser?.region) {
        return false
      }

      const matchesQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)

      const matchesRole =
        roleFilter === "all" ||
        String(u.role_id ?? "") === roleFilter ||
        (u.roleCode ?? "") === roleFilter

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? u.is_active : !u.is_active)

      const matchesRegion =
        regionFilter === "all" ||
        u.region === regionFilter

      return matchesQuery && matchesRole && matchesActive && matchesRegion
    })
  }, [users, search, roleFilter, activeFilter, regionFilter, canManageAllRegions, currentUser?.region])

  const assignableRoles = useMemo(() => {
    const roles = lookups?.roles ?? []
    if (canManageAllRegions) return roles
    return roles.filter((r) => r.code !== ROLES.SUPER_ADMIN && r.code !== ROLES.ADMIN)
  }, [lookups?.roles, canManageAllRegions])

  const roleCodeById = useMemo(() => {
    const map = new Map<number, string>()
    ;(lookups?.roles ?? []).forEach((role) => {
      map.set(role.id, role.code)
    })
    return map
  }, [lookups?.roles])

  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, activeFilter, regionFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE))
  const safePage = Math.min(Math.max(page, 1), totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage])

  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * USERS_PAGE_SIZE
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE)
  }, [filteredUsers, safePage])

  function openEdit(u: User) {
    setEditUser(u)
    setEditForm({
      username: u.username,
      email: u.email,
      full_name: u.full_name ?? "",
      region: u.region,
      role_id: u.role_id ?? null,
      is_active: u.is_active,
    })
    setEditOpen(true)
  }

  async function onCreate() {
    if (!createForm.username?.trim()) return toast.error("Username is required")
    if (!createForm.email?.trim()) return toast.error("Email is required")

    if (!canManageAllRegions && createForm.role_id != null) {
      const selectedRoleCode = roleCodeById.get(createForm.role_id)
      if (selectedRoleCode === ROLES.ADMIN || selectedRoleCode === ROLES.SUPER_ADMIN) {
        return toast.error("Only super admin can assign ADMIN or SUPER_ADMIN roles")
      }
    }

    setSaving(true)
    try {
      await createUser({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        full_name: createForm.full_name?.trim() || undefined,
        region: (canManageAllRegions ? createForm.region : currentUser?.region) as RegionCode,
        role_id: createForm.role_id ?? null,
        is_active: createForm.is_active ?? true,
        password: generatedPassword,
      })
      toast.success("User created")
      setCreateOpen(false)
      setCreateForm(emptyCreate())
      await refresh()
    } catch (err: any) {
      console.error("Create user failed:", err)
      toast.error(err?.response?.data?.error || "Failed to create user")
    } finally {
      setSaving(false)
    }
  }

  async function onSaveEdit() {
    if (!editUser) return
    if (editForm.username !== undefined && !String(editForm.username).trim()) {
      return toast.error("Username is required")
    }
    if (editForm.email !== undefined && !String(editForm.email).trim()) {
      return toast.error("Email is required")
    }

    const selectedRoleId = editForm.role_id
    if (!canManageAllRegions && selectedRoleId != null) {
      const selectedRoleCode = roleCodeById.get(selectedRoleId)
      if (selectedRoleCode === ROLES.ADMIN || selectedRoleCode === ROLES.SUPER_ADMIN) {
        return toast.error("Only super admin can assign ADMIN or SUPER_ADMIN roles")
      }
    }

    setSaving(true)
    try {
      const updatePayload: UpdateUserInput = {
        ...editForm,
        username: editForm.username?.trim(),
        email: editForm.email?.trim(),
        full_name: editForm.full_name?.trim() || undefined,
        region: (canManageAllRegions ? editForm.region : currentUser?.region) as RegionCode,
      }

      if (updatePayload.role_id === editUser.role_id) {
        delete updatePayload.role_id
      }

      await updateUser(editUser.id, updatePayload)
      toast.success("User updated")
      setEditOpen(false)
      setEditUser(null)
      setEditForm({})
      await refresh()
    } catch (err: any) {
      console.error("Update user failed:", err)
      toast.error(err?.response?.data?.error || "Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  function openDelete(u: User) {
    if (isAdministrativeRole(u.roleCode) && !canManageAllRegions) {
      toast.error("Cannot delete administrative users")
      return
    }
    setUserToDelete(u)
    setDeleteOpen(true)
  }

  function scheduleUserDeleteWithUndo(ids: number[], successMessage: string, clearAllSelection = false) {
    if (ids.length === 0) return

    const DELAY = 5
    let remaining = DELAY
    let cancelled = false

    setDeleteOpen(false)
    setBulkDeleteOpen(false)
    setUserToDelete(null)

    let intervalId: ReturnType<typeof setInterval>
    let timeoutId: ReturnType<typeof setTimeout>

    function cancel() {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      toast.dismiss(toastId)
      toast.info("Delete cancelled")
    }

    const toastId = toast.loading(`Deleting in ${remaining}s — click Undo to cancel`, {
      action: { label: "Undo", onClick: cancel },
      duration: Infinity,
    })

    intervalId = setInterval(() => {
      remaining--
      if (remaining > 0) {
        toast.loading(`Deleting in ${remaining}s — click Undo to cancel`, {
          id: toastId,
          action: { label: "Undo", onClick: cancel },
          duration: Infinity,
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      clearInterval(intervalId)
      if (cancelled) return
      toast.dismiss(toastId)

      setDeleting(true)
      try {
        await Promise.all(ids.map((id) => deleteUser(id)))
        toast.success(successMessage)
        if (clearAllSelection) {
          setSelectedIds(new Set())
        } else {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            ids.forEach((id) => next.delete(id))
            return next
          })
        }
        await refresh()
      } catch (err: any) {
        console.error("Delete user failed:", err)
        toast.error(err?.response?.data?.error || "Failed to delete user(s)")
      } finally {
        setDeleting(false)
      }
    }, DELAY * 1000)
  }

  async function onDelete() {
    if (!userToDelete) return
    scheduleUserDeleteWithUndo([userToDelete.id], "User deleted")
  }

  async function onBulkDelete() {
    if (selectedIds.size === 0) return
    const usersToDelete = Array.from(selectedIds).filter((id) => {
      const user = users.find((u) => u.id === id)
      if (!user) return false
      if (canManageAllRegions) return true
      return !isAdministrativeRole(user.roleCode)
    })

    if (usersToDelete.length === 0) {
      toast.error("Cannot delete administrative users")
      return
    }

    const skippedCount = selectedIds.size - usersToDelete.length
    let message = `${usersToDelete.length} user(s) deleted`
    if (skippedCount > 0) {
      message += ` (${skippedCount} administrative user(s) cannot be deleted)`
    }

    scheduleUserDeleteWithUndo(usersToDelete, message, true)
  }

  const toggleSelectUser = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedUsers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagedUsers.map((u) => u.id)))
    }
  }

  if (loading) return (
    <div className="p-6">
      <TableSkeleton />
    </div>
  )

  return (
    <RoleGate
      allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}
      fallback={
        <div className="p-6">
          <div className="text-sm text-muted-foreground">You don’t have access to manage users.</div>
        </div>
      }
    >
      <div className="space-y-6 p-6">
        <Card className="border-0 -mx-6 px-6">
          <CardContent className="space-y-4 px-0">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <Input
                  placeholder="Search username, email, name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {lookups?.roles?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canManageAllRegions && (
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {REGION_OPTIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedIds.size > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/30">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""} selected
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={deleting}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No users found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === pagedUsers.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((u) => {
                    const isCurrentUser = currentUser?.id === u.id
                    const isSelected = selectedIds.has(u.id)
                    return (
                      <TableRow
                        key={u.id}
                        className={cn(
                          "transition-colors",
                          isSelected && "bg-blue-50/50 dark:bg-blue-950/30",
                          !isSelected && "cursor-pointer hover:bg-muted/70",
                          isCurrentUser && "bg-muted/50"
                        )}
                        onClick={() => !isSelected && openEdit(u)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectUser(u.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {u.username}
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs border-primary/20 bg-primary/10 text-primary">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.full_name || "-"}</TableCell>
                        <TableCell>{u.region}</TableCell>
                        <TableCell>{u.roleName || u.roleCode || "-"}</TableCell>
                        <TableCell>
                          {u.is_active ? (
                            <Badge variant="outline" className="border-blue-200 text-blue-700 dark:border-blue-900/40 dark:text-blue-300">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon-xs" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openDelete(u)}
                              disabled={isAdministrativeRole(u.roleCode) && !canManageAllRegions}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                    })}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const start = (safePage - 1) * USERS_PAGE_SIZE
                        const end = Math.min(start + USERS_PAGE_SIZE, filteredUsers.length)
                        return `Showing ${start + 1}-${end} of ${filteredUsers.length}`
                      })()}
                    </div>
                    <Pagination className="sm:mx-0 sm:w-auto sm:justify-end">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            disabled={safePage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          />
                        </PaginationItem>

                        {paginationRange(safePage, totalPages).map((token, idx) => {
                          if (token === "ellipsis") {
                            return (
                              <PaginationItem key={`e-${idx}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )
                          }
                          const n = token
                          return (
                            <PaginationItem key={n}>
                              <PaginationLink isActive={n === safePage} onClick={() => setPage(n)}>
                                {n}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}

                        <PaginationItem>
                          <PaginationNext
                            disabled={safePage >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) {
              setCreateForm(emptyCreate())
              setGeneratedPassword("")
              setCopiedPassword(false)
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Admins can create and manage system users.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="c_username">Username</Label>
                <Input
                  id="c_username"
                  className="h-8 text-sm"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="c_email">Email</Label>
                <Input
                  id="c_email"
                  className="h-8 text-sm"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="c_full_name">Full name</Label>
                <Input
                  id="c_full_name"
                  className="h-8 text-sm"
                  value={createForm.full_name ?? ""}
                  onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="c_role">Role</Label>
                <Select
                  value={createForm.role_id == null ? "none" : String(createForm.role_id)}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, role_id: v === "none" ? null : Number(v) }))
                  }
                >
                  <SelectTrigger id="c_role" className="h-8 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name} ({r.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="c_region">Region</Label>
                <Select
                  value={createForm.region ?? "US"}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, region: v as RegionCode }))
                  }
                  disabled={!canManageAllRegions}
                >
                  <SelectTrigger id="c_region" className="h-8 text-sm">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="c_active">Status</Label>
                <Select
                  value={createForm.is_active ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, is_active: v === "active" }))
                  }
                >
                  <SelectTrigger id="c_active" className="h-8 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs" htmlFor="c_password">Initial Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="c_password"
                    className="h-8 text-sm font-mono bg-muted"
                    value={generatedPassword}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyPasswordToClipboard}
                    className="shrink-0"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Format: username + M@dison_88 + random number</p>
              </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={onCreate} disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user profile, role, and active status.</DialogDescription>
            </DialogHeader>

            {editUser && (
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="e_username">Username</Label>
                    <Input
                      id="e_username"
                      className="h-8 text-sm"
                      value={String(editForm.username ?? "")}
                      onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="e_email">Email</Label>
                    <Input
                      id="e_email"
                      className="h-8 text-sm"
                      value={String(editForm.email ?? "")}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="e_full_name">Full name</Label>
                    <Input
                      id="e_full_name"
                      className="h-8 text-sm"
                      value={String(editForm.full_name ?? "")}
                      onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="e_role">Role</Label>
                    <Select
                      value={editForm.role_id == null ? "none" : String(editForm.role_id)}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, role_id: v === "none" ? null : Number(v) }))
                      }
                    >
                      <SelectTrigger id="e_role" className="h-8 text-sm">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No role</SelectItem>
                        {assignableRoles.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name} ({r.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {isAdministrativeRole(currentUser?.roleCode) &&
                      isAdministrativeRole(editUser?.roleCode) && (
                        <p className="text-xs text-muted-foreground">
                          Admins cannot change the role of super admins.
                        </p>
                      )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="e_region">Region</Label>
                    <Select
                      value={String(editForm.region ?? editUser?.region ?? "US")}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, region: v as RegionCode }))
                      }
                      disabled={!canManageAllRegions}
                    >
                      <SelectTrigger id="e_region" className="h-8 text-sm">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGION_OPTIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="e_active">Status</Label>
                    <Select
                      value={editForm.is_active === undefined ? (editUser?.is_active ? "active" : "inactive") : (editForm.is_active ? "active" : "inactive")}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, is_active: v === "active" }))
                      }
                    >
                      <SelectTrigger id="e_active" className="h-8 text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={onSaveEdit} disabled={saving || !editUser}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {userToDelete && (
              <div className="py-4">
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-muted-foreground">Name</span>
                  <div className="text-sm">
                    {userToDelete.full_name || userToDelete.username}
                  </div>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} User{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onBulkDelete} disabled={deleting}>
                {deleting ? "Deleting..." : `Delete ${selectedIds.size} User${selectedIds.size !== 1 ? "s" : ""}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGate>
  )
}
