import { ArrowLeft, ArrowRight, Languages, MapPin, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ButtonLink } from '../components/Button'
import { PageHero } from '../components/PageHero'
import { ServiceCards } from '../components/ServiceCards'
import { services, type Service } from '../content/site'
import { useSaathis, type Profiles } from '../hooks/useSaathis'
import type { Saathi, Stored } from '../lib/db'
import NotFound from './NotFound'

const serviceName = (id: string) => services.find((service) => service.id === id)?.name

const countLabel = (count: number) => `${count} ${count === 1 ? 'Saathi' : 'Saathis'}`

function ServiceGrid({ saathis }: { saathis: Profiles }) {
  return (
    <ServiceCards
      className="container-large py-16 nav:py-24"
      to={(service) => `/saathis/${service.id}`}
      action={(service) => {
        const count = saathis?.filter((saathi) => saathi.services.includes(service.id)).length ?? 0
        return (
          <p className="flex items-center gap-2 font-semibold text-burgundy">
            {count > 0 ? `Meet ${countLabel(count)}` : 'View Saathis'}
            <ArrowRight
              aria-hidden
              className="size-5 transition-transform duration-300 group-hover:translate-x-1"
            />
          </p>
        )
      }}
    />
  )
}

function SaathiCard({ saathi, current }: { saathi: Stored<Saathi>; current: string }) {
  const others = saathi.services.filter((id) => id !== current && serviceName(id))
  return (
    <li className="flex flex-col rounded-card bg-white/85 p-7 shadow-card nav:p-8">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-burgundy text-lg font-semibold text-blush"
        >
          {saathi.name[0]?.toUpperCase()}
        </span>
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{saathi.name}</h3>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <ShieldCheck aria-hidden className="size-4" />
            Verified Saathi
          </p>
        </div>
      </div>
      <dl className="mt-6 grid gap-3 text-ink-muted">
        {saathi.area && (
          <div className="flex gap-3">
            <dt>
              <MapPin aria-hidden className="mt-0.5 size-5 text-rosewood" />
              <span className="sr-only">Area</span>
            </dt>
            <dd>{saathi.area}</dd>
          </div>
        )}
        {saathi.languages && (
          <div className="flex gap-3">
            <dt>
              <Languages aria-hidden className="mt-0.5 size-5 text-rosewood" />
              <span className="sr-only">Languages</span>
            </dt>
            <dd>{saathi.languages}</dd>
          </div>
        )}
      </dl>
      {others.length > 0 && (
        <>
          <p className="text-eyebrow mt-6 text-[0.6875rem] font-semibold text-rosewood">Also helps with</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {others.map((id) => (
              <li key={id}>
                <Link
                  to={`/saathis/${id}`}
                  className="block rounded-full bg-burgundy/10 px-3 py-1 text-sm font-medium text-burgundy transition-colors hover:bg-burgundy hover:text-blush"
                >
                  {serviceName(id)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

function ServiceSaathis({ service, saathis }: { service: Service; saathis: Profiles }) {
  const matching = saathis?.filter((saathi) => saathi.services.includes(service.id))

  return (
    <div className="container-large py-16 nav:py-24">
      <Link to="/saathis" className="mb-6 inline-flex items-center gap-2 font-semibold text-burgundy hover:text-wine">
        <ArrowLeft aria-hidden className="size-5" />
        All services
      </Link>
      <nav aria-label="Services" className="mb-12 flex flex-wrap gap-2">
        {services.map((item) => (
          <Link
            key={item.id}
            to={`/saathis/${item.id}`}
            aria-current={item.id === service.id ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
              item.id === service.id
                ? 'bg-burgundy text-blush'
                : 'bg-white/80 text-burgundy ring-1 ring-burgundy/15 hover:bg-burgundy/10'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {!matching ? (
        <p role="status" className="text-large text-ink-muted">
          Loading Saathis…
        </p>
      ) : matching.length === 0 ? (
        <div className="rounded-card bg-white/85 p-8 shadow-card nav:p-12">
          <h2 className="text-subheading font-normal">No Saathis are listed here yet.</h2>
          <p className="text-large mt-3 max-w-2xl text-ink-muted">
            We are still adding verified Saathis for {service.name}. Tell us what you need and our
            team will assign a trained, verified Saathi for you.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink to={`/contact/${service.id}`} variant="solid">
              Book now
            </ButtonLink>
            <ButtonLink to="/become-a-saathi" variant="alternate">
              Become a Saathi
            </ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-subheading mb-8 font-normal">
            {countLabel(matching.length)} for {service.name}
          </h2>
          <ul className="grid gap-8 sm:grid-cols-2 nav:grid-cols-3">
            {matching.map((saathi) => (
              <SaathiCard key={saathi.id} saathi={saathi} current={service.id} />
            ))}
          </ul>
          <div className="flex justify-center pt-12">
            <ButtonLink to={`/contact/${service.id}`} variant="solid">
              Book now
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  )
}

export default function Saathis() {
  const { serviceId } = useParams()
  const saathis = useSaathis()
  const service = services.find((item) => item.id === serviceId)

  if (serviceId && !service) return <NotFound />

  return (
    <>
      <PageHero
        title={service ? service.name : 'Our Saathis'}
        intro={
          service
            ? service.summary
            : 'Choose a service to meet the Saathis who provide it. Every Saathi is identity and background verified and trained before their first assignment.'
        }
        tagline={
          service ? (
            <>
              Saathis you can <span className="accent text-rosewood">count on.</span>
            </>
          ) : (
            <>
              Verified, trained, <span className="accent text-rosewood">ready to help.</span>
            </>
          )
        }
      />
      <div className="page-padding">
        {service ? <ServiceSaathis service={service} saathis={saathis} /> : <ServiceGrid saathis={saathis} />}
      </div>
    </>
  )
}
