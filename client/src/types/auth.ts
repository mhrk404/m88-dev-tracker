export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthUser {
  id: number
  username: string
  email: string
  full_name: string | null
  department: string | null
  role_id: number
  is_active: boolean
  roleCode: string
  roleName: string
  created_at?: string
}

export interface LoginResponse {
  user: AuthUser
  token: string
  expiresIn: string
}
