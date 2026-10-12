import {
  ArrowLeft,
  ChevronDown,
  CircleCheck,
  Languages,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Shuffle,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { Img } from '../components/Img'
import { ServiceCards } from '../components/ServiceCards'
import { plans, services, site, type Service } from '../content/site'
import { useSaathis } from '../hooks/useSaathis'
import { createBooking, type Saathi, type SharedLocation, type Stored } from '../lib/db'
import { isValidIndianMobile } from '../lib/enquiry'
import { fieldProps } from '../lib/fieldProps'
import NotFound from './NotFound'

type Errors = Partial<Record<'name' | 'phone', string>>
type Locating = 'idle' | 'locating' | 'denied' | 'unavailable'

/** `choice` is a Saathi id from `matching`, or empty to have one picked at random. */
function BookingForm({ service, matching, choice }: {
  service: Service
  matching: Stored<Saathi>[]
  choice: string
}) {
  const { user } = useAuth()
  const [confirmation, setConfirmation] = useState('')
  const [params] = useSearchParams()
  const requested = plans.find((plan) => plan.id === params.get('plan'))
  const [planId, setPlanId] = useState(requested?.id ?? '')
  const [location, setLocation] = useState<SharedLocation | null>(null)
  const [locating, setLocating] = useState<Locating>('idle')
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'saving' | 'sent' | 'failed'>('idle')
  const plan = plans.find((item) => item.id === planId)

  const shareLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocating('unavailable')
      return
    }
    setLocating('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        })
        setLocating('idle')
      },
      (error) => setLocating(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const form = event.currentTarget
    const data = new FormData(form)
    const value = (key: string) => String(data.get(key) ?? '').trim()

    const next: Errors = {}
    if (!value('name')) next.name = 'Please enter your name.'
    if (!isValidIndianMobile(value('phone'))) next.phone = 'Please enter a valid 10-digit mobile number.'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      document.getElementById(`contact-${Object.keys(next)[0]}`)?.focus()
      return
    }

    const chosen = matching.find((saathi) => saathi.id === choice)
    const saathi = chosen ?? matching[Math.floor(Math.random() * matching.length)]

    setState('saving')
    try {
      await createBooking({
        uid: user.uid,
        name: value('name'),
        phone: value('phone'),
        planId: plan?.id ?? '',
        planName: plan?.name ?? '',
        planPrice: plan ? `${plan.price} / ${plan.unit}` : '',
        location,
        address: value('address'),
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
      setLocation(null)
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-card border border-blush/15 bg-blush/10 p-8 nav:p-12">
        <CircleCheck aria-hidden className="size-10 text-gold" strokeWidth={1.5} />
        <p className="text-subheading mt-4">Thank you. Your {service.name} request is with us.</p>
        <p className="text-large mt-2 text-blush/85">
          {confirmation} A member of our team will call you shortly to confirm. Need us sooner?
          Call {site.phoneDisplay}.
        </p>
        <Button type="button" className="mt-6" onClick={() => setState('idle')}>
          Send another request
        </Button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <Field id="contact-name" label="Name" tone="dark" error={errors.name}>
        <input
          {...fieldProps('contact-name', errors.name)}
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={user?.displayName ?? ''}
          placeholder="Name*"
          className="field-dark"
        />
      </Field>
      <Field id="contact-phone" label="Mobile number" tone="dark" error={errors.phone}>
        <input
          {...fieldProps('contact-phone', errors.phone)}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={user?.phoneNumber ?? ''}
          placeholder="Mobile number*"
          className="field-dark"
        />
      </Field>
      <Field id="contact-plan" label="Plan" tone="dark">
        <div className="relative">
          <select
            id="contact-plan"
            name="plan"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            className="field-dark cursor-pointer appearance-none pr-14 [&>option]:bg-wine [&>option]:text-blush"
          >
            <option value="">Choose a plan (optional)</option>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-7 top-1/2 size-5 -translate-y-1/2"
          />
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 pl-8 text-sm text-gold">
          {plan && `${plan.price} / ${plan.unit}`}
        </p>
      </Field>

      <div>
        {location ? (
          <div className="field-dark flex items-center justify-between gap-4">
            <span className="flex items-center gap-3">
              <CircleCheck aria-hidden className="size-5 shrink-0 text-gold" />
              Location shared (within about {location.accuracy} m)
            </span>
            <button
              type="button"
              onClick={() => setLocation(null)}
              className="shrink-0 text-sm font-semibold text-gold underline underline-offset-4"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={shareLocation}
            disabled={locating === 'locating'}
            className="field-dark flex cursor-pointer items-center gap-3 text-left font-medium disabled:cursor-wait"
          >
            <LocateFixed aria-hidden className="size-5 shrink-0 text-gold" />
            {locating === 'locating' ? 'Finding your location…' : 'Share your location'}
          </button>
        )}
        <p aria-live="polite" className="mt-2 pl-8 text-sm text-blush/75">
          {locating === 'denied'
            ? 'Location permission was declined. You can type the address below instead.'
            : locating === 'unavailable'
              ? 'We could not get your location. Please type the address below instead.'
              : 'So your Saathi knows exactly where to come. Share it from where the visit will happen.'}
        </p>
      </div>
      <Field id="contact-address" label="Address or landmark" tone="dark">
        <input
          id="contact-address"
          name="address"
          type="text"
          autoComplete="street-address"
          placeholder="Address or landmark (optional)"
          className="field-dark"
        />
      </Field>

      <Field id="contact-message" label="Message" tone="dark">
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          placeholder="Message"
          className="field-dark resize-y"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'Booking…' : 'Book now'}
        </Button>
        <p role="status" className="max-w-sm text-sm text-[#f7c1bc]">
          {state === 'failed' &&
            `We could not send your request. Please try again or call ${site.phoneDisplay}.`}
        </p>
      </div>
    </form>
  )
}

/** Burgundy photo panel shared by the contact landing and the booking page. */
function DarkPanel({ children }: { children: ReactNode }) {
  return (
    <section className="page-padding relative isolate overflow-hidden bg-burgundy text-blush">
      <Img
        name="companionship"
        alt=""
        sizes="100vw"
        eager
        position="30% 40%"
        className="absolute inset-0 -z-20 size-full"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(58_17_25/0.82),rgb(107_30_46/0.9))] nav:bg-[linear-gradient(90deg,rgb(107_30_46/0.55)_0%,rgb(107_30_46/0.9)_48%,rgb(58_17_25/0.96)_100%)]"
      />
      {children}
    </section>
  )
}

