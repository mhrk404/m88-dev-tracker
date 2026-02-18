import { RouterProvider } from "react-router-dom"
import { AuthProvider } from "@/contexts/auth"
import { Toaster } from "@/components/ui/sonner"
import { router } from "@/routes"

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  )
}
