import type { Timestamp } from 'firebase/firestore'
import { plans } from '../content/site.ts'

/**
 * Money is always held as whole paise (₹1 = 100 paise) so sums never pick up
 * floating-point errors. Rupees appear only when shown to people.
 */

/** Used until an admin saves a different share in the admin site (config/finance). */
export const DEFAULT_COMMISSION_PERCENT = 20
/** Saathis pay the company's share within this many hours of finishing the visit. */
export const SETTLE_WITHIN_HOURS = 48
/** Largest extra charge a Saathi can record on one visit (₹50,000). Mirrors firestore.rules. */
export const MAX_EXTRA_PAISE = 50_000_00

/** "₹1,299" -> 129900. */
export function priceToPaise(price: string) {
  const digits = price.replace(/[^\d.]/g, '')
  return Math.round(Number(digits) * 100)
}

/** What the customer is billed for each plan, in paise. Mirrors planPaise() in firestore.rules. */
export const planPaise: Record<string, number> = Object.fromEntries(plans.map((plan) => [plan.id, priceToPaise(plan.price)]))

/** Parses what someone types ("150", "150.5", "1,250") into paise, or null if it is not an amount. */
export function rupeesToPaise(input: string) {
  const cleaned = input.replace(/[,\s₹]/g, '')
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

/** ₹1,299 or ₹12.50, Indian digit grouping. */
export function formatRupees(paise: number) {
  const negative = paise < 0
  const absolute = Math.abs(paise)
  const text = (absolute / 100).toLocaleString('en-IN', {
    minimumFractionDigits: absolute % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return `${negative ? '−' : ''}₹${text}`
}

/** The company's share, rounded to the nearest paisa (halves round up). Mirrors firestore.rules. */
export const companyShareOf = (totalPaise: number, percent: number) => Math.floor((totalPaise * percent + 50) / 100)

/** `membership`: the customer's monthly membership covered the visit, so nothing was collected. */
export type PaymentMethod = 'upi' | 'cash' | 'membership'

/** What the Saathi collected on one visit and how it splits. Saved on the booking as `collection`. */
export type Collection = {
  /** The plan price the customer was booked at. */
  billPaise: number
  /** Anything charged on top (e.g. extra time agreed on the spot), with the reason. */
  extraPaise: number
  extraNote?: string
  totalPaise: number
  method: PaymentMethod
  commissionPercent: number
  /**
   * What the Saathi owes the company for this visit. On a membership visit the Saathi collected
   * nothing, so this is minus their share: the company owes it to them. Every total that adds up
   * company shares (the ledger, the payment server) then nets it off without special cases.
   */
  companySharePaise: number
  /** What the Saathi earns from the visit. */
  saathiSharePaise: number
}

export function buildCollection(input: {
  planId: string
  extraPaise: number
  extraNote: string
  method: PaymentMethod
  commissionPercent: number
}): Collection {
  const billPaise = planPaise[input.planId] ?? 0
  // A membership visit has no extras: anything more is booked and paid as a normal visit.
  const extraPaise = input.method === 'membership' ? 0 : input.extraPaise
  const totalPaise = billPaise + extraPaise
  const companyShare = companyShareOf(totalPaise, input.commissionPercent)
  const saathiSharePaise = totalPaise - companyShare
  return {
    billPaise,
    extraPaise,
    ...(extraPaise > 0 ? { extraNote: input.extraNote.trim() } : {}),
    totalPaise,
    method: input.method,
    commissionPercent: input.commissionPercent,
    companySharePaise: input.method === 'membership' ? -saathiSharePaise : companyShare,
    saathiSharePaise,
  }
}

export type LedgerVisit<T> = {
  row: T
  sharePaise: number
  completedAt: Date
  outstandingPaise: number
  dueBy: Date
  /** Still owed after its due time. */
  overdue: boolean
}

/**
 * A Saathi's account with the company. Every completed visit adds the company's share;
 * every payment takes it down. Payments clear the oldest visits first, so each visit
 * knows whether it is settled and when it falls due.
 */
export function ledger<T extends { collection?: Collection; completedAt?: Timestamp }>(
  visits: T[],
  paidPaise: number,
  now = new Date(),
) {
  const recorded = visits.filter((row) => row.collection && row.completedAt)
  // Membership visits carry a negative share (the company owes the Saathi). They count like a
  // payment received up front, so they clear dues rather than appearing as visits to pay for.
  const membershipCreditPaise = recorded
    .filter((row) => row.collection!.companySharePaise < 0)
    .reduce((sum, row) => sum - row.collection!.companySharePaise, 0)
  const owed = recorded
    .filter((row) => row.collection!.companySharePaise >= 0)
    .map((row) => ({ row, sharePaise: row.collection!.companySharePaise, completedAt: row.completedAt!.toDate() }))
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())

  let remaining = paidPaise + membershipCreditPaise
  const items: LedgerVisit<T>[] = owed.map((visit) => {
    const covered = Math.min(visit.sharePaise, Math.max(remaining, 0))
    remaining -= covered
    const dueBy = new Date(visit.completedAt.getTime() + SETTLE_WITHIN_HOURS * 3_600_000)
    const outstandingPaise = visit.sharePaise - covered
    return { ...visit, outstandingPaise, dueBy, overdue: outstandingPaise > 0 && dueBy.getTime() < now.getTime() }
  })

  // Net of membership credits, so it equals the plain sum of shares the payment server uses.
  const owedPaise = owed.reduce((sum, visit) => sum + visit.sharePaise, 0) - membershipCreditPaise
  // What customers paid the Saathi on paid visits (membership visits collect nothing).
  const collectedPaise = owed.reduce((sum, visit) => sum + visit.row.collection!.totalPaise, 0)
  const unpaid = items.filter((item) => item.outstandingPaise > 0)
  const nextDue = unpaid[0]?.dueBy ?? null
  return {
    owedPaise,
    /** The company's share of paid visits alone, before membership visits are netted off. */
    sharePaise: owedPaise + membershipCreditPaise,
    collectedPaise,
    paidPaise,
    /** Earned on membership visits, where the customer paid nothing to the Saathi. */
    membershipCreditPaise,
    /** What the Saathi still has to pay. Never negative. */
    duePaise: Math.max(owedPaise - paidPaise, 0),
    /**
     * What the company owes the Saathi: paid ahead, or earned on membership visits (which add a
     * negative share) and not yet paid out. Used up by the next visits' shares.
     */
    creditPaise: Math.max(paidPaise - owedPaise, 0),
    items,
    unpaid,
    nextDue,
    overdue: Boolean(nextDue && nextDue.getTime() < now.getTime()),
  }
}

export type Ledger<T extends { collection?: Collection; completedAt?: Timestamp }> = ReturnType<typeof ledger<T>>
