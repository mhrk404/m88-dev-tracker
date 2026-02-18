import apiClient from "./client"
import type { Role } from "@/types/lookups"

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

