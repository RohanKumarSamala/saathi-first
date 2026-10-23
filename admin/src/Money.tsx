import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Percent, Wallet, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Application, Booking, Stored } from '../../main/src/lib/db'
import { formatRupees } from '../../main/src/lib/finance'
import { setCommissionPercent, type Settlement } from '../../main/src/lib/staff'
import type { Accounts } from './accounts'

const panel = 'rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25'
const heading = 'mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-ink-muted'

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
        Company share of each paid visit
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

/** One big total at the top of the tab. */
/** One section of the summary bar: a small coloured icon, the amount, and what it is. */
function Total({ icon: Icon, label, value, note, tone }: {
  icon: LucideIcon
  label: string
  value: number
  note: string
  /** Text and icon colours when the amount is not zero. */
  tone: { text: string; icon: string }
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${value ? tone.icon : 'bg-burgundy/[0.06] text-ink-muted'}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
        <dd className={`text-xl font-semibold leading-tight ${value ? tone.text : 'text-ink-muted'}`}>{formatRupees(value)}</dd>
        <dd className="truncate text-xs text-ink-muted">{note}</dd>
      </div>
    </div>
  )
}

/**
 * The money side of the business in plain terms: what customers paid, who owes whom, anything
 * odd, and every payment in or out. The company share setting sits at the bottom.
 */
