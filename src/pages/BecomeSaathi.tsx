import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { PageHero } from '../components/PageHero'
import { isValidIndianMobile, openEnquiryEmail } from '../lib/enquiry'
import { fieldProps } from '../lib/fieldProps'

type FieldName = 'name' | 'mobile' | 'age' | 'area'
type Errors = Partial<Record<FieldName, string>>

const nextSteps = [
  { title: 'Apply', body: 'Share a few details about yourself and the areas of Hyderabad you can cover.' },
  { title: 'Verification', body: 'We carry out identity and background verification.' },
  { title: 'Training', body: 'You complete training before any customer assignment.' },
]

export default function BecomeSaathi() {
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const value = (key: string) => String(data.get(key) ?? '').trim()

    const next: Errors = {}
    if (!value('name')) next.name = 'Please enter your full name.'
    if (!isValidIndianMobile(value('mobile'))) next.mobile = 'Please enter a valid 10-digit mobile number.'
    const age = Number(value('age'))
    if (!Number.isInteger(age) || age < 18 || age > 80) next.age = 'You must be 18 or older to apply.'
    if (!value('area')) next.area = 'Please enter your locality.'
    setErrors(next)

    if (Object.keys(next).length > 0) {
      setSent(false)
      document.getElementById(`saathi-${Object.keys(next)[0]}`)?.focus()
      return
    }

    openEnquiryEmail('Saathi application', {
      'Full name': value('name'),
      Mobile: value('mobile'),
      Age: value('age'),
      Area: value('area'),
      Languages: value('languages'),
      'Experience / skills': value('experience'),
    })
    setSent(true)
  }

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
              <Field id="saathi-name" label="Full name" error={errors.name}>
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
              <Button type="submit" variant="solid">
                Submit application
              </Button>
              <p role="status" className="max-w-xs text-sm text-ink-muted">
                {sent
                  ? 'Your email app should now open with your application, ready to send.'
                  : 'Submitting opens a pre-filled email in your mail app.'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
