import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    if (saved === "true") setSidebarCollapsed(true)
  }, [])

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebarCollapsed", String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
