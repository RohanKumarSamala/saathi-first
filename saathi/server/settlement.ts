import type { Staff } from './auth.ts'
import { HttpError, type Env } from './env.ts'
import { commit, getDocument, sumWhere } from './firestore.ts'
import type { RazorpayApi, RazorpayPayment } from './razorpay.ts'

/** Razorpay's smallest payment is ₹1. */
const MIN_PAYMENT_PAISE = 100

/**
 * What a Saathi owes right now, worked out on the server from the saved records (never from
 * what the browser says): the company's share of every visit they completed, minus every
 * payment recorded for them. Matches `ledger` in main/src/lib/finance.ts.
 */
export async function amountDue(env: Env, saathiId: string) {
  const [owedPaise, paidPaise] = await Promise.all([
    sumWhere(env, 'bookings', 'assignedSaathiId', saathiId, 'collection.companySharePaise'),
    sumWhere(env, 'settlements', 'saathiId', saathiId, 'amountPaise'),
  ])
  return { owedPaise, paidPaise, duePaise: Math.max(owedPaise - paidPaise, 0) }
}

/** Opens a Razorpay order for exactly the amount due, and remembers who it is for. */
export async function createSettlementOrder(env: Env, staff: Staff, razorpay: RazorpayApi) {
  const { duePaise } = await amountDue(env, staff.saathiId)
  if (duePaise === 0) throw new HttpError(400, 'Nothing is due right now.')
  if (duePaise < MIN_PAYMENT_PAISE) {
    throw new HttpError(400, 'Less than ₹1 is due. It will be added to your next payment.')
  }
  const order = await razorpay.createOrder({
    amount: duePaise,
    receipt: `sf-${Date.now()}`,
    notes: { saathiId: staff.saathiId, uid: staff.uid, purpose: 'Saathi settlement' },
  })
  if (order.amount !== duePaise) throw new Error(`Razorpay order ${order.id} has amount ${order.amount}, expected ${duePaise}`)
  await commit(env, [
    {
      path: `settlementOrders/${order.id}`,
      fields: { saathiId: staff.saathiId, uid: staff.uid, amountPaise: duePaise, status: 'created' },
      stamp: ['createdAt'],
    },
  ])
  return { orderId: order.id, amountPaise: duePaise, keyId: env.RAZORPAY_KEY_ID, name: staff.name, phone: staff.phone }
}

export type RecordResult = { status: 'paid' | 'processing'; amountPaise: number }

/**
 * Records a Razorpay payment against the Saathi's account once Razorpay says the money is
 * captured. Called both when the Saathi's browser reports success and by Razorpay's
 * webhook; the payment ID is the record's ID, so it is only ever counted once.
 */
export async function recordPayment(
  env: Env,
  razorpay: RazorpayApi,
  input: { orderId: string; paymentId: string; payment?: RazorpayPayment; saathiId?: string },
): Promise<RecordResult> {
  const order = await getDocument(env, `settlementOrders/${encodeURIComponent(input.orderId)}`)
  if (!order) throw new HttpError(404, 'We could not find that payment. Please contact the office.')
  if (input.saathiId && order.saathiId !== input.saathiId) throw new HttpError(403, 'That payment belongs to someone else.')

  // Always ask Razorpay (or use the webhook's signed copy); never trust amounts from the browser.
  const payment = input.payment ?? (await razorpay.fetchPayment(input.paymentId))
  if (payment.id !== input.paymentId || payment.order_id !== input.orderId) {
    throw new HttpError(400, 'That payment does not match this order.')
  }
  const amountPaise = Number(order.amountPaise)
  if (payment.status === 'authorized') return { status: 'processing', amountPaise }
  if (payment.status !== 'captured') {
    throw new HttpError(402, 'The payment did not go through. No money was taken; please try again.')
  }
  if (payment.currency !== 'INR' || payment.amount !== amountPaise) {
    throw new Error(`Payment ${payment.id} is ${payment.amount} ${payment.currency}; order ${input.orderId} was ${amountPaise} INR`)
  }

  // mustNotExist: a second report of the same payment changes nothing.
  await commit(env, [
    {
      path: `settlements/${payment.id}`,
      fields: {
        saathiId: String(order.saathiId),
        amountPaise: payment.amount,
        method: 'razorpay',
        razorpayOrderId: input.orderId,
        razorpayPaymentId: payment.id,
        paidByUid: String(order.uid),
      },
      stamp: ['createdAt'],
      mustNotExist: true,
    },
    {
      path: `settlementOrders/${input.orderId}`,
      fields: { status: 'paid', razorpayPaymentId: payment.id },
      stamp: ['paidAt'],
      merge: true,
    },
  ])
  return { status: 'paid', amountPaise }
}
