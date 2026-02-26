import apiClient from "./client"
import type { Sample, SampleFull, CreateSampleInput, UpdateSampleInput, SampleFilters } from "@/types/sample"

export type SamplePresenceContext = "view" | "sample_list" | "sample_edit" | "stage_edit"
export type SamplePresenceLockType = "sample_edit" | "stage_edit"

export interface SamplePresenceUser {
  user_id: number
  username: string | null
  full_name: string | null
  role_code: string | null
  context: SamplePresenceContext
  lock_type: SamplePresenceLockType | null
  last_seen_at: string
}

export interface SamplePresenceResponse {
  by_sample: Record<string, SamplePresenceUser[]>
}

export async function listSamples(filters?: SampleFilters): Promise<Sample[]> {
  const params = new URLSearchParams()
  if (filters?.season_id) params.append("season_id", String(filters.season_id))
  if (filters?.brand_id) params.append("brand_id", String(filters.brand_id))
  if (filters?.division) params.append("division", filters.division)
  if (filters?.product_category) params.append("product_category", filters.product_category)
  if (filters?.sample_type) params.append("sample_type", filters.sample_type)
  if (filters?.sample_status) params.append("sample_status", filters.sample_status)

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

export async function getSamplesPresence(sampleIds: string[]): Promise<SamplePresenceResponse> {
  if (sampleIds.length === 0) return { by_sample: {} }
  const query = encodeURIComponent(sampleIds.join(","))
  const { data } = await apiClient.get<SamplePresenceResponse>(`/samples/presence?sample_ids=${query}`)
  return data
}

export async function heartbeatSamplePresence(
  sampleId: string,
  input: { context: SamplePresenceContext; lock_type?: SamplePresenceLockType }
): Promise<void> {
  await apiClient.post(`/samples/${sampleId}/presence/heartbeat`, input)
}

export async function releaseSamplePresence(
  sampleId: string,
  input?: { context?: SamplePresenceContext }
): Promise<void> {
  await apiClient.post(`/samples/${sampleId}/presence/release`, input ?? {})
}
