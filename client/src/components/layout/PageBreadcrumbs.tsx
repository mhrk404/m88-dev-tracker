import * as React from "react"
import { useLocation, Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function getBreadcrumbs(pathname: string, compact: boolean) {
  const crumbs: Array<{ label: string; path: string }> = []
  
  if (!compact) {
    crumbs.push({ label: "Dashboard", path: "/dashboard" })
  }
  
  if (pathname === "/dashboard") {
    return crumbs
  }
  
  if (pathname.startsWith("/samples")) {
    crumbs.push({ label: "Samples", path: "/samples" })
    
    if (pathname === "/samples/new") {
      crumbs.push({ label: "Create", path: "/samples/new" })
    } else if (pathname.includes("stage-edit")) {
      const id = pathname.split("/")[2]
      crumbs.push({ label: "Details", path: `/samples/${id}` })
      crumbs.push({ label: "Edit stage", path: pathname })
    } else if (pathname.includes("/edit")) {
      const id = pathname.split("/")[2]
      crumbs.push({ label: "Details", path: `/samples/${id}` })
      crumbs.push({ label: "Edit", path: pathname })
    } else if (pathname !== "/samples") {
      crumbs.push({ label: "Details", path: pathname })
    }
  } else if (pathname === "/analytics") {
    crumbs.push({ label: "Analytics", path: "/analytics" })
  } else if (pathname === "/users") {
    crumbs.push({ label: "Users", path: "/users" })
  } else if (pathname === "/lookups") {
    crumbs.push({ label: "Lookups", path: "/lookups" })
  } else if (pathname === "/role-access") {
    crumbs.push({ label: "Role Access", path: "/role-access" })
  } else if (pathname.startsWith("/role-access/")) {
    crumbs.push({ label: "Role Access", path: "/role-access" })
    crumbs.push({ label: "Specific Access", path: pathname })
  } else if (pathname === "/help") {
    crumbs.push({ label: "Help Center", path: "/help" })
  }
  
  return crumbs
}

type PageBreadcrumbsProps = {
  compact?: boolean
}

export default function PageBreadcrumbs({ compact = false }: PageBreadcrumbsProps) {
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname, compact)

  if (breadcrumbs.length === 0 || (compact && breadcrumbs.length <= 1)) {
    return null
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
