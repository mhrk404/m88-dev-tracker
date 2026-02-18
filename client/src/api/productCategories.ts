import apiClient from "./client"
import type { ProductCategory } from "@/types/lookups"

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<ProductCategory[]>("/product-categories")
  return data
}

export async function createProductCategory(input: { name: string }): Promise<ProductCategory> {
  const { data } = await apiClient.post<ProductCategory>("/product-categories", input)
  return data
}

export async function updateProductCategory(
  id: number,
  input: { name: string }
): Promise<ProductCategory> {
  const { data } = await apiClient.put<ProductCategory>(`/product-categories/${id}`, input)
  return data
}

export async function deleteProductCategory(id: number): Promise<void> {
  await apiClient.delete(`/product-categories/${id}`)
}

