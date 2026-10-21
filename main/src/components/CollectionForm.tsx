import { Banknote, Check, Crown, QrCode } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import type { Booking } from '../lib/db'
import {
  buildCollection,
  formatRupees,
  MAX_EXTRA_PAISE,
  planPaise,
  rupeesToPaise,
  type Collection,
  type PaymentMethod,
} from '../lib/finance'

const methods: { id: Exclude<PaymentMethod, 'membership'>; label: string; icon: typeof QrCode }[] = [
  { id: 'upi', label: 'UPI / QR', icon: QrCode },
  { id: 'cash', label: 'Cash', icon: Banknote },
]

const field =
  'h-12 w-full min-w-0 rounded-xl border border-burgundy/20 bg-white px-4 text-base font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40'

/**
 * Finishing a visit: the plan amount is fixed, any extra needs a reason, and the split
 * between the company and the Saathi is shown before anything is saved. Used on the Saathi
 * website, and by admins completing a visit for a Saathi.
 */
export function CollectionForm({ booking, commissionPercent, onSave, onCancel, by = 'saathi' }: {
  booking: Pick<Booking, 'planId' | 'planName' | 'paidBy'>
  commissionPercent: number
  onSave: (collection: Collection) => Promise<void>
  onCancel: () => void
  by?: 'saathi' | 'admin'
}) {
  if (booking.paidBy === 'membership') {
    return <MembershipCompletion booking={booking} commissionPercent={commissionPercent} onSave={onSave} onCancel={onCancel} by={by} />
  }
  return <PaidCompletion booking={booking} commissionPercent={commissionPercent} onSave={onSave} onCancel={onCancel} by={by} />
}

type CompletionProps = Parameters<typeof CollectionForm>[0] & { by: 'saathi' | 'admin' }

/**
 * A membership visit: the customer's membership paid, so nothing is collected and there are
 * no extras. The company owes the Saathi their usual share, shown before saving.
 */
function MembershipCompletion({ booking, commissionPercent, onSave, onCancel, by }: CompletionProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const collection = buildCollection({ planId: booking.planId, extraPaise: 0, extraNote: '', method: 'membership', commissionPercent })
  const row = 'flex items-baseline justify-between gap-3'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(collection)
    } catch {
      setError('That did not save. Check your internet connection and try again.')
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 rounded-2xl bg-blush/70 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Crown aria-hidden className="size-5 text-rosewood" />
        Membership visit: nothing to collect
      </p>
      <p className="text-sm text-ink-muted">
        The customer’s monthly membership pays for this visit. Do not take money for it. If they want extra time, ask them to
        book it separately.
      </p>
      <dl className="grid gap-1.5 rounded-xl bg-white p-4 text-sm">
        <div className={`${row} text-ink-muted`}>
          <dt>Visit value ({booking.planName})</dt>
          <dd>{formatRupees(collection.totalPaise)}</dd>
        </div>
        <div className={`${row} font-semibold text-emerald-800`}>
          <dt>{by === 'saathi' ? 'Saathi First pays you' : 'Saathi First pays the Saathi'}</dt>
          <dd>{formatRupees(collection.saathiSharePaise)}</dd>
        </div>
      </dl>
      {error && (
        <p role="alert" className="text-sm font-medium text-[#b3261e]">
          {error}
        </p>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-burgundy font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-60"
        >
          <Check aria-hidden className="size-5" />
          {busy ? 'Saving…' : 'Complete visit'}
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-xl px-4 font-semibold text-ink-muted hover:bg-wine/10">
          Back
        </button>
      </div>
    </form>
  )
}

/** A paid visit: the plan amount is fixed, extras need a reason, and the split is shown first. */
function PaidCompletion({ booking, commissionPercent, onSave, onCancel, by }: CompletionProps) {
  const id = useId()
  const [extra, setExtra] = useState('')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const billPaise = planPaise[booking.planId]
  const extraPaise = extra.trim() ? rupeesToPaise(extra) : 0
  const extraValid = extraPaise !== null && extraPaise <= MAX_EXTRA_PAISE
  const collection = buildCollection({
    planId: booking.planId,
    extraPaise: extraValid ? (extraPaise ?? 0) : 0,
    extraNote: note,
    method,
    commissionPercent,
  })
  const you = by === 'saathi' ? 'I' : 'The Saathi'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (billPaise === undefined) return setError('This booking has an unknown plan. Please call the office.')
    if (!extraValid) return setError('Enter the extra amount in rupees, e.g. 150 or 150.50.')
    if ((extraPaise ?? 0) > 0 && note.trim().length < 3) return setError('Say what the extra amount was for.')
    if (!confirmed) return setError(`Tick the box to confirm ${formatRupees(collection.totalPaise)} was received.`)
    setBusy(true)
    setError('')
    try {
      await onSave(collection)
    } catch {
      setError('That did not save. Check your internet connection and try again.')
      setBusy(false)
    }
  }

  const row = 'flex items-baseline justify-between gap-3'

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 rounded-2xl bg-blush/70 p-4">
      <p className={`${row} font-semibold`}>
        <span>{booking.planName}</span>
        <span>{formatRupees(billPaise ?? 0)}</span>
      </p>

      <div className="grid gap-2">
        <label htmlFor={`${id}-extra`} className="text-sm font-semibold text-ink-muted">
          Extra charged (if any)
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-ink-muted">
            ₹
          </span>
          <input
            id={`${id}-extra`}
            inputMode="decimal"
            placeholder="0"
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            className={`${field} pl-8`}
          />
        </div>
        {(extraPaise ?? 0) > 0 && (
          <input
            aria-label="What the extra amount was for"
            placeholder="What was it for? e.g. 1 extra hour"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={field}
          />
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink-muted">Customer paid by</legend>
        <div className="grid grid-cols-2 gap-2">
          {methods.map(({ id: value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={method === value}
              onClick={() => setMethod(value)}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${
                method === value ? 'bg-burgundy text-blush' : 'bg-white text-burgundy ring-1 ring-burgundy/20'
              }`}
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <dl className="grid gap-1.5 rounded-xl bg-white p-4 text-sm">
        <div className={`${row} text-base font-semibold`}>
          <dt>Total received</dt>
          <dd>{formatRupees(collection.totalPaise)}</dd>
        </div>
        <div className={`${row} text-ink-muted`}>
          <dt>Company share ({commissionPercent}%)</dt>
          <dd>{formatRupees(collection.companySharePaise)}</dd>
        </div>
        <div className={`${row} font-semibold text-emerald-800`}>
          <dt>{by === 'saathi' ? 'Your share' : 'Saathi’s share'}</dt>
          <dd>{formatRupees(collection.saathiSharePaise)}</dd>
        </div>
      </dl>

      <label className="flex items-start gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-burgundy"
        />
        {you} received {formatRupees(collection.totalPaise)} from the customer.
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-[#b3261e]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-burgundy font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-60"
        >
          <Check aria-hidden className="size-5" />
          {busy ? 'Saving…' : 'Complete visit'}
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-xl px-4 font-semibold text-ink-muted hover:bg-wine/10">
          Back
        </button>
      </div>
    </form>
  )
}
