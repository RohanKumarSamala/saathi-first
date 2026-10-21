// Tests the Saathi website's payment server code against the local Firestore emulator,
// with a fake Razorpay. Run with: npm run test:rules (it starts the emulator).
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { beforeEach, describe, test } from 'node:test'
import type { Env } from '../saathi/server/env.ts'
import { commit, getDocument } from '../saathi/server/firestore.ts'
import { validPaymentSignature, validWebhookSignature, type RazorpayApi, type RazorpayPayment } from '../saathi/server/razorpay.ts'
import { amountDue, createSettlementOrder, recordPayment } from '../saathi/server/settlement.ts'
import { buildCollection, companyShareOf, ledger, planPaise, rupeesToPaise } from '../main/src/lib/finance.ts'

const env: Env = {
  FIREBASE_PROJECT_ID: 'demo-saathi-first',
  FIREBASE_CLIENT_EMAIL: '',
  FIREBASE_PRIVATE_KEY: '',
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'test_secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8181',
}

const staff = { uid: 'ravi', saathiId: 's1', name: 'Ravi Kumar', phone: '9123456780' }

/** A pretend Razorpay that remembers its orders and lets tests decide each payment. */
function fakeRazorpay() {
  const orders = new Map<string, number>()
  const payments = new Map<string, RazorpayPayment>()
  let count = 0
  const api: RazorpayApi = {
    async createOrder({ amount }) {
      const id = `order_${++count}`
      orders.set(id, amount)
      return { id, amount, currency: 'INR', status: 'created' }
    },
    async fetchPayment(id) {
      const payment = payments.get(id)
      if (!payment) throw new Error('no such payment')
      return payment
    },
  }
  const pay = (orderId: string, status = 'captured', amount = orders.get(orderId) ?? 0) => {
    const id = `pay_${++count}`
    payments.set(id, { id, order_id: orderId, amount, currency: 'INR', status })
    return id
  }
  return { api, pay }
}

