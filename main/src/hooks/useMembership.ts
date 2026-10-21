import { useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { watchMembership, type Membership } from '../lib/membership'

type State = { uid?: string; membership: Membership | null | undefined; error: string }

/**
 * The signed-in customer's membership, live, and why it could not be read if that failed
 * (e.g. "permission-denied" until firestore.rules is published). `membership` is `undefined`
 * while loading or signed out, `null` when they have none.
 */
export function useMembershipState(): { membership: Membership | null | undefined; error: string } {
  const { user } = useAuth()
  const uid = user?.uid
  const [state, setState] = useState<State>({ membership: undefined, error: '' })

  useEffect(() => {
    if (!uid) return
    return watchMembership(
      uid,
      (membership) => setState({ uid, membership, error: '' }),
      (error) => {
        const code = (error as { code?: string }).code ?? error.message
        console.warn('Could not read the membership:', code)
        setState({ uid, membership: null, error: code })
      },
    )
  }, [uid])

  // A previous account's membership never shows after switching accounts.
  return uid && state.uid === uid ? { membership: state.membership, error: state.error } : { membership: undefined, error: '' }
}

/** Just the membership: `undefined` while loading (or signed out), `null` when there is none. */
export function useMembership(): Membership | null | undefined {
  return useMembershipState().membership
}
