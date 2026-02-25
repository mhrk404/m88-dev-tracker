// Status color utility for consistent color usage across pages

export function getStatusColor(status: string | null | undefined): string {
  const s = (status || "").toUpperCase()

  // Negative/blocked statuses - red
  if (s === "REJECTED" || s === "HOLD" || s === "CANCELLED" || s === "CANCELED" || s === "DROPPED") {
    return "bg-rose-500"
  }

  // Positive/completed statuses - green
  if (
    s === "APPROVED" ||
    s === "PARTIAL_APPROVED" ||
    s.includes("COMPLETE") ||
    s.includes("SENT") ||
    s.includes("SHARED") ||
    s.includes("DELIVERED")
  ) {
    return "bg-emerald-500"
  }

  // In-progress/pending statuses - amber
  if (s.includes("PENDING") || s.includes("REVIEW")) {
    return "bg-amber-500"
  }

  // Initial/development statuses - blue
  if (s === "INITIATED" || s.includes("DEVELOPMENT") || s.includes("PROGRESS")) {
    return "bg-blue-500"
  }

  return "bg-blue-500" // fallback
}

export function getStatusBadgeVariant(status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  const s = (status || "").toUpperCase()

  // Negative/blocked - destructive
  if (s === "REJECTED" || s === "HOLD" || s === "CANCELLED" || s === "CANCELED" || s === "DROPPED") {
    return "destructive"
  }

  // Positive/completed - secondary (default green)
  if (
    s === "APPROVED" ||
    s === "PARTIAL_APPROVED" ||
    s.includes("COMPLETE") ||
    s.includes("SENT") ||
    s.includes("SHARED") ||
    s.includes("DELIVERED")
  ) {
    return "secondary"
  }

  // In-progress/pending - default
  if (s.includes("PENDING") || s.includes("REVIEW")) {
    return "default"
  }

  // Initial/development - outline
  return "outline"
}
