import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '../components/Button'
import { services } from '../content/site'

export function ServiceShowcase() {
  return (
    <section aria-labelledby="services-heading" className="page-padding">
      <div className="container-large section-y">
        <div className="mx-auto mb-16 max-w-3xl text-center nav:mb-20">
          <p className="text-xlarge mb-2">Our Services</p>
          <h2 id="services-heading" className="text-heading">
            One Saathi.
            <br />
            <span className="accent text-rosewood">Every kind of help.</span>
          </h2>
        </div>

        <ul className="mx-auto max-w-5xl">
          {services.map((service, index) => (
            <Fragment key={service.id}>
              {index > 0 && <li aria-hidden className="divider-fade text-wine/80" />}
              <li>
                <Link
                  to={`/services#${service.id}`}
                  className="group grid gap-x-8 gap-y-1 py-6 nav:grid-cols-[17.5rem_1fr] nav:items-center"
                >
                  <span className="text-xl font-bold tracking-tight text-burgundy transition-colors group-hover:text-rosewood">
                    {service.name}
                  </span>
                  <span className="text-large">{service.summary}</span>
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>

        <div className="mt-12 flex justify-center">
          <ButtonLink to="/services" variant="alternate">
            Explore our services
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
