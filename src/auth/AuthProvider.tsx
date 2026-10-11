import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import { AuthDialog } from './AuthDialog'
import { AuthContext, type AuthState } from './context'

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
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, async (next) => {
      // Resolve the admin flag first so admins never see a "no access" flash.
      const admin = next ? await checkAdmin(next) : false
      setUser(next)
      setIsAdmin(admin)
      setLoading(false)
      if (next) setDialogOpen(false)
    })
  }, [])

  const openAuth = useCallback(() => setDialogOpen(true), [])
  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, loading, isAdmin, openAuth, signOut }),
    [user, loading, isAdmin, openAuth, signOut],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialogOpen && <AuthDialog onClose={() => setDialogOpen(false)} />}
    </AuthContext.Provider>
  )
}
