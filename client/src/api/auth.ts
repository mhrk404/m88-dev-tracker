import apiClient from "./client"
import type { LoginCredentials, LoginResponse, AuthUser } from "@/types/auth"

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", credentials)
  return data
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me")
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout")
}
