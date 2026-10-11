import { ChevronDown } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { Img } from '../components/Img'
import { plans, site } from '../content/site'
import { isValidIndianMobile, openEnquiryEmail } from '../lib/enquiry'
import { fieldProps } from '../lib/fieldProps'

type Errors = Partial<Record<'name' | 'phone', string>>

export default function Contact() {
  const [params] = useSearchParams()
  const requested = plans.find((plan) => plan.id === params.get('plan'))
  const [planId, setPlanId] = useState(requested?.id ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)
  const plan = plans.find((item) => item.id === planId)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const phone = String(data.get('phone') ?? '').trim()

    const next: Errors = {}
    if (!name) next.name = 'Please enter your name.'
    if (!isValidIndianMobile(phone)) next.phone = 'Please enter a valid 10-digit mobile number.'
    setErrors(next)

    if (Object.keys(next).length > 0) {
      setSent(false)
      document.getElementById(`contact-${Object.keys(next)[0]}`)?.focus()
      return
    }

    openEnquiryEmail(plan ? `Booking enquiry: ${plan.name}` : 'Enquiry from saathifirst.in', {
      Name: name,
      Phone: phone,
      Plan: plan ? `${plan.name} (${plan.price} / ${plan.unit})` : '',
      Message: String(data.get('message') ?? ''),
    })
    setSent(true)
  }

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

          <form noValidate onSubmit={onSubmit} className="grid gap-5">
            <Field id="contact-name" label="Name" tone="dark" error={errors.name}>
              <input
                {...fieldProps('contact-name', errors.name)}
                name="name"
                type="text"
                autoComplete="name"
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
              <Button type="submit">Send</Button>
              <p role="status" className="max-w-sm text-sm text-blush/80">
                {sent
                  ? `Your email app should now open with your message. Prefer to talk? Call ${site.phoneDisplay}.`
                  : 'Sending opens a pre-filled email in your mail app.'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
