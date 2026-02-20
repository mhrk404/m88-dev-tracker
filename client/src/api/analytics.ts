import apiClient from "./client"
import type {
  DashboardStats,
  SubmissionPerformanceResponse,
  DeliveryPerformanceResponse,
} from "@/types/analytics"

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>("/analytics/dashboard")
  return data
}

export async function getSubmissionPerformance(params?: {
  brandId?: number
  seasonId?: number
  productCategory?: string
  month?: number
  year?: number
  startDate?: string
  endDate?: string
}): Promise<SubmissionPerformanceResponse> {
  const { data } = await apiClient.get<SubmissionPerformanceResponse>(
    "/analytics/submission-performance",
    { params }
  )
  return data
}

export async function getDeliveryPerformance(params?: {
  brandId?: number
  seasonId?: number
  productCategory?: string
  month?: number
  year?: number
  startDate?: string
  endDate?: string
}): Promise<DeliveryPerformanceResponse> {
  const { data } = await apiClient.get<DeliveryPerformanceResponse>(
    "/analytics/delivery-performance",
    { params }
  )
  return data
}

export async function exportDeliveryPerformance(params?: {
  brandId?: number
  seasonId?: number
  productCategory?: string
  month?: number
  year?: number
  startDate?: string
  endDate?: string
  status?: string
  threshold?: string
}): Promise<Blob> {
  const { data } = await apiClient.get("/analytics/delivery-performance/export", {
    params,
    responseType: "blob",
  })
  return data as Blob
}
