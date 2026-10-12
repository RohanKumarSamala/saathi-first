import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { services, type Service } from '../content/site'
import type { ImageName } from '../lib/images'
import { Img } from './Img'

type Props = {
  to: (service: Service) => string
  /** Call to action shown at the foot of each card; the whole card is the link. */
  action: (service: Service) => ReactNode
  className?: string
}

/** One card per service, used wherever a visitor picks a service first. */
export function ServiceCards({ to, action, className = '' }: Props) {
  return (
    <ul className={`grid gap-8 sm:grid-cols-2 nav:grid-cols-3 ${className}`}>
      {services.map((service, index) => (
        <li key={service.id}>
          <Link
            to={to(service)}
            className="group flex h-full flex-col overflow-hidden rounded-card bg-white/85 text-ink shadow-card transition-transform duration-500 ease-out-soft hover:-translate-y-1.5"
          >
            <Img
              name={service.image as ImageName}
              alt=""
              sizes="(min-width: 992px) 405px, (min-width: 640px) 45vw, 90vw"
              eager={index < 3}
              className="aspect-[3/2] w-full"
            />
            <div className="flex grow flex-col p-7 nav:p-8">
              <h3 className="text-xl font-semibold tracking-tight">{service.name}</h3>
              <p className="mt-2 text-ink-muted">{service.summary}</p>
              <div className="mt-auto pt-6">{action(service)}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
