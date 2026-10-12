import { Check } from 'lucide-react'
import { ButtonLink } from '../components/Button'
import { Img } from '../components/Img'
import { PageHero } from '../components/PageHero'
import { services } from '../content/site'
import type { ImageName } from '../lib/images'

export default function Services() {
  return (
    <>
      <PageHero
        title="Our Services"
        intro="Saathi First provides reliable elder-care, personal assistance, property monitoring and support services, helping families stay connected with their loved ones."
        tagline={
          <>
            Everyday support. <span className="accent text-rosewood">Thoughtfully delivered.</span>
          </>
        }
      />

      <div className="page-padding">
        {/* Below the nav breakpoint each service is a compact card, two to a row; above it, a full-width feature. */}
        <div className="container-large grid grid-cols-2 gap-4 py-12 nav:grid-cols-1 nav:gap-16 nav:py-24">
          {services.map((service, index) => (
            <section
              key={service.id}
              id={service.id}
              aria-labelledby={`${service.id}-title`}
              className="flex scroll-mt-28 flex-col overflow-hidden rounded-3xl bg-white/85 shadow-card nav:grid nav:grid-cols-2 nav:gap-8 nav:overflow-visible nav:rounded-none nav:bg-transparent nav:shadow-none"
            >
              <Img
                name={service.image as ImageName}
                alt={service.imageAlt}
                sizes="(min-width: 992px) 624px, 45vw"
                eager={index < 2}
                className={`aspect-[4/3] w-full nav:aspect-auto nav:h-full nav:min-h-[30rem] nav:rounded-card nav:shadow-card ${
                  index % 2 ? 'nav:order-last' : ''
                }`}
              />
              <div className="flex grow flex-col p-3.5 nav:justify-center nav:rounded-card nav:bg-white/85 nav:p-12 nav:shadow-card">
                <p className="text-eyebrow mb-4 hidden font-semibold text-rosewood nav:block">{service.name}</p>
                <h2
                  id={`${service.id}-title`}
                  className="font-semibold leading-snug [overflow-wrap:anywhere] nav:hidden"
                >
                  {service.name}
                </h2>
                <p className="mt-1.5 text-sm text-ink-muted nav:hidden">{service.summary}</p>
                <div className="hidden nav:block">
                  <h2 className="text-subheading font-normal">{service.heading}</h2>
                  {service.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-ink-muted">
                      {paragraph}
                    </p>
                  ))}
                  <ul className="mt-6 grid gap-3">
                    {service.points.map((point) => (
                      <li key={point} className="flex gap-3 font-medium">
                        <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-rosewood" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto pt-4 nav:mt-0 nav:pt-8">
                  <ButtonLink
                    to={`/contact/${service.id}`}
                    variant="solid"
                    className="w-full px-0! nav:w-auto nav:px-8!"
                  >
                    Book now
                  </ButtonLink>
                </div>
              </div>
            </section>
          ))}

          <div className="col-span-full flex justify-center pt-4">
            <ButtonLink to="/plans" variant="solid">
              See our plans
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  )
}
