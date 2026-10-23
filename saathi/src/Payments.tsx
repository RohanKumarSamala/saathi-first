import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, ShieldCheck, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../main/src/auth/context'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Booking, Stored } from '../../main/src/lib/db'
import { formatRupees, SETTLE_WITHIN_HOURS, type Ledger } from '../../main/src/lib/finance'
import type { Settlement } from '../../main/src/lib/staff'
import { payDue } from './checkout'

const card = 'rounded-2xl bg-white/90 ring-1 ring-gold/25'
const heading = 'mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-ink-muted'
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One part of "How this is worked out": a few named amounts and what they come to. */
function Working({ title, rows, result }: { title: string; rows: { label: string; note: string; value: string; tone?: string }[]; result: string }) {
  return (
    <dl className="grid gap-2">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ink-muted">{title}</dt>
      {rows.map((row) => (
        <dd key={row.label} className="flex items-start justify-between gap-3">
          <span>
            <span className="block font-medium text-ink">{row.label}</span>
            <span className="text-ink-muted">{row.note}</span>
          </span>
          <span className={`shrink-0 font-semibold ${row.tone ?? 'text-ink'}`}>{row.value}</span>
        </dd>
      ))}
      <dd className="border-t border-dashed border-burgundy/15 pt-1 text-right font-semibold">{result}</dd>
    </dl>
  )
}

/**
 * The Saathi's money with Saathi First, from their side: what they owe or are owed right now,
 * what they earned, how the balance is reached, visits still to pay for, and every payment
 * either way.
 */
