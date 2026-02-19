import apiClient from "./client"
import type { StageName } from "@/lib/constants"

export interface StagesResponse {
  sample_id: string
  stages: {
    psi: Record<string, unknown> | null
    sample_development: Record<string, unknown> | null
    pc_review: Record<string, unknown> | null
    costing: Record<string, unknown> | null
    scf: Record<string, unknown> | null
    shipment_to_brand: Record<string, unknown> | null
  }
}

export async function getStages(sampleId: string): Promise<StagesResponse> {
  const { data } = await apiClient.get<StagesResponse>(`/samples/${sampleId}/stages`)
  return data
}

export async function updateStage(
  sampleId: string,
  stage: StageName,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.put<Record<string, unknown>>(
    `/samples/${sampleId}/stages`,
    { stage, ...payload }
  )
  return data
}
