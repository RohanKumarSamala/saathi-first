import { Check, Hourglass, MapPin, MessageCircle, Phone, UserRoundCheck, X, XCircle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Collapsible } from './Collapsible'
import { services } from '../../main/src/content/site'
import { callLink, friendlyWhen, whatsappLink } from '../../main/src/lib/contact'
import { formatRupees } from '../../main/src/lib/finance'
import { hoursLabel, planForHours } from '../../main/src/lib/pricing'
import {
  approveMoreTime,
  assignSaathi,
  declineMoreTime,
  cancelBooking,
  publicName,
  type Application,
  type Booking,
  type Stored,
} from '../../main/src/lib/db'
import { isValidIndianMobile } from '../../main/src/lib/enquiry'

/** "2026-10-18T10:30" in local time, the format a datetime-local input expects. */
function toInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const fieldClass =
  'h-10 w-full min-w-0 rounded-xl border border-burgundy/20 bg-white px-3 text-sm font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40'
const iconAction =
  'grid size-9 shrink-0 place-items-center rounded-full bg-burgundy/10 text-burgundy transition-colors hover:bg-burgundy hover:text-blush'
const mainAction =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50'

/**
 * Admin controls for one booking: assign a verified Saathi with a visit time and the
 * number the customer will WhatsApp. Starting and completing a visit happen only on the Saathi website.
 */
