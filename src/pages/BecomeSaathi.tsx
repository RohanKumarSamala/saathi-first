import { ChevronDown, CircleCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { PageHero } from '../components/PageHero'
import { services } from '../content/site'
import { createApplication } from '../lib/db'
import { isValidIndianMobile } from '../lib/enquiry'
import { fieldProps } from '../lib/fieldProps'
import { idTypes, isValidId, maskIdNumber } from '../lib/identity'

type FieldName = 'name' | 'mobile' | 'age' | 'area' | 'services' | 'citizen' | 'idNumber' | 'consent'
type Errors = Partial<Record<FieldName, string>>

const nextSteps = [
  { title: 'Apply', body: 'Share a few details about yourself and the areas of Hyderabad you can cover.' },
  { title: 'Verification', body: 'We check your government ID in person and carry out a background check.' },
  { title: 'Training', body: 'You complete training before any customer assignment.' },
]

const checkClass = 'mt-1 size-5 shrink-0 accent-burgundy'

function ApplicationForm() {
  const { user } = useAuth()
  const [idType, setIdType] = useState<string>(idTypes[0].id)
  const [errors, setErrors] = useState<Errors>({})
  const [state, setState] = useState<'idle' | 'saving' | 'sent' | 'failed'>('idle')
  const idHint = idTypes.find((item) => item.id === idType)?.hint

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    const age = Number(value('age'))
    const offered = data.getAll('services').map(String)

    const next: Errors = {}
    if (!value('name')) next.name = 'Please enter your full name.'
    if (!isValidIndianMobile(value('mobile'))) next.mobile = 'Please enter a valid 10-digit mobile number.'
    if (!Number.isInteger(age) || age < 18 || age > 80) next.age = 'You must be 18 or older to apply.'
    if (!value('area')) next.area = 'Please enter your locality.'
    if (offered.length === 0) next.services = 'Please choose at least one service.'
    if (!data.get('citizen')) next.citizen = 'Saathis must be Indian citizens. Please confirm to continue.'
    if (!isValidId(idType, value('idNumber'))) next.idNumber = `Please enter a valid number (${idHint}).`
    if (!data.get('consent')) next.consent = 'We need your consent to verify your identity and background.'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      document.getElementById(`saathi-${Object.keys(next)[0]}`)?.focus()
      return
    }

    setState('saving')
    try {
      await createApplication({
        uid: user.uid,
        name: value('name'),
        mobile: value('mobile'),
        age,
        area: value('area'),
        languages: value('languages'),
        experience: value('experience'),
        services: offered,
        indianCitizen: true,
        idType,
        idNumber: maskIdNumber(idType, value('idNumber')),
        consent: true,
      })
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-card bg-white/85 p-8 shadow-card nav:p-12">
        <CircleCheck aria-hidden className="size-10 text-rosewood" strokeWidth={1.5} />
        <h2 className="text-subheading mt-4 font-normal">Application received.</h2>
        <p className="text-large mt-2 text-ink-muted">
          Thank you for applying. Our team will contact you about identity verification and
          training. Please keep your original ID ready.
        </p>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="application-heading"
      className="grid gap-5 rounded-card bg-white/85 p-7 shadow-card nav:p-12"
    >
      <h2 id="application-heading" className="text-subheading font-normal">
        Your application
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="saathi-name" label="Full name (as on your ID)" error={errors.name}>
          <input
            {...fieldProps('saathi-name', errors.name)}
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Full name"
            className="field-light"
          />
        </Field>
        <Field id="saathi-mobile" label="Mobile" error={errors.mobile}>
          <input
            {...fieldProps('saathi-mobile', errors.mobile)}
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={user?.phoneNumber ?? ''}
            placeholder="10-digit mobile"
            className="field-light"
          />
        </Field>
        <Field id="saathi-age" label="Age" error={errors.age}>
          <input
            {...fieldProps('saathi-age', errors.age)}
            name="age"
            type="number"
            inputMode="numeric"
            min={18}
            placeholder="Age"
            className="field-light"
          />
        </Field>
        <Field id="saathi-area" label="Area" error={errors.area}>
          <input
            {...fieldProps('saathi-area', errors.area)}
            name="area"
            type="text"
            placeholder="Hyderabad locality"
            className="field-light"
          />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-3 font-medium">Services you can help with</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service, index) => (
            <label key={service.id} className="flex gap-3 font-medium">
              <input
                id={index === 0 ? 'saathi-services' : undefined}
                name="services"
                value={service.id}
                type="checkbox"
                aria-invalid={Boolean(errors.services)}
                className={checkClass}
              />
              {service.name}
            </label>
          ))}
        </div>
        {errors.services && <p className="mt-2 text-sm text-[#b3261e]">{errors.services}</p>}
      </fieldset>
      <Field id="saathi-languages" label="Languages">
        <input
          id="saathi-languages"
          name="languages"
          type="text"
          placeholder="Telugu, Hindi, English"
          className="field-light"
        />
      </Field>
      <Field id="saathi-experience" label="Experience / skills">
        <textarea
          id="saathi-experience"
          name="experience"
          rows={4}
          placeholder="Customer service, hospital experience, driving, etc."
          className="field-light resize-y"
        />
      </Field>

      <fieldset className="grid gap-5 rounded-3xl bg-burgundy/[0.06] p-5 nav:p-7">
        <legend className="text-eyebrow float-left mb-1 w-full font-semibold text-rosewood">
          Identity check
        </legend>
        <p className="text-sm text-ink-muted">
          Families trust a Saathi with the people they love, so every applicant is verified
          before their first assignment.
        </p>

        <div>
          <label className="flex gap-3 font-medium">
            <input
              id="saathi-citizen"
              name="citizen"
              type="checkbox"
              aria-invalid={Boolean(errors.citizen)}
              className={checkClass}
            />
            I am an Indian citizen and live in India.
          </label>
          {errors.citizen && <p className="mt-2 text-sm text-[#b3261e]">{errors.citizen}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="saathi-idType" label="Government ID">
            <div className="relative">
              <select
                id="saathi-idType"
                value={idType}
                onChange={(event) => setIdType(event.target.value)}
                className="field-light cursor-pointer appearance-none pr-12"
              >
                {idTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2"
              />
            </div>
          </Field>
          <Field id="saathi-idNumber" label="ID number" error={errors.idNumber}>
            <input
              {...fieldProps('saathi-idNumber', errors.idNumber)}
              name="idNumber"
              type="text"
              autoComplete="off"
              placeholder={idHint}
              className="field-light uppercase placeholder:normal-case"
            />
          </Field>
        </div>
        {idType === 'aadhaar' && (
          <p className="text-sm text-ink-muted">
            For your privacy we keep only the last four digits of your Aadhaar number. We will
            check the card itself when we meet you.
          </p>
        )}

        <div>
          <label className="flex gap-3 font-medium">
            <input
              id="saathi-consent"
              name="consent"
              type="checkbox"
              aria-invalid={Boolean(errors.consent)}
              className={checkClass}
            />
            I confirm these details are true and I consent to Saathi First verifying my identity
            and background.
          </label>
          {errors.consent && <p className="mt-2 text-sm text-[#b3261e]">{errors.consent}</p>}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
        <Button type="submit" variant="solid" disabled={state === 'saving'}>
          {state === 'saving' ? 'Submitting…' : 'Submit application'}
        </Button>
        <p role="status" className="max-w-xs text-sm text-[#b3261e]">
          {state === 'failed' && 'We could not submit your application. Please try again.'}
        </p>
      </div>
    </form>
  )
}

export default function BecomeSaathi() {
  return (
    <>
      <PageHero
        title="Become a Saathi"
        intro="Register to become a trusted Saathi and support seniors in their everyday needs."
        tagline={
          <>
            Join Saathi First. <span className="accent text-rosewood">Be someone’s someone.</span>
          </>
        }
      />

      <div className="page-padding">
        <div className="container-large grid items-start gap-8 py-16 nav:grid-cols-2 nav:py-24">
          <section
            aria-labelledby="next-steps"
            className="rounded-card bg-burgundy p-8 text-blush shadow-card nav:sticky nav:top-32 nav:p-12"
          >
            <h2 id="next-steps" className="text-subheading">
              What happens next
            </h2>
            <ol className="mt-8 grid gap-7">
              {nextSteps.map((step, index) => (
                <li key={step.title} className="flex gap-5">
                  <span className="accent text-4xl leading-none text-gold">{index + 1}</span>
                  <span>
                    <span className="text-eyebrow block font-semibold text-gold">{step.title}</span>
                    <span className="text-large mt-1 block">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <AuthGate action="apply as a Saathi">
            <ApplicationForm />
          </AuthGate>
        </div>
      </div>
    </>
  )
}
