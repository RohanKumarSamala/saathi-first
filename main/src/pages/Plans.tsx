import {
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  Clock,
  Hospital,
  PartyPopper,
  Pill,
  Sparkles,
  UserRound,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { ButtonLink } from '../components/Button'
import { Img } from '../components/Img'
import { PageHero } from '../components/PageHero'
import {
  individualServices,
  memberships,
  plans,
  premiumAddOns,
  site,
  type Membership,
} from '../content/site'
import { whatsappLink } from '../lib/contact'
import type { ImageName } from '../lib/images'

type TabId = 'monthly' | 'individual' | 'add-ons'

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'monthly', label: 'Monthly Memberships', icon: CalendarDays },
  { id: 'individual', label: 'Individual Plans', icon: UserRound },
  { id: 'add-ons', label: 'Premium Add-ons', icon: Sparkles },
]

const isTab = (value: string | null): value is TabId => tabs.some((tab) => tab.id === value)

function MembershipCard({ plan, index }: { plan: Membership; index: number }) {
  const { user } = useAuth()
  // The office switches the membership on against this ID once the customer has paid.
  const message = `Hello Saathi First, I would like to join the ${plan.name} membership (${plan.price} / month).${
    user ? ` My customer ID is ${user.uid}.` : ''
  }`
  return (
    <li className="flex flex-col overflow-hidden rounded-card bg-white/90 shadow-card ring-1 ring-gold/25 transition-transform duration-500 ease-out-soft hover:-translate-y-1.5">
      <Img
        name={plan.image as ImageName}
        alt={plan.imageAlt}
        sizes="(min-width: 992px) 405px, (min-width: 640px) 45vw, 90vw"
        eager={index === 0}
        position={plan.imagePosition}
        className="aspect-[16/10] w-full"
      />
      <div className="flex grow flex-col p-7 nav:p-8">
        <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-light tracking-tight text-burgundy">{plan.price}</span>
          <span className="font-medium text-ink-muted">/ month</span>
        </p>
        <p className="mt-3 text-ink-muted">{plan.description}</p>

        <ul className="mt-6 grid gap-2 rounded-2xl bg-blush/70 p-4 font-medium">
          <li className="flex items-center gap-3">
            <CalendarDays aria-hidden className="size-5 shrink-0 text-rosewood" />
            {plan.visits}
          </li>
          <li className="flex items-center gap-3">
            <Clock aria-hidden className="size-5 shrink-0 text-rosewood" />
            {plan.hoursEach}
          </li>
        </ul>

        <p className="text-eyebrow mt-7 text-[0.75rem] font-semibold text-rosewood">Includes</p>
        <ul className="mt-3 grid gap-2.5">
          {plan.includes.map((item) => (
            <li key={item} className="flex gap-3 font-medium">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-rosewood" />
              {item}
            </li>
          ))}
        </ul>

        <p className="text-eyebrow mt-6 flex items-center gap-2 text-[0.75rem] font-semibold text-ink-muted">
          <X aria-hidden className="size-4 text-rosewood" />
          Not included
        </p>
        <p className="mt-2 text-sm text-ink-muted">{plan.notIncluded}</p>

        {/* mt-auto pins the button to the card's foot, so buttons line up across cards of any length. */}
        <div className="mt-auto pt-8">
          <a
            href={whatsappLink(site.phoneDisplay, message)}
            target="_blank"
            rel="noreferrer"
            className="group flex min-h-12 items-center justify-center gap-2 rounded-pill bg-burgundy px-8 font-semibold text-blush shadow-[0_10px_24px_-12px_rgb(107_30_46/0.9)] transition-colors duration-300 hover:bg-wine"
          >
            Choose plan
            <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <p className="mt-2 text-center text-xs text-ink-muted">Opens WhatsApp to confirm with our team</p>
        </div>
      </div>
    </li>
  )
}

function MonthlyMemberships() {
  return (
    <>
      <p className="text-eyebrow font-semibold text-rosewood">Membership plans</p>
      <h2 className="text-subheading mt-2 font-normal">Flexible plans for every family</h2>
      <p className="mt-3 max-w-3xl text-ink-muted">
        Select a plan that fits your needs. All plans include our trusted support, trained staff and regular
        updates.
      </p>
      <ul className="mt-10 grid gap-8 sm:grid-cols-2 nav:grid-cols-3">
        {memberships.map((plan, index) => (
          <MembershipCard key={plan.id} plan={plan} index={index} />
        ))}
      </ul>
    </>
  )
}

const planCardClass =
  'flex w-full flex-col rounded-card bg-white/85 p-8 shadow-card transition-transform duration-500 ease-out-soft hover:-translate-y-1.5 sm:w-[calc(50%-1rem)] nav:w-[calc((100%-4rem)/3)] nav:p-10'

/** One-time services shown alongside the per-visit plans; booked by WhatsApp, not the booking form. */
const extraIndividualIds = ['event-temple']

/**
 * The per-visit plans (property monitoring and the hourly companion plans, booked online)
 * plus selected one-time services.
 */
