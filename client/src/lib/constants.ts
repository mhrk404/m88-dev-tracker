// API_BASE_URL, role codes, stage names

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PD: "PD",
  MD: "MD",
  TD: "TD",
  COSTING: "COSTING",
  FACTORY: "FACTORY",
} as const

export type RoleCode = typeof ROLES[keyof typeof ROLES]

export const STAGES = {
  PRODUCT_BUSINESS_DEV: "product_business_dev",
  TECHNICAL_DESIGN: "technical_design",
  FACTORY_EXECUTION: "factory_execution",
  MERCHANDISING_REVIEW: "merchandising_review",
  COSTING_ANALYSIS: "costing_analysis",
} as const

export type StageName = typeof STAGES[keyof typeof STAGES]
