import apiClient from "./client"
import type { Brand } from "@/types/lookups"

export async function listBrands(): Promise<Brand[]> {
  const { data } = await apiClient.get<Brand[]>("/brands")
  return data
}

export async function createBrand(input: { name: string }): Promise<Brand> {
  const { data } = await apiClient.post<Brand>("/brands", input)
  return data
}

export async function updateBrand(id: number, input: { name: string }): Promise<Brand> {
  const { data } = await apiClient.put<Brand>(`/brands/${id}`, input)
  return data
}

export async function deleteBrand(id: number): Promise<void> {
  await apiClient.delete(`/brands/${id}`)
}

