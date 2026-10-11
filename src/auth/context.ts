import type { User } from 'firebase/auth'
import { createContext, useContext } from 'react'

export type AuthState = {
  user: User | null
  /** True while Firebase restores a previous session on page load. */
  loading: boolean
  isAdmin: boolean
  /** Opens the sign-in pop-up. */
  openAuth: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
