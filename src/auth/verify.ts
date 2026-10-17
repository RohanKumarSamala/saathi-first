import { sendEmailVerification, type User } from 'firebase/auth'

/**
 * Email and password accounts must confirm their address before booking or
 * applying. Google accounts arrive verified; phone accounts have no email.
 */
export const needsEmailVerification = (user: User, emailVerified: boolean) =>
  Boolean(user.email) && !emailVerified

// Firebase refuses to send the email at all when the "return to this page" link points
// at a domain missing from Authentication > Settings > Authorized domains.
const continueUrlRejected = new Set([
  'auth/unauthorized-continue-uri',
  'auth/invalid-continue-uri',
  'auth/missing-continue-uri',
])

/**
 * Sends the verification email. The link brings the visitor back to the page they were on;
 * if Firebase rejects that address, the email is sent anyway with Firebase's own
 * confirmation page, so a domain setting never stops people from verifying.
 */
export async function sendVerification(user: User) {
  try {
    await sendEmailVerification(user, { url: window.location.href })
  } catch (caught) {
    if (!continueUrlRejected.has((caught as { code?: string })?.code ?? '')) throw caught
    await sendEmailVerification(user)
  }
}
