import { ChevronDown, CircleCheck, LocateFixed } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { Img } from '../components/Img'
import { plans, site } from '../content/site'
import { createBooking, type SharedLocation } from '../lib/db'
import { isValidIndianMobile } from '../lib/enquiry'
import { fieldProps } from '../lib/fieldProps'

type Errors = Partial<Record<'name' | 'phone', string>>
type Locating = 'idle' | 'locating' | 'denied' | 'unavailable'

function BookingForm() {
  const { user } = useAuth()
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
      })
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
        <p className="text-subheading mt-4">Thank you. Your request is with us.</p>
        <p className="text-large mt-2 text-blush/85">
          A member of our team will contact you shortly. Need us sooner? Call {site.phoneDisplay}.
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
          {state === 'saving' ? 'Sending…' : 'Send'}
        </Button>
        <p role="status" className="max-w-sm text-sm text-[#f7c1bc]">
          {state === 'failed' &&
            `We could not send your request. Please try again or call ${site.phoneDisplay}.`}
        </p>
      </div>
    </form>
  )
}

export default function Contact() {
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

      <div className="container-large grid gap-x-8 gap-y-12 pb-20 pt-32 nav:min-h-screen nav:grid-cols-2 nav:pb-28 nav:pt-44">
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

          <div aria-hidden className="divider-left my-10 text-blush/70" />

          <AuthGate action="book a Saathi" tone="dark">
            <BookingForm />
          </AuthGate>
        </div>
      </div>
    </section>
  )
}