function IndividualPlans() {
  const extras = individualServices.filter((service) => extraIndividualIds.includes(service.id))
  return (
    <>
      <p className="text-eyebrow font-semibold text-rosewood">Pay per visit</p>
      <h2 className="text-subheading mt-2 font-normal">Book a Saathi when you need one</h2>
      <p className="mt-3 max-w-3xl text-ink-muted">
        Every companion plan covers the same services; you simply pick how long you need a Saathi.
      </p>
      {/* Wrapping flex with a centred last row, so five cards sit as three and two without a gap. */}
      <ul className="mt-10 flex flex-wrap justify-center gap-8">
        {plans.map((plan) => (
          <li key={plan.id} className={planCardClass}>
            <h3 className="text-eyebrow font-semibold text-rosewood">{plan.name}</h3>
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
            <ButtonLink
              to={plan.hours ? `/contact?plan=${plan.id}` : '/contact/property-monitoring'}
              variant="solid"
              className="mt-auto"
            >
              Choose plan
            </ButtonLink>
          </li>
        ))}
        {extras.map((service) => (
          <li key={service.id} className={planCardClass}>
            <h3 className="text-eyebrow font-semibold text-rosewood">{service.name}</h3>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
              <span className="text-5xl font-light tracking-tight text-burgundy">{service.price}</span>
              <span className="font-medium text-ink-muted">/ {service.unit}</span>
            </p>
            <p className="mt-4 text-ink-muted">{service.description}</p>
            <div aria-hidden className="divider-left my-7 text-wine/60" />
            <ul className="mb-9 grid gap-3">
              {service.points.map((point) => (
                <li key={point} className="flex gap-3 font-medium">
                  <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-rosewood" />
                  {point}
                </li>
              ))}
            </ul>
            <a
              href={whatsappLink(
                site.phoneDisplay,
                `Hello Saathi First, I would like to book ${service.name} (${service.price} / ${service.unit}).`,
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex min-h-12 items-center justify-center rounded-pill bg-burgundy px-8 font-semibold text-blush shadow-[0_10px_24px_-12px_rgb(107_30_46/0.9)] transition-[transform,background-color] duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-wine"
            >
              Choose plan
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

const addOnIcons: Record<string, LucideIcon> = {
  'extra-hospital-visit': Hospital,
  'extended-companionship': Clock,
  'special-transportation': Car,
  'medicine-pickup': Pill,
  'special-event-assistance': PartyPopper,
  'priority-booking': Zap,
}

function PremiumAddOns() {
  return (
    <>
      <p className="text-eyebrow font-semibold text-rosewood">Premium add-ons</p>
      <h2 className="text-subheading mt-2 font-normal">Extra care, added to any plan</h2>
      <p className="mt-3 max-w-3xl text-ink-muted">
        Need a little more help? Add any of these to a membership or a one-time service.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 nav:grid-cols-3">
        {premiumAddOns.map((addOn) => {
          const Icon = addOnIcons[addOn.id] ?? Sparkles
          const message = `Hello Saathi First, I would like to add ${addOn.name} (${addOn.price} / ${addOn.unit}).`
          return (
            <li
              key={addOn.id}
              className="flex flex-col rounded-card bg-white/90 p-6 shadow-card ring-1 ring-gold/25 transition-transform duration-500 ease-out-soft hover:-translate-y-1 nav:p-7"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-blush text-rosewood">
                <Icon aria-hidden className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold leading-snug">{addOn.name}</h3>
              <p className="mt-2 text-sm text-ink-muted">{addOn.description}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                <p className="rounded-full bg-blush px-4 py-1.5 text-sm font-semibold text-burgundy">
                  {addOn.price} <span className="font-medium text-ink-muted">/ {addOn.unit}</span>
                </p>
                <a
                  href={whatsappLink(site.phoneDisplay, message)}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 font-semibold text-burgundy"
                >
                  Add on WhatsApp
                  <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function Plans() {
  const [params] = useSearchParams()
  const requested = params.get('tab')
  const [active, setActive] = useState<TabId>(isTab(requested) ? requested : 'monthly')
  const baseId = useId()

  // A link can open a tab (?tab=individual). Switching tabs rewrites the address in place
  // rather than navigating, because every navigation scrolls the page back to the top.
  const select = (id: TabId) => {
    setActive(id)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', id)
    window.history.replaceState(window.history.state, '', url)
  }

  return (
    <>
      <PageHero
        title="Our Plans"
        intro="Choose a monthly membership for regular visits, or book a Saathi only when you need one."
        tagline={
          <>
            Clear pricing. <span className="accent text-rosewood">No surprises.</span>
          </>
        }
      />

      <div className="page-padding">
        <div className="container-large py-12 nav:py-20">
          <div
            role="tablist"
            aria-label="Plan types"
            className="grid grid-cols-3 gap-1 rounded-3xl bg-blush/80 p-1.5 shadow-card ring-1 ring-gold/25"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const selected = id === active
              return (
                <button
                  key={id}
                  id={`${baseId}-${id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-${id}-panel`}
                  onClick={() => select(id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-sm font-semibold leading-tight transition-colors duration-300 sm:flex-row sm:gap-2.5 sm:px-5 sm:py-3.5 sm:text-base ${
                    selected ? 'bg-white text-burgundy shadow-[0_10px_24px_-16px_rgb(107_30_46/0.8)]' : 'text-ink-muted hover:text-burgundy'
                  }`}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </button>
              )
            })}
          </div>

          <div
            id={`${baseId}-${active}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-${active}-tab`}
            className="mt-12"
          >
            {active === 'monthly' && <MonthlyMemberships />}
            {active === 'individual' && <IndividualPlans />}
            {active === 'add-ons' && <PremiumAddOns />}
          </div>
        </div>
      </div>
    </>
  )
}
