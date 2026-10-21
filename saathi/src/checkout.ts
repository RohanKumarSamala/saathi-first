import type { User } from 'firebase/auth'

/**
 * Paying the company's share through Razorpay. The server (saathi/functions) works out the
 * amount and opens the order; Razorpay Checkout takes the payment (UPI apps such as GPay
 * open from here on a phone); the server then confirms it with Razorpay and records it.
 */

type CheckoutResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
type CheckoutFailure = { error?: { description?: string; reason?: string } }

type RazorpayCheckout = {
  open(): void
  on(event: 'payment.failed', handler: (response: CheckoutFailure) => void): void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout
  }
}

let checkoutScript: Promise<void> | null = null

/** Razorpay's own script, loaded only when someone pays. */
function loadCheckout() {
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => {
      checkoutScript = null
      reject(new Error('Could not open Razorpay. Check your internet connection and try again.'))
    }
    document.head.append(script)
  })
  return checkoutScript
}

async function api<T>(user: User, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { authorization: `Bearer ${await user.getIdToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new Error('No internet connection. Please try again.')
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Payments are not available right now. Please try again later.')
  return data
}

type Order = { orderId: string; amountPaise: number; keyId: string; name: string; phone: string }
export type PayOutcome = { status: 'paid' | 'processing'; amountPaise: number } | { status: 'closed' }

/** Opens Razorpay for everything due and resolves once the payment is confirmed or the window is closed. */
export async function payDue(user: User): Promise<PayOutcome> {
  const [order] = await Promise.all([api<Order>(user, '/api/settlement/order'), loadCheckout()])
  if (!window.Razorpay) throw new Error('Could not open Razorpay. Please try again.')
  const Checkout = window.Razorpay

  return new Promise<PayOutcome>((resolve, reject) => {
    const checkout = new Checkout({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: 'INR',
      name: 'Saathi First',
      description: 'Company share of your visits',
      prefill: { name: order.name, contact: order.phone, email: user.email ?? undefined },
      theme: { color: '#6b1e2e' },
      // UPI first: on a phone this lists GPay, PhonePe, Paytm and other installed UPI apps.
      config: {
        display: {
          blocks: { upi: { name: 'Pay with any UPI app', instruments: [{ method: 'upi' }] } },
          sequence: ['block.upi'],
          preferences: { show_default_blocks: true },
        },
      },
      retry: { enabled: true },
      handler: (response: CheckoutResponse) => {
        api<PayOutcome>(user, '/api/settlement/verify', response).then(resolve, reject)
      },
      modal: { ondismiss: () => resolve({ status: 'closed' }), confirm_close: true },
    })
    // Razorpay shows the failure and lets them retry; we only need to know if they give up.
    checkout.on('payment.failed', () => undefined)
    checkout.open()
  })
}
