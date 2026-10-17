import { Check } from 'lucide-react'
import { ButtonLink } from '../components/Button'
import { PageHero } from '../components/PageHero'
import { plans } from '../content/site'

export default function Plans() {
  return (
    <>
      <PageHero
        title="Our Plans"
        intro="Choose the right support plan for your loved ones. Every companion plan covers the same services; you simply pick how long you need a Saathi."
        tagline={
          <>
            Clear pricing. <span className="accent text-rosewood">No surprises.</span>
          </>
        }
      />

      <div className="page-padding">
        <ul className="container-large grid gap-8 py-16 sm:grid-cols-2 nav:grid-cols-3 nav:py-24">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-col rounded-card bg-white/85 p-8 shadow-card transition-transform duration-500 ease-out-soft hover:-translate-y-1.5 nav:p-10"
            >
              <h2 className="text-eyebrow font-semibold text-rosewood">{plan.name}</h2>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
                <span className="text-5xl font-light tracking-tight text-burgundy">{plan.price}</span>
                <span className="font-medium text-ink-muted">/ {plan.unit}</span>
              </p>
              <p className="mt-4 text-ink-muted">{plan.description}</p>
              <div aria-hidden className="divider-left my-7 text-wine/60" />
              <ul className="mb-9 grid gap-3">
                {plan.includes.map((item) => (
                  <li key={item} className="flex gap-3 font-medium">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-rosewood" />
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink to={plan.hours ? `/contact?plan=${plan.id}` : '/contact/property-monitoring'} variant="solid" className="mt-auto">
                Choose plan
              </ButtonLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
