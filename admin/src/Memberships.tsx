import { Crown, Minus, Plus, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { memberships as plans } from '../../main/src/content/site'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Booking, Stored } from '../../main/src/lib/db'
import {
  adjustUsed,
  monthKey,
  monthName,
  saveMembership,
  setMembershipStatus,
  untilAfterMonths,
  type Membership,
} from '../../main/src/lib/membership'

const panel = 'rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25'
const field =
  'h-11 w-full min-w-0 rounded-xl border border-burgundy/20 bg-white px-3 font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40'
const small =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-burgundy ring-1 ring-burgundy/20 transition-colors hover:bg-burgundy/10 disabled:opacity-50'

type Customer = { uid: string; name: string; phone: string }

const day = (date: Date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const inputDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch (caught) {
      setError(`Could not save (${(caught as { code?: string })?.code ?? 'unknown'}). Check admin access and the published rules.`)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

/** Switch a membership on for a customer, after they have paid the office. */
function Activate({ customers, existing, onDone }: { customers: Customer[]; existing: Map<string, Stored<Membership>>; onDone: () => void }) {
  const [uid, setUid] = useState('')
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [from, setFrom] = useState(() => inputDate(new Date()))
  const [months, setMonths] = useState(1)
  const [note, setNote] = useState('')
  const { busy, error, run } = useAction()
  const plan = plans.find((item) => item.id === planId)
  const customer = customers.find((item) => item.uid === uid.trim())
  const start = new Date(`${from}T00:00`)
  const until = untilAfterMonths(start, months)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!uid.trim()) return
    const current = existing.get(uid.trim())
    const label = customer ? `${customer.name} (${customer.phone})` : uid.trim()
    if (!window.confirm(`Switch on ${plan?.name} for ${label}, valid ${day(start)} – ${day(until)}?`)) return
    const saved = await run(() => saveMembership({ uid, planId, from: start, until, note, used: current?.used }))
    if (saved) {
      setUid('')
      setNote('')
      onDone()
    }
  }

  return (
    <form onSubmit={submit} className={`${panel} grid gap-3`}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Crown aria-hidden className="size-5 text-rosewood" /> Switch on a membership
      </h2>
      <p className="text-sm text-ink-muted">
        After the customer has paid. Pick them from people who have booked, or paste the customer ID shown on their My profile page.
      </p>
      <label className="grid gap-1 text-sm font-semibold">
        Customer
        <input
          list="membership-customers"
          value={uid}
          onChange={(event) => setUid(event.target.value)}
          placeholder="Customer ID"
          className={field}
          required
        />
        <datalist id="membership-customers">
          {customers.map((item) => (
            <option key={item.uid} value={item.uid}>
              {item.name} · {item.phone}
            </option>
          ))}
        </datalist>
        {uid.trim() && (
          <span className="text-xs font-normal text-ink-muted">
            {customer ? `${customer.name} · ${customer.phone}` : 'Not seen in bookings yet. Check the ID is exactly as shown on their profile.'}
            {existing.has(uid.trim()) && ' · Already has a membership: this replaces its plan and dates.'}
          </span>
        )}
      </label>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Plan
          <select value={planId} onChange={(event) => setPlanId(event.target.value)} className={field}>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.price}/month · {item.visitsPerMonth} visits
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Starts
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={field} required />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Paid for
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className={field}>
            {[1, 3, 6, 12].map((value) => (
              <option key={value} value={value}>
                {value} month{value === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">
        Note (optional)
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          placeholder="e.g. Paid ₹2,999 by UPI, ref 1234"
          className={field}
        />
      </label>
      <p className="text-sm text-ink-muted">Valid until {day(until)}.</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-[#b3261e]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !uid.trim()}
        className="h-11 rounded-xl bg-burgundy font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Switch on membership'}
      </button>
    </form>
  )
}

function MembershipCard({ row, customer, now }: { row: Stored<Membership>; customer?: Customer; now: Date }) {
  const { busy, error, run } = useAction()
  const key = monthKey(now)
  const used = row.used[key] ?? 0
  const until = row.validUntil.toDate()
  const expired = until.getTime() < now.getTime()
  const state = row.status === 'cancelled' ? 'Stopped' : expired ? 'Expired' : 'Active'
  const tone = state === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-wine/10 text-ink-muted'

  const renew = () => {
    // Renewing an active membership adds a month to its end; an ended one restarts from today.
    const from = expired || row.status === 'cancelled' ? now : row.validFrom.toDate()
    const end = untilAfterMonths(expired || row.status === 'cancelled' ? now : new Date(until.getTime() + 1000), 1)
    if (!window.confirm(`Renew ${row.planName} until ${day(end)}?`)) return
    void run(() => saveMembership({ uid: row.id, planId: row.planId, from, until: end, note: row.note ?? '', used: row.used }))
  }

  return (
    <li className={`${panel} grid gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{customer ? customer.name : 'Customer without bookings yet'}</p>
          <p className="truncate text-xs text-ink-muted">{customer ? customer.phone : row.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{state}</span>
      </div>
      <p className="text-sm">
        <strong>{row.planName}</strong> · {row.visitsPerMonth} visits a month · {day(row.validFrom.toDate())} – {day(until)}
      </p>
      {row.note && <p className="text-xs text-ink-muted">{row.note}</p>}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="grow">
          {monthName(now)}: <strong>{used}</strong> of {row.visitsPerMonth} used
        </span>
        <button type="button" aria-label="One visit fewer" disabled={busy || used === 0} onClick={() => void run(() => adjustUsed(row.id, key, used - 1))} className={small}>
          <Minus aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-label="One visit more"
          disabled={busy || used >= row.visitsPerMonth}
          onClick={() => void run(() => adjustUsed(row.id, key, used + 1))}
          className={small}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={renew} className={small}>
          <RefreshCw aria-hidden className="size-4" /> Renew 1 month
        </button>
        {row.status === 'active' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => window.confirm('Stop this membership? Visits already booked stay booked.') && void run(() => setMembershipStatus(row.id, 'cancelled'))}
            className={small}
          >
            Stop
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void run(() => setMembershipStatus(row.id, 'active'))} className={small}>
            Resume
          </button>
        )}
      </div>
      {row.updatedAt && <p className="text-xs text-ink-muted">Last changed {friendlyWhen(row.updatedAt.toDate())}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-[#b3261e]">
          {error}
        </p>
      )}
    </li>
  )
}

/** Monthly memberships: switch them on after payment, renew, stop, and correct a month's count. */
export function Memberships({ rows, bookings }: { rows: Stored<Membership>[]; bookings: Stored<Booking>[] }) {
  const [term, setTerm] = useState('')
  const [now] = useState(() => new Date())
  const customers = useMemo(() => {
    const byUid = new Map<string, Customer>()
    for (const row of bookings) if (!byUid.has(row.uid)) byUid.set(row.uid, { uid: row.uid, name: row.name, phone: row.phone })
    return [...byUid.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [bookings])
  const customerOf = (uid: string) => customers.find((item) => item.uid === uid)
  const existing = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])
  const needle = term.trim().toLowerCase()
  const visible = rows
    .filter((row) => !needle || `${customerOf(row.id)?.name ?? ''} ${customerOf(row.id)?.phone ?? ''} ${row.id} ${row.planName}`.toLowerCase().includes(needle))
    .sort((a, b) => b.validUntil.toMillis() - a.validUntil.toMillis())

  return (
    <div className="grid gap-6">
      <Activate customers={customers} existing={existing} onDone={() => setTerm('')} />
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Memberships ({rows.length})</h2>
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Search memberships</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Name, phone or plan" className={`${field} pl-9`} />
          </label>
        </div>
        {visible.length === 0 ? (
          <p className={`${panel} text-center text-sm font-medium text-ink-muted`}>
            {rows.length ? 'Nothing matches that search.' : 'No memberships yet.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-3">
            {visible.map((row) => (
              <MembershipCard key={row.id} row={row} customer={customerOf(row.id)} now={now} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
