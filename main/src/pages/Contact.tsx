import {
  Ambulance,
  ArrowLeft,
  Baby,
  Car,
  ChevronRight,
  HeartHandshake,
  Hospital,
  House,
  Landmark,
  Mail,
  Phone,
  type LucideIcon,
} from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import logoIcon from '../assets/logo/icon-dark.svg'
import { services, site, type Service } from '../content/site'
import { useSaathis } from '../hooks/useSaathis'
import { companionPlans, isPerVisitService, priceLabel, propertyPlan } from '../lib/pricing'
import { BookingWizard } from './booking/BookingWizard'
import NotFound from './NotFound'

const serviceIcons: Record<string, LucideIcon> = {
  'hospital-assistance': Hospital,
  'elder-companionship': HeartHandshake,
  'banking-assistance': Landmark,
  'transportation-assistance': Car,
  'creche-services': Baby,
  'emergency-support': Ambulance,
  'property-monitoring': House,
}

const fromPrice = (service: Service) =>
  isPerVisitService(service.id) ? priceLabel(propertyPlan) : `from ${companionPlans[0]?.price ?? ''}`

function ServiceIcon({ service, large = false }: { service: Service; large?: boolean }) {
  const Icon = serviceIcons[service.id] ?? HeartHandshake
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-burgundy/10 text-burgundy ${large ? 'size-14' : 'size-12'}`}>
      <Icon aria-hidden className={large ? 'size-7' : 'size-6'} strokeWidth={1.7} />
    </span>
  )
}

/** Quiet strip for visitors who would rather phone or email than book online. */
function TalkToUs() {
  const link =
    'inline-flex min-h-12 items-center gap-2 rounded-full bg-white/80 px-4 font-semibold text-burgundy ring-1 ring-burgundy/15 transition-colors hover:bg-burgundy hover:text-blush'
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-ink-muted">
      <span>Prefer to talk?</span>
      <a href={site.phoneHref} className={link}>
        <Phone aria-hidden className="size-4" />
        {site.phoneDisplay}
      </a>
      <a href={site.emailHref} className={link}>
        <Mail aria-hidden className="size-4" />
        Email us
      </a>
    </div>
  )
}

function Booking({ service }: { service: Service }) {
  const { search } = useLocation()
  const saathis = useSaathis()

  return (
    <div className="page-padding">
      {/* No site menu here (see App.tsx): the brand mark leads home and the back link to the services. */}
      <div className="container-large pb-20 pt-6 nav:pt-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              to={`/contact${search}`}
              className="-ml-3 inline-flex min-h-12 items-center gap-2 rounded-full px-3 font-semibold text-burgundy hover:bg-burgundy/10"
            >
              <ArrowLeft aria-hidden className="size-5" />
              All services
            </Link>
            <Link to="/" aria-label="Saathi First home" className="rounded-lg">
              <img src={logoIcon} alt="" width={48} height={48} className="size-11" />
            </Link>
          </div>
          <div className="mb-8 flex items-center gap-4">
            <ServiceIcon service={service} large />
            <div>
              <h1 className="text-3xl font-light tracking-tight nav:text-4xl">{service.name}</h1>
              <p className="text-ink-muted">{fromPrice(service)}</p>
            </div>
          </div>
          <BookingWizard service={service} saathis={saathis} />
          <TalkToUs />
        </div>
      </div>
    </div>
  )
}

export default function Contact() {
  const { serviceId } = useParams()
  const { search } = useLocation()
  const service = services.find((item) => item.id === serviceId)

  if (serviceId && !service) return <NotFound />
  if (service) return <Booking key={service.id} service={service} />

  return (
    <div className="page-padding">
      <div className="container-large pb-20 pt-28 nav:pt-36">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-light tracking-tight nav:text-5xl">
            Book a <span className="accent text-rosewood">Saathi</span>
          </h1>
          <p className="mt-3 text-lg text-ink-muted">Choose what you need help with. It takes about a minute.</p>

          <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/contact/${item.id}${search}`}
                  className="group flex h-full items-center gap-4 rounded-2xl bg-white/90 p-4 ring-1 ring-gold/25 transition-[box-shadow,transform] duration-300 ease-out-soft hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgb(58_17_25/0.55)] hover:ring-burgundy/30"
                >
                  <ServiceIcon service={item} />
                  <span className="min-w-0 grow">
                    <span className="block text-lg font-semibold leading-snug">{item.name}</span>
                    <span className="line-clamp-2 text-sm text-ink-muted">{item.summary}</span>
                  </span>
                  <span className="hidden shrink-0 text-sm font-semibold text-burgundy sm:block">{fromPrice(item)}</span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-burgundy/50 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>

          <TalkToUs />
          <p className="mt-4 text-center text-sm text-ink-muted">{site.city}</p>
        </div>
      </div>
    </div>
  )
}
