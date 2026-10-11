import { useCallback, useRef } from 'react'
import { Img } from '../components/Img'
import { valueCards } from '../content/site'
import { clamp01, useScrollEffect } from '../hooks/useScrollEffect'
import type { ImageName } from '../lib/images'

type CardData = (typeof valueCards)[number]

const overlays = {
  dark: 'bg-[radial-gradient(120%_70%_at_0%_100%,rgb(107_30_46/0.92),transparent_70%),linear-gradient(100deg,rgb(107_30_46/0.96)_0%,rgb(107_30_46/0.8)_34%,rgb(107_30_46/0.15)_64%,transparent_100%)]',
  shifted:
    'bg-[linear-gradient(90deg,#6b1e2e_0%,#6b1e2e_38%,rgb(107_30_46/0.6)_52%,transparent_74%)]',
  light:
    'bg-[linear-gradient(100deg,rgb(253_238_238/0.98)_0%,rgb(253_238_238/0.9)_40%,rgb(253_238_238/0.25)_70%,transparent_100%)]',
}

function Card({ card, className }: { card: CardData; className: string }) {
  const ref = useRef<HTMLElement>(null)

  // Scroll-linked growth from 70% to full size as the card rises into view.
  const grow = useCallback((element: HTMLElement, rect: DOMRect, viewport: number) => {
    const centre = rect.top + rect.height / 2
    const progress = clamp01((viewport * 1.05 - centre) / (viewport * 0.55))
    element.style.transform = `scale(${0.7 + 0.3 * progress})`
  }, [])
  useScrollEffect(ref, grow)

  const dark = card.tone === 'dark'

  return (
    <article
      ref={ref}
      className={`relative isolate flex overflow-hidden rounded-card shadow-card will-change-transform ${
        dark ? 'bg-burgundy text-blush' : 'bg-blush text-wine'
      } ${className}`}
    >
      <Img
        name={card.image as ImageName}
        alt={card.imageAlt}
        sizes="(min-width: 992px) 577px, 90vw"
        position={card.position}
        className={`absolute inset-0 -z-20 size-full ${card.shift}`}
      />
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 ${overlays[card.shift ? 'shifted' : card.tone]}`}
      />
      <div className="flex w-full flex-col justify-between gap-6 p-7 pr-[38%] nav:p-8 nav:pr-44">
        <h3 className="text-card-title">{card.title}</h3>
        <p className="text-large max-w-[16rem] font-medium">{card.body}</p>
      </div>
    </article>
  )
}

export function ValueCards() {
  const [first, second, third] = valueCards
  return (
    <section aria-labelledby="value-heading" className="page-padding">
      <div className="container-large section-y">
        <div className="mb-16 text-center nav:mb-20">
          <h2 id="value-heading" className="text-heading">
            Being there, when family <span className="accent text-rosewood">can’t</span>
          </h2>
          <p className="text-xlarge mt-6">Trusted companions for every stage of ageing</p>
        </div>

        {/* Staggered collage: tall card and wide card on the left, one offset card on the right. */}
        <div className="grid gap-8 nav:grid-cols-2">
          <Card
            card={first}
            className="min-h-[25rem] nav:col-start-1 nav:row-start-1 nav:h-[34.2rem] nav:w-[28.5rem] nav:max-w-full nav:justify-self-end"
          />
          <Card
            card={second}
            className="min-h-[17rem] nav:col-start-2 nav:row-span-2 nav:row-start-1 nav:mt-[22.4rem] nav:h-80 nav:w-[28.5rem] nav:max-w-full"
          />
          <Card
            card={third}
            className="min-h-[25rem] nav:col-start-1 nav:row-start-2 nav:h-[28.5rem] nav:w-[36rem] nav:max-w-full"
          />
        </div>
      </div>
    </section>
  )
}
