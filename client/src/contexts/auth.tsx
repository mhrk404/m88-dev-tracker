import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import type { AuthUser } from "@/types/auth"
import { login as loginApi, getMe, logout as logoutApi } from "@/api/auth"
import type { LoginCredentials } from "@/types/auth"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUser() {
    const token = localStorage.getItem("token")
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const userData = await getMe()
      setUser(userData)
    } catch {
      localStorage.removeItem("token")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  async function login(credentials: LoginCredentials) {
    const res = await loginApi(credentials)
    localStorage.setItem("token", res.token)
    setUser(res.user)
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      // Ignore errors
    }
    localStorage.removeItem("token")
    setUser(null)
  }

  async function refreshUser() {
    await loadUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