async function clearDatabase() {
  const response = await fetch(
    `http://${env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  assert.ok(response.ok)
}

/** A completed visit with the company's share in paise, stored the way the rules require. */
const completedVisit = (id: string, saathiId: string, companySharePaise: number) =>
  commit(env, [
    { path: `bookings/${id}`, fields: { assignedSaathiId: saathiId, status: 'completed', collection: { companySharePaise } } },
  ])

describe('money helpers', () => {
  test('plan prices are read in paise', () => {
    assert.deepEqual(planPaise, { property: 9900, quick: 24900, care: 49900, day: 99900, extended: 129900 })
  })
  test('typed amounts become exact paise', () => {
    assert.equal(rupeesToPaise('150'), 15000)
    assert.equal(rupeesToPaise('150.5'), 15050)
    assert.equal(rupeesToPaise('₹1,250.75'), 125075)
    assert.equal(rupeesToPaise('0.1'), 10)
    assert.equal(rupeesToPaise('-5'), null)
    assert.equal(rupeesToPaise('1.234'), null)
    assert.equal(rupeesToPaise('abc'), null)
  })
  test('the company share rounds to the nearest paisa, halves up', () => {
    assert.equal(companyShareOf(49900, 20), 9980)
    assert.equal(companyShareOf(24901, 33), 8217)
    assert.equal(companyShareOf(50, 1), 1) // 0.5 paise rounds up
    assert.equal(companyShareOf(49, 1), 0)
  })
  test('a collection always adds up', () => {
    const c = buildCollection({ planId: 'care', extraPaise: 10000, extraNote: ' One extra hour ', method: 'cash', commissionPercent: 20 })
    assert.deepEqual(c, {
      billPaise: 49900, extraPaise: 10000, extraNote: 'One extra hour', totalPaise: 59900,
      method: 'cash', commissionPercent: 20, companySharePaise: 11980, saathiSharePaise: 47920,
    })
    assert.equal(c.companySharePaise + c.saathiSharePaise, c.totalPaise)
  })
  test('payments clear the oldest visits first, and each visit is due 48 hours after it ends', () => {
    const at = (iso: string) => ({ toDate: () => new Date(iso) }) as never
    const visit = (share: number, iso: string) => ({ collection: { companySharePaise: share } as never, completedAt: at(iso) })
    const book = ledger([visit(5000, '2026-10-02T10:00:00Z'), visit(9980, '2026-10-01T10:00:00Z')], 12000, new Date('2026-10-04T09:00:00Z'))
    assert.equal(book.owedPaise, 14980)
    assert.equal(book.duePaise, 2980)
    assert.equal(book.unpaid.length, 1)
    assert.equal(book.unpaid[0].outstandingPaise, 2980)
    assert.equal(book.nextDue?.toISOString(), '2026-10-04T10:00:00.000Z')
    assert.equal(book.overdue, false)
    assert.equal(ledger([visit(100, '2026-10-01T10:00:00Z')], 0, new Date('2026-10-03T11:00:00Z')).overdue, true)
    assert.equal(ledger([visit(100, '2026-10-01T10:00:00Z')], 300).creditPaise, 200)
  })
})

describe('Razorpay signatures', () => {
  test('a genuine Checkout signature is accepted and a forged one refused', async () => {
    const good = createHmac('sha256', env.RAZORPAY_KEY_SECRET).update('order_1|pay_1').digest('hex')
    assert.equal(await validPaymentSignature(env, 'order_1', 'pay_1', good), true)
    assert.equal(await validPaymentSignature(env, 'order_1', 'pay_2', good), false)
    assert.equal(await validPaymentSignature(env, 'order_1', 'pay_1', 'f'.repeat(64)), false)
    assert.equal(await validPaymentSignature(env, 'order_1', 'pay_1', ''), false)
  })
  test('webhooks are checked against the raw body', async () => {
    const body = '{"event":"payment.captured"}'
    const good = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex')
    assert.equal(await validWebhookSignature(env, body, good), true)
    assert.equal(await validWebhookSignature(env, `${body} `, good), false)
  })
})

describe('settling the company share', () => {
  beforeEach(clearDatabase)

  test('the amount due is every completed visit’s share minus payments, for this Saathi only', async () => {
    await completedVisit('b1', 's1', 9980)
    await completedVisit('b2', 's1', 4980)
    await completedVisit('b3', 's2', 99999)
    await commit(env, [{ path: 'settlements/pay_old', fields: { saathiId: 's1', amountPaise: 5000 } }])
    assert.deepEqual(await amountDue(env, 's1'), { owedPaise: 14960, paidPaise: 5000, duePaise: 9960 })
  })

  test('an order is opened for exactly the amount due and paid once', async () => {
    await completedVisit('b1', 's1', 9980)
    const razorpay = fakeRazorpay()
    const order = await createSettlementOrder(env, staff, razorpay.api)
    assert.equal(order.amountPaise, 9980)
    assert.equal((await getDocument(env, `settlementOrders/${order.orderId}`))?.saathiId, 's1')

    const paymentId = razorpay.pay(order.orderId)
    assert.deepEqual(await recordPayment(env, razorpay.api, { orderId: order.orderId, paymentId, saathiId: 's1' }), {
      status: 'paid', amountPaise: 9980,
    })
    // The webhook reporting the same payment again does not count it twice.
    await recordPayment(env, razorpay.api, { orderId: order.orderId, paymentId })
    assert.equal((await amountDue(env, 's1')).duePaise, 0)
    const saved = await getDocument(env, `settlements/${paymentId}`)
    assert.equal(saved?.amountPaise, 9980)
    assert.equal(saved?.method, 'razorpay')
    await assert.rejects(createSettlementOrder(env, staff, razorpay.api), /Nothing is due/)
  })

  test('nothing is recorded until Razorpay has captured the money', async () => {
    await completedVisit('b1', 's1', 9980)
    const razorpay = fakeRazorpay()
    const order = await createSettlementOrder(env, staff, razorpay.api)
    const pending = razorpay.pay(order.orderId, 'authorized')
    assert.equal((await recordPayment(env, razorpay.api, { orderId: order.orderId, paymentId: pending })).status, 'processing')
    const failed = razorpay.pay(order.orderId, 'failed')
    await assert.rejects(recordPayment(env, razorpay.api, { orderId: order.orderId, paymentId: failed }), /did not go through/)
    assert.equal((await amountDue(env, 's1')).duePaise, 9980)
  })

  test('a payment for a different amount, order or Saathi is refused', async () => {
    await completedVisit('b1', 's1', 9980)
    const razorpay = fakeRazorpay()
    const order = await createSettlementOrder(env, staff, razorpay.api)
    const short = razorpay.pay(order.orderId, 'captured', 100)
    await assert.rejects(recordPayment(env, razorpay.api, { orderId: order.orderId, paymentId: short }))
    const good = razorpay.pay(order.orderId)
    await assert.rejects(recordPayment(env, razorpay.api, { orderId: order.orderId, paymentId: good, saathiId: 's2' }), /someone else/)
    await assert.rejects(recordPayment(env, razorpay.api, { orderId: 'order_unknown', paymentId: good }), /could not find/)
    assert.equal((await amountDue(env, 's1')).duePaise, 9980)
  })

  test('paying twice for the same dues leaves a credit, not a negative due', async () => {
    await completedVisit('b1', 's1', 9980)
    const razorpay = fakeRazorpay()
    const first = await createSettlementOrder(env, staff, razorpay.api)
    const second = await createSettlementOrder(env, staff, razorpay.api)
    await recordPayment(env, razorpay.api, { orderId: first.orderId, paymentId: razorpay.pay(first.orderId) })
    await recordPayment(env, razorpay.api, { orderId: second.orderId, paymentId: razorpay.pay(second.orderId) })
    assert.deepEqual(await amountDue(env, 's1'), { owedPaise: 9980, paidPaise: 19960, duePaise: 0 })
  })

  test('under ₹1 cannot be paid through Razorpay and waits for the next payment', async () => {
    await completedVisit('b1', 's1', 50)
    await assert.rejects(createSettlementOrder(env, staff, fakeRazorpay().api), /Less than ₹1/)
  })
})
