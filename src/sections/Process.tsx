import { CircleCheck } from 'lucide-react'
import { useCallback, useRef, type ReactNode } from 'react'
import { Img } from '../components/Img'
import { steps } from '../content/site'
import { clamp01, useScrollEffect } from '../hooks/useScrollEffect'

const half = '(min-width: 992px) 432px, 90vw'
const wide = '(min-width: 992px) 896px, 90vw'
const narrow = '224px'
const media = 'w-full rounded-card shadow-card aspect-[3/2]'
const lead = 'max-w-2xl nav:col-span-4'

/** Each step fades up as it enters the viewport and recedes as it leaves. */
function Block({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const fade = useCallback((element: HTMLElement, rect: DOMRect, viewport: number) => {
    const entering = clamp01((viewport - rect.top) / (viewport * 0.55))
    const leaving = clamp01(rect.bottom / (viewport * 0.6))
    element.style.opacity = String(Math.min(entering, leaving))
  }, [])
  useScrollEffect(ref, fade)

  return (
    <div
      ref={ref}
      className={`mx-auto grid w-full max-w-[56rem] gap-8 will-change-[opacity] nav:grid-cols-4 ${className}`}
    >
      {children}
    </div>
  )
}

function StepText({ index, className = '' }: { index: number; className?: string }) {
  const step = steps[index]
  return (
    <div className={className}>
      <h3 className="text-eyebrow mb-3 text-sm font-normal">
        <span className="mr-3 text-rosewood">{String(index + 1).padStart(2, '0')}</span>
        {step.title}
      </h3>
      <p className="text-large">{step.body}</p>
    </div>
  )
}

const updates = ['Picked up from home', 'Arrived at the hospital', 'Dropped home safely']

/** `heading` is "h1" when the section is the whole page (/how-it-works). */
export function Process({ heading: Heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="process-heading"
      className="page-padding bg-[linear-gradient(transparent,#fffaf8_12%,#fbe3e0_49%,#f7e6d3_75%,#fffaf8_92%,transparent)]"
    >
      <div className="container-large section-y grid gap-16 nav:gap-20">
        <Heading
          id="process-heading"
          className="text-heading pt-10 text-center nav:pb-24 nav:pt-36 nav:text-[3.25rem] nav:font-extralight"
        >
          How Saathi First <span className="accent text-rosewood">works</span>
        </Heading>

        <Block>
          <StepText index={0} className={lead} />
          <Img
            name="companionship"
            alt="A Saathi First companion sharing tea with an elderly woman reading at home"
            sizes={half}
            className={`${media} nav:col-span-2`}
            position="55% 50%"
          />
          <Img
            name="travel-bus"
            alt="A Saathi First companion sitting beside an elderly woman on a city bus"
            sizes={half}
            className={`${media} nav:col-span-2`}
            position="50% 35%"
          />
        </Block>

        <Block className="nav:items-center">
          <Img
            name="hospital"
            alt="A Saathi First companion sitting with an elderly man at his hospital bedside"
            sizes={half}
            className={`${media} order-last nav:order-none nav:col-span-2`}
            position="60% 50%"
          />
          <StepText index={1} className="nav:col-span-2" />
        </Block>

        <Block className="nav:items-center">
          <div className="flex flex-col gap-8 nav:col-span-2">
            <StepText index={2} />
            <Img
              name="transport"
              alt="A Saathi First companion helping an elderly woman out of a car"
              sizes={narrow}
              className={`${media} hidden max-w-56 nav:block`}
              position="55% 40%"
            />
          </div>
          <Img
            name="svc-banking"
            alt="Saathi First companions helping an elderly couple at a bank counter"
            sizes={half}
            className={`${media} nav:col-span-2`}
            position="30% 50%"
          />
        </Block>

        <Block>
          <StepText index={3} className={lead} />
          <div className="relative isolate min-h-[20rem] overflow-hidden rounded-card bg-burgundy shadow-card nav:col-span-4">
            <Img
              name="caring-call"
              alt="A Saathi First companion calling a family member with an update"
              sizes={wide}
              className="absolute inset-0 -z-20 size-full"
              position="80% 30%"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(107_30_46/0.2),rgb(58_17_25/0.92)_78%)] nav:bg-[linear-gradient(90deg,rgb(107_30_46/0.96)_0%,rgb(107_30_46/0.82)_34%,rgb(185_84_92/0.15)_66%,transparent)]"
            />
            <ul
              aria-label="Example family updates"
              className="flex h-full flex-col justify-end gap-3 p-6 nav:w-[24rem] nav:justify-center nav:gap-4 nav:p-10"
            >
              {updates.map((update, index) => (
                <li
                  key={update}
                  className="flex items-center gap-3 rounded-3xl border border-white/40 bg-blush/95 px-5 py-4 text-wine shadow-[0_18px_36px_-18px_rgb(0_0_0/0.6)] nav:w-[19rem]"
                  style={{ marginLeft: `${index * 1.25}rem` }}
                >
                  <CircleCheck aria-hidden className="size-6 shrink-0 text-rosewood" strokeWidth={1.8} />
                  <span>
                    <span className="text-eyebrow block text-[0.6875rem] text-ink-muted">Family update</span>
                    <span className="block font-semibold leading-snug">{update}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Block>

        <Block>
          <StepText index={4} className={lead} />
          <Img
            name="travel-car"
            alt="A Saathi First companion driving a smiling elderly man to his appointment"
            sizes={half}
            className={`${media} nav:col-span-2`}
            position="50% 20%"
          />
          <Img
            name="couple"
            alt="A smiling elderly couple holding a red flower in their garden"
            sizes={half}
            className={`${media} nav:col-span-2`}
            position="50% 12%"
          />
          <p className="text-xs nav:col-span-4">Services are currently available in Hyderabad.</p>
        </Block>
      </div>
    </section>
  )
}