export function BookingAssignment({ row, saathis, linked, children }: {
  row: Stored<Booking>
  saathis: Stored<Application>[]
  /** Saathis (application IDs) who can sign in to the Saathi website and see the visit. */
  linked: Set<string>
  /** The booking's detail lines; shown in the card's fold below the assignment summary. */
  children: ReactNode
}) {
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
  const [editing, setEditing] = useState(false)
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
    if (!linked.has(picked.id)) return setError('Give this Saathi website access under Saathis first, so they can see the visit.')
    if (!isValidIndianMobile(phone)) return setError('Enter a valid 10-digit WhatsApp number.')
    if (!when || Number.isNaN(scheduledAt.getTime())) return setError('Choose the visit date and time.')
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
  const active = open || row.status === 'started'

  // Only the Saathi can start and complete a visit, on the Saathi website, so a visit given to
  // someone without an active login there would never be finished.
  const unreachable = Boolean(row.assignedSaathiId) && active && !linked.has(row.assignedSaathiId ?? '')

  return (
    <>
      {unreachable && (
        <p role="status" className="rounded-xl bg-rosewood/15 px-3 py-2 text-sm font-medium text-wine">
          {row.assignedSaathiName} cannot see this visit: no active Saathi website login. Give access under Saathis, or change
          the Saathi.
        </p>
      )}
      <Collapsible>
        {row.assignedSaathiName && (
          <p className="flex items-start gap-2 rounded-xl bg-blush/70 px-3 py-2 text-sm">
            <UserRoundCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-rosewood" />
            <span className="sr-only">Assigned Saathi: </span>
            <span>
              <strong className="font-semibold">{row.assignedSaathiName}</strong> · {row.assignedSaathiPhone}
              {row.scheduledAt && <span className="block text-ink-muted">{friendlyWhen(row.scheduledAt.toDate())}</span>}
            </span>
          </p>
        )}

        {row.extraHoursRequested && (row.status === 'assigned' || row.status === 'started') && (
          <ExtraTimeRequest row={row} busy={busy} run={run} />
        )}
        {row.collection && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span className="sr-only">Collected: </span>
            <strong className="font-semibold">{formatRupees(row.collection.totalPaise)}</strong> by{' '}
            {row.collection.method === 'cash' ? 'cash' : 'UPI'} · company {formatRupees(row.collection.companySharePaise)} (
            {row.collection.commissionPercent}%)
            {row.collection.extraPaise > 0 && (
              <span className="block text-emerald-800">
                Includes {formatRupees(row.collection.extraPaise)} extra: {row.collection.extraNote}
              </span>
            )}
          </p>
        )}
        {children}
      </Collapsible>

      {open && editing && (
        <form noValidate onSubmit={onAssign} className="grid gap-2 rounded-xl bg-blush/70 p-3">
          <select
            aria-label="Saathi"
            value={saathiId}
            onChange={(event) => chooseSaathi(event.target.value)}
            className={fieldClass}
          >
            <option value="">{saathis.length ? 'Choose a Saathi…' : 'No verified Saathis yet'}</option>
            {ordered.map((s) => (
              <option key={s.id} value={s.id} disabled={!linked.has(s.id)}>
                {s.name} · {s.area}
                {(s.services ?? []).includes(row.serviceId ?? '') ? ' ✓' : ''}
                {s.id === row.saathiId ? ' (asked for)' : ''}
                {linked.has(s.id) ? '' : ' (no Saathi login: give access first)'}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Saathi WhatsApp number"
              placeholder="WhatsApp number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              className={fieldClass}
            />
            <input
              aria-label="Visit date and time"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              type="datetime-local"
              className={fieldClass}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={`${mainAction} bg-burgundy text-blush hover:bg-wine`}>
              <Check aria-hidden className="size-4" />
              {row.assignedSaathiId ? 'Save' : 'Assign'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={`${mainAction} text-ink-muted hover:bg-wine/10`}>
              Close
            </button>
          </div>
        </form>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-burgundy/10 pt-3">
        <a href={callLink(row.phone)} title={`Call ${row.phone}`} aria-label={`Call ${row.name}`} className={iconAction}>
          <Phone aria-hidden className="size-4" />
        </a>
        <a
          href={whatsappLink(row.phone, customerMessage)}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp customer"
          aria-label={`WhatsApp ${row.name}`}
          className={`${iconAction} bg-[#1f7a46]/10 text-[#1f7a46] hover:bg-[#1f7a46] hover:text-white`}
        >
          <MessageCircle aria-hidden className="size-4" />
        </a>
        {row.location && (
          <a
            href={`https://www.google.com/maps?q=${row.location.lat},${row.location.lng}`}
            target="_blank"
            rel="noreferrer"
            title={`Open location in Maps (±${row.location.accuracy} m)`}
            aria-label="Open location in Maps"
            className={iconAction}
          >
            <MapPin aria-hidden className="size-4" />
          </a>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          {open && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`${mainAction} ${row.assignedSaathiId ? 'text-burgundy ring-1 ring-burgundy/20 hover:bg-burgundy/10' : 'bg-burgundy text-blush hover:bg-wine'}`}
            >
              {row.assignedSaathiId ? 'Change' : 'Assign'}
            </button>
          )}
          {active && (
            <button type="button" disabled={busy} onClick={onCancel} title="Cancel booking" aria-label="Cancel booking" className={`${iconAction} bg-transparent text-ink-muted hover:bg-wine/10 hover:text-wine`}>
              <XCircle aria-hidden className="size-[1.125rem]" />
            </button>
          )}
        </span>
      </div>
      {error && (
        <p role="status" className="-mt-1 text-xs text-[#b3261e]">
          {error}
        </p>
      )}
    </>
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
    <div role="status" className="flex items-center gap-2 rounded-xl bg-gold/25 px-3 py-2 text-sm">
      <Hourglass aria-hidden className="size-4 shrink-0 text-burgundy" />
      <span className="grow">
        <strong>+{extra} hr{extra === 1 ? '' : 's'}</strong> asked · {hoursLabel(total).toLowerCase()}
        {plan && `, ${plan.price}`}
      </span>
      <button
        type="button"
        disabled={busy || !plan}
        onClick={() => void run(() => approveMoreTime(row))}
        title="Approve extra time"
        aria-label="Approve extra time"
        className="grid size-8 place-items-center rounded-full bg-burgundy text-blush transition-colors hover:bg-wine disabled:opacity-50"
      >
        <Check aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run(() => declineMoreTime(row.id))}
        title="Decline extra time"
        aria-label="Decline extra time"
        className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-wine/10 hover:text-wine"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
