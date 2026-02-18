import { createBrowserRouter, Navigate } from "react-router-dom"
import LoginPage from "@/pages/login/LoginPage"
import DashboardPage from "@/pages/dashboard/DashboardPage"
import AppLayout from "@/components/layout/AppLayout"
import ProtectedRoute from "@/components/protected/ProtectedRoute"
import UsersPage from "@/pages/users/UsersPage"
import LookupsPage from "@/pages/lookups/LookupsPage"
import SamplesListPage from "@/pages/samples/SamplesListPage"
import SampleDetailPage from "@/pages/samples/SampleDetailPage"
import SampleCreatePage from "@/pages/samples/SampleCreatePage"
import SampleEditPage from "@/pages/samples/SampleEditPage"
import HelpPage from "@/pages/help/HelpPage"
import NotFoundPage from "@/pages/not-found/NotFoundPage"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "samples",
        element: <SamplesListPage />,
      },
      {
        path: "samples/new",
        element: <SampleCreatePage />,
      },
      {
        path: "samples/:id",
        element: <SampleDetailPage />,
      },
      {
        path: "samples/:id/edit",
        element: <SampleEditPage />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
      {
        path: "lookups",
        element: <LookupsPage />,
      },
      {
        path: "help",
        element: <HelpPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
])
