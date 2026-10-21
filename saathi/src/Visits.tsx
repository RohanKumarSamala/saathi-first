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
  const greeting = `Hello ${row.name}, this is ${row.assignedSaathiName ?? 'your Saathi'} from Saathi First about your visit.`

  const start = async () => {
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
      <div className={`flex items-center justify-between gap-3 px-5 py-3 text-sm font-semibold ${started ? 'bg-burgundy text-blush' : 'bg-blush text-wine'}`}>
        <span className="flex items-center gap-2">
          <CalendarClock aria-hidden className="size-4" />
          {when(row)}
        </span>
        <span>{started ? 'In progress' : 'Upcoming'}</span>
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
                onClick={() => void start()}
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

export function Visits({ visits, percent, account, onPay }: {
  visits: Stored<Booking>[]
  percent: number
  account: Ledger<Stored<Booking>>
  onPay: () => void
}) {
  const active = visits.filter((row) => row.status === 'assigned' || row.status === 'started')
  const done = visits
    .filter((row) => row.status === 'completed')
    .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
    .slice(0, 15)
  const outstanding = new Map(account.items.map((item) => [item.row.id, item.outstandingPaise]))

  return (
    <div className="grid gap-6">
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

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your visits</h2>
        {active.length === 0 ? (
          <Notice>No visits assigned right now. New visits appear here by themselves.</Notice>
        ) : (
          <ul className="grid gap-4">
            {active.map((row) => (
              <VisitCard key={row.id} row={row} percent={percent} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Completed</h2>
          <ul className="grid gap-2">
            {done.map((row) => (
              <DoneCard key={row.id} row={row} outstandingPaise={outstanding.get(row.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
