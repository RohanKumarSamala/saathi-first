import { ChevronDown } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { services, site } from '../content/site'
import { isValidIndianMobile, openEnquiryEmail } from '../lib/enquiry'
import { Button } from './Button'

type Errors = Partial<Record<'name' | 'phone' | 'service', string>>

/** Compact enquiry form used in the site-wide footer call to action. */
export function EnquiryForm() {
  const id = useId()
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const phone = String(data.get('phone') ?? '').trim()
    const service = String(data.get('service') ?? '')

    const next: Errors = {}
    if (!name) next.name = 'Please enter your name.'
    if (!isValidIndianMobile(phone)) next.phone = 'Please enter a valid 10-digit mobile number.'
    if (!service) next.service = 'Please choose what you need help with.'
    setErrors(next)

    if (Object.keys(next).length > 0) {
      setSent(false)
      const first = Object.keys(next)[0]
      event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    openEnquiryEmail(`Enquiry: ${service}`, { Name: name, Phone: phone, 'I need help with': service })
    setSent(true)
  }

  const describe = (field: keyof Errors) => (errors[field] ? `${id}-${field}-error` : undefined)
  const errorText = (field: keyof Errors) =>
    errors[field] && (
      <p id={`${id}-${field}-error`} className="mt-2 pl-8 text-sm text-[#f7c1bc]">
        {errors[field]}
      </p>
    )

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full max-w-[35rem] flex-col gap-5">
      <div>
        <label htmlFor={`${id}-name`} className="sr-only">
          Name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describe('name')}
          className="field-dark"
        />
        {errorText('name')}
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="sr-only">
          Mobile number
        </label>
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Mobile number"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describe('phone')}
          className="field-dark"
        />
        {errorText('phone')}
      </div>
      <div>
        <label htmlFor={`${id}-service`} className="sr-only">
          I need help with
        </label>
        <div className="relative">
          <select
            id={`${id}-service`}
            name="service"
            defaultValue=""
            aria-invalid={Boolean(errors.service)}
            aria-describedby={describe('service')}
            className="field-dark cursor-pointer appearance-none pr-14 [&>option]:bg-wine [&>option]:text-blush"
          >
            <option value="" disabled>
              I need help with…
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.name}>
                {service.name}
              </option>
            ))}
            <option value="Something else">Something else</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-7 top-1/2 size-5 -translate-y-1/2 text-blush" />
        </div>
        {errorText('service')}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button type="submit">Submit</Button>
        <p role="status" className="max-w-sm text-sm text-blush/80">
          {sent
            ? `Your email app should now open with your request. Prefer to talk? Call ${site.phoneDisplay}.`
            : 'Submitting opens a pre-filled email in your mail app.'}
        </p>
      </div>
    </form>
  )
}
