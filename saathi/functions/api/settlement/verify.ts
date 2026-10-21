// POST /api/settlement/verify — after Razorpay Checkout succeeds, checks Razorpay's signature,
// confirms the payment with Razorpay itself and records it on the Saathi's account.
import { activeSaathi, signedInUid } from '../../../server/auth.ts'
import { errorResponse, HttpError, json, type Env } from '../../../server/env.ts'
import { razorpayApi, validPaymentSignature } from '../../../server/razorpay.ts'
import { recordPayment } from '../../../server/settlement.ts'

type Body = { razorpay_order_id?: unknown; razorpay_payment_id?: unknown; razorpay_signature?: unknown }

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const staff = await activeSaathi(env, await signedInUid(request, env))
    const body = (await request.json().catch(() => ({}))) as Body
    const orderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : ''
    const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : ''
    const signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : ''
    if (!orderId || !paymentId || !(await validPaymentSignature(env, orderId, paymentId, signature))) {
      throw new HttpError(400, 'We could not confirm that payment. If money was taken, it will show here shortly.')
    }
    return json(await recordPayment(env, razorpayApi(env), { orderId, paymentId, saathiId: staff.saathiId }))
  } catch (caught) {
    return errorResponse(caught)
  }
}
