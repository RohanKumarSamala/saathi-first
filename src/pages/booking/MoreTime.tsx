import { Hourglass, Plus } from 'lucide-react'
import { useState } from 'react'
import { site } from '../../content/site'
import { requestMoreTime, type Booking, type Stored } from '../../lib/db'
import { hoursLabel, MAX_HOURS, planForHours } from '../../lib/pricing'

const choices = [1, 2, 3, 4]

/**
 * "More time" on a confirmed or running visit. The customer picks extra hours, sees
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
      <p role="status" className="flex items-center gap-2 rounded-xl bg-gold/25 px-3 py-2.5">
        <Hourglass aria-hidden className="size-5 shrink-0 text-burgundy" />
        Asked for +{pending} hr{pending === 1 ? '' : 's'} · we will confirm soon
      </p>
    )
  }
  if (room <= 0) return null

  const total = hours + extra
  const plan = extra ? planForHours(total) : undefined

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await requestMoreTime(row.id, extra)
      setOpen(false)
    } catch {
      setError(`Could not send. Please call ${site.phoneDisplay}.`)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold text-burgundy ring-1 ring-burgundy/20 transition-colors hover:bg-burgundy hover:text-blush"
        >
          <Plus aria-hidden className="size-5" />
          More time
        </button>
        {row.extraDeclinedAt && <span className="text-sm text-ink-muted">Last request not possible · please call us</span>}
      </div>
    )
  }

  return (
    <div className="grid gap-3 rounded-xl bg-blush/70 p-3">
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Extra hours">
        {choices
          .filter((value) => value <= room)
          .map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={extra === value}
              onClick={() => setExtra(value)}
              className={`min-h-12 rounded-xl text-lg font-semibold transition-colors ${
                extra === value ? 'bg-burgundy text-blush' : 'bg-white text-burgundy ring-1 ring-burgundy/20 hover:bg-burgundy/10'
              }`}
            >
              +{value}
            </button>
          ))}
      </div>
      {plan && (
        <p aria-live="polite">
          {hoursLabel(total)} · <strong className="text-burgundy">{plan.price}</strong>
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!extra || busy}
          onClick={send}
          className="min-h-12 grow rounded-xl bg-burgundy px-4 font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Ask for more time'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-xl px-4 font-semibold text-ink-muted hover:text-wine">
          Close
        </button>
      </div>
      {error && (
        <p role="status" className="text-sm text-[#b3261e]">
          {error}
        </p>
      )}
    </div>
  )
}
