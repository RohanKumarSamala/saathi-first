import {
  CalendarClock,
  Check,
  ClipboardCheck,
  Home,
  MessageCircle,
  Phone,
  PlayCircle,
  RotateCcw,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { PageHero } from '../components/PageHero'
import { site } from '../content/site'
import { callLink, friendlyWhen, whatsappLink } from '../lib/contact'
import { cancelBooking, watchMyBookings, type Booking, type Stored } from '../lib/db'
import { hoursLabel } from '../lib/pricing'
import { MoreTime } from './booking/MoreTime'

const bigButton =
  'inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl px-7 text-lg font-semibold transition-[transform,background-color] duration-300 ease-out-soft hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60'

const when = (stamp?: { toDate: () => Date } | null) => (stamp ? friendlyWhen(stamp.toDate()) : '')

/** Plain-words headline for each stage, written for someone reading at a glance. */
const headline: Record<string, { title: string; body: string }> = {
  new: {
    title: 'We have your request',
    body: 'Our team is choosing a Saathi for you and will call to confirm. You will see their name here.',
  },
  assigned: {
    title: 'Your Saathi is confirmed',
    body: 'They will come at the time below. You can message or call them directly.',
  },
  started: {
    title: 'Your Saathi is with you now',
    body: 'The visit has started. We will mark it complete when it ends.',
  },
}

type Step = { key: string; label: string; icon: LucideIcon; time?: string }

/** Requested -> Saathi assigned -> Visit started -> Completed, like a ride tracker. */
function Tracker({ row }: { row: Stored<Booking> }) {
  const order = ['new', 'assigned', 'started', 'completed']
  const reached = order.indexOf(row.status)
  const steps: Step[] = [
    { key: 'new', label: 'Requested', icon: ClipboardCheck, time: when(row.createdAt) },
    { key: 'assigned', label: 'Saathi assigned', icon: UserRoundCheck, time: when(row.assignedAt) },
    { key: 'started', label: 'Visit started', icon: PlayCircle, time: when(row.startedAt) },
    { key: 'completed', label: 'Completed', icon: Home, time: when(row.completedAt) },
  ]
  return (
    <ol aria-label="Booking progress" className="grid gap-0 sm:grid-cols-4">
      {steps.map((step, index) => {
        const done = index <= reached
        const current = index === reached
        const Icon = step.icon
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-7 top-14 h-[calc(100%-3.5rem)] w-1 rounded-full sm:left-[calc(50%+1.75rem)] sm:top-7 sm:h-1 sm:w-[calc(100%-3.5rem)] ${
                  index < reached ? 'bg-rosewood' : 'bg-burgundy/15'
                }`}
              />
            )}
            <span
              className={`relative grid size-14 shrink-0 place-items-center rounded-full ${
                done ? 'bg-burgundy text-blush' : 'bg-white text-burgundy/40 ring-2 ring-burgundy/15'
              } ${current ? 'ring-4 ring-gold/60' : ''}`}
            >
              {done && !current ? <Check aria-hidden className="size-7" strokeWidth={2.5} /> : <Icon aria-hidden className="size-7" />}
            </span>
            <span className="pt-2 sm:pt-3">
              <span className={`block text-lg font-semibold ${done ? 'text-ink' : 'text-ink-muted'}`}>
                {step.label}
                {current && <span className="sr-only"> (current step)</span>}
              </span>
              {done && step.time && <span className="block text-sm text-ink-muted">{step.time}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function CurrentBooking({ row }: { row: Stored<Booking> }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const copy = headline[row.status]
  const service = row.serviceName ?? 'Saathi visit'
  const visit = when(row.scheduledAt)
  const requestedFor = when(row.preferredStart)
  const message = `Hello ${row.assignedSaathiName ?? ''}, this is ${row.name} from Saathi First. I am writing about my ${service}${
    visit ? ` on ${visit}` : ''
  }.`

  const cancel = async () => {
    setBusy(true)
    setError('')
    try {
      await cancelBooking(row.id, 'customer')
    } catch {
      setError(`We could not cancel it. Please call us on ${site.phoneDisplay}.`)
      setBusy(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-card bg-white shadow-card ring-1 ring-gold/30">
      <header className="bg-[linear-gradient(135deg,#6b1e2e,#8f2f42_60%,#b9545c)] p-7 text-blush nav:p-10">
        <p className="text-eyebrow font-semibold text-gold">{service}</p>
        <h2 className="mt-2 text-3xl font-normal leading-tight nav:text-4xl">{copy.title}</h2>
        <p className="mt-3 max-w-2xl text-lg text-blush/90 nav:text-xl">{copy.body}</p>
      </header>

      <div className="grid gap-8 p-7 nav:p-10">
        <Tracker row={row} />

        {row.assignedSaathiName ? (
          <section aria-label="Your Saathi" className="rounded-3xl bg-blush/70 p-6 ring-1 ring-gold/30 nav:p-8">
            <div className="flex flex-wrap items-center gap-5">
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-burgundy text-2xl font-semibold text-blush">
                {row.assignedSaathiName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-eyebrow font-semibold text-rosewood">Your Saathi</p>
                <p className="text-3xl font-semibold tracking-tight">{row.assignedSaathiName}</p>
                {visit && (
                  <p className="mt-1 flex items-center gap-2 text-lg text-ink-muted">
                    <CalendarClock aria-hidden className="size-5 shrink-0" />
                    {row.status === 'started' ? `Started ${when(row.startedAt)}` : visit}
                  </p>
                )}
              </div>
            </div>
            {row.assignedSaathiPhone && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={whatsappLink(row.assignedSaathiPhone, message)}
                  target="_blank"
                  rel="noreferrer"
                  className={`${bigButton} bg-[#1f7a46] text-white hover:bg-[#17653a]`}
                >
                  <MessageCircle aria-hidden className="size-6" />
                  WhatsApp {row.assignedSaathiName.split(' ')[0]}
                </a>
                <a href={callLink(row.assignedSaathiPhone)} className={`${bigButton} bg-burgundy text-blush hover:bg-wine`}>
                  <Phone aria-hidden className="size-6" />
                  Call {row.assignedSaathiName.split(' ')[0]}
                </a>
              </div>
            )}
          </section>
        ) : (
          <section aria-label="Contact us" className="rounded-3xl bg-blush/70 p-6 ring-1 ring-gold/30 nav:p-8">
            <p className="text-lg">Questions while you wait? We are happy to help.</p>
            <a href={site.phoneHref} className={`${bigButton} mt-4 bg-burgundy text-blush hover:bg-wine`}>
              <Phone aria-hidden className="size-6" />
              Call Saathi First
            </a>
          </section>
        )}

        {(row.status === 'assigned' || row.status === 'started') && row.hours ? <MoreTime row={row} /> : null}

        <dl className="grid gap-x-8 gap-y-4 text-lg sm:grid-cols-2">
          {!row.assignedSaathiName && requestedFor && (
            <div>
              <dt className="text-sm font-semibold text-ink-muted">You asked for</dt>
              <dd className="font-medium">{requestedFor}</dd>
            </div>
          )}
          {row.hours ? (
            <div>
              <dt className="text-sm font-semibold text-ink-muted">How long</dt>
              <dd className="font-medium">{hoursLabel(row.hours)}</dd>
            </div>
          ) : null}
          {row.planName && (
            <div>
              <dt className="text-sm font-semibold text-ink-muted">Plan</dt>
              <dd className="font-medium">{row.planName} · {row.planPrice}</dd>
            </div>
          )}
          {(row.address || row.location) && (
            <div>
              <dt className="text-sm font-semibold text-ink-muted">Where</dt>
              <dd className="font-medium">{row.address || 'Your shared location'}</dd>
            </div>
          )}
        </dl>

        {row.status === 'new' && (
          <div className="border-t border-burgundy/10 pt-6">
            {confirming ? (
              <div role="alertdialog" aria-label="Cancel this request?" className="rounded-3xl bg-wine/[0.06] p-6">
                <p className="text-xl font-semibold">Cancel this request?</p>
                <p className="mt-1 text-lg text-ink-muted">You can always book again later.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" disabled={busy} onClick={cancel} className={`${bigButton} bg-wine text-blush hover:bg-burgundy`}>
                    {busy ? 'Cancelling…' : 'Yes, cancel it'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={`${bigButton} bg-white text-burgundy ring-2 ring-burgundy/20`}>
                    No, keep it
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-12 items-center gap-2 text-lg font-semibold text-ink-muted underline underline-offset-4 hover:text-wine">
                <XCircle aria-hidden className="size-5" />
                Cancel this request
              </button>
            )}
            <p role="status" className="mt-3 text-lg text-[#b3261e]">{error}</p>
          </div>
        )}
        {row.status !== 'new' && (
          <p className="border-t border-burgundy/10 pt-6 text-lg text-ink-muted">
            Need to change or cancel? Call us on{' '}
            <a href={site.phoneHref} className="font-semibold text-burgundy underline underline-offset-4">
              {site.phoneDisplay}
            </a>
            .
          </p>
        )}
      </div>
    </article>
  )
}

function PastBooking({ row }: { row: Stored<Booking> }) {
  const done = row.status === 'completed'
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/90 p-6 shadow-card ring-1 ring-gold/25">
      <div className="flex items-center gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-wine/10 text-ink-muted'}`}>
          {done ? <Check aria-hidden className="size-6" strokeWidth={2.5} /> : <XCircle aria-hidden className="size-6" />}
        </span>
        <div>
          <p className="text-xl font-semibold">{row.serviceName ?? 'Saathi visit'}</p>
          <p className="text-lg text-ink-muted">
            {done ? 'Completed' : 'Cancelled'}
            {' · '}
            {when(row.completedAt ?? row.cancelledAt ?? row.scheduledAt ?? row.createdAt)}
            {row.assignedSaathiName && ` · with ${row.assignedSaathiName}`}
          </p>
        </div>
      </div>
      <Link
        to={row.serviceId ? `/contact/${row.serviceId}` : '/contact'}
        className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 text-lg font-semibold text-burgundy ring-2 ring-burgundy/20 transition-colors hover:bg-burgundy hover:text-blush"
      >
        <RotateCcw aria-hidden className="size-5" />
        Book again
      </Link>
    </li>
  )
}

function Bookings() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Stored<Booking>[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return watchMyBookings(user.uid, setRows, () => setError('We could not load your bookings. Please refresh the page.'))
  }, [user])

  if (error) return <p role="alert" className="rounded-card bg-white/90 p-8 text-xl shadow-card">{error}</p>
  if (!rows) return <p role="status" className="rounded-card bg-white/90 p-8 text-xl shadow-card">Loading your bookings…</p>

  const current = rows
    .filter((row) => ['new', 'assigned', 'started'].includes(row.status))
    .sort((a, b) => (a.scheduledAt?.toMillis() ?? Infinity) - (b.scheduledAt?.toMillis() ?? Infinity))
  const past = rows.filter((row) => !current.includes(row))

  if (rows.length === 0) {
    return (
      <div className="rounded-card bg-white/90 p-8 shadow-card ring-1 ring-gold/30 nav:p-12">
        <p className="text-3xl font-light">You have no bookings yet.</p>
        <p className="mt-2 text-xl text-ink-muted">When you book a Saathi, you can follow it here.</p>
        <Link to="/contact" className={`${bigButton} mt-8 bg-burgundy text-blush hover:bg-wine`}>
          Book a Saathi
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-14">
      <section aria-labelledby="current-heading" className="grid gap-6">
        <h2 id="current-heading" className="text-3xl font-light nav:text-4xl">
          {current.length > 1 ? 'Current bookings' : 'Current booking'}
        </h2>
        {current.length > 0 ? (
          current.map((row) => <CurrentBooking key={row.id} row={row} />)
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-card bg-white/90 p-8 shadow-card ring-1 ring-gold/25">
            <p className="text-xl">Nothing booked right now.</p>
            <Link to="/contact" className={`${bigButton} bg-burgundy text-blush hover:bg-wine`}>
              Book a Saathi
            </Link>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-heading" className="grid gap-5">
          <h2 id="past-heading" className="text-3xl font-light nav:text-4xl">Past bookings</h2>
          <ul className="grid gap-4">
            {past.map((row) => <PastBooking key={row.id} row={row} />)}
          </ul>
        </section>
      )}
    </div>
  )
}

export default function MyBookings() {
  return (
    <>
      <PageHero
        title="My bookings"
        intro="See who is coming and when, message your Saathi, and look back at past visits."
        tagline={
          <>
            Always know <span className="accent text-rosewood">who is coming.</span>
          </>
        }
      />
      <div className="page-padding">
        <div className="container-large py-12 nav:py-20">
          <div className="mx-auto max-w-5xl">
            <AuthGate action="see your bookings">
              <Bookings />
            </AuthGate>
          </div>
        </div>
      </div>
    </>
  )
}
