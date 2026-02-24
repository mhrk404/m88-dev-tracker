import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import RoleGate from "@/components/protected/RoleGate"
import { FormSkeleton } from "@/components/ui/skeletons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

import { ROLES } from "@/lib/constants"
import {
  getRolePermissions,
  updateRolePermissions,
  type RolePermission,
} from "@/api/roles"

const STAGE_LABELS: Record<string, string> = {
  PSI: "PSI",
  SAMPLE_DEVELOPMENT: "Factory Development Updates",
  PC_REVIEW: "MD / Product Review Decision",
  COSTING: "Cost Sheet Processing",
  SHIPMENT_TO_BRAND: "Brand Delivery Tracking",
  USERS: "Users",
  ROLES: "Roles",
  BRANDS: "Brands",
  SEASONS: "Seasons",
  DIVISIONS: "Divisions",
  PRODUCT_CATEGORIES: "Product Categories",
  SAMPLE_TYPES: "Sample Types",
  ANALYTICS: "Analytics",
  EXPORT: "Export",
}

export default function RoleAccessDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roleName, setRoleName] = useState("")
  const [roleCode, setRoleCode] = useState("")
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [initialPermissions, setInitialPermissions] = useState<RolePermission[]>([])

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      try {
        const data = await getRolePermissions(Number(id))
        setRoleName(data.role.name)
        setRoleCode(data.role.code)
        setPermissions(data.permissions)
        setInitialPermissions(data.permissions)
      } catch (err: any) {
        console.error("Failed to load role access:", err)
        toast.error(err?.response?.data?.error || "Failed to load role access")
        navigate("/role-access")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  function togglePermission(stage: string, field: "can_read" | "can_write" | "can_approve", checked: boolean) {
    setPermissions((prev) =>
      prev.map((row) => (row.stage === stage ? { ...row, [field]: checked } : row))
    )
  }

  async function onSave() {
    if (!id || !hasPermissionChanges) return
    setSaving(true)
    try {
      await updateRolePermissions(Number(id), permissions)
      setInitialPermissions(permissions)
      toast.success("Role access updated")
    } catch (err: any) {
      console.error("Failed to update role access:", err)
      toast.error(err?.response?.data?.error || "Failed to update role access")
    } finally {
      setSaving(false)
    }
  }

  const hasPermissionChanges = useMemo(() => {
    if (permissions.length !== initialPermissions.length) return true
    const byStage = new Map(initialPermissions.map((p) => [p.stage, p]))
    for (const current of permissions) {
      const initial = byStage.get(current.stage)
      if (!initial) return true
      if (
        current.can_read !== initial.can_read ||
        current.can_write !== initial.can_write ||
        current.can_approve !== initial.can_approve
      ) {
        return true
      }
    }
    return false
  }, [permissions, initialPermissions])

  if (loading) return (
    <div className="p-6">
      <FormSkeleton />
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
        <PageBreadcrumbs />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/role-access")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Specific Access Checklist</CardTitle>
              <CardDescription className="text-xs">
                {roleName} ({roleCode})
              </CardDescription>
            </div>
            <Button size="sm" onClick={onSave} disabled={saving || !hasPermissionChanges}>
              {saving ? "Saving..." : "Save Access"}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Feature / Stage</TableHead>
                    <TableHead className="h-8 text-xs">Read</TableHead>
                    <TableHead className="h-8 text-xs">Write</TableHead>
                    <TableHead className="h-8 text-xs">Approve</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((row) => (
                    <TableRow key={row.stage}>
                      <TableCell className="py-2 text-sm">{STAGE_LABELS[row.stage] ?? row.stage}</TableCell>
                      <TableCell className="py-2">
                        <Checkbox
                          checked={row.can_read}
                          onCheckedChange={(v) => togglePermission(row.stage, "can_read", !!v)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Checkbox
                          checked={row.can_write}
                          onCheckedChange={(v) => togglePermission(row.stage, "can_write", !!v)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Checkbox
                          checked={row.can_approve}
                          onCheckedChange={(v) => togglePermission(row.stage, "can_approve", !!v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  )
}
