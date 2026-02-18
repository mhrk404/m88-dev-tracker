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

function getBreadcrumbs(pathname: string) {
  const crumbs: Array<{ label: string; path: string }> = []
  
  // Always start with Dashboard
  crumbs.push({ label: "Dashboard", path: "/dashboard" })
  
  if (pathname === "/dashboard") {
    return crumbs
  }
  
  if (pathname.startsWith("/samples")) {
    crumbs.push({ label: "Samples", path: "/samples" })
    
    if (pathname === "/samples/new") {
      crumbs.push({ label: "Create", path: "/samples/new" })
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
  } else if (pathname === "/help") {
    crumbs.push({ label: "Help Center", path: "/help" })
  }
  
  return crumbs
}

export default function PageBreadcrumbs() {
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname)

  // Don't show breadcrumbs if only Dashboard
  if (breadcrumbs.length <= 1) {
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
