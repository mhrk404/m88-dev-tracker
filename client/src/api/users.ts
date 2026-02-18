import apiClient from "./client"
import type { CreateUserInput, UpdateUserInput, User } from "@/types/user"

export async function listUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/users")
  return data
}

export async function getUser(id: number): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${id}`)
  return data
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<User>("/users", input)
  return data
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.put<User>(`/users/${id}`, input)
  return data
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}
