/**
 * Settings for the Saathi website's server code (Cloudflare Pages Functions). Set them in
 * Cloudflare: Workers & Pages > the Saathi project > Settings > Variables and Secrets.
 * Mark every key and secret as "Secret" (encrypted). See saathi/README.md.
 */
export type Env = {
  /** The Firebase project ID, e.g. saathi-first. */
  FIREBASE_PROJECT_ID: string
  /** From a Firebase service account key (Project settings > Service accounts). */
  FIREBASE_CLIENT_EMAIL: string
  /** The service account's private key, "-----BEGIN PRIVATE KEY-----...". */
  FIREBASE_PRIVATE_KEY: string
  /** Razorpay Dashboard > Account & Settings > API keys. rzp_test_… while testing. */
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  /** Razorpay Dashboard > Webhooks: the secret typed when adding the webhook. */
  RAZORPAY_WEBHOOK_SECRET: string
  /** Tests only: talk to the local Firestore emulator instead of the real database. */
  FIRESTORE_EMULATOR_HOST?: string
}

/** An error whose message is safe to show the Saathi, with the HTTP status to send. */
export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

/** Turns any thrown error into a JSON reply without leaking internals. */
export function errorResponse(caught: unknown) {
  if (caught instanceof HttpError) return json({ error: caught.message }, caught.status)
  console.error(caught)
  return json({ error: 'Something went wrong on our side. Please try again in a minute.' }, 500)
}
