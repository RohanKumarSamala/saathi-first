import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { dateKey } from '../../lib/dates'

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
const clamp = (date: Date, min: Date, max: Date) => (date < min ? min : date > max ? max : date)

const weekdays = [
  ['S', 'Sunday'],
  ['M', 'Monday'],
  ['T', 'Tuesday'],
  ['W', 'Wednesday'],
  ['T', 'Thursday'],
  ['F', 'Friday'],
  ['S', 'Saturday'],
]

/**
 * Month calendar for picking a visit date. Days outside `min`–`max` are greyed out.
 * Arrow keys move a day or a week, Page Up / Page Down a month, Enter or Space picks.
 */
export function DateCalendar({ value, today, min, max, onChange }: {
  value: Date | null
  /** Marked with a ring so people can find their bearings. */
  today: Date
  min: Date
  max: Date
  onChange: (date: Date) => void
}) {
  const [month, setMonth] = useState(() => startOfMonth(value ?? min))
  const [focused, setFocused] = useState(() => value ?? min)
  const grid = useRef<HTMLDivElement>(null)
  const moveFocus = useRef(false)

  // A date typed into the box (or a quick button) brings its month into view.
  const valueKey = value ? dateKey(value) : ''
  const [shownKey, setShownKey] = useState(valueKey)
  if (valueKey !== shownKey) {
    setShownKey(valueKey)
    if (value) {
      setMonth(startOfMonth(value))
      setFocused(value)
    }
  }

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${dateKey(focused)}"]`)?.focus()
  }, [focused])

  const goTo = (date: Date) => {
    const next = clamp(date, min, max)
    moveFocus.current = true
    setFocused(next)
    setMonth(startOfMonth(next))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (event.key in moves) goTo(addDays(focused, moves[event.key]))
    else if (event.key === 'PageUp') goTo(new Date(focused.getFullYear(), focused.getMonth() - 1, focused.getDate()))
    else if (event.key === 'PageDown') goTo(new Date(focused.getFullYear(), focused.getMonth() + 1, focused.getDate()))
    else return
    event.preventDefault()
  }

  const first = startOfMonth(month)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ]
  const todayKey = dateKey(today)
  // The focused day must be in this month to take the tab stop; otherwise the first open day does.
  const focusKey =
    focused.getMonth() === month.getMonth() && focused.getFullYear() === month.getFullYear()
      ? dateKey(focused)
      : dateKey(clamp(first, min, max))
  const canGoBack = addMonths(month, -1) >= startOfMonth(min)
  const canGoForward = addMonths(month, 1) <= max

  const navButton =
    'grid size-10 place-items-center rounded-full text-burgundy transition-colors hover:bg-burgundy/10 disabled:pointer-events-none disabled:opacity-30'

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-3 ring-1 ring-burgundy/15 sm:p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => setMonth(addMonths(month, -1))}
          className={navButton}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <p aria-live="polite" className="font-semibold">
          {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => setMonth(addMonths(month, 1))}
          className={navButton}
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-xs font-semibold text-ink-muted">
        {weekdays.map(([short, full]) => (
          <abbr key={full} title={full} className="py-1 no-underline">
            {short}
          </abbr>
        ))}
      </div>

      <div ref={grid} role="group" aria-label="Choose a date" className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} aria-hidden />
          const key = dateKey(date)
          const selected = valueKey === key
          const disabled = date < min || date > max
          return (
            <button
              key={key}
              type="button"
              data-date={key}
              tabIndex={key === focusKey ? 0 : -1}
              disabled={disabled}
              aria-pressed={selected}
              aria-current={key === todayKey ? 'date' : undefined}
              aria-label={date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              onClick={() => {
                setFocused(date)
                onChange(date)
              }}
              onKeyDown={onKeyDown}
              className={`grid h-10 place-items-center rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:font-normal disabled:text-ink/25 ${
                selected
                  ? 'bg-burgundy text-blush'
                  : key === todayKey
                    ? 'text-burgundy ring-1 ring-burgundy/40 hover:bg-burgundy/10'
                    : 'text-ink hover:bg-burgundy/10'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