export function Money({ percent, bookings, settlements, saathis, accounts }: {
  percent: number
  bookings: Stored<Booking>[]
  settlements: Stored<Settlement>[]
  saathis: Stored<Application>[]
  accounts: Accounts
}) {
  const nameOf = (id: string) => saathis.find((saathi) => saathi.id === id)?.name ?? 'Former Saathi'
  const firstOf = (id: string) => nameOf(id).split(' ')[0]
  const paidVisits = bookings.filter((row) => row.status === 'completed' && row.collection && row.collection.method !== 'membership')
  const collected = paidVisits.reduce((sum, row) => sum + row.collection!.totalPaise, 0)

  // Who owes what, biggest first: those who owe us, then those we owe.
  const balances = saathis
    .map((saathi) => ({ saathi, account: accounts.get(saathi.id)! }))
    .filter(({ account }) => account && (account.duePaise > 0 || account.creditPaise > 0))
    .sort((a, b) => b.account.duePaise - a.account.duePaise || b.account.creditPaise - a.account.creditPaise)
  const owedToUs = balances.reduce((sum, { account }) => sum + account.duePaise, 0)
  const owedByUs = balances.reduce((sum, { account }) => sum + account.creditPaise, 0)
  const owing = balances.filter(({ account }) => account.duePaise > 0).length
  const owed = balances.filter(({ account }) => account.creditPaise > 0).length

  const unrecorded = bookings.filter((row) => row.status === 'completed' && !row.collection)
  const extras = paidVisits
    .filter((row) => (row.collection?.extraPaise ?? 0) > 0)
    .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
    .slice(0, 20)

  const history = [...settlements].sort((a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity))
  const moneyIn = settlements.filter((row) => row.amountPaise > 0).reduce((sum, row) => sum + row.amountPaise, 0)
  const moneyOut = -settlements.filter((row) => row.amountPaise < 0).reduce((sum, row) => sum + row.amountPaise, 0)

  return (
    // minmax(0, 1fr): long one-line notes in the lists below shorten with … instead of widening the page.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {/* One compact bar, three sections side by side (stacked on phones). */}
      <dl className={`${panel} grid divide-y divide-burgundy/10 p-0 md:grid-cols-3 md:divide-x md:divide-y-0`}>
        <Total
          icon={Wallet}
          label="Customers paid Saathis"
          value={collected}
          note={`${paidVisits.length} paid visit${paidVisits.length === 1 ? '' : 's'}`}
          tone={{ text: 'text-ink', icon: 'bg-burgundy/10 text-burgundy' }}
        />
        <Total
          icon={ArrowDownLeft}
          label="Saathis owe us"
          value={owedToUs}
          note={owing ? `${owing} Saathi${owing === 1 ? '' : 's'} to collect from` : 'Nothing to collect'}
          tone={{ text: 'text-wine', icon: 'bg-rosewood/15 text-wine' }}
        />
        <Total
          icon={ArrowUpRight}
          label="We owe Saathis"
          value={owedByUs}
          note={owed ? `${owed} Saathi${owed === 1 ? '' : 's'} to pay` : 'Nothing to pay'}
          tone={{ text: 'text-sky-900', icon: 'bg-sky-100 text-sky-900' }}
        />
      </dl>

      <section>
        <h2 className={heading}>Who owes what</h2>
        {balances.length === 0 ? (
          <p className={`${panel} text-center text-sm font-medium text-emerald-800`}>Everyone is settled.</p>
        ) : (
          <ul className={`${panel} divide-y divide-burgundy/10 p-0`}>
            {balances.map(({ saathi, account }) => {
              const theyOwe = account.duePaise > 0
              return (
                <li key={saathi.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0 grow">
                    <p className="truncate font-semibold">{saathi.name}</p>
                    <p className={`text-xs ${account.overdue ? 'font-semibold text-rosewood' : 'text-ink-muted'}`}>
                      {theyOwe
                        ? account.overdue && account.nextDue
                          ? `Overdue since ${friendlyWhen(account.nextDue)}`
                          : `Owes us${account.nextDue ? `, due by ${friendlyWhen(account.nextDue)}` : ''}`
                        : account.membershipCreditPaise > 0
                          ? 'We owe them, for membership visits'
                          : 'We owe them (they paid ahead)'}
                    </p>
                  </div>
                  <p className={`shrink-0 text-lg font-semibold ${theyOwe ? 'text-wine' : 'text-sky-900'}`}>
                    {formatRupees(theyOwe ? account.duePaise : account.creditPaise)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-muted">Record payments and payouts on the Saathis tab.</p>
      </section>

      {(unrecorded.length > 0 || extras.length > 0) && (
        <section>
          <h2 className={`${heading} flex items-center gap-2`}>
            <AlertTriangle aria-hidden className="size-4 text-rosewood" /> Needs a look
          </h2>
          <ul className="grid gap-2 text-sm">
            {unrecorded.map((row) => (
              <li key={row.id} className="rounded-xl bg-gold/20 px-3 py-2">
                {row.name}’s {row.serviceName ?? 'visit'} with {row.assignedSaathiName ?? 'a Saathi'} was completed without a payment
                record, so no share is counted for it.
              </li>
            ))}
            {extras.map((row) => (
              <li key={row.id} className="rounded-xl bg-white/90 px-3 py-2 ring-1 ring-gold/25">
                {row.assignedSaathiName} charged {row.name} {formatRupees(row.collection!.extraPaise)} extra: “{row.collection!.extraNote}”
                {row.completedAt && <span className="text-ink-muted"> · {friendlyWhen(row.completedAt.toDate())}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className={`${heading} mb-0`}>Payment history</h2>
          {history.length > 0 && (
            <p className="text-sm">
              <span className="font-semibold text-emerald-700">In {formatRupees(moneyIn)}</span>
              <span className="mx-2 text-ink-muted">·</span>
              <span className="font-semibold text-rosewood">Out {formatRupees(moneyOut)}</span>
            </p>
          )}
        </div>
        {history.length === 0 ? (
          <p className={`${panel} text-center text-sm font-medium text-ink-muted`}>No payments yet.</p>
        ) : (
          <ul className={`${panel} divide-y divide-burgundy/10 p-0`}>
            {history.map((row) => {
              const incoming = row.amountPaise > 0
              const how =
                row.method === 'razorpay' ? `Paid online${row.razorpayPaymentId ? ` (${row.razorpayPaymentId})` : ''}` : (row.note ?? '')
              return (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${incoming ? 'bg-emerald-100 text-emerald-700' : 'bg-rosewood/10 text-rosewood'}`}
                  >
                    {incoming ? <ArrowDownLeft aria-hidden className="size-4" /> : <ArrowUpRight aria-hidden className="size-4" />}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate font-semibold">
                      {incoming ? `Received from ${firstOf(row.saathiId)}` : `Paid out to ${firstOf(row.saathiId)}`}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {row.createdAt ? friendlyWhen(row.createdAt.toDate()) : 'Just now'}
                      {how && ` · ${how}`}
                    </p>
                  </div>
                  <p className={`shrink-0 font-semibold ${incoming ? 'text-emerald-700' : 'text-rosewood'}`}>
                    {incoming ? '+' : '−'} {formatRupees(Math.abs(row.amountPaise))}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className={heading}>Setting</h2>
        <ShareSetting key={percent} percent={percent} />
      </section>
    </div>
  )
}
