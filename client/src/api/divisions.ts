import apiClient from "./client"
import type { Division } from "@/types/lookups"

export async function listDivisions(): Promise<Division[]> {
  const { data } = await apiClient.get<Division[]>("/divisions")
  return data
}

export async function createDivision(input: { name: string }): Promise<Division> {
  const { data } = await apiClient.post<Division>("/divisions", input)
  return data
}

export async function updateDivision(id: number, input: { name: string }): Promise<Division> {
  const { data } = await apiClient.put<Division>(`/divisions/${id}`, input)
  return data
}

export async function deleteDivision(id: number): Promise<void> {
  await apiClient.delete(`/divisions/${id}`)
}

