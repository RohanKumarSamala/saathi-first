import { sendEmailVerification, type User } from 'firebase/auth'

/**
 * Email and password accounts must confirm their address before booking or
 * applying. Google accounts arrive verified; phone accounts have no email.
 */
export const needsEmailVerification = (user: User, emailVerified: boolean) =>
  Boolean(user.email) && !emailVerified

/** The link in the email brings the visitor back to the page they were on. */
export const sendVerification = (user: User) => sendEmailVerification(user, { url: window.location.href })
