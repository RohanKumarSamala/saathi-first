import { ArrowLeft, CircleCheck, Languages, MapPin, ShieldCheck, Shuffle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { Img } from '../components/Img'
import { ServiceCards } from '../components/ServiceCards'
import { services, site, type Service } from '../content/site'
import { useSaathis } from '../hooks/useSaathis'
import { type Saathi, type Stored } from '../lib/db'
import { BookingForm } from './booking/BookingForm'
import NotFound from './NotFound'

/** Burgundy photo panel shared by the contact landing and the booking page. */
function DarkPanel({ children }: { children: ReactNode }) {
  return (
    <section data-nav-hero className="page-padding relative isolate overflow-hidden bg-burgundy text-blush">
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
          <p className="text-eyebrow mb-4 font-semibold text-gold">Book your visit</p>
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
