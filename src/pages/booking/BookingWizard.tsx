import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock,
  LocateFixed,
  MapPin,
  Pencil,
  Shuffle,
} from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthGate } from '../../auth/AuthGate'
import { useAuth } from '../../auth/context'
import { plans, site, type Service } from '../../content/site'
import { friendlyWhen } from '../../lib/contact'
import { dateKey } from '../../lib/dates'
import { DateCalendar } from './DateCalendar'
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

// Visits start from 7 am on the half hour and must finish by 11 pm, so the latest start
// depends on the plan's hours (2 hrs → 9 pm, 12 hrs → 11 am). Property visits have no set
// length and start by 8 pm. Same-day visits need 90 minutes' notice.
const FIRST_SLOT = 7 * 60
const LATEST_END = 23 * 60
const PER_VISIT_LAST_SLOT = 20 * 60
const NOTICE_MINUTES = 90
const MAX_DAYS_AHEAD = 90

const pad = (value: number) => String(value).padStart(2, '0')
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const pickAtRandom = <T,>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)]
const isTooSoon = (date: Date) => date.getTime() < Date.now() + 30 * 60_000

function slotLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${pad(minutes % 60)} ${hours >= 12 ? 'pm' : 'am'}`
}

/** Start times on `date` up to `lastStart`; today only offers those with enough notice. */
function slotsFor(date: Date, now: Date, lastStart: number) {
  const all: number[] = []
  for (let minutes = FIRST_SLOT; minutes <= lastStart; minutes += 30) all.push(minutes)
  if (isoDate(date) !== isoDate(now)) return all
  const earliest = now.getHours() * 60 + now.getMinutes() + NOTICE_MINUTES
  return all.filter((minutes) => minutes >= earliest)
}

type AddressPart = 'flat' | 'building' | 'street' | 'landmark' | 'pin'

// Lengths keep the joined address under the 300 characters firestore.rules allows.
const addressFields: {
  id: AddressPart
  label: string
  placeholder: string
  required: boolean
  maxLength: number
  autoComplete: string
  message: string
  wide?: boolean
}[] = [
  { id: 'flat', label: 'Flat / house no.', placeholder: 'e.g. Flat 302', required: true, maxLength: 30, autoComplete: 'address-line1', message: 'Please enter your flat or house number.' },
  { id: 'building', label: 'Apartment / building name', placeholder: 'e.g. Green Residency', required: false, maxLength: 60, autoComplete: 'address-line2', message: '' },
  { id: 'street', label: 'Street / lane / area', placeholder: 'e.g. Road No. 12, Banjara Hills', required: true, maxLength: 90, autoComplete: 'address-line3', message: 'Please enter the street, lane or area.', wide: true },
  { id: 'landmark', label: 'Landmark', placeholder: 'e.g. Near City Centre Mall', required: false, maxLength: 60, autoComplete: 'off', message: '' },
  { id: 'pin', label: 'PIN code', placeholder: '6 digits, e.g. 500034', required: true, maxLength: 6, autoComplete: 'postal-code', message: 'Please enter a 6-digit PIN code.' },
]

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
  // The latest start that still ends the visit by 11 pm.
  const lastStart = perVisit ? PER_VISIT_LAST_SLOT : LATEST_END - hours * 60
  const todaySlots = slotsFor(today, now, lastStart)
  const firstDay = todaySlots.length ? today : addDays(today, 1)
  const lastDay = addDays(today, MAX_DAYS_AHEAD)
  const [visitKey, setVisitKey] = useState('')
  const [slot, setSlot] = useState('')
  const visitDate = visitKey ? new Date(`${visitKey}T00:00`) : null
  // Before a date is picked every time is open; a date (today especially) can close some.
  const allSlots = slotsFor(addDays(today, 1), now, lastStart)
  const slots = visitDate ? slotsFor(visitDate, now, lastStart) : allSlots
  const start = visitDate && slot ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 0, Number(slot)) : null

  const [location, setLocation] = useState<SharedLocation | null>(null)
  const [locating, setLocating] = useState<Locating>('idle')
  const [addressParts, setAddressParts] = useState<Record<AddressPart, string>>({
    flat: '',
    building: '',
    street: '',
    landmark: '',
    pin: '',
  })
  // Stored as one line, e.g. "Flat 302, Green Residency, Road No. 12, Banjara Hills, near City Centre Mall, 500034".
  const address = [
    addressParts.flat,
    addressParts.building,
    addressParts.street,
    addressParts.landmark && `near ${addressParts.landmark.trim()}`,
    addressParts.pin,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
  const missingAddress = addressFields.find((field) =>
    field.id === 'pin' ? !/^[1-9]\d{5}$/.test(addressParts.pin) : field.required && !addressParts[field.id].trim(),
  )
  const [missingField, setMissingField] = useState<AddressPart | ''>('')

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
  const [failure, setFailure] = useState('')

  // Any new answer clears the last error, so a fixed problem never keeps showing.
  const pickDate = (date: Date) => {
    // A time picked first is kept unless the new day can't take it (e.g. too soon today).
    const dropped = slot !== '' && !slotsFor(date, now, lastStart).includes(Number(slot))
    setVisitKey(dateKey(date))
    setError(dropped ? `${slotLabel(Number(slot))} is too soon on that day. Please choose a later time.` : '')
    if (dropped) setSlot('')
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
    // Going back and choosing a longer plan can push a chosen time past the 11 pm finish.
    if (id === 'when' && slot && Number(slot) > lastStart) {
      return `Your ${hours}-hour visit must start by ${slotLabel(lastStart)} to end by 11 pm. Please choose an earlier time.`
    }
    if (id === 'where' && missingAddress) return missingAddress.message
    return ''
  }

  const go = (to: number) => {
    setError('')
    setIndex(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const next = () => {
    const issue = problem(step)
    if (step === 'where' && missingAddress) {
      // Point at the exact box that still needs filling.
      setMissingField(missingAddress.id)
      document.getElementById(`address-${missingAddress.id}`)?.focus()
    }
    if (issue) return setError(issue)
    setMissingField('')
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
        address,
        message: note.trim(),
        serviceId: service.id,
        serviceName: service.name,
        saathiId: saathi?.id ?? '',
        saathiName: saathi?.name ?? '',
        saathiChoice: chosen ? 'chosen' : saathi ? 'random' : 'none',
      })
      setPicked(chosen ? `You asked for ${chosen.name}.` : saathi ? `We picked ${saathi.name} for you.` : '')
      setState('sent')
      // The confirmation replaces the form, so bring the top of it into view.
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) {
      // Firebase's own code (e.g. permission-denied) is what tells the team why a booking failed.
      console.error('Booking could not be saved:', caught)
      setFailure((caught as { code?: string })?.code ?? 'unknown')
      setState('failed')
    }
  }

  const recap: { label: string; value: string; edit?: StepId }[] = [
    { label: 'Service', value: service.name },
    { label: perVisit ? 'Visit' : 'How long', value: perVisit ? 'One visit' : hoursLabel(hours), edit: perVisit ? undefined : 'time' },
    { label: 'When', value: start ? friendlyWhen(start) : '', edit: 'when' },
    { label: 'Where', value: `${address}${location ? ' (location shared)' : ''}`, edit: 'where' },
    { label: 'Price', value: plan ? `${plan.price} · ${plan.name}` : '' },
  ]

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgb(58_17_25/0.5)] ring-1 ring-gold/25 nav:p-12"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CircleCheck aria-hidden className="size-9" strokeWidth={1.8} />
        </span>
        <h2 className="mt-5 text-3xl font-light tracking-tight">Your booking is confirmed</h2>
        <p className="mx-auto mt-2 max-w-md text-lg text-ink-muted">
          Thank you. Our team will contact you soon on {phoneValue.trim() || 'your number'}.
        </p>
        <dl className="mx-auto mt-6 grid max-w-md gap-2 rounded-2xl bg-blush/60 p-4 text-left">
          {[
            { label: 'Service', value: service.name },
            { label: 'Plan', value: plan ? `${plan.name} · ${priceLabel(plan)}` : '' },
            { label: 'When', value: start ? friendlyWhen(start) : '' },
            { label: 'Where', value: address },
          ]
            .filter((row) => row.value)
            .map((row) => (
              <div key={row.label} className="flex gap-3">
                <dt className="w-16 shrink-0 text-ink-muted">{row.label}</dt>
                <dd className="font-semibold [overflow-wrap:anywhere]">{row.value}</dd>
              </div>
            ))}
        </dl>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-muted">
          {picked} Your Saathi’s name and WhatsApp number will appear on My bookings once assigned.
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
            {/* One option per companion plan, each naming the plan and price it books. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {companionPlans.map((option) => (
                <Choice
                  key={option.id}
                  name="hours"
                  value={String(option.hours)}
                  checked={hours === option.hours}
                  onChange={(v) => setHours(Number(v))}
                >
                  {/* Same three rows in every card (length, plan, price) so they line up across the row. */}
                  <span className="flex flex-col items-center self-stretch py-4 leading-tight">
                    <span className="whitespace-nowrap text-lg">
                      {wholeDayPlan?.hours === option.hours ? 'Whole day' : `${option.hours} hours`}
                    </span>
                    <span className="mt-1.5 flex min-h-10 items-center text-sm font-medium opacity-80 [text-wrap:balance]">
                      {option.name}
                    </span>
                    <span className="mt-auto pt-2 text-base">{option.price}</span>
                  </span>
                </Choice>
              ))}
            </div>
            {plan && (
              <p aria-live="polite" className="rounded-2xl bg-blush/60 px-5 py-4">
                <span className="block text-lg font-semibold">
                  {plan.name} · {plan.price}
                  <span className="font-medium text-ink-muted"> / {plan.unit}</span>
                </span>
                <span className="mt-0.5 block text-ink-muted">{plan.description}</span>
              </p>
            )}
            {hours >= MAX_HOURS && (
              <p className="text-ink-muted">Need more than a day? Add a note at the end, or call {site.phoneDisplay}.</p>
            )}
          </div>
        )}

        {step === 'when' && (
          <div className="grid gap-6">
            <section aria-labelledby="visit-date-heading" className="grid gap-3">
              <h3 id="visit-date-heading" className="flex items-center gap-2 font-semibold">
                <CalendarDays aria-hidden className="size-4 text-rosewood" />
                Date
              </h3>
              <DateCalendar value={visitDate} today={today} min={firstDay} max={lastDay} onChange={(date) => pickDate(date)} />
              {!todaySlots.length && <p className="text-ink-muted">It is too late to book for today.</p>}
              {visitDate && (
                <p className="font-semibold text-burgundy">
                  {visitDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </section>

            <h3 className="-mb-3 font-semibold">
              Start time{' '}
              <span className="font-normal text-ink-muted">
                {perVisit
                  ? '· visits start 7 am to 8 pm'
                  : `· start by ${slotLabel(lastStart)} so your ${hours}-hour visit ends by 11 pm`}
              </span>
            </h3>
            {/* Every time shows from the start; times the chosen day can't take are greyed out. */}
            {periods.map((period) => {
                const inPeriod = allSlots.filter((minutes) => minutes >= period.from && minutes < period.to)
                if (!inPeriod.length) return null
                return (
                  <fieldset key={period.label}>
                    <legend className="mb-2 flex items-center gap-2 font-semibold">
                      <Clock aria-hidden className="size-4 text-rosewood" />
                      {period.label}
                    </legend>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {inPeriod.map((minutes) => (
                        <Choice
                          key={minutes}
                          name="slot"
                          value={String(minutes)}
                          checked={slot === String(minutes)}
                          disabled={!slots.includes(minutes)}
                          onChange={chooseSlot}
                        >
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
                {locating === 'denied' ? 'Location is turned off.' : 'We could not find your location.'} That’s fine; the
                address below is enough.
              </p>
            )}
            {!location && (
              <p className="-mt-2 text-sm text-ink-muted">Optional, but it helps your Saathi find the right door.</p>
            )}
            <h3 className="mt-2 flex items-center gap-2 font-semibold">
              <MapPin aria-hidden className="size-4 text-rosewood" />
              Address
            </h3>
            {/* The address is always required; the shared location above only adds precision. */}
            <div className="grid gap-4 sm:grid-cols-2">
              {addressFields.map((field) => (
                <label key={field.id} className={`block ${field.wide ? 'sm:col-span-2' : ''}`}>
                  <span className="mb-1.5 block text-sm font-semibold">
                    {field.label}
                    {!field.required && <span className="font-normal text-ink-muted"> (optional)</span>}
                  </span>
                  <input
                    id={`address-${field.id}`}
                    value={addressParts[field.id]}
                    onChange={(event) => {
                      const value = field.id === 'pin' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value
                      setAddressParts((current) => ({ ...current, [field.id]: value }))
                      if (missingField === field.id) setMissingField('')
                      setError('')
                    }}
                    required={field.required}
                    maxLength={field.maxLength}
                    inputMode={field.id === 'pin' ? 'numeric' : undefined}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    aria-invalid={missingField === field.id}
                    className={`${input} aria-invalid:border-[#b3261e]`}
                  />
                </label>
              ))}
            </div>
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
                {state === 'failed' && (
                  <ErrorText>{`We could not send your booking. Please try again or call ${site.phoneDisplay}. (Reason: ${failure})`}</ErrorText>
                )}
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
