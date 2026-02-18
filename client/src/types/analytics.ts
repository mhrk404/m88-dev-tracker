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
