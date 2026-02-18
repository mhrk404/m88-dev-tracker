import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import { Loading } from "@/components/ui/loading"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
const USERS_PAGE_SIZE = 10

function emptyCreate(): CreateUserInput {
  return {
    username: "",
    email: "",
    full_name: "",
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

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState<CreateUserInput>(emptyCreate())
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserInput>({})

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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
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

      return matchesQuery && matchesRole && matchesActive
    })
  }, [users, search, roleFilter, activeFilter])

  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, activeFilter])

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
      role_id: u.role_id ?? null,
      is_active: u.is_active,
    })
    setEditOpen(true)
  }

  async function onCreate() {
    if (!createForm.username?.trim()) return toast.error("Username is required")
    if (!createForm.email?.trim()) return toast.error("Email is required")

    setSaving(true)
    try {
      await createUser({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        full_name: createForm.full_name?.trim() || undefined,
        role_id: createForm.role_id ?? null,
        is_active: createForm.is_active ?? true,
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

    setSaving(true)
    try {
      await updateUser(editUser.id, {
        ...editForm,
        username: editForm.username?.trim(),
        email: editForm.email?.trim(),
        full_name: editForm.full_name?.trim() || undefined,
      })
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
    setUserToDelete(u)
    setDeleteOpen(true)
  }

  async function onDelete() {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete.id)
      toast.success("User deleted")
      setDeleteOpen(false)
      setUserToDelete(null)
      await refresh()
    } catch (err: any) {
      console.error("Delete user failed:", err)
      toast.error(err?.response?.data?.error || "Failed to delete user")
    }
  }

  if (loading) return <Loading fullScreen text="Loading users..." />

  return (
    <RoleGate
      allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}
      fallback={
        <div className="p-6">
          <div className="text-sm text-muted-foreground">You don’t have access to manage users.</div>
        </div>
      }
    >
      <div className="space-y-6 p-6">
        <PageBreadcrumbs />

        <Card className="border-0 -mx-6 px-6">
          <CardHeader className="px-0">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter users.</CardDescription>
          </CardHeader>
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
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No users found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((u) => {
                    const isCurrentUser = currentUser?.id === u.id
                    return (
                      <TableRow
                        key={u.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/70",
                          isCurrentUser && "bg-muted/50"
                        )}
                        onClick={() => openEdit(u)}
                      >
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
                            <Button variant="ghost" size="icon-xs" onClick={() => openDelete(u)}>
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

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                    {lookups?.roles?.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name} ({r.code})
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
                      disabled={
                        currentUser?.roleCode === ROLES.ADMIN &&
                        editUser?.roleCode === ROLES.SUPER_ADMIN
                      }
                    >
                      <SelectTrigger id="e_role" className="h-8 text-sm">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No role</SelectItem>
                        {lookups?.roles
                          ?.filter((r) => {
                            // If admin is editing super admin, hide super admin role option
                            if (
                              currentUser?.roleCode === ROLES.ADMIN &&
                              editUser?.roleCode === ROLES.SUPER_ADMIN
                            ) {
                              return r.code !== ROLES.SUPER_ADMIN
                            }
                            return true
                          })
                          .map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name} ({r.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {currentUser?.roleCode === ROLES.ADMIN &&
                      editUser?.roleCode === ROLES.SUPER_ADMIN && (
                        <p className="text-xs text-muted-foreground">
                          Admins cannot change the role of super admins.
                        </p>
                      )}
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGate>
  )
}