const optionClass =
  'flex cursor-pointer items-center gap-4 rounded-3xl border border-blush/20 bg-wine/40 p-4 backdrop-blur-sm transition-colors duration-300 hover:border-gold/60 has-checked:border-gold has-checked:bg-blush/15 has-focus-visible:outline-2 has-focus-visible:outline-gold'

function SaathiOption({ value, checked, onChange, badge, title, children }: {
  value: string
  checked: boolean
  onChange: (value: string) => void
  badge: ReactNode
  title: ReactNode
  children: ReactNode
}) {
  return (
    <label className={optionClass}>
      <input
        type="radio"
        name="saathi"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush/15 text-lg font-semibold text-gold"
      >
        {badge}
      </span>
      <span className="min-w-0 grow">
        <span className="block text-lg font-semibold leading-snug">{title}</span>
        <span className="mt-1 block text-sm text-blush/80">{children}</span>
      </span>
      <CircleCheck
        aria-hidden
        className={`size-6 shrink-0 text-gold transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
      />
    </label>
  )
}

function SaathiPicker({ service, matching, choice, onChoose }: {
  service: Service
  /** Null while the list is loading. */
  matching: Stored<Saathi>[] | null
  choice: string
  onChoose: (id: string) => void
}) {
  return (
    <fieldset className="mt-10">
      <legend className="text-eyebrow mb-4 font-semibold text-gold">Choose your Saathi</legend>
      <div className="grid gap-3">
        <SaathiOption
          value=""
          checked={choice === ''}
          onChange={onChoose}
          badge={<Shuffle className="size-5" />}
          title="Choose for me"
        >
          {matching?.length
            ? 'We’ll pick one of these Saathis at random.'
            : 'Our team will assign a trained, verified Saathi.'}
        </SaathiOption>
        {matching?.map((saathi) => (
          <SaathiOption
            key={saathi.id}
            value={saathi.id}
            checked={choice === saathi.id}
            onChange={onChoose}
            badge={saathi.name[0]?.toUpperCase()}
            title={
              <span className="flex flex-wrap items-center gap-x-3">
                {saathi.name}
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                  <ShieldCheck aria-hidden className="size-4" />
                  Verified
                </span>
              </span>
            }
          >
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              {saathi.area && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-4" />
                  {saathi.area}
                </span>
              )}
              {saathi.languages && (
                <span className="inline-flex items-center gap-1.5">
                  <Languages aria-hidden className="size-4" />
                  {saathi.languages}
                </span>
              )}
            </span>
          </SaathiOption>
        ))}
      </div>
      <p role="status" className="mt-4 text-sm text-blush/75">
        {!matching
          ? 'Loading Saathis…'
          : matching.length === 0
            ? `No Saathis are listed for ${service.name} yet, so our team will assign one for you.`
            : 'Your choice is a preference. We confirm your Saathi’s availability when we call you.'}
      </p>
    </fieldset>
  )
}

function Booking({ service }: { service: Service }) {
  const { search } = useLocation()
  const saathis = useSaathis()
  const [choice, setChoice] = useState('')
  const matching = saathis?.filter((saathi) => saathi.services.includes(service.id)) ?? null

  return (
    <DarkPanel>
      <div className="container-large grid gap-x-12 gap-y-12 pb-20 pt-32 nav:min-h-screen nav:grid-cols-2 nav:pb-28 nav:pt-44">
        <div className="animate-rise">
          <Link
            to={`/contact${search}`}
            className="mb-6 inline-flex items-center gap-2 font-semibold text-gold hover:text-blush"
          >
            <ArrowLeft aria-hidden className="size-5" />
            All services
          </Link>
          <p className="text-eyebrow mb-3 font-semibold text-gold">Book a Saathi</p>
          <h1 className="text-heading">{service.name}</h1>
          <p className="text-large mt-4 max-w-md font-medium">{service.summary}</p>
          <SaathiPicker service={service} matching={matching} choice={choice} onChoose={setChoice} />
        </div>

        <div className="animate-rise" style={{ animationDelay: '150ms' }}>
          <p className="text-eyebrow mb-4 font-semibold text-gold">Your details</p>
          <AuthGate action="book a Saathi" tone="dark">
            <BookingForm service={service} matching={matching ?? []} choice={choice} />
          </AuthGate>
          <p className="mt-8 text-sm text-blush/75">
            Prefer to talk? Call{' '}
            <a href={site.phoneHref} className="font-semibold text-gold">
              {site.phoneDisplay}
            </a>
            .
          </p>
        </div>
      </div>
    </DarkPanel>
  )
}

export default function Contact() {
  const { serviceId } = useParams()
  const { search } = useLocation()
  const service = services.find((item) => item.id === serviceId)

  if (serviceId && !service) return <NotFound />
  if (service) return <Booking key={service.id} service={service} />

  return (
    <>
      <DarkPanel>
        <div className="container-large grid gap-x-8 gap-y-12 pb-16 pt-32 nav:grid-cols-2 nav:pb-24 nav:pt-44">
          <div>
            <h1 className="text-display animate-rise">Contact Us</h1>
            <p className="text-large mt-5 max-w-md animate-rise font-medium" style={{ animationDelay: '100ms' }}>
              We’re here to help and hear from you. Have questions or need assistance? Contact Saathi
              First for trusted elder-care and personal support services in Hyderabad.
            </p>
          </div>

          <div className="animate-rise" style={{ animationDelay: '200ms' }}>
            <p className="text-eyebrow mb-4 font-semibold text-gold">Talk to us</p>
            <address className="text-subheading font-light not-italic nav:text-[2rem]">
              <a href={site.phoneHref} className="block transition-colors hover:text-gold">
                {site.phoneDisplay}
              </a>
              <a href={site.emailHref} className="block break-words transition-colors hover:text-gold">
                {site.email}
              </a>
              <span className="block">{site.city}</span>
            </address>
          </div>
        </div>
      </DarkPanel>

      <section aria-labelledby="book-heading" className="page-padding">
        <div className="container-large py-16 nav:py-24">
          <h2 id="book-heading" className="text-heading">
            Book a <span className="accent text-rosewood">Saathi</span>
          </h2>
          <p className="text-large mt-4 max-w-2xl text-ink-muted">
            Choose the service you need. On the next step you can pick your Saathi or let us choose
            one for you.
          </p>
          <ServiceCards
            className="mt-12"
            to={(item) => `/contact/${item.id}${search}`}
            action={() => (
              <span className="inline-flex min-h-12 items-center rounded-pill bg-burgundy px-8 font-semibold text-blush shadow-[0_10px_24px_-12px_rgb(107_30_46/0.9)] transition-colors duration-300 group-hover:bg-wine">
                Book now
              </span>
            )}
          />
        </div>
      </section>
    </>
  )
}
