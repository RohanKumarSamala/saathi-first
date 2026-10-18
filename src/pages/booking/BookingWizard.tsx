import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock,
  LocateFixed,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Shuffle,
  Sun,
} from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthGate } from '../../auth/AuthGate'
import { useAuth } from '../../auth/context'
import { plans, site, type Service } from '../../content/site'
import { friendlyWhen } from '../../lib/contact'
import { createBooking, type Saathi, type SharedLocation, type Stored } from '../../lib/db'
import { isValidIndianMobile } from '../../lib/enquiry'
import {
  companionPlans,
  hoursLabel,
  isPerVisitService,
  MAX_HOURS,
  MIN_HOURS,
  planForHours,
  priceLabel,
  propertyPlan,
  wholeDayPlan,
} from '../../lib/pricing'

type StepId = 'time' | 'when' | 'where' | 'confirm'
type Locating = 'idle' | 'locating' | 'denied' | 'unavailable'
type Day = 'today' | 'tomorrow' | 'other' | ''

// Visits start between 7 am and 8 pm on the half hour; same-day visits need 90 minutes' notice.
const FIRST_SLOT = 7 * 60
const LAST_SLOT = 20 * 60
const NOTICE_MINUTES = 90
const MAX_DAYS_AHEAD = 90

const pad = (value: number) => String(value).padStart(2, '0')
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const shortDay = (date: Date) => date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const pickAtRandom = <T,>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)]
const isTooSoon = (date: Date) => date.getTime() < Date.now() + 30 * 60_000

function slotLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${pad(minutes % 60)} ${hours >= 12 ? 'pm' : 'am'}`
}

/** Start times on `date`; today only offers those with enough notice. */
function slotsFor(date: Date, now: Date) {
  const all: number[] = []
  for (let minutes = FIRST_SLOT; minutes <= LAST_SLOT; minutes += 30) all.push(minutes)
  if (isoDate(date) !== isoDate(now)) return all
  const earliest = now.getHours() * 60 + now.getMinutes() + NOTICE_MINUTES
  return all.filter((minutes) => minutes >= earliest)
}

const periods = [
  { label: 'Morning', from: 0, to: 12 * 60 },
  { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { label: 'Evening', from: 17 * 60, to: 24 * 60 },
]

const chip =
  'flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-burgundy/15 bg-white px-3 text-center font-semibold text-ink transition-colors duration-200 hover:border-burgundy/50 has-checked:border-burgundy has-checked:bg-burgundy has-checked:text-blush has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold has-disabled:cursor-not-allowed has-disabled:opacity-40'
const input =
  'h-14 w-full rounded-2xl border border-burgundy/15 bg-white px-4 text-lg text-ink placeholder:text-ink/40 focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30'
const primary =
  'inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-burgundy px-7 text-lg font-semibold text-blush transition-colors hover:bg-wine disabled:pointer-events-none disabled:opacity-60'

function Choice({ name, value, checked, onChange, disabled, children }: {
  name: string
  value: string
  checked: boolean
  onChange: (value: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <label className={chip}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {children}
    </label>
  )
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p role="alert" className="mt-4 rounded-xl bg-[#b3261e]/[0.08] px-4 py-3 font-medium text-[#8c1d18]">
      {children}
    </p>
  )
}

/**
 * Booking, one question per screen: how long, when, where, then a recap to confirm.
 * Visitors can look through the steps freely; signing in is asked for only to confirm.
 */
export function BookingWizard({ service, saathis }: { service: Service; saathis: Stored<Saathi>[] | null }) {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const perVisit = isPerVisitService(service.id)
  const stepIds: StepId[] = perVisit ? ['when', 'where', 'confirm'] : ['time', 'when', 'where', 'confirm']
  const [index, setIndex] = useState(0)
  const step = stepIds[index]

  // A plan picked on the Plans page arrives as ?plan= and sets the starting hours.
  const fromPlans = plans.find((plan) => plan.id === params.get('plan'))
  const [hours, setHours] = useState(fromPlans?.hours ?? companionPlans[0]?.hours ?? MIN_HOURS)
  const plan = perVisit ? propertyPlan : planForHours(hours)

  const [now] = useState(() => new Date())
  const today = useMemo(() => addDays(now, 0), [now])
  const todaySlots = slotsFor(today, now)
  const [day, setDay] = useState<Day>(todaySlots.length ? '' : 'tomorrow')
  const [otherDate, setOtherDate] = useState('')
  const [slot, setSlot] = useState('')
  const visitDate =
    day === 'today' ? today : day === 'tomorrow' ? addDays(today, 1) : day === 'other' && otherDate ? new Date(`${otherDate}T00:00`) : null
  const slots = visitDate ? slotsFor(visitDate, now) : []
  const start = visitDate && slot ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 0, Number(slot)) : null

  const [location, setLocation] = useState<SharedLocation | null>(null)
  const [locating, setLocating] = useState<Locating>('idle')
  const [address, setAddress] = useState('')

  const matching = saathis?.filter((saathi) => saathi.services.includes(service.id)) ?? []
  const [choice, setChoice] = useState('')
  // Null until edited, so the signed-in account's name and number fill in by default.
  const [name, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const nameValue = name ?? user?.displayName ?? ''
  const phoneValue = phone ?? user?.phoneNumber ?? ''

  const [error, setError] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'sent' | 'failed'>('idle')
  const [picked, setPicked] = useState('')

  // Any new answer clears the last error, so a fixed problem never keeps showing.
  const chooseDay = (value: string) => {
    setDay(value as Day)
    setSlot('')
    setError('')
  }
  const chooseSlot = (value: string) => {
    setSlot(value)
    setError('')
  }

  const shareLocation = () => {
    if (!('geolocation' in navigator)) return setLocating('unavailable')
    setLocating('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy) })
        setLocating('idle')
        setError('')
      },
      (failure) => setLocating(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  /** The problem with the current step, if any, so Continue can stop and say why. */
  const problem = (id: StepId) => {
    if (id === 'when' && !start) return 'Please choose a day and a start time.'
    if (id === 'when' && start && isTooSoon(start)) return 'That time has passed. Please choose a later time.'
    if (id === 'where' && !location && address.trim().length < 3) return 'Please share your location or type the address.'
    return ''
  }

  const go = (to: number) => {
    setError('')
    setIndex(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const next = () => {
    const issue = problem(step)
    if (issue) return setError(issue)
    go(index + 1)
  }

  const confirm = async (event: FormEvent) => {
    event.preventDefault()
    // Re-check earlier steps too, in case the time slipped into the past while confirming.
    const earlier = stepIds.find((id) => problem(id))
    if (earlier) {
      go(stepIds.indexOf(earlier))
      setError(problem(earlier))
      return
    }
    if (!nameValue.trim()) return setError('Please enter your name.')
    if (!isValidIndianMobile(phoneValue)) return setError('Please enter a valid 10-digit mobile number.')
    if (!user || !plan || !start) return

    const chosen = matching.find((saathi) => saathi.id === choice)
    const saathi = chosen ?? pickAtRandom(matching)
    setError('')
    setState('saving')
    try {
      await createBooking({
        uid: user.uid,
        name: nameValue.trim(),
        phone: phoneValue.trim(),
        planId: plan.id,
        planName: plan.name,
        planPrice: priceLabel(plan),
        hours: perVisit ? null : hours,
        preferredStart: start,
        location,
        address: address.trim(),
        message: note.trim(),
        serviceId: service.id,
        serviceName: service.name,
        saathiId: saathi?.id ?? '',
        saathiName: saathi?.name ?? '',
        saathiChoice: chosen ? 'chosen' : saathi ? 'random' : 'none',
      })
      setPicked(chosen ? `You asked for ${chosen.name}.` : saathi ? `We picked ${saathi.name} for you.` : '')
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  const recap: { label: string; value: string; edit?: StepId }[] = [
    { label: 'Service', value: service.name },
    { label: perVisit ? 'Visit' : 'How long', value: perVisit ? 'One visit' : hoursLabel(hours), edit: perVisit ? undefined : 'time' },
    { label: 'When', value: start ? friendlyWhen(start) : '', edit: 'when' },
    { label: 'Where', value: address.trim() || (location ? 'Your shared location' : ''), edit: 'where' },
    { label: 'Price', value: plan ? `${plan.price} · ${plan.name}` : '' },
  ]

  if (state === 'sent') {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgb(58_17_25/0.5)] ring-1 ring-gold/25 nav:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CircleCheck aria-hidden className="size-9" strokeWidth={1.8} />
        </span>
        <h2 className="mt-5 text-3xl font-light tracking-tight">Booking received</h2>
        <p className="mx-auto mt-2 max-w-md text-lg text-ink-muted">
          {start && `${service.name}, ${friendlyWhen(start)}. `}
          {picked} We will call to confirm, and your Saathi’s name and WhatsApp will appear on My bookings.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/bookings" className={primary}>
            Track my booking
          </Link>
          <Link to="/" className="inline-flex min-h-14 items-center rounded-2xl px-6 text-lg font-semibold text-burgundy hover:bg-burgundy/10">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const title: Record<StepId, string> = {
    time: 'How long do you need a Saathi?',
    when: 'When should your Saathi come?',
    where: 'Where should your Saathi come?',
    confirm: 'Check and confirm',
  }

  return (
    <>
      <div className="mb-5">
        <div className="flex gap-1.5" aria-hidden>
          {stepIds.map((id, position) => (
            <span key={id} className={`h-1.5 grow rounded-full transition-colors duration-500 ${position <= index ? 'bg-burgundy' : 'bg-burgundy/15'}`} />
          ))}
        </div>
        <p className="mt-2 text-sm font-medium text-ink-muted">
          Step {index + 1} of {stepIds.length}
        </p>
      </div>

      <section aria-labelledby="step-title" className="rounded-3xl bg-white p-6 shadow-[0_20px_50px_-30px_rgb(58_17_25/0.5)] ring-1 ring-gold/25 nav:p-8">
        <h2 id="step-title" className="mb-6 text-2xl font-normal tracking-tight nav:text-3xl">
          {title[step]}
        </h2>

        {step === 'time' && (
          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {companionPlans.map(({ hours: value }) => (
                <Choice key={value} name="hours" value={String(value)} checked={hours === value} onChange={(v) => setHours(Number(v))}>
                  {wholeDayPlan?.hours === value ? (
                    <>
                      <Sun aria-hidden className="size-5" />
                      Whole day
                    </>
                  ) : (
                    `${value} hours`
                  )}
                </Choice>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-blush/60 p-2">
              <button
                type="button"
                aria-label="One hour less"
                disabled={hours <= MIN_HOURS}
                onClick={() => setHours((value) => Math.max(MIN_HOURS, value - 1))}
                className="grid size-14 place-items-center rounded-xl bg-white text-burgundy shadow-sm transition-colors hover:bg-burgundy hover:text-blush disabled:opacity-30"
              >
                <Minus aria-hidden className="size-6" />
              </button>
              <p aria-live="polite" className="text-center">
                <span className="block text-xl font-semibold">{hoursLabel(hours)}</span>
                {plan && <span className="block text-ink-muted">{plan.price} · {plan.name}</span>}
              </p>
              <button
                type="button"
                aria-label="One hour more"
                disabled={hours >= MAX_HOURS}
                onClick={() => setHours((value) => Math.min(MAX_HOURS, value + 1))}
                className="grid size-14 place-items-center rounded-xl bg-white text-burgundy shadow-sm transition-colors hover:bg-burgundy hover:text-blush disabled:opacity-30"
              >
                <Plus aria-hidden className="size-6" />
              </button>
            </div>
            {hours >= MAX_HOURS && (
              <p className="text-ink-muted">Need more than a day? Add a note at the end, or call {site.phoneDisplay}.</p>
            )}
          </div>
        )}

        {step === 'when' && (
          <div className="grid gap-6">
            <div className="grid grid-cols-3 gap-3">
              <Choice name="day" value="today" checked={day === 'today'} onChange={chooseDay} disabled={!todaySlots.length}>
                <span className="leading-tight">
                  Today
                  <span className="block text-sm font-normal opacity-75">{shortDay(today)}</span>
                </span>
              </Choice>
              <Choice name="day" value="tomorrow" checked={day === 'tomorrow'} onChange={chooseDay}>
                <span className="leading-tight">
                  Tomorrow
                  <span className="block text-sm font-normal opacity-75">{shortDay(addDays(today, 1))}</span>
                </span>
              </Choice>
              <Choice name="day" value="other" checked={day === 'other'} onChange={chooseDay}>
                <CalendarDays aria-hidden className="size-5" />
                Later
              </Choice>
            </div>
            {!todaySlots.length && <p className="-mt-3 text-ink-muted">It is too late to book for today.</p>}
            {day === 'other' && (
              <label className="block">
                <span className="mb-2 block font-semibold">Date</span>
                <input
                  type="date"
                  value={otherDate}
                  min={isoDate(addDays(today, 2))}
                  max={isoDate(addDays(today, MAX_DAYS_AHEAD))}
                  onChange={(event) => {
                    setOtherDate(event.target.value)
                    setSlot('')
                    setError('')
                  }}
                  className={input}
                />
              </label>
            )}
            {visitDate &&
              periods.map((period) => {
                const inPeriod = slots.filter((minutes) => minutes >= period.from && minutes < period.to)
                if (!inPeriod.length) return null
                return (
                  <fieldset key={period.label}>
                    <legend className="mb-2 flex items-center gap-2 font-semibold">
                      <Clock aria-hidden className="size-4 text-rosewood" />
                      {period.label}
                    </legend>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {inPeriod.map((minutes) => (
                        <Choice key={minutes} name="slot" value={String(minutes)} checked={slot === String(minutes)} onChange={chooseSlot}>
                          {slotLabel(minutes)}
                        </Choice>
                      ))}
                    </div>
                  </fieldset>
                )
              })}
          </div>
        )}

        {step === 'where' && (
          <div className="grid gap-4">
            {location ? (
              <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 ring-1 ring-emerald-200">
                <span className="flex items-center gap-2 font-semibold text-emerald-800">
                  <CircleCheck aria-hidden className="size-5" />
                  Location shared
                </span>
                <button type="button" onClick={() => setLocation(null)} className="min-h-12 px-2 font-semibold text-ink-muted underline underline-offset-4">
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={shareLocation}
                disabled={locating === 'locating'}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-burgundy/20 bg-blush/50 px-4 text-lg font-semibold text-burgundy transition-colors hover:bg-burgundy hover:text-blush disabled:cursor-wait"
              >
                <LocateFixed aria-hidden className="size-5" />
                {locating === 'locating' ? 'Finding you…' : 'Use my current location'}
              </button>
            )}
            {(locating === 'denied' || locating === 'unavailable') && (
              <p role="status" className="text-ink-muted">
                {locating === 'denied' ? 'Location is turned off.' : 'We could not find your location.'} Please type the address
                instead.
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-ink-muted">
              <span className="h-px grow bg-burgundy/10" />
              or type it
              <span className="h-px grow bg-burgundy/10" />
            </div>
            <label className="relative block">
              <span className="sr-only">Address or landmark</span>
              <MapPin aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-rosewood" />
              <input
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value)
                  setError('')
                }}
                autoComplete="street-address"
                placeholder="House, street, area or landmark"
                className={`${input} pl-12`}
              />
            </label>
          </div>
        )}

        {step === 'confirm' && (
          <div className="grid gap-6">
            <dl className="divide-y divide-burgundy/10 rounded-2xl bg-blush/50 px-4">
              {recap
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="flex items-center gap-3 py-3">
                    <dt className="w-24 shrink-0 text-ink-muted">{row.label}</dt>
                    <dd className="grow font-semibold [overflow-wrap:anywhere]">{row.value}</dd>
                    {row.edit && (
                      <button
                        type="button"
                        onClick={() => go(stepIds.indexOf(row.edit as StepId))}
                        aria-label={`Change ${row.label.toLowerCase()}`}
                        className="grid size-11 shrink-0 place-items-center rounded-full text-burgundy hover:bg-burgundy/10"
                      >
                        <Pencil aria-hidden className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
            </dl>

            <AuthGate action="confirm your booking">
              <form noValidate onSubmit={confirm} className="grid gap-4">
                {matching.length > 0 && (
                  <fieldset>
                    <legend className="mb-2 font-semibold">Your Saathi</legend>
                    <div className="grid gap-2">
                      <Choice name="saathi" value="" checked={choice === ''} onChange={setChoice}>
                        <Shuffle aria-hidden className="size-5" />
                        Choose for me
                      </Choice>
                      {matching.map((saathi) => (
                        <Choice key={saathi.id} name="saathi" value={saathi.id} checked={choice === saathi.id} onChange={setChoice}>
                          {saathi.name}
                          {saathi.area && <span className="font-normal opacity-75">· {saathi.area}</span>}
                        </Choice>
                      ))}
                    </div>
                  </fieldset>
                )}
                <label className="block">
                  <span className="mb-2 block font-semibold">Your name</span>
                  <input value={nameValue} onChange={(event) => setName(event.target.value)} autoComplete="name" className={input} />
                </label>
                <label className="block">
                  <span className="mb-2 block font-semibold">Mobile number</span>
                  <input
                    value={phoneValue}
                    onChange={(event) => setPhone(event.target.value)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="For your Saathi to reach you"
                    className={input}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-semibold">
                    Note <span className="font-normal text-ink-muted">(optional)</span>
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    placeholder="e.g. hospital name, wheelchair needed"
                    className={`${input} h-auto resize-y py-3`}
                  />
                </label>
                <ErrorText>{error}</ErrorText>
                {state === 'failed' && <ErrorText>{`We could not send your booking. Please try again or call ${site.phoneDisplay}.`}</ErrorText>}
                <button type="submit" disabled={state === 'saving'} className={`${primary} mt-2 w-full`}>
                  {state === 'saving' ? 'Booking…' : `Confirm booking${plan ? ` · ${plan.price}` : ''}`}
                </button>
                <p className="text-center text-sm text-ink-muted">We will call you to confirm before your Saathi comes.</p>
              </form>
            </AuthGate>
          </div>
        )}

        {step !== 'confirm' && <ErrorText>{error}</ErrorText>}
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        {index > 0 ? (
          <button type="button" onClick={() => go(index - 1)} className="inline-flex min-h-14 items-center gap-2 rounded-2xl px-4 text-lg font-semibold text-burgundy hover:bg-burgundy/10">
            <ArrowLeft aria-hidden className="size-5" />
            Back
          </button>
        ) : (
          <span />
        )}
        {step !== 'confirm' && (
          <button type="button" onClick={next} className={primary}>
            Continue
            <ArrowRight aria-hidden className="size-5" />
          </button>
        )}
      </div>
    </>
  )
}
