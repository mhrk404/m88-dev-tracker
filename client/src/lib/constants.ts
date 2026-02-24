// API_BASE_URL, role codes, stage names

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"

export const ROLES = {
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  PBD: "PBD",
  MD: "MD",
  TD: "TD",
  COSTING: "COSTING",
  FTY: "FTY",
  BRAND: "BRAND",
} as const

export type RoleCode = typeof ROLES[keyof typeof ROLES]

export const STAGES = {
  PSI: "psi",
  SAMPLE_DEVELOPMENT: "sample_development",
  PC_REVIEW: "pc_review",
  COSTING: "costing",
  SHIPMENT_TO_BRAND: "shipment_to_brand",
  DELIVERED_CONFIRMATION: "delivered_confirmation",
} as const

export type StageName = typeof STAGES[keyof typeof STAGES]
