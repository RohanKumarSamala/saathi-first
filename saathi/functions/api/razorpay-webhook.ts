// POST /api/razorpay-webhook — Razorpay calls this when a payment is captured, so a payment
// is recorded even if the Saathi closed the page or lost signal before it confirmed.
// Add it in Razorpay Dashboard > Webhooks with the "payment.captured" event.
import { errorResponse, json, type Env } from '../../server/env.ts'
import { razorpayApi, validWebhookSignature, type RazorpayPayment } from '../../server/razorpay.ts'
import { recordPayment } from '../../server/settlement.ts'
import { getDocument } from '../../server/firestore.ts'

type Event = { event?: string; payload?: { payment?: { entity?: RazorpayPayment } } }

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const raw = await request.text()
    const signature = request.headers.get('x-razorpay-signature') ?? ''
    if (!(await validWebhookSignature(env, raw, signature))) return json({ error: 'bad signature' }, 400)

    const event = JSON.parse(raw) as Event
    const payment = event.payload?.payment?.entity
    if (event.event !== 'payment.captured' || !payment?.order_id) return json({ ignored: true })
    // Payments that are not Saathi settlements (none today) are left alone.
    if (!(await getDocument(env, `settlementOrders/${encodeURIComponent(payment.order_id)}`))) return json({ ignored: true })

    return json(await recordPayment(env, razorpayApi(env), { orderId: payment.order_id, paymentId: payment.id, payment }))
  } catch (caught) {
    // A non-2xx reply makes Razorpay retry later, which is what we want on a temporary failure.
    return errorResponse(caught)
  }
}
