import { AlertTriangle, Landmark, Percent, Smartphone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Application, Booking, Stored } from '../../main/src/lib/db'
import { formatRupees } from '../../main/src/lib/finance'
import { setCommissionPercent, type Settlement } from '../../main/src/lib/staff'
import type { Accounts } from './accounts'

const panel = 'rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25'

function ShareSetting({ percent }: { percent: number }) {
  const [value, setValue] = useState(String(percent))
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const parsed = Number(value)
  const valid = /^\d{1,3}$/.test(value) && parsed >= 0 && parsed <= 100

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || parsed === percent) return
    if (!window.confirm(`Change the company share from ${percent}% to ${parsed}%? It applies to visits completed from now on.`)) return
    setState('saving')
    try {
      await setCommissionPercent(parsed)
      setState('saved')
    } catch {
      setState('failed')
    }
  }

  return (
    <form onSubmit={save} className={`${panel} flex flex-wrap items-center gap-3`}>
      <span className="grid size-10 place-items-center rounded-xl bg-burgundy/10 text-burgundy">
        <Percent aria-hidden className="size-5" />
      </span>
      <label htmlFor="share" className="grow text-sm font-semibold">
        Company share of each visit
        <span className="block text-xs font-normal text-ink-muted">Applies to visits completed after you save. Finished visits keep their share.</span>
      </label>
      <input
        id="share"
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          setState('idle')
        }}
        className="h-10 w-20 rounded-xl border border-burgundy/20 bg-white px-3 text-right font-semibold focus-visible:border-burgundy focus-visible:outline-none"
      />
      <span className="font-semibold">%</span>
      <button
        type="submit"
        disabled={!valid || parsed === percent || state === 'saving'}
        className="h-10 rounded-full bg-burgundy px-4 text-sm font-semibold text-blush hover:bg-wine disabled:opacity-50"
      >
        {state === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {state === 'saved' && <p role="status" className="w-full text-xs text-emerald-800">Saved.</p>}
      {state === 'failed' && <p role="alert" className="w-full text-xs text-[#b3261e]">Could not save. Check your admin access.</p>}
      {!valid && <p role="alert" className="w-full text-xs text-[#b3261e]">Use a whole number from 0 to 100.</p>}
    </form>
  )
}

/** Totals, things that need a look, and every payment Saathis have made. */
export function Money({ percent, bookings, settlements, saathis, accounts }: {
  percent: number
  bookings: Stored<Booking>[]
  settlements: Stored<Settlement>[]
  saathis: Stored<Application>[]
  accounts: Accounts
}) {
  const nameOf = (id: string) => saathis.find((saathi) => saathi.id === id)?.name ?? 'Former Saathi'
  const collected = bookings.filter((row) => row.status === 'completed' && row.collection)
  const total = (key: 'totalPaise' | 'companySharePaise') => collected.reduce((sum, row) => sum + (row.collection?.[key] ?? 0), 0)
  const received = settlements.reduce((sum, row) => sum + row.amountPaise, 0)
  const outstanding = [...accounts.values()].reduce((sum, account) => sum + account.duePaise, 0)

  const overdue = saathis.filter((saathi) => accounts.get(saathi.id)?.overdue)
  const unrecorded = bookings.filter((row) => row.status === 'completed' && !row.collection)
  const extras = collected
    .filter((row) => (row.collection?.extraPaise ?? 0) > 0)
    .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
    .slice(0, 20)

  const stats: [string, number][] = [
    ['Collected from customers', total('totalPaise')],
    ['Company share', total('companySharePaise')],
    ['Received from Saathis', received],
    ['Still to receive', outstanding],
  ]

  return (
    <div className="grid gap-6">
      <ShareSetting key={percent} percent={percent} />

      <dl className="grid grid-cols-2 gap-3 nav:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className={panel}>
            <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{formatRupees(value)}</dd>
          </div>
        ))}
      </dl>

      {(overdue.length > 0 || unrecorded.length > 0 || extras.length > 0) && (
        <section className={panel}>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden className="size-5 text-rosewood" /> Needs a look
          </h2>
          <ul className="grid gap-2 text-sm">
            {overdue.map((saathi) => {
              const account = accounts.get(saathi.id)!
              return (
                <li key={saathi.id} className="rounded-xl bg-rosewood/10 px-3 py-2">
                  <strong>{saathi.name}</strong> owes {formatRupees(account.duePaise)}, overdue since{' '}
                  {account.nextDue ? friendlyWhen(account.nextDue) : ''}.
                </li>
              )
            })}
            {unrecorded.map((row) => (
              <li key={row.id} className="rounded-xl bg-gold/20 px-3 py-2">
                {row.name}’s {row.serviceName ?? 'visit'} with {row.assignedSaathiName ?? 'a Saathi'} was completed without a payment
                record (completed before payments were tracked, so no share is counted).
              </li>
            ))}
            {extras.map((row) => (
              <li key={row.id} className="rounded-xl bg-blush px-3 py-2">
                {row.assignedSaathiName} charged {row.name} {formatRupees(row.collection!.extraPaise)} extra: “{row.collection!.extraNote}”
                {row.completedAt && <span className="text-ink-muted"> · {friendlyWhen(row.completedAt.toDate())}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Payments from Saathis</h2>
        {settlements.length === 0 ? (
          <p className={`${panel} text-center text-sm font-medium text-ink-muted`}>No payments yet.</p>
        ) : (
          <ul className="grid gap-2">
            {settlements.map((row) => (
              <li key={row.id} className={`${panel} flex items-center gap-3 py-3`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                  {row.method === 'razorpay' ? <Smartphone aria-hidden className="size-5" /> : <Landmark aria-hidden className="size-5" />}
                </span>
                <div className="min-w-0 grow">
                  <p className="truncate font-semibold">{nameOf(row.saathiId)}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {row.createdAt ? friendlyWhen(row.createdAt.toDate()) : 'Just now'} ·{' '}
                    {row.method === 'razorpay' ? `Razorpay ${row.razorpayPaymentId ?? ''}` : `Recorded: ${row.note ?? ''}`}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{formatRupees(row.amountPaise)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
