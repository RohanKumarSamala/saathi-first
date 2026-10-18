import { ArrowRight, CalendarDays, Sparkles, Tag, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  individualServices,
  memberships,
  plans,
  premiumAddOns,
  servicePlans,
  site,
  type Service,
} from '../content/site'
import { whatsappLink } from '../lib/contact'

const actionClass =
  'group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 py-2 text-sm font-semibold text-blush transition-colors hover:bg-wine'

function Row({ title, price, detail, action }: {
  title: string
  price: ReactNode
  detail: string
  action: ReactNode
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-gold/25 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{detail}</p>
        <p className="mt-1.5 font-semibold text-burgundy">{price}</p>
      </div>
      {action}
    </li>
  )
}

function Group({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-eyebrow flex items-center gap-2 text-[0.75rem] font-semibold text-rosewood">
        {icon}
        {title}
      </h3>
      <ul className="mt-3 grid gap-3">{children}</ul>
    </section>
  )
}

const whatsappAction = (label: string, message: string) => (
  <a href={whatsappLink(site.phoneDisplay, message)} target="_blank" rel="noreferrer" className={actionClass}>
    {label}
    <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
  </a>
)

/** Pop-up listing every plan that covers one service, opened from the Our Services page. */
export function ServicePlansDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const related = servicePlans[service.id] ?? { perVisit: [], individual: [], memberships: [], addOns: [] }
  const oneTime = individualServices.filter((item) => related.individual.includes(item.id))
  const monthly = memberships.filter((item) => related.memberships.includes(item.id))
  const perVisit = plans.filter((item) => related.perVisit.includes(item.id))
  const extras = premiumAddOns.filter((item) => related.addOns.includes(item.id))
  const nothingListed = oneTime.length + monthly.length + perVisit.length + extras.length === 0

  // A native modal dialog traps focus, closes on Escape and dims the page behind it.
  // No close() on cleanup: its async "close" event would shut the next dialog React opens.
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="service-plans-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto max-h-[min(90dvh,48rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-card bg-cream p-0 text-ink shadow-[0_60px_120px_-30px_rgb(0_0_0/0.75)] backdrop:bg-wine/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow text-[0.75rem] font-semibold text-rosewood">Plans and prices</p>
            <h2 id="service-plans-title" className="mt-1 text-2xl font-semibold tracking-tight">
              {service.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-burgundy/[0.07] text-burgundy transition-colors hover:bg-burgundy hover:text-blush"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        {perVisit.length > 0 && (
          <Group
            icon={<Tag aria-hidden className="size-4" />}
            title={perVisit.some((plan) => plan.hours) ? 'Book by the hour' : 'Book a visit'}
          >
            {perVisit.map((plan) => (
              <Row
                key={plan.id}
                title={plan.name}
                detail={plan.description}
                price={`${plan.price} / ${plan.unit}`}
                action={
                  // The booking form opens with this plan already chosen.
                  <Link
                    to={plan.hours ? `/contact/${service.id}?plan=${plan.id}` : `/contact/${service.id}`}
                    onClick={onClose}
                    className={actionClass}
                  >
                    Book now
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                }
              />
            ))}
          </Group>
        )}

        {oneTime.length > 0 && (
          <Group icon={<Tag aria-hidden className="size-4" />} title="Also available">
            {oneTime.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                detail={item.description}
                price={`${item.price} / ${item.unit}`}
                action={whatsappAction('Book', `Hello Saathi First, I would like to book ${item.name} (${item.price} / ${item.unit}).`)}
              />
            ))}
          </Group>
        )}

        {monthly.length > 0 && (
          <Group icon={<CalendarDays aria-hidden className="size-4" />} title="Monthly memberships that include it">
            {monthly.map((plan) => (
              <Row
                key={plan.id}
                title={plan.name}
                detail={`${plan.visits}, ${plan.hoursEach.toLowerCase()}`}
                price={`${plan.price} / month`}
                action={whatsappAction('Choose plan', `Hello Saathi First, I would like to join the ${plan.name} membership (${plan.price} / month).`)}
              />
            ))}
          </Group>
        )}

        {extras.length > 0 && (
          <Group icon={<Sparkles aria-hidden className="size-4" />} title="Premium add-ons">
            {extras.map((addOn) => (
              <Row
                key={addOn.id}
                title={addOn.name}
                detail={addOn.description}
                price={`${addOn.price} / ${addOn.unit}`}
                action={whatsappAction('Add', `Hello Saathi First, I would like to add ${addOn.name} (${addOn.price} / ${addOn.unit}).`)}
              />
            ))}
          </Group>
        )}

        {nothingListed && (
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-gold/25">
            <p className="font-semibold">Priced on request</p>
            <p className="mt-1 text-sm text-ink-muted">
              Tell us what you need and our team will confirm the price before your Saathi is assigned.
            </p>
            <Link to={`/contact/${service.id}`} onClick={onClose} className={`${actionClass} mt-4`}>
              Book now
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        )}

        <Link
          to="/plans"
          onClick={onClose}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-burgundy underline decoration-gold decoration-2 underline-offset-4"
        >
          See all plans
        </Link>
      </div>
    </dialog>
  )
}
