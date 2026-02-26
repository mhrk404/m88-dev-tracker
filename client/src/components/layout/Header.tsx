import { useLocation, useNavigate } from "react-router-dom"
import { Plus, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth"
import { canCreateSample, canManageUsers } from "@/lib/rbac"
import type { RoleCode } from "@/lib/constants"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/samples": "Samples",
  "/samples/new": "Create Sample",
  "/analytics": "Analytics",
  "/analytics/table": "Analytics Table",
  "/pbd/monitoring": "PBD Monitoring",
  "/costing/monitoring": "Costing Monitoring",
  "/td/monitoring": "TD Monitoring",
  "/fty/monitoring": "Factory Monitoring",
  "/md/monitoring": "MD Monitoring",
  "/brand/monitoring": "Brand Monitoring",
  "/users": "Users",
  "/lookups": "Lookups",
  "/role-access": "Role Access",
  "/activity-logs": "Activity Logs",
  "/help": "Help Center",
}

function getPageTitle(pathname: string): string {
  // Check for exact matches first
  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }

  // Check for dynamic routes (e.g., /samples/:id)
  if (pathname.startsWith("/samples/")) {
    if (pathname.includes("stage-edit")) return "Edit stage"
    if (pathname.includes("/edit")) return "Edit Sample"
    return "Sample Details"
  }

  if (pathname.startsWith("/role-access/")) {
    return "Specific Access"
  }

  // Default fallback
  return "Dashboard"
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const title = getPageTitle(location.pathname)
  const canCreate = user ? canCreateSample(user.roleCode as RoleCode) : false
  const showSamplesPage = location.pathname === "/samples"
  const showCreateSampleButton = showSamplesPage && canCreate

  const canCreateUsers = user ? canManageUsers(user.roleCode as RoleCode) : false
  const showCreateUserButton = location.pathname === "/users" && canCreateUsers
  const showAnalyticsActions = location.pathname === "/analytics"
  const showMonitoringRefresh = location.pathname.endsWith("/monitoring")

  return (
    <header className="flex h-16 items-center justify-between border-b dark:border-opacity-30 bg-background px-6 gradient-dark-header">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {showAnalyticsActions ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent("analytics:export"))}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent("analytics:refresh"))}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      ) : showMonitoringRefresh ? (
        <Button
          type="button"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent("monitoring:refresh"))}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      ) : showSamplesPage ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent("samples:export"))}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          {showCreateSampleButton ? (
            <Button onClick={() => navigate("/samples/new")} size="sm">
              <Plus className="h-4 w-4" />
              Create Sample
            </Button>
          ) : null}
        </div>
      ) : showCreateSampleButton ? (
        <Button onClick={() => navigate("/samples/new")} size="sm">
          <Plus className="h-4 w-4" />
          Create Sample
        </Button>
      ) : showCreateUserButton ? (
        <Button onClick={() => navigate("/users?create=1")} size="sm">
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      ) : null}
    </header>
  )
}
