import { RouterProvider } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth"
import { ThemeProvider } from "@/contexts/theme"
import { Toaster } from "@/components/ui/sonner"
import { router } from "@/routes"

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}
