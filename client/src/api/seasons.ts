import apiClient from "./client"
import type { Season } from "@/types/lookups"

export async function listSeasons(): Promise<Season[]> {
  const { data } = await apiClient.get<Season[]>("/seasons")
  return data
}

type SeasonPayload = {
  code: string
  year: number
  start_date?: string
  end_date?: string
}

export async function createSeason(input: SeasonPayload): Promise<Season> {
  const { data } = await apiClient.post<Season>("/seasons", input)
  return data
}

export async function updateSeason(id: number, input: SeasonPayload): Promise<Season> {
  const { data } = await apiClient.put<Season>(`/seasons/${id}`, input)
  return data
}

export async function deleteSeason(id: number): Promise<void> {
  await apiClient.delete(`/seasons/${id}`)
}

