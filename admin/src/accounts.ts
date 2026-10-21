import type { Application, Booking, Stored } from '../../main/src/lib/db'
import { ledger } from '../../main/src/lib/finance'
import type { Settlement } from '../../main/src/lib/staff'

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
      const paid = settlements.filter((row) => row.saathiId === saathi.id).reduce((sum, row) => sum + row.amountPaise, 0)
      return [saathi.id, ledger(visits, paid, now)]
    }),
  )
}

export type Accounts = ReturnType<typeof accountsBySaathi>
