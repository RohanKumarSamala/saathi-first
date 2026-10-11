import {
  Ambulance,
  Baby,
  Car,
  HeartHandshake,
  Hospital,
  House,
  Landmark,
  type LucideIcon,
} from 'lucide-react'

const items: { label: string; icon: LucideIcon }[] = [
  { label: 'Hospital Assistance', icon: Hospital },
  { label: 'Elder Companionship', icon: HeartHandshake },
  { label: 'Banking Assistance', icon: Landmark },
  { label: 'Transportation', icon: Car },
  { label: 'Creche Services', icon: Baby },
  { label: 'Emergency Support', icon: Ambulance },
  { label: 'Property Monitoring', icon: House },
]

function Track({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map(({ label, icon: Icon }) => (
        <li
          key={label}
          className="flex items-center gap-3 whitespace-nowrap px-8 text-lg font-semibold tracking-tight nav:px-11"
        >
          <Icon aria-hidden className="size-6 text-gold" strokeWidth={1.6} />
          {label}
        </li>
      ))}
    </ul>
  )
}

/** Sits at the foot of the hero in place of the reference's brand-logo strip. */
export function TrustMarquee() {
  return (
    <section aria-labelledby="trust-heading" className="py-14 nav:py-20">
      <div className="page-padding">
        <div className="container-large">
          <h2 id="trust-heading" className="text-subheading mb-10 nav:mb-12">
            One trusted Saathi for every everyday need
          </h2>
        </div>
      </div>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Track />
        <Track hidden />
      </div>
    </section>
  )
}
