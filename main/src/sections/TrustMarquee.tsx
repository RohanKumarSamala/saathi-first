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

/** A slim band of services that drifts across under the hero. Hover pauses it. */
export function TrustMarquee() {
  return (
    <section aria-label="Our services" className="overflow-hidden bg-wine py-5 text-blush nav:py-6">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Track />
        <Track hidden />
      </div>
    </section>
  )
}
