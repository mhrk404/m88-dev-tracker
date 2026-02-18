import apiClient from "./client"
import type { DashboardStats, PerformanceMetrics } from "@/types/analytics"

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>("/analytics/dashboard")
  return data
}

export async function getSubmissionPerformance(params?: {
  brandId?: number
  month?: number
  year?: number
}): Promise<PerformanceMetrics> {
  const { data } = await apiClient.get<PerformanceMetrics>(
    "/analytics/submission-performance",
    { params }
  )
  return data
}

export async function getDeliveryPerformance(params?: {
  brandId?: number
  month?: number
  year?: number
}): Promise<PerformanceMetrics> {
  const { data } = await apiClient.get<PerformanceMetrics>(
    "/analytics/delivery-performance",
    { params }
  )
  return data
}
