import apiClient from "./client"
import type { Role } from "@/types/lookups"

export interface RolePermission {
  role: string
  stage: string
  can_read: boolean
  can_write: boolean
  can_approve: boolean
}

export interface RolePermissionsResponse {
  role: Pick<Role, "id" | "name" | "code">
  permissions: RolePermission[]
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>("/roles")
  return data
}

export async function createRole(input: { code: string; name: string }): Promise<Role> {
  const { data } = await apiClient.post<Role>("/roles", input)
  return data
}

export async function updateRole(id: number, input: { code: string; name: string }): Promise<Role> {
  const { data } = await apiClient.put<Role>(`/roles/${id}`, input)
  return data
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/roles/${id}`)
}

export async function getRolePermissions(id: number): Promise<RolePermissionsResponse> {
  const { data } = await apiClient.get<RolePermissionsResponse>(`/roles/${id}/permissions`)
  return data
}

export async function updateRolePermissions(
  id: number,
  permissions: RolePermission[]
): Promise<void> {
  await apiClient.put(`/roles/${id}/permissions`, { permissions })
}

