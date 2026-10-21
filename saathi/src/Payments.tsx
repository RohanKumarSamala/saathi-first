import { CheckCircle2, Clock, Landmark, ShieldCheck, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../main/src/auth/context'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Booking, Stored } from '../../main/src/lib/db'
import { formatRupees, SETTLE_WITHIN_HOURS, type Ledger } from '../../main/src/lib/finance'
import type { Settlement } from '../../main/src/lib/staff'
import { payDue } from './checkout'

const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

export function Payments({ account, settlements, visits }: {
  account: Ledger<Stored<Booking>>
  settlements: Stored<Settlement>[]
  visits: Stored<Booking>[]
}) {
  const { user } = useAuth()
  const [state, setState] = useState<'idle' | 'opening' | 'confirming'>('idle')
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)

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

  const completed = visits.filter((row) => row.status === 'completed' && row.collection)
  const today = completed.filter((row) => row.completedAt && isToday(row.completedAt.toDate()))
  const sum = (rows: Stored<Booking>[], key: 'totalPaise' | 'saathiSharePaise') =>
    rows.reduce((total, row) => total + (row.collection?.[key] ?? 0), 0)
  const canPay = account.duePaise >= 100

  return (
    <div className="grid gap-6">
      <section
        className={`rounded-3xl p-6 text-blush shadow-card ${account.overdue ? 'bg-rosewood' : 'bg-burgundy'}`}
        aria-label="Amount to pay the company"
      >
        <p className="text-sm font-medium text-blush/80">To pay Saathi First</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">{formatRupees(account.duePaise)}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-blush/85">
          {account.duePaise === 0 ? (
            <>
              <CheckCircle2 aria-hidden className="size-4" /> All settled
              {account.creditPaise > 0 && ` · ${formatRupees(account.creditPaise)} paid ahead`}
            </>
          ) : (
            <>
              <Clock aria-hidden className="size-4" />
              {account.overdue ? 'Overdue since' : 'Pay by'} {account.nextDue ? friendlyWhen(account.nextDue) : ''}
            </>
          )}
        </p>

        {account.duePaise > 0 && (
          <button
            type="button"
            disabled={!canPay || state !== 'idle'}
            onClick={() => void pay()}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-wine shadow-[0_16px_32px_-14px_rgb(201_162_107/0.9)] [background-image:var(--grad-primary)] disabled:opacity-60"
          >
            <Smartphone aria-hidden className="size-5" />
            {state === 'opening' ? 'Opening Razorpay…' : `Pay ${formatRupees(account.duePaise)} with UPI`}
          </button>
        )}
        {account.duePaise > 0 && !canPay && (
          <p className="mt-2 text-sm text-blush/80">Under ₹1 is due; it is added to your next payment.</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blush/70">
          <ShieldCheck aria-hidden className="size-3.5" />
          Paid securely through Razorpay. GPay, PhonePe, Paytm and other UPI apps work.
        </p>
      </section>

      {message && (
        <p
          role="status"
          className={`rounded-2xl p-4 text-sm font-medium ${message.tone === 'good' ? 'bg-emerald-100 text-emerald-900' : 'bg-gold/25 text-wine'}`}
        >
          {message.text}
        </p>
      )}

      <section aria-label="Your earnings" className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-gold/25">
          <p className="text-xs font-semibold text-ink-muted">Collected today</p>
          <p className="mt-1 text-xl font-semibold">{formatRupees(sum(today, 'totalPaise'))}</p>
        </div>
        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-gold/25">
          <p className="text-xs font-semibold text-ink-muted">Your share today</p>
          <p className="mt-1 text-xl font-semibold text-emerald-800">{formatRupees(sum(today, 'saathiSharePaise'))}</p>
        </div>
      </section>

      {account.unpaid.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Not yet paid</h2>
          <p className="mb-3 text-sm text-ink-muted">
            The company’s share of each visit is due within {SETTLE_WITHIN_HOURS / 24} days.
          </p>
          <ul className="grid gap-2">
            {account.unpaid.map(({ row, outstandingPaise, sharePaise, dueBy, overdue }) => (
              <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-gold/20">
                <div className="min-w-0 grow">
                  <p className="truncate font-semibold">{row.serviceName ?? row.planName} · {row.name}</p>
                  <p className={`text-xs ${overdue ? 'font-semibold text-rosewood' : 'text-ink-muted'}`}>
                    Due {friendlyWhen(dueBy)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatRupees(outstandingPaise)}</p>
                  {outstandingPaise !== sharePaise && (
                    <p className="text-xs text-ink-muted">of {formatRupees(sharePaise)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Payment history</h2>
        {settlements.length === 0 ? (
          <p className="rounded-2xl bg-white/90 p-5 text-center text-sm font-medium text-ink-muted ring-1 ring-gold/25">
            No payments yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {settlements.map((row) => (
              <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-gold/20">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                  {row.method === 'razorpay' ? <Smartphone aria-hidden className="size-5" /> : <Landmark aria-hidden className="size-5" />}
                </span>
                <div className="min-w-0 grow">
                  <p className="font-semibold">{formatRupees(row.amountPaise)}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {row.createdAt ? friendlyWhen(row.createdAt.toDate()) : 'Just now'} ·{' '}
                    {row.method === 'razorpay' ? `Razorpay ${row.razorpayPaymentId ?? ''}` : row.note || 'Recorded by the office'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
