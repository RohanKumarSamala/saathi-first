import { Hourglass, Plus } from 'lucide-react'
import { useState } from 'react'
import { site } from '../../content/site'
import { requestMoreTime, type Booking, type Stored } from '../../lib/db'
import { hoursLabel, MAX_HOURS, planForHours } from '../../lib/pricing'

const choices = [1, 2, 3, 4]

/**
 * "Need more time?" on a confirmed or running visit. The customer picks extra hours, sees
 * the new total and price, and the request goes to the team, who confirm with the Saathi.
 */
export function MoreTime({ row }: { row: Stored<Booking> }) {
  const [open, setOpen] = useState(false)
  const [extra, setExtra] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const hours = row.hours ?? 0
  const room = MAX_HOURS - hours
  const pending = row.extraHoursRequested ?? 0

  if (pending > 0) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-3xl bg-gold/20 p-5 text-lg ring-1 ring-gold/50">
        <Hourglass aria-hidden className="mt-1 size-6 shrink-0 text-burgundy" />
        You asked for {pending} more hour{pending === 1 ? '' : 's'}. We are checking with your Saathi and will update
        this page.
      </p>
    )
  }
  if (room <= 0) {
    return (
      <p className="text-lg text-ink-muted">
        This visit already covers the whole day. For longer, call us on{' '}
        <a href={site.phoneHref} className="font-semibold text-burgundy underline underline-offset-4">
          {site.phoneDisplay}
        </a>
        .
      </p>
    )
  }

  const total = hours + extra
  const plan = extra ? planForHours(total) : undefined

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await requestMoreTime(row.id, extra)
      setOpen(false)
    } catch {
      setError(`We could not send that. Please call us on ${site.phoneDisplay}.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      {row.extraDeclinedAt && (
        <p className="text-lg text-ink-muted">
          We could not add more time last time. Please call us on {site.phoneDisplay} and we will help.
        </p>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-16 items-center justify-center gap-3 justify-self-start rounded-2xl bg-white px-7 text-lg font-semibold text-burgundy ring-2 ring-burgundy/25 transition-colors hover:bg-burgundy hover:text-blush"
        >
          <Plus aria-hidden className="size-6" />
          Need more time?
        </button>
      ) : (
        <div className="rounded-3xl bg-blush/70 p-6 ring-1 ring-gold/30">
          <p className="text-xl font-semibold">How many more hours?</p>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {choices
              .filter((value) => value <= room)
              .map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={extra === value}
                  onClick={() => setExtra(value)}
                  className={`min-h-16 rounded-2xl text-lg font-semibold transition-colors ${
                    extra === value ? 'bg-burgundy text-blush' : 'bg-white text-burgundy ring-2 ring-burgundy/20 hover:bg-burgundy/10'
                  }`}
                >
                  +{value}
                </button>
              ))}
          </div>
          {plan && (
            <p aria-live="polite" className="mt-4 text-lg">
              New total <strong>{hoursLabel(total).toLowerCase()}</strong> ·{' '}
              <strong className="text-burgundy">
                {plan.name} {plan.price}
              </strong>
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!extra || busy}
              onClick={send}
              className="inline-flex min-h-16 items-center rounded-2xl bg-burgundy px-7 text-lg font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Ask for more time'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-16 items-center rounded-2xl px-6 text-lg font-semibold text-ink-muted hover:text-wine"
            >
              Not now
            </button>
          </div>
          <p role="status" className="mt-2 text-lg text-[#b3261e]">
            {error}
          </p>
        </div>
      )}
    </div>
  )
}
