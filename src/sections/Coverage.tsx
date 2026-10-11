import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { site } from '../content/site'

const rings = [22, 38, 56, 76, 98]

/** Stands in for the reference's coverage map: one city, stated honestly. */
export function Coverage() {
  return (
    <section aria-labelledby="coverage-heading" className="page-padding">
      <div className="container-large section-y flex flex-col items-center">
        <h2 id="coverage-heading" className="text-heading mb-12 max-w-3xl text-center nav:mb-20">
          Serving families across <span className="accent text-rosewood">Hyderabad</span>
        </h2>

        <div className="relative grid aspect-[4/3] w-full max-w-5xl place-items-center overflow-hidden sm:aspect-[1024/520]">
          <svg
            aria-hidden
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 size-full [mask-image:radial-gradient(closest-side,black_55%,transparent)]"
          >
            {rings.map((radius, index) => (
              <circle
                key={radius}
                cx="100"
                cy="100"
                r={radius}
                fill={index === 0 ? 'rgb(185 84 92 / 0.14)' : 'none'}
                stroke={index % 2 ? '#c9a26b' : '#b9545c'}
                strokeOpacity={0.75 - index * 0.11}
                strokeWidth="0.4"
                strokeDasharray={index % 2 ? '1.2 2.4' : undefined}
              />
            ))}
          </svg>

          <div className="relative flex flex-col items-center gap-4 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-burgundy text-blush shadow-card">
              <MapPin aria-hidden className="size-7" strokeWidth={1.6} />
            </span>
            <p className="text-subheading font-normal">{site.city}</p>
            <p className="text-eyebrow">Currently serving</p>
          </div>
        </div>

        <p className="text-large mt-10 max-w-2xl text-center">
          Live elsewhere while your parents are in Hyderabad?{' '}
          <Link
            to="/contact"
            className="font-semibold text-burgundy underline decoration-gold decoration-2 underline-offset-4 transition-colors hover:text-rosewood"
          >
            Ask us about your locality
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
