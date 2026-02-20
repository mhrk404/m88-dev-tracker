import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import RoleGate from "@/components/protected/RoleGate"
import { TableSkeleton } from "@/components/ui/skeletons"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ROLES } from "@/lib/constants"
import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
} from "@/api/roles"
import type { Role } from "@/types/lookups"

export default function RoleAccessPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const data = await listRoles()
      setRoles(data)
    } catch (err) {
      console.error("Failed to load roles:", err)
      toast.error("Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return roles.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q)
    )
  }, [roles, search])

  const normalizedName = name.trim()
  const normalizedCode = code.trim().toUpperCase()
  const isRoleFormValid = normalizedName.length > 0 && normalizedCode.length > 0
  const hasRoleChanges = useMemo(() => {
    if (!editingRole) return isRoleFormValid
    return (
      normalizedName !== editingRole.name.trim() ||
      normalizedCode !== editingRole.code.trim().toUpperCase()
    )
  }, [editingRole, isRoleFormValid, normalizedCode, normalizedName])

  function openCreate() {
    setEditingRole(null)
    setName("")
    setCode("")
    setDialogOpen(true)
  }

  function openEdit(role: Role) {
    setEditingRole(role)
    setName(role.name)
    setCode(role.code)
    setDialogOpen(true)
  }

  async function onSave() {
    if (!isRoleFormValid) {
      toast.error("Role name and code are required")
      return
    }

    if (!hasRoleChanges) return

    const payload = {
      name: normalizedName,
      code: normalizedCode,
    }

    setSaving(true)
    try {
      if (editingRole) {
        await updateRole(editingRole.id, payload)
      } else {
        await createRole(payload)
      }
      toast.success(editingRole ? "Role updated" : "Role created")
      setDialogOpen(false)
      setEditingRole(null)
      await refresh()
    } catch (err: any) {
      console.error("Failed to save role:", err)
      toast.error(err?.response?.data?.error || "Failed to save role")
    } finally {
      setSaving(false)
    }
  }

  function openDelete(role: Role) {
    setRoleToDelete(role)
    setDeleteOpen(true)
  }

  async function onDelete() {
    if (!roleToDelete) return
    try {
      await deleteRole(roleToDelete.id)
      toast.success("Role deleted")
      setDeleteOpen(false)
      setRoleToDelete(null)
      await refresh()
    } catch (err: any) {
      console.error("Failed to delete role:", err)
      toast.error(err?.response?.data?.error || "Failed to delete role")
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
          <div className="text-sm text-muted-foreground">You don’t have access to role-based access settings.</div>
        </div>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Role-Based Access</CardTitle>
              <CardDescription className="text-xs">Manage system roles for admin access control.</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Input
              placeholder="Search by role name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Name</TableHead>
                    <TableHead className="h-8 text-xs">Code</TableHead>
                    <TableHead className="h-8 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-3 text-center text-xs text-muted-foreground">
                        No roles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="py-2 text-sm">{role.name}</TableCell>
                        <TableCell className="py-2 text-sm">{role.code}</TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/role-access/${role.id}`)}>
                              Access
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => openEdit(role)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => openDelete(role)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
              <DialogDescription>Define the role name and code.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="role_name">Role Name</Label>
                <Input
                  id="role_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Super Admin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role_code">Role Code</Label>
                <Input
                  id="role_code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUPER_ADMIN"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving || !hasRoleChanges}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete role?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete {roleToDelete?.name ?? "this role"}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGate>
  )
}
