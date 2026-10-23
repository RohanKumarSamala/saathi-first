import { Check, ChevronDown, Crown, Hourglass, MapPin, MessageCircle, Pencil, Phone, TriangleAlert, X, XCircle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { services } from '../../main/src/content/site'
import { callLink, friendlyWhen, whatsappLink } from '../../main/src/lib/contact'
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
import { formatRupees } from '../../main/src/lib/finance'
import { tooManyUnpaid, unpaidVisits, type Accounts } from './accounts'

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
export function BookingAssignment({ row, saathis, linked, accounts, children, more }: {
  row: Stored<Booking>
  saathis: Stored<Application>[]
  /** Saathis (application IDs) who can sign in to the Saathi website and see the visit. */
  linked: Set<string>
  /** Each Saathi's account, to flag those with too many visits unpaid. */
  accounts: Accounts
  /** The booking's main detail lines, always shown. */
  children: ReactNode
  /** Further detail lines (payment, rating, message), behind Show more. */
  more?: ReactNode
}) {
  const [showMore, setShowMore] = useState(false)
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

  const chosen = saathis.find((s) => s.id === saathiId)
  const chosenAccount = accounts.get(saathiId)
  const chosenBehind = tooManyUnpaid(chosenAccount)

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
      void run(() => cancelBooking(row, 'admin'))
    }
  }

  const service = services.find((item) => item.id === row.serviceId)?.name ?? row.serviceName ?? 'their booking'
  const customerMessage = row.scheduledAt
    ? `Hello ${row.name}, this is Saathi First about your ${service} on ${friendlyWhen(row.scheduledAt.toDate())}.`
    : `Hello ${row.name}, this is Saathi First about your ${service} request.`
  const membershipVisit = row.paidBy === 'membership'
  // The visit's details for the assigned Saathi, with the money rule spelt out for membership visits.
  const saathiMessage = [
    `Hello ${row.assignedSaathiName?.split(' ')[0] ?? ''}, this is Saathi First.`,
    `Your visit: ${service} for ${row.name} (${row.phone})${row.scheduledAt ? ` on ${friendlyWhen(row.scheduledAt.toDate())}` : ''}.`,
    row.address ? `Address: ${row.address}.` : '',
    membershipVisit
      ? 'This is a MEMBERSHIP visit: please DO NOT collect any money from the customer. Saathi First will pay your share.'
      : `Please collect ${row.planPrice.split(' / ')[0]} (${row.planName}) and record it on the Saathi website.`,
  ]
    .filter(Boolean)
    .join('\n')
  const open = row.status === 'new' || row.status === 'assigned'
  const active = open || row.status === 'started'

  // Only the Saathi can start and complete a visit, on the Saathi website, so a visit given to
  // someone without an active login there would never be finished.
  const unreachable = Boolean(row.assignedSaathiId) && active && !linked.has(row.assignedSaathiId ?? '')

  return (
    <>
      {/* The booking's main details, then slim one-line notes, then the rest behind Show more. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{children}</div>
      {unreachable && (
        <p role="status" className="-mt-1 flex items-start gap-1.5 text-xs font-semibold text-rosewood">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {row.assignedSaathiName} has no Saathi website login, so cannot see this visit. Give access under Saathis.
        </p>
      )}
      {membershipVisit && active && (
        <p role="note" className="-mt-1 flex items-start gap-1.5 text-xs font-semibold text-wine">
          <Crown aria-hidden className="mt-px size-3.5 shrink-0 text-gold" />
          Membership visit: the Saathi must not collect money
        </p>
      )}
      {row.extraHoursRequested && (row.status === 'assigned' || row.status === 'started') && (
        <ExtraTimeRequest row={row} busy={busy} run={run} />
      )}
      {more && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
          {showMore && more}
          <button
            type="button"
            aria-expanded={showMore}
            onClick={() => setShowMore((value) => !value)}
            className="inline-flex items-center gap-1 justify-self-start text-xs font-semibold text-rosewood transition-colors hover:text-burgundy"
          >
            {showMore ? 'Show less' : 'Show more'}
            <ChevronDown aria-hidden className={`size-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

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
                {s.id === row.saathiId ? (row.saathiChoice === 'chosen' ? ' (customer asked for)' : ' (suggested)') : ''}
                {linked.has(s.id) ? '' : ' (no Saathi login: give access first)'}
                {tooManyUnpaid(accounts.get(s.id)) ? ` ⚠ ${unpaidVisits(accounts.get(s.id))} unpaid visits` : ''}
              </option>
            ))}
          </select>
          {chosenBehind && (
            <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-rosewood">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              {chosen?.name} has not paid for {unpaidVisits(chosenAccount)} visits ({formatRupees(chosenAccount?.duePaise ?? 0)} due).
              Collect it before giving them more visits, or pick another Saathi.
            </p>
          )}
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

      {/* Wraps onto a second line in narrow cards (half-screen windows, zoomed-in browsers). */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-burgundy/10 pt-3">
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
        {row.assignedSaathiPhone && active && (
          <a
            href={whatsappLink(row.assignedSaathiPhone, saathiMessage)}
            target="_blank"
            rel="noreferrer"
            title={membershipVisit ? 'WhatsApp the Saathi (tells them not to collect money)' : 'WhatsApp the Saathi the visit details'}
            aria-label={`WhatsApp ${row.assignedSaathiName ?? 'the Saathi'}`}
            className="relative grid size-9 shrink-0 place-items-center rounded-full bg-[#1f7a46] text-white transition-colors hover:bg-[#17603a]"
          >
            <MessageCircle aria-hidden className="size-4" />
            {/* Filled green with an S, to tell it from the customer's WhatsApp beside it. */}
            <span aria-hidden className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-white text-[0.5625rem] font-bold text-[#1f7a46] ring-1 ring-[#1f7a46]/40">
              S
            </span>
          </a>
        )}
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
              title={row.assignedSaathiId ? 'Give the visit to another Saathi, or move its time' : undefined}
              aria-label={row.assignedSaathiId ? 'Reassign: another Saathi or a new time' : undefined}
              className={`${mainAction} ${row.assignedSaathiId ? 'px-2.5 text-burgundy ring-1 ring-burgundy/20 hover:bg-burgundy/10 sm:px-4' : 'bg-burgundy text-blush hover:bg-wine'}`}
            >
              {row.assignedSaathiId ? (
                <>
                  {/* Just the pencil on phones, so the buttons stay on one row. */}
                  <Pencil aria-hidden className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">Reassign</span>
                </>
              ) : (
                'Assign'
              )}
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
