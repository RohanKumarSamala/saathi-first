import { CalendarClock, CircleCheck, Hourglass, MessageCircle, Play, UserRoundCheck, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { services } from '../../content/site'
import { friendlyWhen, whatsappLink } from '../../lib/contact'
import { hoursLabel, planForHours } from '../../lib/pricing'
import {
  approveMoreTime,
  assignSaathi,
  declineMoreTime,
  cancelBooking,
  markCompleted,
  markStarted,
  publicName,
  type Application,
  type Booking,
  type Stored,
} from '../../lib/db'
import { isValidIndianMobile } from '../../lib/enquiry'

/** "2026-10-18T10:30" in local time, the format a datetime-local input expects. */
function toInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fieldClass =
  'w-full rounded-2xl border border-burgundy/20 bg-white px-4 py-3 font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30'
const labelClass = 'mb-1.5 block text-sm font-semibold text-ink-muted'
const smallButton =
  'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 disabled:pointer-events-none disabled:opacity-50'

/**
 * Admin controls for one booking: assign a verified Saathi with a visit time and the
 * number the customer will WhatsApp, then mark the visit started and completed.
 */
export function BookingAssignment({ row, saathis }: { row: Stored<Booking>; saathis: Stored<Application>[] }) {
  // Saathis who offer this booking's service are listed first.
  const ordered = [...saathis].sort(
    (a, b) =>
      Number((b.services ?? []).includes(row.serviceId ?? '')) - Number((a.services ?? []).includes(row.serviceId ?? '')),
  )
  const initialId = row.assignedSaathiId || (saathis.some((s) => s.id === row.saathiId) ? row.saathiId : '') || ''
  const [saathiId, setSaathiId] = useState(initialId)
  const [phone, setPhone] = useState(row.assignedSaathiPhone ?? saathis.find((s) => s.id === initialId)?.mobile ?? '')
  // Start from the time the customer asked for; the admin can move it after calling them.
  const requested = row.scheduledAt ?? row.preferredStart
  const [when, setWhen] = useState(requested ? toInputValue(requested.toDate()) : '')
  const [editing, setEditing] = useState(!row.assignedSaathiId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch {
      setError('That did not save. Check your connection and admin access, then try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const chooseSaathi = (id: string) => {
    setSaathiId(id)
    const picked = saathis.find((s) => s.id === id)
    if (picked) setPhone(picked.mobile)
  }

  const onAssign = async (event: FormEvent) => {
    event.preventDefault()
    const picked = saathis.find((s) => s.id === saathiId)
    const scheduledAt = new Date(when)
    if (!picked) return setError('Choose a verified Saathi.')
    if (!isValidIndianMobile(phone)) return setError('Enter a valid 10-digit WhatsApp number for the Saathi.')
    if (!when || Number.isNaN(scheduledAt.getTime())) return setError('Choose the date and time of the visit.')
    const saved = await run(() =>
      assignSaathi(row.id, { saathiId: picked.id, name: publicName(picked.name), phone, scheduledAt }),
    )
    if (saved) setEditing(false)
  }

  const onCancel = () => {
    if (window.confirm(`Cancel ${row.name}'s ${row.serviceName ?? 'booking'}? The customer will see it as cancelled.`)) {
      void run(() => cancelBooking(row.id, 'admin'))
    }
  }

  const service = services.find((item) => item.id === row.serviceId)?.name ?? row.serviceName ?? 'their booking'
  const customerMessage = row.scheduledAt
    ? `Hello ${row.name}, this is Saathi First about your ${service} on ${friendlyWhen(row.scheduledAt.toDate())}.`
    : `Hello ${row.name}, this is Saathi First about your ${service} request.`
  const open = row.status === 'new' || row.status === 'assigned'

  return (
    <div className="mt-2 rounded-3xl bg-blush/60 p-5 ring-1 ring-gold/30 sm:col-span-2 nav:col-span-3 nav:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-eyebrow flex items-center gap-2 font-semibold text-rosewood">
          <UserRoundCheck aria-hidden className="size-4" />
          Assigned Saathi
        </p>
        <a
          href={whatsappLink(row.phone, customerMessage)}
          target="_blank"
          rel="noreferrer"
          className={`${smallButton} bg-[#1f7a46] text-white hover:bg-[#17653a]`}
        >
          <MessageCircle aria-hidden className="size-4" />
          WhatsApp customer
        </a>
      </div>

      {row.assignedSaathiId && !editing && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">
              {row.assignedSaathiName} · {row.assignedSaathiPhone}
            </p>
            {row.scheduledAt && (
              <p className="flex items-center gap-1.5 text-ink-muted">
                <CalendarClock aria-hidden className="size-4" />
                {friendlyWhen(row.scheduledAt.toDate())}
              </p>
            )}
          </div>
          {open && (
            <button type="button" onClick={() => setEditing(true)} className={`${smallButton} bg-white text-burgundy ring-1 ring-burgundy/20 hover:bg-burgundy/10`}>
              Change Saathi or time
            </button>
          )}
        </div>
      )}

      {open && editing && (
        <form noValidate onSubmit={onAssign} className="mt-4 grid gap-4 nav:grid-cols-[1.4fr_1fr_1fr_auto] nav:items-end">
          <div>
            <label htmlFor={`saathi-${row.id}`} className={labelClass}>
              Saathi
            </label>
            <select id={`saathi-${row.id}`} value={saathiId} onChange={(event) => chooseSaathi(event.target.value)} className={fieldClass}>
              <option value="">Choose a verified Saathi…</option>
              {ordered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.area}
                  {(s.services ?? []).includes(row.serviceId ?? '') ? ' · offers this service' : ''}
                  {s.id === row.saathiId ? ' · customer’s choice' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`phone-${row.id}`} className={labelClass}>
              WhatsApp number
            </label>
            <input id={`phone-${row.id}`} value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" className={fieldClass} />
          </div>
          <div>
            <label htmlFor={`when-${row.id}`} className={labelClass}>
              Visit date and time
            </label>
            <input id={`when-${row.id}`} value={when} onChange={(event) => setWhen(event.target.value)} type="datetime-local" className={fieldClass} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={`${smallButton} bg-burgundy py-3.5 text-blush hover:bg-wine`}>
              {row.assignedSaathiId ? 'Save' : 'Assign'}
            </button>
            {row.assignedSaathiId && (
              <button type="button" onClick={() => setEditing(false)} className={`${smallButton} py-3.5 text-burgundy hover:bg-burgundy/10`}>
                Keep
              </button>
            )}
          </div>
          {saathis.length === 0 && (
            <p className="text-sm text-ink-muted nav:col-span-4">
              No verified Saathis yet. Verify an applicant on the Saathi applications tab first.
            </p>
          )}
        </form>
      )}

      {(row.status === 'cancelled' || row.status === 'completed') && !row.assignedSaathiId && (
        <p className="mt-2 text-ink-muted">No Saathi was assigned.</p>
      )}

      {row.extraHoursRequested && (row.status === 'assigned' || row.status === 'started') && (
        <ExtraTimeRequest row={row} busy={busy} run={run} />
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {row.status === 'assigned' && (
          <button type="button" disabled={busy} onClick={() => void run(() => markStarted(row.id))} className={`${smallButton} bg-rosewood text-white hover:bg-burgundy`}>
            <Play aria-hidden className="size-4" />
            Mark visit started
          </button>
        )}
        {row.status === 'started' && (
          <button type="button" disabled={busy} onClick={() => void run(() => markCompleted(row.id))} className={`${smallButton} bg-emerald-700 text-white hover:bg-emerald-800`}>
            <CircleCheck aria-hidden className="size-4" />
            Mark completed
          </button>
        )}
        {row.status !== 'completed' && row.status !== 'cancelled' && (
          <button type="button" disabled={busy} onClick={onCancel} className={`${smallButton} text-ink-muted hover:bg-wine/10 hover:text-wine`}>
            <XCircle aria-hidden className="size-4" />
            Cancel booking
          </button>
        )}
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-[#b3261e]">
        {error}
      </p>
    </div>
  )
}

/** The customer tapped "Need more time?"; approving moves the booking to the plan that covers it. */
function ExtraTimeRequest({ row, busy, run }: {
  row: Stored<Booking>
  busy: boolean
  run: (action: () => Promise<unknown>) => Promise<boolean>
}) {
  const extra = row.extraHoursRequested ?? 0
  const total = (row.hours ?? 0) + extra
  const plan = planForHours(total)
  return (
    <div role="status" className="mt-5 rounded-2xl bg-gold/20 p-4 ring-1 ring-gold/50">
      <p className="flex items-center gap-2 font-semibold">
        <Hourglass aria-hidden className="size-5 text-burgundy" />
        Customer asked for {extra} more hour{extra === 1 ? '' : 's'}
      </p>
      <p className="mt-1 text-ink-muted">
        New total {hoursLabel(total).toLowerCase()}
        {plan && ` · ${plan.name} ${plan.price}`}
        {row.planName && plan && plan.name !== row.planName && ` (was ${row.planName})`}. Check with the Saathi first.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !plan}
          onClick={() => void run(() => approveMoreTime(row))}
          className="inline-flex items-center gap-2 rounded-full bg-burgundy px-5 py-2.5 text-sm font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-50"
        >
          <CircleCheck aria-hidden className="size-4" />
          Approve extra time
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => declineMoreTime(row.id))}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-wine/10 hover:text-wine"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
