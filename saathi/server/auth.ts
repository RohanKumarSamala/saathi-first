import { createRemoteJWKSet, jwtVerify } from 'jose'
import { HttpError, type Env } from './env.ts'
import { getDocument } from './firestore.ts'

// Google's public keys for Firebase sign-in tokens; jose caches them between requests.
const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

/** Checks the Firebase sign-in token the browser sent and returns the user ID. */
export async function signedInUid(request: Request, env: Env) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) throw new HttpError(401, 'Please sign in again.')
  try {
    const { payload } = await jwtVerify(token, firebaseKeys, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    })
    if (!payload.sub) throw new Error('no subject')
    return payload.sub
  } catch {
    throw new HttpError(401, 'Your sign-in has expired. Please sign in again.')
  }
}

export type Staff = { uid: string; saathiId: string; name: string; phone: string }

/** The Saathi behind a login, as long as an admin has given it access and not switched it off. */
export async function activeSaathi(env: Env, uid: string): Promise<Staff> {
  const staff = await getDocument(env, `staff/${encodeURIComponent(uid)}`)
  if (!staff || staff.active !== true || typeof staff.applicationId !== 'string') {
    throw new HttpError(403, 'This login does not have Saathi access. Please contact the office.')
  }
  return { uid, saathiId: staff.applicationId, name: String(staff.name ?? ''), phone: String(staff.phone ?? '') }
}
