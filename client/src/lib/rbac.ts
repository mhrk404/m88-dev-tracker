// Role checks: canManageUsers, canCreateSample, canEditSample, stageForRole

import type { RoleCode } from "./constants"
import { ROLES, STAGES, type StageName } from "./constants"

export function canManageUsers(roleCode: RoleCode): boolean {
  return roleCode === ROLES.SUPER_ADMIN || roleCode === ROLES.ADMIN
}

export function canCreateSample(roleCode: RoleCode): boolean {
  return (
    roleCode === ROLES.SUPER_ADMIN ||
    roleCode === ROLES.ADMIN ||
    roleCode === ROLES.PD
  )
}

export function canEditSample(roleCode: RoleCode): boolean {
  return (
    roleCode === ROLES.SUPER_ADMIN ||
    roleCode === ROLES.ADMIN ||
    roleCode === ROLES.PD
  )
}

export function stageForRole(roleCode: RoleCode): StageName | null {
  switch (roleCode) {
    case ROLES.PD:
      return STAGES.PRODUCT_BUSINESS_DEV
    case ROLES.MD:
      return STAGES.MERCHANDISING_REVIEW
    case ROLES.TD:
      return STAGES.TECHNICAL_DESIGN
    case ROLES.COSTING:
      return STAGES.COSTING_ANALYSIS
    case ROLES.FACTORY:
      return STAGES.FACTORY_EXECUTION
    default:
      return null
  }
}

export function canAccessLookupsManagement(roleCode: RoleCode): boolean {
  return roleCode === ROLES.SUPER_ADMIN || roleCode === ROLES.ADMIN
}
