// POST /api/settlement/order — opens a Razorpay order for the company share the signed-in
// Saathi owes. The amount is worked out here from the saved records, never sent by the browser.
import { activeSaathi, signedInUid } from '../../../server/auth.ts'
import { errorResponse, json, type Env } from '../../../server/env.ts'
import { razorpayApi } from '../../../server/razorpay.ts'
import { createSettlementOrder } from '../../../server/settlement.ts'

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const staff = await activeSaathi(env, await signedInUid(request, env))
    return json(await createSettlementOrder(env, staff, razorpayApi(env)))
  } catch (caught) {
    return errorResponse(caught)
  }
}
