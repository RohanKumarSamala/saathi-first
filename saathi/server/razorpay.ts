import type { Env } from './env.ts'

/** The parts of a Razorpay payment we rely on. Amounts are in paise. */
export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string }
export type RazorpayOrder = { id: string; amount: number; currency: string; status: string }

/** The two Razorpay calls the server makes; tests swap in a fake. */
export type RazorpayApi = {
  createOrder(input: { amount: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder>
  fetchPayment(id: string): Promise<RazorpayPayment>
}

export function razorpayApi(env: Env): RazorpayApi {
  const auth = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`
  const request = async <T>(path: string, init: RequestInit = {}) => {
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      ...init,
      headers: { authorization: auth, 'content-type': 'application/json' },
    })
    if (!response.ok) throw new Error(`Razorpay ${path} failed: ${response.status} ${await response.text()}`)
    return (await response.json()) as T
  }
  return {
    createOrder: (input) =>
      request<RazorpayOrder>('orders', { method: 'POST', body: JSON.stringify({ ...input, currency: 'INR' }) }),
    fetchPayment: (id) => request<RazorpayPayment>(`payments/${encodeURIComponent(id)}`),
  }
}

const encoder = new TextEncoder()

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Compares in constant time, so the check does not leak how much of a guess was right. */
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return difference === 0
}

/** Razorpay Checkout's proof of payment: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export async function validPaymentSignature(env: Env, orderId: string, paymentId: string, signature: string) {
  return sameText(await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature)
}

/** Webhooks are signed over the raw request body with the webhook secret (X-Razorpay-Signature). */
export async function validWebhookSignature(env: Env, rawBody: string, signature: string) {
  return sameText(await hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature)
}
