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
  month?: number
  year?: number
}): Promise<SubmissionPerformanceResponse> {
  const { data } = await apiClient.get<SubmissionPerformanceResponse>(
    "/analytics/submission-performance",
    { params }
  )
  return data
}

export async function getDeliveryPerformance(params?: {
  brandId?: number
  month?: number
  year?: number
}): Promise<DeliveryPerformanceResponse> {
  const { data } = await apiClient.get<DeliveryPerformanceResponse>(
    "/analytics/delivery-performance",
    { params }
  )
  return data
}
