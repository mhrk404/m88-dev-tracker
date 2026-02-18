import { useLocation, useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth"
import { canCreateSample, canManageUsers } from "@/lib/rbac"
import type { RoleCode } from "@/lib/constants"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/samples": "Samples",
  "/samples/new": "Create Sample",
  "/analytics": "Analytics",
  "/users": "Users",
  "/lookups": "Lookups",
  "/help": "Help Center",
}

function getPageTitle(pathname: string): string {
  // Check for exact matches first
  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }

  // Check for dynamic routes (e.g., /samples/:id)
  if (pathname.startsWith("/samples/")) {
    if (pathname.includes("/edit")) {
      return "Edit Sample"
    }
    return "Sample Details"
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
  const showCreateSampleButton = location.pathname === "/samples" && canCreate

  const canCreateUsers = user ? canManageUsers(user.roleCode as RoleCode) : false
  const showCreateUserButton = location.pathname === "/users" && canCreateUsers

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {showCreateSampleButton ? (
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
