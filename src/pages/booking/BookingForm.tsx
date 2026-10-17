import { CalendarDays, CircleCheck, Clock, LocateFixed, MapPin, Minus, Plus, Sun } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/context'
import { Button, ButtonLink } from '../../components/Button'
import { Field } from '../../components/Field'
import { plans, site, type Service } from '../../content/site'
import { friendlyWhen } from '../../lib/contact'
import { createBooking, type Saathi, type SharedLocation, type Stored } from '../../lib/db'
import { isValidIndianMobile } from '../../lib/enquiry'
import { fieldProps } from '../../lib/fieldProps'
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

type ErrorKey = 'when' | 'place' | 'name' | 'phone'
type Errors = Partial<Record<ErrorKey, string>>
type Locating = 'idle' | 'locating' | 'denied' | 'unavailable'
type Day = 'today' | 'tomorrow' | 'other' | ''

// Visits can start between 7 am and 8 pm, on the half hour.
const FIRST_SLOT = 7 * 60
const LAST_SLOT = 20 * 60
// A same-day visit needs at least this much notice so a Saathi can reach you.
const NOTICE_MINUTES = 90
const MAX_DAYS_AHEAD = 90

const pickAtRandom = <T,>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)]
const isTooSoon = (date: Date) => date.getTime() < Date.now() + 30 * 60_000

const pad = (value: number) => String(value).padStart(2, '0')
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

function slotLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const suffix = hours >= 12 ? 'pm' : 'am'
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${pad(minutes % 60)} ${suffix}`
}

/** Start times available on `date`; for today, only those with enough notice. */
function slotsFor(date: Date, now: Date) {
  const all: number[] = []
  for (let minutes = FIRST_SLOT; minutes <= LAST_SLOT; minutes += 30) all.push(minutes)
  if (isoDate(date) !== isoDate(now)) return all
  const earliest = now.getHours() * 60 + now.getMinutes() + NOTICE_MINUTES
  return all.filter((minutes) => minutes >= earliest)
}

const chipClass =
  'flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-blush/20 bg-wine/40 px-4 text-center text-lg font-semibold transition-colors duration-200 hover:border-gold/70 has-checked:border-gold has-checked:bg-gold has-checked:text-wine has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold has-disabled:cursor-not-allowed has-disabled:opacity-40'

function Chip({ name, value, checked, onChange, disabled, children }: {
  name: string
  value: string
  checked: boolean
  onChange: (value: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <label className={chipClass}>
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

/** A numbered step heading, so the form reads as a short, ordered checklist. */
function Step({ number, title, hint, error, children }: {
  number: number
  title: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} className="grid gap-4">
      <legend className="mb-1 flex items-center gap-3 text-xl font-semibold">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold text-base text-wine">{number}</span>
        {title}
      </legend>
      {hint && <p className="-mt-2 text-blush/80">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-base font-medium text-[#f7c1bc]">
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** `choice` is a Saathi id from `matching`, or empty to have one picked at random. */
export function BookingForm({ service, matching, choice }: {
  service: Service
  matching: Stored<Saathi>[]
  choice: string
}) {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const perVisit = isPerVisitService(service.id)

  // A plan chosen on the Plans page arrives as ?plan=; start from its hours.
  const fromPlans = plans.find((plan) => plan.id === params.get('plan'))
  const [hours, setHours] = useState(
    fromPlans?.hours ?? companionPlans.find((plan) => plan.hours >= 2)?.hours ?? MIN_HOURS,
  )
  const plan = perVisit ? propertyPlan : planForHours(hours)

  const [now] = useState(() => new Date())
  const today = useMemo(() => addDays(now, 0), [now])
  const todaySlots = slotsFor(today, now)
  const [day, setDay] = useState<Day>('')
  const [otherDate, setOtherDate] = useState('')
  const [slot, setSlot] = useState('')

  const visitDate =
    day === 'today' ? today : day === 'tomorrow' ? addDays(today, 1) : day === 'other' && otherDate ? new Date(`${otherDate}T00:00`) : null
  const slots = visitDate ? slotsFor(visitDate, now) : []
  const start = visitDate && slot ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 0, Number(slot)) : null

  const [location, setLocation] = useState<SharedLocation | null>(null)
  const [locating, setLocating] = useState<Locating>('idle')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'saving' | 'sent' | 'failed'>('idle')
  const [confirmation, setConfirmation] = useState('')

  const chooseDay = (value: string) => {
    setDay(value as Day)
    setSlot('')
  }

  const shareLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocating('unavailable')
      return
    }
    setLocating('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy) })
        setLocating('idle')
      },
      (error) => setLocating(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const value = (key: string) => String(data.get(key) ?? '').trim()

    const next: Errors = {}
    if (!start) next.when = 'Please choose the day and the time you need your Saathi.'
    else if (isTooSoon(start)) next.when = 'That time has passed. Please choose a later time.'
    if (!location && address.trim().length < 3) next.place = 'Please share your location or type the address.'
    if (!value('name')) next.name = 'Please enter your name.'
    if (!isValidIndianMobile(value('phone'))) next.phone = 'Please enter a valid 10-digit mobile number.'
    setErrors(next)
    if (Object.keys(next).length > 0 || !start) {
      // Bring the first problem into view for someone who may not notice it below the fold.
      const first = Object.keys(next)[0]
      document.getElementById(`book-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.getElementById(`book-${first}`)?.focus({ preventScroll: true })
      return
    }

    if (!user || !plan) return
    const chosen = matching.find((saathi) => saathi.id === choice)
    const saathi = chosen ?? pickAtRandom(matching)

    setState('saving')
    try {
      await createBooking({
        uid: user.uid,
        name: value('name'),
        phone: value('phone'),
        planId: plan.id,
        planName: plan.name,
        planPrice: priceLabel(plan),
        hours: perVisit ? null : hours,
        preferredStart: start,
        location,
        address: address.trim(),
        message: value('message'),
        serviceId: service.id,
        serviceName: service.name,
        saathiId: saathi?.id ?? '',
        saathiName: saathi?.name ?? '',
        saathiChoice: chosen ? 'chosen' : saathi ? 'random' : 'none',
      })
      setConfirmation(
        chosen
          ? `You asked for ${chosen.name}.`
          : saathi
            ? `We picked ${saathi.name} for you.`
            : 'Our team will assign a verified Saathi.',
      )
      form.reset()
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-card border border-blush/15 bg-blush/10 p-8 nav:p-12">
        <CircleCheck aria-hidden className="size-12 text-gold" strokeWidth={1.5} />
        <p className="text-subheading mt-4">Thank you. Your {service.name} request is with us.</p>
        <p className="text-large mt-3 text-blush/90">
          {confirmation} You asked for {start ? friendlyWhen(start) : 'your chosen time'}
          {perVisit ? '' : `, ${hoursLabel(hours).toLowerCase()}`}. Follow it on My bookings, where your
          Saathi’s name, visit time and WhatsApp appear once confirmed.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <ButtonLink to="/bookings">Track my booking</ButtonLink>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="min-h-12 font-semibold text-blush underline underline-offset-4 hover:text-gold"
          >
            Book another visit
          </button>
        </div>
      </div>
    )
  }

  const wholeDay = wholeDayPlan && hours === wholeDayPlan.hours
  const quickHours = companionPlans.map((item) => item.hours)

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-10">
      {perVisit ? (
        <Step number={1} title="Your visit">
          <p className="rounded-3xl border border-blush/20 bg-wine/40 p-5 text-lg">
            One property visit with photos and an update ·{' '}
            <strong className="text-gold">{priceLabel(propertyPlan)}</strong>
          </p>
        </Step>
      ) : (
        <Step number={1} title="How long do you need a Saathi?" hint="Tap a choice, or use − and + for exact hours.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickHours.map((value) => (
              <Chip key={value} name="hours-quick" value={String(value)} checked={hours === value} onChange={(v) => setHours(Number(v))}>
                {wholeDayPlan?.hours === value ? (
                  <span className="flex flex-col leading-tight">
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Sun aria-hidden className="size-5" />
                      Whole day
                    </span>
                    <span className="text-sm font-medium opacity-80">{value} hours</span>
                  </span>
                ) : (
                  `${value} hours`
                )}
              </Chip>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-blush/20 bg-wine/40 p-3">
            <button
              type="button"
              onClick={() => setHours((value) => Math.max(MIN_HOURS, value - 1))}
              disabled={hours <= MIN_HOURS}
              aria-label="One hour less"
              className="grid size-16 shrink-0 place-items-center rounded-2xl bg-blush/15 text-gold transition-colors hover:bg-blush/25 disabled:opacity-30"
            >
              <Minus aria-hidden className="size-7" />
            </button>
            <p aria-live="polite" className="text-center text-2xl font-semibold">
              {hoursLabel(hours)}
            </p>
            <button
              type="button"
              onClick={() => setHours((value) => Math.min(MAX_HOURS, value + 1))}
              disabled={hours >= MAX_HOURS}
              aria-label="One hour more"
              className="grid size-16 shrink-0 place-items-center rounded-2xl bg-blush/15 text-gold transition-colors hover:bg-blush/25 disabled:opacity-30"
            >
              <Plus aria-hidden className="size-7" />
            </button>
          </div>
          {plan && (
            <p aria-live="polite" className="text-lg">
              <strong className="text-gold">
                {plan.name} · {plan.price}
              </strong>{' '}
              <span className="text-blush/80">
                {wholeDay ? `covers the whole day (up to ${plan.hours} hours)` : `covers up to ${plan.hours} hours`}
              </span>
            </p>
          )}
          {hours >= MAX_HOURS && (
            <p className="text-blush/80">
              Need more than a day, or several days? Book the whole day and mention it in your message, or call{' '}
              <a href={site.phoneHref} className="font-semibold text-gold underline underline-offset-4">
                {site.phoneDisplay}
              </a>
              .
            </p>
          )}
        </Step>
      )}

      <Step number={2} title="When should your Saathi come?" error={errors.when}>
        <div id="book-when" tabIndex={-1} className="grid grid-cols-3 gap-3 focus:outline-none">
          <Chip name="day" value="today" checked={day === 'today'} onChange={chooseDay} disabled={todaySlots.length === 0}>
            Today
          </Chip>
          <Chip name="day" value="tomorrow" checked={day === 'tomorrow'} onChange={chooseDay}>
            Tomorrow
          </Chip>
          <Chip name="day" value="other" checked={day === 'other'} onChange={chooseDay}>
            <CalendarDays aria-hidden className="size-5" />
            Other day
          </Chip>
        </div>
        {todaySlots.length === 0 && <p className="text-blush/80">It is too late to book for today. Please choose tomorrow or another day.</p>}
        {day === 'other' && (
          <Field id="book-date" label="Choose the date" tone="dark">
            <input
              id="book-date"
              type="date"
              value={otherDate}
              min={isoDate(addDays(today, 2))}
              max={isoDate(addDays(today, MAX_DAYS_AHEAD))}
              onChange={(event) => {
                setOtherDate(event.target.value)
                setSlot('')
              }}
              className="field-dark"
            />
          </Field>
        )}
        {visitDate && (
          <div>
            <label htmlFor="book-slot" className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Clock aria-hidden className="size-5 text-gold" />
              Start time
            </label>
            <select
              id="book-slot"
              value={slot}
              onChange={(event) => setSlot(event.target.value)}
              className="field-dark cursor-pointer appearance-none text-lg [&>option]:bg-wine [&>option]:text-blush"
            >
              <option value="">Choose a time…</option>
              {slots.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {slotLabel(minutes)}
                </option>
              ))}
            </select>
          </div>
        )}
        {start && <p className="text-lg text-gold">{friendlyWhen(start)}</p>}
      </Step>

      <Step number={3} title="Where should your Saathi come?" hint="Share your location, type the address, or both." error={errors.place}>
        <div id="book-place" tabIndex={-1} className="focus:outline-none">
          {location ? (
            <div className="field-dark flex items-center justify-between gap-4">
              <span className="flex items-center gap-3 text-lg">
                <CircleCheck aria-hidden className="size-6 shrink-0 text-gold" />
                Location shared
              </span>
              <button type="button" onClick={() => setLocation(null)} className="min-h-12 shrink-0 font-semibold text-gold underline underline-offset-4">
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={shareLocation}
              disabled={locating === 'locating'}
              className="field-dark flex cursor-pointer items-center gap-3 text-left text-lg font-semibold disabled:cursor-wait"
            >
              <LocateFixed aria-hidden className="size-6 shrink-0 text-gold" />
              {locating === 'locating' ? 'Finding your location…' : 'Share my current location'}
            </button>
          )}
          {(locating === 'denied' || locating === 'unavailable') && (
            <p role="status" className="mt-2 text-blush/80">
              {locating === 'denied'
                ? 'Location permission was turned off. Please type the address below instead.'
                : 'We could not find your location. Please type the address below instead.'}
            </p>
          )}
        </div>
        <Field id="book-address" label="Address or landmark" tone="dark">
          <div className="relative">
            <MapPin aria-hidden className="pointer-events-none absolute left-6 top-1/2 size-5 -translate-y-1/2 text-gold" />
            <input
              id="book-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              type="text"
              autoComplete="street-address"
              placeholder="House, street, area or a landmark"
              className="field-dark pl-14! text-lg"
            />
          </div>
        </Field>
      </Step>

      <Step number={4} title="Your details">
        <Field id="book-name" label="Name" tone="dark" error={errors.name}>
          <input
            {...fieldProps('book-name', errors.name)}
            name="name"
            type="text"
            autoComplete="name"
            defaultValue={user?.displayName ?? ''}
            placeholder="Your name"
            className="field-dark text-lg"
          />
        </Field>
        <Field id="book-phone" label="Mobile number" tone="dark" error={errors.phone}>
          <input
            {...fieldProps('book-phone', errors.phone)}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={user?.phoneNumber ?? ''}
            placeholder="Mobile number for your Saathi to reach you"
            className="field-dark text-lg"
          />
        </Field>
        <Field id="book-message" label="Anything we should know?" tone="dark">
          <textarea
            id="book-message"
            name="message"
            rows={3}
            placeholder="Anything we should know? (optional) e.g. hospital name, wheelchair needed"
            className="field-dark resize-y text-lg"
          />
        </Field>
      </Step>

      {/* A plain recap so nobody books something they did not mean to. */}
      <section aria-label="Your booking" className="rounded-3xl border-2 border-gold/50 bg-wine/50 p-6">
        <p className="text-eyebrow font-semibold text-gold">Your booking</p>
        <dl className="mt-3 grid gap-2 text-lg">
          <div className="flex justify-between gap-4">
            <dt className="text-blush/75">Service</dt>
            <dd className="text-right font-semibold">{service.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-blush/75">{perVisit ? 'Visit' : 'Time'}</dt>
            <dd className="text-right font-semibold">{perVisit ? 'One visit' : hoursLabel(hours)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-blush/75">When</dt>
            <dd className="text-right font-semibold">{start ? friendlyWhen(start) : 'Not chosen yet'}</dd>
          </div>
          {plan && (
            <div className="flex justify-between gap-4 border-t border-blush/15 pt-2">
              <dt className="text-blush/75">Price</dt>
              <dd className="text-right text-xl font-semibold text-gold">
                {plan.price} <span className="text-base font-medium text-blush/80">({plan.name})</span>
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-sm text-blush/75">We will call you to confirm before your Saathi comes.</p>
      </section>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" disabled={state === 'saving'} className="min-h-16! px-10! text-lg!">
          {state === 'saving' ? 'Booking…' : 'Confirm booking'}
        </Button>
        <p role="status" className="max-w-sm text-base text-[#f7c1bc]">
          {state === 'failed' && `We could not send your request. Please try again or call ${site.phoneDisplay}.`}
        </p>
      </div>
    </form>
  )
}
