import type { Application, Booking, Stored } from '../../main/src/lib/db'
import { ledger } from '../../main/src/lib/finance'
import type { Settlement } from '../../main/src/lib/staff'

/** A Saathi with more than this many visits still unpaid is flagged when assigning and on the dashboard. */
export const UNPAID_VISIT_LIMIT = 3

/** Each verified Saathi's account with the company: their completed visits, payments and dues. */
export function accountsBySaathi(
  saathis: Stored<Application>[],
  bookings: Stored<Booking>[],
  settlements: Stored<Settlement>[],
  now = new Date(),
) {
  return new Map(
    saathis.map((saathi) => {
      const visits = bookings.filter((row) => row.assignedSaathiId === saathi.id)
      const theirs = settlements.filter((row) => row.saathiId === saathi.id)
      const paid = theirs.reduce((sum, row) => sum + row.amountPaise, 0)
      // The two directions apart, for the breakdown: money they paid us, and payouts we made them.
      const receivedPaise = theirs.filter((row) => row.amountPaise > 0).reduce((sum, row) => sum + row.amountPaise, 0)
      const paidOutPaise = -theirs.filter((row) => row.amountPaise < 0).reduce((sum, row) => sum + row.amountPaise, 0)
      const done = visits.filter((row) => row.collection && row.completedAt)
      const membershipVisits = done.filter((row) => row.collection!.method === 'membership').length
      // Customers' star ratings of this Saathi, from their completed visits.
      const ratings = visits.map((row) => row.saathiRating).filter((rating): rating is number => typeof rating === 'number')
      const rating = ratings.length ? { average: ratings.reduce((sum, value) => sum + value, 0) / ratings.length, count: ratings.length } : null
      return [
        saathi.id,
        { ...ledger(visits, paid, now), rating, receivedPaise, paidOutPaise, paidVisits: done.length - membershipVisits, membershipVisits },
      ]
    }),
  )
}

export type Accounts = ReturnType<typeof accountsBySaathi>
export type Account = Accounts extends Map<string, infer A> ? A : never

/** Visits whose company share is still unpaid, and whether that is over the limit. */
export const unpaidVisits = (account: Account | undefined) => account?.unpaid.length ?? 0
export const tooManyUnpaid = (account: Account | undefined) => unpaidVisits(account) > UNPAID_VISIT_LIMIT
