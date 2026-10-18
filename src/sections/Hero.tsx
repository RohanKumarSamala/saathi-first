import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageSources, type ImageName } from '../lib/images'
import { TrustMarquee } from './TrustMarquee'

const SLIDE_MS = 6000

type Slide = {
  /** Short name for the photo; also its key. */
  caption: string
  alt: string
  /** Where the people are in the frame, so the crop keeps them in view. */
  position: string
  /** A different focus for tall phone screens, where far less of a wide photo fits. */
  mobilePosition?: string
  image?: ImageName
}

// The first slide uses the hero photo (with its own portrait crop for phones); the rest are
// the brand's own photography, each showing a different part of the service.
const slides: Slide[] = [
  {
    caption: 'Everyday outings',
    alt: 'A Saathi First companion walking arm in arm with an elderly woman beside a car',
    position: '50% 30%',
    mobilePosition: '64% 30%',
  },
  {
    caption: 'Companionship at home',
    alt: 'A Saathi First companion sharing tea and a book with an elderly woman',
    position: '72% 40%',
    image: 'companionship',
  },
  {
    caption: 'Hospital visits',
    alt: 'A Saathi First companion sitting with an elderly man at his hospital bedside',
    position: '62% 40%',
    image: 'hospital',
  },
  {
    caption: 'Safe travel',
    alt: 'A Saathi First companion helping an elderly woman out of a car',
    position: '62% 35%',
    image: 'transport',
  },
]

/** Visible slide: fades in and zooms in slowly. Hidden slides wait to reset until faded out. */
const slideClass = (active: boolean) =>
  `absolute inset-0 size-full object-cover [object-position:var(--focus-mobile)] md:[object-position:var(--focus)] ${
    active
      ? 'scale-[1.08] opacity-100 transition-[opacity,scale] duration-[1200ms,7000ms] ease-[ease,linear]'
      : 'scale-100 opacity-0 transition-[opacity,scale] delay-[0ms,1200ms] duration-[1200ms,0ms]'
  }`

function SlideImage({ slide, index, active }: { slide: Slide; index: number; active: boolean }) {
  const common = {
    alt: active ? slide.alt : '',
    'aria-hidden': !active,
    decoding: 'async' as const,
    className: slideClass(active),
    style: {
      ['--focus' as string]: slide.position,
      ['--focus-mobile' as string]: slide.mobilePosition ?? slide.position,
    },
  }
  if (!slide.image) {
    return (
      <picture>
        <source media="(max-width: 767px)" srcSet="/images/hero-mobile-900.webp" />
        <img
          src="/images/hero-2400.webp"
          srcSet="/images/hero-2400.webp 2400w, /images/hero-3072.webp 3072w"
          sizes="(min-width: 1600px) 3072px, 2400px"
          width={3072}
          height={1152}
          fetchPriority="high"
          {...common}
        />
      </picture>
    )
  }
  return <img {...imageSources(slide.image)} sizes="100vw" loading={index === 1 ? 'eager' : 'lazy'} {...common} />
}

export function Hero() {
  const [active, setActive] = useState(0)
  // Hovering or tabbing into the hero pauses it, so nobody is rushed while reading.
  const [paused, setPaused] = useState(false)
  // Visitors who ask for less motion see one still photo.
  const [stillPhotos] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (paused || stillPhotos) return
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [active, paused, stillPhotos])

  return (
    <>
      <header
        data-nav-hero
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
        }}
        className="relative isolate flex h-svh min-h-[36rem] max-h-[64rem] overflow-hidden bg-wine text-white"
      >
        <div className="absolute inset-0 -z-20">
          {slides.map((slide, index) => (
            <SlideImage key={slide.caption} slide={slide} index={index} active={index === active} />
          ))}
        </div>
        {/* Neutral shade, darker at the foot and top, so text and nav read on any photo. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(18_8_10/0.82)_0%,rgb(18_8_10/0.35)_42%,transparent_68%),linear-gradient(to_bottom,rgb(18_8_10/0.45)_0%,transparent_22%)]"
        />

        <div className="page-padding mt-auto w-full">
          <div className="container-large pb-14 nav:pb-20">
            <p className="mb-4 animate-rise text-white/80 nav:text-lg">Elder care at home, in Hyderabad</p>
            <h1 className="text-display max-w-3xl animate-rise" style={{ animationDelay: '100ms' }}>
              Someone you trust, when you <span className="accent">can’t be there.</span>
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 animate-rise" style={{ animationDelay: '220ms' }}>
              <Link
                to="/contact"
                className="inline-flex min-h-14 items-center rounded-full bg-white px-8 text-lg font-semibold text-wine transition-colors duration-300 hover:bg-blush"
              >
                Book a Saathi
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex min-h-12 items-center text-lg font-semibold text-white underline decoration-white/40 underline-offset-8 transition-colors hover:decoration-white"
              >
                How it works
              </Link>
            </div>

          </div>
        </div>
      </header>
      <TrustMarquee />
    </>
  )
}
