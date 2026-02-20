// Dashboard, submission/delivery performance

export interface DashboardStats {
  submission: {
    early: number
    on_time: number
    delay: number
    pending: number
  }
  delivery: {
    early: number
    on_time: number
    delay: number
    pending: number
  }
}

export interface PerformanceMetrics {
  early: number
  on_time: number
  delay: number
  total?: number
}

// Full API response for submission/delivery performance (with filters, summary, byBrand)
export interface PerformanceSummary {
  total: number
  early: number
  on_time: number
  delay: number
  pending: number
  percentage?: {
    early: number
    on_time: number
    delay: number
  }
}

export interface PerformanceByBrand {
  brand_id: number | string
  brand_name: string
  early: number
  on_time: number
  delay: number
  pending: number
  total?: number
  style_count?: number
  percentage?: {
    early: number
    on_time: number
    delay: number
  }
}

export interface PerformanceByProduct {
  product: string
  early: number
  on_time: number
  delay: number
  pending: number
  total?: number
  percentage?: {
    early: number
    on_time: number
    delay: number
  }
}

export interface PerformanceTrendPoint {
  label: string
  year: number
  month: number
  early: number
  on_time: number
  delay: number
  pending: number
  total: number
}

export interface PerformanceFilters {
  brandId?: number
  seasonId?: number
  productCategory?: string
  month?: number
  year?: number
}

export interface SubmissionPerformanceResponse {
  filters: PerformanceFilters
  summary: PerformanceSummary
  byBrand: PerformanceByBrand[]
  byProduct: PerformanceByProduct[]
  trend?: PerformanceTrendPoint[]
}

export interface DeliveryPerformanceResponse {
  filters: PerformanceFilters
  summary: PerformanceSummary
  byBrand: PerformanceByBrand[]
  byProduct: PerformanceByProduct[]
  trend?: PerformanceTrendPoint[]
}