export function Payments({ account, settlements, visits }: {
  account: Ledger<Stored<Booking>>
  settlements: Stored<Settlement>[]
  visits: Stored<Booking>[]
}) {
  const { user } = useAuth()
  const [state, setState] = useState<'idle' | 'opening'>('idle')
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [now] = useState(() => new Date())

  const pay = async () => {
    if (!user) return
    setState('opening')
    setMessage(null)
    try {
      const outcome = await payDue(user)
      if (outcome.status === 'paid') {
        setMessage({ tone: 'good', text: `Payment of ${formatRupees(outcome.amountPaise)} received. Thank you!` })
      } else if (outcome.status === 'processing') {
        setMessage({ tone: 'good', text: 'Payment made. Razorpay is confirming it; it will show below in a few minutes.' })
      }
    } catch (caught) {
      setMessage({
        tone: 'bad',
        text: `${(caught as Error).message} If money left your account, it will appear here once Razorpay confirms it.`,
      })
    } finally {
      setState('idle')
    }
  }

  const completed = visits.filter((row) => row.status === 'completed' && row.collection && row.completedAt)
  const paidVisits = completed.filter((row) => row.collection!.method !== 'membership')
  const membershipVisits = completed.length - paidVisits.length
  const earned = (rows: Stored<Booking>[]) => rows.reduce((sum, row) => sum + row.collection!.saathiSharePaise, 0)
  const today = completed.filter((row) => row.completedAt!.toDate().toDateString() === now.toDateString())
  const thisMonth = completed.filter((row) => {
    const done = row.completedAt!.toDate()
    return done.getMonth() === now.getMonth() && done.getFullYear() === now.getFullYear()
  })

  // Money that moved: what they paid the company, and what the company paid them.
  const paidByYou = settlements.filter((row) => row.amountPaise > 0).reduce((sum, row) => sum + row.amountPaise, 0)
  const paidToYou = -settlements.filter((row) => row.amountPaise < 0).reduce((sum, row) => sum + row.amountPaise, 0)
  // owedPaise is already net of membership pay; add it back for the company's share alone.
  const ourShare = account.owedPaise + account.membershipCreditPaise
  const earnedNet = account.owedPaise
  const history = [...settlements].sort((a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity))
  const canPay = account.duePaise >= 100

  const youOwe = account.duePaise > 0
  const weOwe = !youOwe && account.creditPaise > 0

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      {/* Where things stand, in one line, with the way to pay when something is due. */}
      <section
        aria-label="Where you stand with Saathi First"
        className={`rounded-3xl p-6 shadow-card ${
          youOwe ? (account.overdue ? 'bg-rosewood text-blush' : 'bg-burgundy text-blush') : weOwe ? 'bg-sky-900 text-white' : 'bg-emerald-700 text-white'
        }`}
      >
        <p className="text-sm font-medium opacity-80">
          {youOwe ? 'You owe Saathi First' : weOwe ? 'Saathi First owes you' : 'You and Saathi First'}
        </p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {youOwe ? formatRupees(account.duePaise) : weOwe ? formatRupees(account.creditPaise) : 'All settled'}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm opacity-90">
          {youOwe ? (
            <>
              <Clock aria-hidden className="size-4" />
              {account.overdue ? 'Overdue since' : 'Please pay by'} {account.nextDue ? friendlyWhen(account.nextDue) : ''}
            </>
          ) : weOwe ? (
            <>
              <CheckCircle2 aria-hidden className="size-4" />
              {account.membershipCreditPaise > 0 ? 'Your pay for membership visits. The office will send it to you.' : 'You paid ahead.'}
            </>
          ) : (
            <>
              <CheckCircle2 aria-hidden className="size-4" /> Nothing to pay and nothing owed to you.
            </>
          )}
        </p>

        {youOwe && (
          <>
            <button
              type="button"
              disabled={!canPay || state !== 'idle'}
              onClick={() => void pay()}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-wine shadow-[0_16px_32px_-14px_rgb(201_162_107/0.9)] [background-image:var(--grad-primary)] disabled:opacity-60"
            >
              <Smartphone aria-hidden className="size-5" />
              {state === 'opening' ? 'Opening Razorpay…' : `Pay ${formatRupees(account.duePaise)} with UPI`}
            </button>
            {!canPay && <p className="mt-2 text-sm opacity-80">Under ₹1 is due; it is added to your next payment.</p>}
            <p className="mt-3 flex items-center gap-1.5 text-xs opacity-75">
              <ShieldCheck aria-hidden className="size-3.5" />
              Paid securely through Razorpay. GPay, PhonePe, Paytm and other UPI apps work. You can also pay at the office.
            </p>
          </>
        )}
      </section>

      {message && (
        <p
          role="status"
          className={`-mt-3 rounded-2xl p-4 text-sm font-medium ${message.tone === 'good' ? 'bg-emerald-100 text-emerald-900' : 'bg-gold/25 text-wine'}`}
        >
          {message.text}
        </p>
      )}

      <section aria-labelledby="earnings">
        <h2 id="earnings" className={heading}>
          Your earnings
        </h2>
        <dl className={`${card} grid grid-cols-2 divide-x divide-burgundy/10`}>
          {[
            ['Today', earned(today), plural(today.length, 'visit')],
            [now.toLocaleDateString('en-IN', { month: 'long' }), earned(thisMonth), plural(thisMonth.length, 'visit')],
          ].map(([label, value, note]) => (
            <div key={label as string} className="px-4 py-3">
              <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
              <dd className="text-xl font-semibold text-emerald-800">{formatRupees(value as number)}</dd>
              <dd className="text-xs text-ink-muted">{note}</dd>
            </div>
          ))}
        </dl>

        <details className="group mt-3 text-sm">
          <summary className="cursor-pointer list-none text-sm font-semibold text-rosewood hover:text-burgundy">
            <span className="group-open:hidden">Show how your balance is worked out</span>
            <span className="hidden group-open:inline">Hide the working</span>
          </summary>
          <div className={`${card} mt-2 grid gap-3 px-4 py-3 text-xs`}>
            <Working
              title="From your visits"
              rows={[
                {
                  label: `Saathi First's share of ${plural(paidVisits.length, 'paid visit')}`,
                  note: 'You collected this from customers for us',
                  value: formatRupees(ourShare),
                },
                {
                  label: `Your pay for ${plural(membershipVisits, 'membership visit')}`,
                  note: 'Customers paid nothing, so we owe you this',
                  value: formatRupees(account.membershipCreditPaise),
                },
              ]}
              result={
                earnedNet > 0
                  ? `So far, you owe us ${formatRupees(earnedNet)}`
                  : earnedNet < 0
                    ? `So far, we owe you ${formatRupees(-earnedNet)}`
                    : 'So far, nothing owed either way'
              }
            />
            <Working
              title="Money that changed hands"
              rows={[
                { label: 'You paid Saathi First', note: 'UPI or at the office', value: `− ${formatRupees(paidByYou)}`, tone: 'text-rosewood' },
                { label: 'Saathi First paid you', note: 'Your pay sent to you', value: `+ ${formatRupees(paidToYou)}`, tone: 'text-emerald-700' },
              ]}
              result={
                paidByYou - paidToYou > 0
                  ? `Overall, you paid us ${formatRupees(paidByYou - paidToYou)}`
                  : paidByYou - paidToYou < 0
                    ? `Overall, we paid you ${formatRupees(paidToYou - paidByYou)}`
                    : 'Overall, nothing has changed hands'
              }
            />
            <p className="flex justify-between gap-3 rounded-lg bg-cream px-2 py-1.5 font-semibold">
              <span>Balance</span>
              <span>{youOwe ? `You owe ${formatRupees(account.duePaise)}` : weOwe ? `We owe you ${formatRupees(account.creditPaise)}` : 'All settled'}</span>
            </p>
          </div>
        </details>
      </section>

      {account.unpaid.length > 0 && (
        <section aria-labelledby="unpaid">
          <h2 id="unpaid" className={heading}>
            Visits not yet paid
          </h2>
          <p className="-mt-2 mb-3 text-sm text-ink-muted">Pay Saathi First's share within {SETTLE_WITHIN_HOURS / 24} days of each visit.</p>
          <ul className={`${card} divide-y divide-burgundy/10`}>
            {account.unpaid.map(({ row, outstandingPaise, sharePaise, dueBy, overdue }) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 grow">
                  <p className="truncate font-semibold">
                    {row.serviceName ?? row.planName} · {row.name}
                  </p>
                  <p className={`text-xs ${overdue ? 'font-semibold text-rosewood' : 'text-ink-muted'}`}>
                    {overdue ? 'Overdue since' : 'Due by'} {friendlyWhen(dueBy)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-wine">{formatRupees(outstandingPaise)}</p>
                  {outstandingPaise !== sharePaise && <p className="text-xs text-ink-muted">of {formatRupees(sharePaise)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="history">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="history" className={`${heading} mb-0`}>
            Payment history
          </h2>
          {history.length > 0 && (
            <p className="text-sm">
              <span className="font-semibold text-rosewood">You paid {formatRupees(paidByYou)}</span>
              <span className="mx-2 text-ink-muted">·</span>
              <span className="font-semibold text-emerald-700">Paid to you {formatRupees(paidToYou)}</span>
            </p>
          )}
        </div>
        {history.length === 0 ? (
          <p className={`${card} p-5 text-center text-sm font-medium text-ink-muted`}>No payments yet.</p>
        ) : (
          <ul className={`${card} divide-y divide-burgundy/10`}>
            {history.map((row) => {
              // Stored from the company's side: positive is money the Saathi paid in, negative a payout to them.
              const toYou = row.amountPaise < 0
              const how =
                row.method === 'razorpay'
                  ? 'Paid by UPI on this website'
                  : row.method === 'payout'
                    ? row.note || 'Sent by the office'
                    : row.note
                      ? `Recorded by the office: ${row.note}`
                      : 'Recorded by the office'
              return (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${toYou ? 'bg-emerald-100 text-emerald-700' : 'bg-rosewood/10 text-rosewood'}`}
                  >
                    {toYou ? <ArrowDownLeft aria-hidden className="size-4" /> : <ArrowUpRight aria-hidden className="size-4" />}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="font-semibold">{toYou ? 'Saathi First paid you' : 'You paid Saathi First'}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {row.createdAt ? friendlyWhen(row.createdAt.toDate()) : 'Just now'} · {how}
                    </p>
                  </div>
                  <p className={`shrink-0 font-semibold ${toYou ? 'text-emerald-700' : 'text-rosewood'}`}>
                    {toYou ? '+' : '−'} {formatRupees(Math.abs(row.amountPaise))}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
