import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Settings,
  Package,
  BarChart3,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth"
import { canManageUsers } from "@/lib/rbac"
import { Button } from "@/components/ui/button"
import logoImage from "@/assets/logo.png"

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/samples", label: "Samples", icon: Package },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

const adminOnlyItems = [
  { href: "/users", label: "Users", icon: Users },
  { href: "/lookups", label: "Lookups", icon: Settings },
]

const otherItems = [{ href: "/help", label: "Help Center", icon: HelpCircle }]

type SidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const canSeeAdmin = !!user && canManageUsers(user.roleCode as any)
  const navItems = canSeeAdmin ? [...mainNavItems, ...adminOnlyItems] : mainNavItems

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-[width] duration-200",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div className={cn("flex h-16 items-center justify-between border-b", collapsed ? "px-2" : "px-4")}>
        {!collapsed && (
          <div className="flex items-center">
            <img
              src={logoImage}
              alt="Madison 88"
              className="h-8 w-auto"
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          className={cn("shrink-0 text-muted-foreground hover:text-foreground", collapsed ? "mx-auto" : "")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!collapsed && (
          <div className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
            MAIN MENU
          </div>
        )}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-lg transition-colors",
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-[#1a2539]/10 text-[#1a2539]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#1a2539]" : "")} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {!collapsed && (
          <>
            <div className="mt-6 px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              OTHER
            </div>
            <nav className="space-y-1">
              {otherItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.href ||
                  location.pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group flex items-center rounded-lg transition-colors",
                      "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-[#1a2539]/10 text-[#1a2539]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#1a2539]" : "")} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </>
        )}
      </div>

      <div className={cn("border-t", collapsed ? "p-2" : "p-3")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a2539]/10">
            <User className="h-4 w-4 text-[#1a2539]" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">
                {user?.full_name || user?.username}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.roleName}
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "mt-3 w-full text-muted-foreground hover:text-foreground hover:bg-muted",
            collapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )
}
