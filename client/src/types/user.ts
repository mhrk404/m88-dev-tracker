export interface User {
  id: number
  supabase_user_id: string | null
  username: string
  email: string
  full_name: string | null
  department: string | null
  role_id: number | null
  roleCode?: string
  roleName?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  username: string
  email: string
  full_name?: string
  department?: string
  role_id?: number | null
  is_active?: boolean
}

export interface UpdateUserInput {
  username?: string
  email?: string
  full_name?: string
  department?: string
  role_id?: number | null
  is_active?: boolean
}
