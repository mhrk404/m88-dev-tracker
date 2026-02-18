import { useAuth } from "@/contexts/auth"
import type { RoleCode } from "@/lib/constants"

interface RoleGateProps {
  children: React.ReactNode
  allowedRoles: RoleCode[]
  fallback?: React.ReactNode
}

export default function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.roleCode as RoleCode)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
