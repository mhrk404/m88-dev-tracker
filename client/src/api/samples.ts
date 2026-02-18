import apiClient from "./client"
import type { Sample, SampleFull, CreateSampleInput, UpdateSampleInput, SampleFilters } from "@/types/sample"

export async function listSamples(filters?: SampleFilters): Promise<Sample[]> {
  const params = new URLSearchParams()
  if (filters?.season_id) params.append("season_id", String(filters.season_id))
  if (filters?.brand_id) params.append("brand_id", String(filters.brand_id))
  if (filters?.division_id) params.append("division_id", String(filters.division_id))
  if (filters?.category_id) params.append("category_id", String(filters.category_id))
  if (filters?.sample_type_id) params.append("sample_type_id", String(filters.sample_type_id))
  
  const query = params.toString()
  const { data } = await apiClient.get<Sample[]>(`/samples${query ? `?${query}` : ""}`)
  return data
}

export async function getSample(sampleId: string): Promise<Sample> {
  const { data } = await apiClient.get<Sample>(`/samples/${sampleId}`)
  return data
}

export async function getSampleFull(sampleId: string): Promise<SampleFull> {
  const { data } = await apiClient.get<SampleFull>(`/samples/${sampleId}/full`)
  return data
}

export async function createSample(input: CreateSampleInput): Promise<Sample> {
  const { data } = await apiClient.post<Sample>("/samples", input)
  return data
}

export async function updateSample(sampleId: string, input: UpdateSampleInput): Promise<Sample> {
  const { data } = await apiClient.put<Sample>(`/samples/${sampleId}`, input)
  return data
}

export async function deleteSample(sampleId: string): Promise<void> {
  await apiClient.delete(`/samples/${sampleId}`)
}
