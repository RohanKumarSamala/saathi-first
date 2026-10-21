import type { User } from 'firebase/auth'
import { createContext, useContext } from 'react'

export type AuthState = {
  user: User | null
  /** Mirrors user.emailVerified so the context updates when it flips after refreshUser. */
  emailVerified: boolean
  /** Mirrors user.phoneNumber and user.displayName for the same reason, after profile changes. */
  phoneNumber: string | null
  displayName: string | null
  email: string | null
  /** The account's sign-in methods (e.g. "google.com,phone"), so linking one re-renders. */
  providers: string
  /** This website asks every account for a verified mobile number before booking (main site). */
  requirePhone: boolean
  /** True while Firebase restores a previous session on page load. */
  loading: boolean
  isAdmin: boolean
  /** Opens the sign-in pop-up. */
  openAuth: () => void
  /** Opens the sign-in pop-up on the email tab with the address filled in. */
  openEmailSignIn: (email: string) => void
  signOut: () => Promise<void>
  /** Re-reads the account from Firebase, e.g. after the visitor confirms their email. */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
