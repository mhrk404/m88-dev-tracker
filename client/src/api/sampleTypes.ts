import apiClient from "./client"
import type { SampleType } from "@/types/lookups"

export async function listSampleTypes(): Promise<SampleType[]> {
  const { data } = await apiClient.get<SampleType[]>("/sample-types")
  return data
}

export async function createSampleType(input: { name: string; group?: string }): Promise<SampleType> {
  const { data } = await apiClient.post<SampleType>("/sample-types", input)
  return data
}

export async function updateSampleType(
  id: number,
  input: { name: string; group?: string }
): Promise<SampleType> {
  const { data } = await apiClient.put<SampleType>(`/sample-types/${id}`, input)
  return data
}

export async function deleteSampleType(id: number): Promise<void> {
  await apiClient.delete(`/sample-types/${id}`)
}

