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
        <div className="container-large grid gap-8 py-16 nav:gap-16 nav:py-24">
          {services.map((service, index) => (
            <section
              key={service.id}
              id={service.id}
              aria-labelledby={`${service.id}-title`}
              className="grid scroll-mt-28 gap-8 nav:grid-cols-2"
            >
              <Img
                name={service.image as ImageName}
                alt={service.imageAlt}
                sizes="(min-width: 992px) 624px, 90vw"
                eager={index === 0}
                className={`aspect-[4/3] size-full rounded-card shadow-card nav:aspect-auto nav:min-h-[30rem] ${
                  index % 2 ? 'nav:order-last' : ''
                }`}
              />
              <div className="flex flex-col justify-center rounded-card bg-white/85 p-7 shadow-card nav:p-12">
                <p className="text-eyebrow mb-4 font-semibold text-rosewood">{service.name}</p>
                <h2 id={`${service.id}-title`} className="text-subheading font-normal">
                  {service.heading}
                </h2>
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
            </section>
          ))}

          <div className="flex justify-center pt-4">
            <ButtonLink to="/plans" variant="solid">
              See our plans
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  )
}
