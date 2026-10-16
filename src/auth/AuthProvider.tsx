import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import { AuthDialog } from './AuthDialog'
import { AuthContext, type AuthState } from './context'

/**
 * firestore.rules reads email_verified from the sign-in token, which can lag behind
 * the account when the email was confirmed in another tab or on Firebase's page.
 */
async function syncVerifiedClaim(user: User) {
  if (!user.email || !user.emailVerified) return
  try {
    const { claims } = await user.getIdTokenResult()
    if (claims.email_verified !== true) await user.getIdToken(true)
  } catch {
    // Offline: the next booking attempt will refresh the token anyway.
  }
}

async function checkAdmin(user: User) {
  if (!db) return false
  try {
    return (await getDoc(doc(db, 'admins', user.uid))).exists()
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(Boolean(auth))
  /** Null while the sign-in pop-up is closed; `email` pre-fills its email tab. */
  const [dialog, setDialog] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, async (next) => {
      // Resolve the admin flag first so admins never see a "no access" flash.
      if (next) await syncVerifiedClaim(next)
      const admin = next ? await checkAdmin(next) : false
      setUser(next)
      setIsAdmin(admin)
      setLoading(false)
      if (next) setDialog(null)
    })
  }, [])

  // Keeps an already-open pop-up as it is, so a pre-filled email is not wiped.
  const openAuth = useCallback(() => setDialog((current) => current ?? {}), [])
  const openEmailSignIn = useCallback((email: string) => setDialog({ email }), [])
  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth)
  }, [])

  // reload() updates the same User object in place, so a re-render is forced and the
  // fresh flag is read below, where it changes the context value.
  const [, rerender] = useState(0)
  const refreshUser = useCallback(async () => {
    const current = auth?.currentUser
    if (!current) return
    await current.reload()
    // A fresh token carries the new email_verified claim that firestore.rules checks.
    await current.getIdToken(true)
    rerender((count) => count + 1)
  }, [])
  const emailVerified = user?.emailVerified ?? false

  const value = useMemo<AuthState>(
    () => ({ user, emailVerified, loading, isAdmin, openAuth, openEmailSignIn, signOut, refreshUser }),
    [user, emailVerified, loading, isAdmin, openAuth, openEmailSignIn, signOut, refreshUser],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialog && <AuthDialog initialEmail={dialog.email} onClose={() => setDialog(null)} />}
    </AuthContext.Provider>
  )
}
