// Role checks: canManageUsers, canCreateSample, canEditSample, stageForRole

import type { RoleCode } from "./constants"
import { ROLES, STAGES, type StageName } from "./constants"

export function canManageUsers(roleCode: RoleCode): boolean {
  return roleCode === ROLES.ADMIN
}

export function canCreateSample(roleCode: RoleCode): boolean {
  return (
    roleCode === ROLES.ADMIN ||
    roleCode === ROLES.PBD
  )
}

export function canEditSample(roleCode: RoleCode): boolean {
  return (
    roleCode === ROLES.ADMIN ||
    roleCode === ROLES.PBD
  )
}

export function stageForRole(roleCode: RoleCode): StageName | null {
  switch (roleCode) {
    case ROLES.PBD:
      return null
    case ROLES.MD:
      return STAGES.PC_REVIEW
    case ROLES.TD:
      return STAGES.PSI
    case ROLES.COSTING:
      return STAGES.COSTING
    case ROLES.FTY:
      return STAGES.SAMPLE_DEVELOPMENT
    default:
      return null
  }
}

export function canAccessLookupsManagement(roleCode: RoleCode): boolean {
  return roleCode === ROLES.ADMIN
}
