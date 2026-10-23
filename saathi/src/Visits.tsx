import { AlertTriangle, CalendarClock, Crown, Hourglass, MessageCircle, MessageSquareText, Navigation, Phone, Play } from 'lucide-react'
import { useState } from 'react'
import { CollectionForm } from '../../main/src/components/CollectionForm'
import { callLink, friendlyWhen, whatsappLink } from '../../main/src/lib/contact'
import { markCompleted, type Booking, type Stored } from '../../main/src/lib/db'
import { formatRupees, type Ledger } from '../../main/src/lib/finance'
import { hoursLabel } from '../../main/src/lib/pricing'
import { startVisit } from '../../main/src/lib/staff'
import { Notice } from './Portal'

/** Google Maps directions to the shared pin, or to the typed address when there is no pin. */
function directionsLink(row: Pick<Booking, 'location' | 'address'>) {
  const destination = row.location ? `${row.location.lat},${row.location.lng}` : row.address
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

const when = (row: Stored<Booking>) => {
  const time = row.scheduledAt ?? row.preferredStart
  return time ? friendlyWhen(time.toDate()) : 'Time to be confirmed'
}

const roundButton =
  'grid size-12 shrink-0 place-items-center rounded-full bg-burgundy/10 text-burgundy transition-colors hover:bg-burgundy hover:text-blush'

function VisitCard({ row, percent }: { row: Stored<Booking>; percent: number }) {
  const [finishing, setFinishing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const started = row.status === 'started'
  const [now] = useState(() => new Date())
  const start = (row.scheduledAt ?? row.preferredStart)?.toDate()
  const stage = started
    ? 'In progress'
    : start && start.toDateString() !== now.toDateString() && start.getTime() < now.getTime()
      ? 'Late'
      : start && start.toDateString() === now.toDateString()
        ? 'Today'
        : 'Upcoming'
  const greeting = `Hello ${row.name}, this is ${row.assignedSaathiName ?? 'your Saathi'} from Saathi First about your visit.`

  const begin = async () => {
    setBusy(true)
    setError('')
    try {
      await startVisit(row.id)
    } catch {
      setError('Could not save. Check your internet connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_-24px_rgb(58_17_25/0.5)] ring-1 ring-gold/25">
      <div
        className={`flex items-center justify-between gap-3 px-5 py-3 text-sm font-semibold ${
          started ? 'bg-burgundy text-blush' : stage === 'Late' ? 'bg-rosewood text-white' : 'bg-blush text-wine'
        }`}
      >
        <span className="flex items-center gap-2">
          <CalendarClock aria-hidden className="size-4" />
          {when(row)}
        </span>
        <span className="shrink-0 whitespace-nowrap">{stage}</span>
      </div>

      <div className="grid gap-4 p-5">
        <div>
          <h3 className="text-xl font-semibold leading-tight">{row.serviceName ?? row.planName}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {[row.hours ? hoursLabel(row.hours) : 'One visit', row.planName, row.planPrice.split(' / ')[0]].join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-0 grow">
            <p className="truncate font-semibold">{row.name}</p>
            <p className="text-sm text-ink-muted">{row.phone}</p>
          </div>
          <a href={callLink(row.phone)} aria-label={`Call ${row.name}`} className={roundButton}>
            <Phone aria-hidden className="size-5" />
          </a>
          <a
            href={whatsappLink(row.phone, greeting)}
            target="_blank"
            rel="noreferrer"
            aria-label={`WhatsApp ${row.name}`}
            className={`${roundButton} bg-[#1f7a46]/10 text-[#1f7a46] hover:bg-[#1f7a46] hover:text-white`}
          >
            <MessageCircle aria-hidden className="size-5" />
          </a>
        </div>

        <a
          href={directionsLink(row)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl bg-cream p-4 ring-1 ring-burgundy/10 transition-colors hover:bg-blush"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1a73e8] text-white">
            <Navigation aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-[#1a73e8]">Open in Google Maps</span>
            <span className="block text-sm text-ink-muted [overflow-wrap:anywhere]">
              {row.address || 'Customer’s shared location'}
            </span>
          </span>
        </a>

        {row.message && (
          <p className="flex gap-2 text-sm">
            <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-rosewood" />
            <span className="[overflow-wrap:anywhere]">{row.message}</span>
          </p>
        )}

        {row.paidBy === 'membership' && (
          <p className="flex items-center gap-2 rounded-xl bg-gold/25 px-3 py-2 text-sm font-semibold">
            <Crown aria-hidden className="size-4 shrink-0 text-burgundy" />
            Membership visit: do not collect money. Saathi First pays your share.
          </p>
        )}

        {row.extraHoursRequested && (
          <p className="flex items-center gap-2 rounded-xl bg-gold/25 px-3 py-2 text-sm font-medium">
            <Hourglass aria-hidden className="size-4 shrink-0 text-burgundy" />
            Customer asked for {row.extraHoursRequested} more hour{row.extraHoursRequested === 1 ? '' : 's'}. The office will
            confirm.
          </p>
        )}

        {finishing ? (
          <CollectionForm
            booking={row}
            commissionPercent={percent}
            onSave={(collection) => markCompleted(row.id, collection)}
            onCancel={() => setFinishing(false)}
          />
        ) : (
          <div className="grid gap-2">
            {!started && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void begin()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold text-burgundy ring-1 ring-burgundy/25 transition-colors hover:bg-burgundy/10 disabled:opacity-60"
              >
                <Play aria-hidden className="size-4" />
                {busy ? 'Saving…' : 'I have arrived — start visit'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setFinishing(true)}
              className="h-12 rounded-xl bg-burgundy font-semibold text-blush transition-colors hover:bg-wine"
            >
              {row.paidBy === 'membership' ? 'Complete visit' : <>Complete visit &amp; record payment</>}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-[#b3261e]">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}

function DoneCard({ row, outstandingPaise }: { row: Stored<Booking>; outstandingPaise?: number }) {
  const c = row.collection
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-gold/20">
      <div className="min-w-0 grow">
        <p className="truncate font-semibold">{row.serviceName ?? row.planName} · {row.name}</p>
        <p className="text-xs text-ink-muted">
          {row.completedAt ? friendlyWhen(row.completedAt.toDate()) : ''}
        </p>
      </div>
      {c && c.method === 'membership' ? (
        <div className="shrink-0 text-right">
          <p className="font-semibold">{formatRupees(c.saathiSharePaise)}</p>
          <p className="text-xs font-semibold text-emerald-700">Membership · you earn</p>
        </div>
      ) : (
        c && (
          <div className="shrink-0 text-right">
            <p className="font-semibold">{formatRupees(c.totalPaise)}</p>
            <p className={`text-xs font-semibold ${outstandingPaise ? 'text-rosewood' : 'text-emerald-700'}`}>
              {outstandingPaise ? `${formatRupees(outstandingPaise)} to pay` : 'Settled'}
            </p>
          </div>
        )
      )}
    </li>
  )
}

type View = 'today' | 'upcoming' | 'completed'

const startOf = (row: Stored<Booking>) => (row.scheduledAt ?? row.preferredStart)?.toDate() ?? null
const dayKey = (date: Date) => date.toDateString()

export function Visits({ visits, percent, account, onPay }: {
  visits: Stored<Booking>[]
  percent: number
  account: Ledger<Stored<Booking>>
  onPay: () => void
}) {
  const [now] = useState(() => new Date())
  const active = visits
    .filter((row) => row.status === 'assigned' || row.status === 'started')
    .sort((a, b) => (startOf(a)?.getTime() ?? 0) - (startOf(b)?.getTime() ?? 0))
  // Today holds anything in progress or due today, and anything late (an earlier day, not done).
  const isToday = (row: Stored<Booking>) => {
    const start = startOf(row)
    return row.status === 'started' || !start || start.getTime() < now.getTime() || dayKey(start) === dayKey(now)
  }
  const today = active.filter(isToday)
  const upcoming = active.filter((row) => !isToday(row))
  const done = visits
    .filter((row) => row.status === 'completed')
    .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
  const outstanding = new Map(account.items.map((item) => [item.row.id, item.outstandingPaise]))
  const [view, setView] = useState<View>(today.length || !upcoming.length ? 'today' : 'upcoming')

  // Upcoming visits under a heading per day, e.g. "Tomorrow" or "Saturday, 31 October".
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const days = new Map<string, Stored<Booking>[]>()
  for (const row of upcoming) {
    const start = startOf(row)!
    const label =
      dayKey(start) === dayKey(tomorrow)
        ? 'Tomorrow'
        : start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    days.set(label, [...(days.get(label) ?? []), row])
  }

  const tabs: { id: View; label: string; count: number }[] = [
    { id: 'today', label: 'Today', count: today.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Completed', count: done.length },
  ]

  return (
    <div className="grid gap-5">
      {account.overdue && (
        <button
          type="button"
          onClick={onPay}
          className="flex items-center gap-3 rounded-2xl bg-rosewood p-4 text-left text-white"
        >
          <AlertTriangle aria-hidden className="size-6 shrink-0" />
          <span className="grow font-semibold">{formatRupees(account.duePaise)} is overdue. Tap to pay now.</span>
        </button>
      )}

      <div role="tablist" aria-label="Visits" className="grid grid-cols-3 gap-1 rounded-2xl bg-white/85 p-1 ring-1 ring-gold/25">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${
              view === id ? 'bg-burgundy text-blush' : 'text-burgundy hover:bg-burgundy/[0.06]'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 text-xs ${view === id ? 'bg-blush/20' : 'bg-burgundy/10'}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {view === 'today' &&
        (today.length === 0 ? (
          <Notice>
            No visits today.{upcoming.length > 0 && ' Your next ones are under Upcoming.'} New visits appear by themselves.
          </Notice>
        ) : (
          <ul className="grid gap-4">
            {today.map((row) => (
              <VisitCard key={row.id} row={row} percent={percent} />
            ))}
          </ul>
        ))}

      {view === 'upcoming' &&
        (upcoming.length === 0 ? (
          <Notice>Nothing coming up yet. New visits appear here by themselves.</Notice>
        ) : (
          [...days].map(([label, rows]) => (
            <section key={label}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</h2>
              <ul className="grid gap-4">
                {rows.map((row) => (
                  <VisitCard key={row.id} row={row} percent={percent} />
                ))}
              </ul>
            </section>
          ))
        ))}

      {view === 'completed' &&
        (done.length === 0 ? (
          <Notice>No completed visits yet.</Notice>
        ) : (
          <ul className="grid gap-2">
            {done.map((row) => (
              <DoneCard key={row.id} row={row} outstandingPaise={outstanding.get(row.id)} />
            ))}
          </ul>
        ))}
    </div>
  )
}
