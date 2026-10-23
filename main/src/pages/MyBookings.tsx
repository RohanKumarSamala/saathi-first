import {
  CalendarClock,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { site } from '../content/site'
import { callLink, friendlyWhen, whatsappLink } from '../lib/contact'
import { RatingBar } from '../components/RatingBar'
import { cancelBooking, rateSaathi, watchMyBookings, type Booking, type Stored } from '../lib/db'
import { formatRupees } from '../lib/finance'
import { hoursLabel } from '../lib/pricing'

const when = (stamp?: { toDate: () => Date } | null) => (stamp ? friendlyWhen(stamp.toDate()) : '')

/** Plain words for each stage, short enough to read at a glance. */
const stage: Record<string, { label: string; tone: string }> = {
  new: { label: 'Finding your Saathi', tone: 'bg-gold/30 text-wine' },
  assigned: { label: 'Confirmed', tone: 'bg-rosewood/15 text-burgundy' },
  started: { label: 'With you now', tone: 'bg-burgundy text-blush' },
  completed: { label: 'Completed', tone: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', tone: 'bg-wine/10 text-ink-muted' },
}

const steps = ['Requested', 'Saathi assigned', 'Visit started', 'Completed']
const order = ['new', 'assigned', 'started', 'completed']

const action =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60'

/** One detail on one line behind an icon; the label is read to screen readers only. */
function Line({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-2.5">
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-rosewood" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </p>
  )
}

/** Four short segments, filled up to the current stage, with the stage named underneath. */
function Progress({ status }: { status: string }) {
  const reached = order.indexOf(status)
  return (
    <div>
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((step, index) => (
          <span key={step} className={`h-1.5 grow rounded-full ${index <= reached ? 'bg-burgundy' : 'bg-burgundy/15'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">
        Step {reached + 1} of {steps.length} · {steps[reached]}
      </p>
    </div>
  )
}

function CurrentBooking({ row }: { row: Stored<Booking> }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [openedAt] = useState(() => Date.now())
  const service = row.serviceName ?? 'Saathi visit'
  const visit = when(row.scheduledAt) || when(row.preferredStart)
  const saathi = row.assignedSaathiName
  const firstName = saathi?.split(' ')[0] ?? ''
  const message = `Hello ${saathi ?? ''}, this is ${row.name} from Saathi First about my ${service}${visit ? ` on ${visit}` : ''}.`
  const careMessage = `Hello Saathi First, this is ${row.name} about my ${service} request${visit ? ` for ${visit}` : ''}.`
  const { label, tone } = stage[row.status]

  const cancel = async () => {
    setBusy(true)
    setError('')
    try {
      await cancelBooking(row, 'customer')
    } catch {
      setError(`Could not cancel. Please call ${site.phoneDisplay}.`)
      setBusy(false)
    }
  }

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl bg-white/90 p-5 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">{service}</h3>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{label}</span>
      </div>

      <Progress status={row.status} />

      <div className="grid gap-2">
        <Line icon={CalendarClock} label={row.scheduledAt ? 'Visit time' : 'You asked for'}>
          {row.status === 'started' ? `Started ${when(row.startedAt)}` : visit}
        </Line>
        <Line icon={Clock} label="How long and price">
          {[row.hours ? hoursLabel(row.hours) : '', row.paidBy === 'membership' ? 'Free with membership' : row.planPrice.split(' / ')[0]]
            .filter(Boolean)
            .join(' · ')}
        </Line>
        <Line icon={MapPin} label="Where">
          {row.address || (row.location ? 'Your shared location' : '')}
        </Line>
      </div>

      {row.status === 'new' && row.preferredStart && row.preferredStart.toMillis() < openedAt && (
        <p role="status" className="rounded-xl bg-gold/25 px-3 py-2.5 text-sm font-medium">
          The time you asked for has passed and no Saathi was confirmed. We will call you to fix a new time, or
          you can cancel and book again.
        </p>
      )}

      {saathi ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-blush/70 p-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-burgundy text-lg font-semibold text-blush">
            {saathi.slice(0, 1).toUpperCase()}
          </span>
          <p className="grow font-semibold">
            <span className="sr-only">Your Saathi: </span>
            {saathi}
          </p>
          {row.assignedSaathiPhone && (
            <span className="flex gap-2">
              <a
                href={whatsappLink(row.assignedSaathiPhone, message)}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${firstName}`}
                className={`${action} bg-[#1f7a46] text-white hover:bg-[#17653a]`}
              >
                <MessageCircle aria-hidden className="size-5" />
                WhatsApp
              </a>
              <a href={callLink(row.assignedSaathiPhone)} aria-label={`Call ${firstName}`} className={`${action} bg-burgundy text-blush hover:bg-wine`}>
                <Phone aria-hidden className="size-5" />
                Call
              </a>
            </span>
          )}
        </div>
      ) : null}

      {row.status === 'new' &&
        (confirming ? (
          <div role="alertdialog" aria-label="Cancel this request?" className="grid gap-3 rounded-xl bg-wine/[0.06] p-3">
            <p className="font-semibold">Cancel this request?</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={cancel} className={`${action} grow bg-wine text-blush hover:bg-burgundy`}>
                {busy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={`${action} grow bg-white text-burgundy ring-1 ring-burgundy/20`}>
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 border-t border-burgundy/10 pt-3">
            {/* Until a Saathi is assigned, questions go to customer care on WhatsApp. */}
            <a
              href={whatsappLink(site.phoneDisplay, careMessage)}
              target="_blank"
              rel="noreferrer"
              className={`${action} -ml-2 bg-[#1f7a46]/10 text-[#1f7a46] hover:bg-[#1f7a46] hover:text-white`}
            >
              <MessageCircle aria-hidden className="size-5" />
              Message us
            </a>
            <button type="button" onClick={() => setConfirming(true)} className={`${action} -mr-2 text-ink-muted hover:bg-wine/10 hover:text-wine`}>
              <XCircle aria-hidden className="size-5" />
              Cancel
            </button>
          </div>
        ))}
      {error && (
        <p role="status" className="text-sm text-[#b3261e]">
          {error}
        </p>
      )}
    </article>
  )
}

function PastBooking({ row }: { row: Stored<Booking> }) {
  const done = row.status === 'completed'
  return (
    <li className="grid gap-3 rounded-2xl bg-white/90 p-4 ring-1 ring-gold/25">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-wine/10 text-ink-muted'}`}>
          {done ? <Check aria-hidden className="size-5" strokeWidth={2.5} /> : <XCircle aria-hidden className="size-5" />}
          <span className="sr-only">{done ? 'Completed' : 'Cancelled'}</span>
        </span>
        <div className="min-w-0 grow">
          <p className="truncate font-semibold">{row.serviceName ?? 'Saathi visit'}</p>
          <p className="truncate text-sm text-ink-muted">
            {when(row.completedAt ?? row.cancelledAt ?? row.scheduledAt ?? row.createdAt)}
            {row.assignedSaathiName && ` · ${row.assignedSaathiName}`}
          </p>
          {/* What the Saathi recorded as paid, so the family can spot a mistake and call us. */}
          {row.collection && row.collection.method === 'membership' ? (
            <p className="truncate text-sm font-medium">Free with your membership</p>
          ) : (
            row.collection && (
              <p className="truncate text-sm font-medium">
                You paid {formatRupees(row.collection.totalPaise)}
                {row.collection.extraPaise > 0 && ` (incl. ${formatRupees(row.collection.extraPaise)} extra: ${row.collection.extraNote})`}
              </p>
            )
          )}
        </div>
        <Link
          to={row.serviceId ? `/contact/${row.serviceId}` : '/contact'}
          aria-label={`Book ${row.serviceName ?? 'this'} again`}
          title="Book again"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-burgundy/10 text-burgundy transition-colors hover:bg-burgundy hover:text-blush"
        >
          <RotateCcw aria-hidden className="size-5" />
        </Link>
      </div>
      {/* After a finished visit the family can rate the Saathi who came; the team sees it. */}
      {done && row.assignedSaathiName && (
        <RatingBar
          tone="light"
          title={`How was ${row.assignedSaathiName}?`}
          given={row.saathiRating ? { rating: row.saathiRating, note: row.saathiRatingNote } : undefined}
          onSend={(rating, note) => rateSaathi(row, rating, note)}
        />
      )}
    </li>
  )
}

function Bookings() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Stored<Booking>[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return watchMyBookings(user.uid, setRows, () => setError('Could not load your bookings. Please refresh the page.'))
  }, [user])

  const box = 'rounded-2xl bg-white/90 p-6 ring-1 ring-gold/25'
  if (error) return <p role="alert" className={box}>{error}</p>
  if (!rows) return <p role="status" className={box}>Loading your bookings…</p>
  if (rows.length === 0) {
    return (
      <div className={`${box} flex flex-wrap items-center justify-between gap-4`}>
        <p className="text-lg">No bookings yet.</p>
        <Link to="/contact" className={`${action} bg-burgundy text-blush hover:bg-wine`}>
          Book a Saathi
        </Link>
      </div>
    )
  }

  const current = rows
    .filter((row) => ['new', 'assigned', 'started'].includes(row.status))
    .sort(
      (a, b) =>
        ((a.scheduledAt ?? a.preferredStart)?.toMillis() ?? Infinity) - ((b.scheduledAt ?? b.preferredStart)?.toMillis() ?? Infinity),
    )
  const past = rows.filter((row) => !current.includes(row))

  return (
    <div className="grid gap-8">
      <section aria-labelledby="current-heading" className="grid gap-3">
        <h2 id="current-heading" className="text-lg font-semibold">
          Upcoming
        </h2>
        {current.length > 0 ? (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            {current.map((row) => (
              <CurrentBooking key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <p className={box}>Nothing booked right now.</p>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-heading" className="grid gap-3">
          <h2 id="past-heading" className="text-lg font-semibold">
            Past bookings
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {past.map((row) => (
              <PastBooking key={row.id} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default function MyBookings() {
  return (
    <div className="page-padding">
      <div className="container-large pb-16 pt-28 nav:pb-24 nav:pt-36">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-light tracking-tight nav:text-4xl">
              My <span className="accent text-rosewood">bookings</span>
            </h1>
            <Link to="/contact" className={`${action} bg-burgundy text-blush hover:bg-wine`}>
              <Plus aria-hidden className="size-5" />
              Book a Saathi
            </Link>
          </div>
          <AuthGate action="see your bookings">
            <Bookings />
          </AuthGate>
        </div>
      </div>
    </div>
  )
}
