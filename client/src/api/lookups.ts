import apiClient from "./client"
import type { Lookups, LookupType } from "@/types/lookups"

export async function getLookups(): Promise<Lookups> {
  const { data } = await apiClient.get<Lookups>("/lookups")
  return data
}

export async function getLookupByType<T extends LookupType>(type: T): Promise<Lookups[T]> {
  const { data } = await apiClient.get<Lookups[T]>(`/lookups?type=${type}`)
  return data
}
