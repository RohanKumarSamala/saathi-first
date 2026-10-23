import { collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { memberships, servicePlans } from '../content/site'
import { monthKey } from './dates'
import { database, type Stored } from './db'

/**
 * Monthly memberships. A customer buys one from the office (WhatsApp / UPI) and an admin switches
 * it on in the admin site. Each calendar month it gives `visitsPerMonth` free visits of up to
 * 2 hours, for the services the plan includes; unused visits expire at the month's end.
 *
 * Stored at memberships/{customer uid}. Only admins create or change the plan and dates.
 * The customer's own browser may only move `used` by one, in the same write that books or
 * cancels a membership visit; firestore.rules checks both sides of that write.
 */
export type MembershipStatus = 'active' | 'cancelled'

export type Membership = {
  uid: string
  planId: string
  planName: string
  visitsPerMonth: number
  status: MembershipStatus
  validFrom: Timestamp
  validUntil: Timestamp
  /** Visits booked per month, keyed "2026-10". Cancelled visits are given back. */
  used: Record<string, number>
  /** The booking whose write last moved `used`; firestore.rules uses it to tie the two together. */
  lastBookingId?: string
  /** Who switched it on and anything the office wants to remember (e.g. "Paid ₹2,999 by UPI"). */
  note?: string
  updatedAt: Timestamp | null
}

/** A membership visit is booked on the 2-hour plan. Mirrors firestore.rules. */
export const MEMBERSHIP_PLAN_ID = 'quick'
export const MEMBERSHIP_HOURS = 2

/** The services a membership plan covers (as listed on the Our Plans page). */
export const servicesCoveredBy = (planId: string) =>
  Object.entries(servicePlans)
    .filter(([, plans]) => plans.memberships.includes(planId))
    .map(([serviceId]) => serviceId)

export { monthKey }

export const monthName = (date: Date) => date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export const isActiveOn = (membership: Membership, date: Date) =>
  membership.status === 'active' &&
  date.getTime() >= membership.validFrom.toMillis() &&
  date.getTime() <= membership.validUntil.toMillis()

/** Free visits left in the month of `date`. */
export const visitsLeft = (membership: Membership, date: Date) =>
  Math.max(membership.visitsPerMonth - (membership.used[monthKey(date)] ?? 0), 0)

/** Whether this membership can pay for a visit to `serviceId` on `date`. */
export const covers = (membership: Membership, serviceId: string, date: Date) =>
  isActiveOn(membership, date) && servicesCoveredBy(membership.planId).includes(serviceId) && visitsLeft(membership, date) > 0

export const planOf = (planId: string) => memberships.find((plan) => plan.id === planId)

/**
 * The catalogue plan a saved membership belongs to today. Plans were renamed on 23 Oct 2026
 * (Basic → Silver, Silver → Golden), so an older record maps to its new plan;
 * the rules accept only current plans, so the admin's next change saves it under the new one.
 */
const renamedPlans: Record<string, string> = { 'basic-care': 'silver-care', 'silver-care': 'golden-care' }
export function currentPlanOf(membership: Pick<Membership, 'planId' | 'visitsPerMonth'>) {
  const plan = planOf(membership.planId)
  if (plan && plan.visitsPerMonth === membership.visitsPerMonth) return plan
  return planOf(renamedPlans[membership.planId] ?? '') ?? memberships[0]
}

/** The signed-in customer's membership, live; null when they have none. */
export function watchMembership(uid: string, onData: (membership: Membership | null) => void, onError: (error: Error) => void) {
  return onSnapshot(
    doc(database(), 'memberships', uid),
    (snapshot) => onData(snapshot.exists() ? ({ used: {}, ...snapshot.data() } as Membership) : null),
    onError,
  )
}

// ---------- Admin ----------

/** Admin: every membership, live. */
export function watchAllMemberships(onData: (rows: Stored<Membership>[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    collection(database(), 'memberships'),
    (snapshot) =>
      onData(snapshot.docs.map((row) => ({ id: row.id, used: {}, createdAt: null, ...row.data() }) as Stored<Membership>)),
    onError,
  )
}

/**
 * Admin: switch a membership on (or change its plan), valid from `from` until the end of the day
 * `months` calendar months later. Keeps the visits already used this month.
 */
export function saveMembership(input: {
  uid: string
  planId: string
  from: Date
  until: Date
  note: string
  used?: Record<string, number>
  status?: MembershipStatus
}) {
  const plan = planOf(input.planId)
  if (!plan) throw new Error('Unknown membership plan.')
  return setDoc(doc(database(), 'memberships', input.uid.trim()), {
    uid: input.uid.trim(),
    planId: plan.id,
    planName: plan.name,
    visitsPerMonth: plan.visitsPerMonth,
    status: input.status ?? 'active',
    validFrom: Timestamp.fromDate(input.from),
    validUntil: Timestamp.fromDate(input.until),
    used: input.used ?? {},
    note: input.note.trim(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Admin: change one membership (stop or resume it, correct a month's count) by saving it whole,
 * so a record from before the plans were renamed moves to its current plan at the same time.
 */
export function updateMembership(
  membership: Membership,
  changes: { status?: MembershipStatus; used?: Record<string, number> },
) {
  return saveMembership({
    uid: membership.uid,
    planId: currentPlanOf(membership).id,
    from: membership.validFrom.toDate(),
    until: membership.validUntil.toDate(),
    note: membership.note ?? '',
    used: changes.used ?? membership.used,
    status: changes.status ?? membership.status,
  })
}

/** The end of the day `months` calendar months after `from`, the usual validity of one purchase. */
export function untilAfterMonths(from: Date, months: number) {
  const end = new Date(from.getFullYear(), from.getMonth() + months, from.getDate() - 1, 23, 59, 59)
  return end
}
