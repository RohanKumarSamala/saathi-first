import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageSources, type ImageName } from '../lib/images'
import { TrustMarquee } from './TrustMarquee'

const SLIDE_MS = 4700

type Slide = {
  /** Short name for the photo; also its key. */
  caption: string
  alt: string
  /** Where the people are in the frame, so the crop keeps them in view. */
  position: string
  /** A different focus for tall phone screens, where far less of a wide photo fits. */
  mobilePosition?: string
  image: ImageName
  /**
   * Gently sharpen it on wider screens: the photo is only 1400 px wide, so a desktop screen
   * stretches it and it would otherwise look soft.
   */
  sharpen?: boolean
}

/** How far each slide slowly zooms in while it shows. */
const ZOOM = 1.08

// The brand's own photography, each showing a different part of the service; companionship at
// home comes first.
const slides: Slide[] = [
  {
    caption: 'Companionship at home',
    alt: 'A Saathi First companion sharing tea and a book with an elderly woman',
    position: '72% 40%',
    // Phones are too narrow for both faces: keep the elder's face and the Saathi's shirt in view.
    mobilePosition: '60% 40%',
    image: 'companionship',
  },
  {
    caption: 'Everyday outings',
    alt: 'A Saathi First companion helping an elderly woman into a van, a wheelchair beside them',
    position: '50% 30%',
    mobilePosition: '45% 30%',
    image: 'svc-travel',
    sharpen: true,
  },
  {
    caption: 'Hospital visits',
    alt: 'A Saathi First companion sitting with an elderly man at his hospital bedside',
    position: '62% 40%',
    image: 'hospital',
  },
  {
    caption: 'Banking help',
    alt: 'A Saathi First companion helping an elderly man fill in forms at a bank counter',
    position: '50% 30%',
    mobilePosition: '45% 30%',
    image: 'svc-banking',
    sharpen: true,
  },
  {
    caption: 'Safe travel',
    alt: 'A Saathi First companion helping an elderly woman out of a car',
    position: '62% 35%',
    image: 'transport',
  },
  {
    caption: 'Creche services',
    alt: 'A Saathi First companion playing with building blocks with children at a creche',
    position: '50% 35%',
    mobilePosition: '50% 35%',
    image: 'svc-children',
    sharpen: true,
  },
]

/** Visible slide: fades in and zooms in slowly. Hidden slides wait to reset until faded out. */
const slideClass = (active: boolean, sharpen?: boolean) =>
  `absolute inset-0 size-full object-cover [object-position:var(--focus-mobile)] md:[object-position:var(--focus)] ${
    sharpen ? 'md:[filter:url(#hero-sharpen)] ' : ''
  }${
    active
      ? 'opacity-100 transition-[opacity,scale] duration-[1200ms,5700ms] ease-[ease,linear]'
      : 'opacity-0 transition-[opacity,scale] delay-[0ms,1200ms] duration-[1200ms,0ms]'
  }`

function SlideImage({ slide, index, active, zoomed }: { slide: Slide; index: number; active: boolean; zoomed: boolean }) {
  const common = {
    alt: active ? slide.alt : '',
    'aria-hidden': !active,
    decoding: 'async' as const,
    className: slideClass(active, slide.sharpen),
    style: {
      ['--focus' as string]: slide.position,
      ['--focus-mobile' as string]: slide.mobilePosition ?? slide.position,
      scale: zoomed ? String(ZOOM) : '1',
    },
  }
  // Every slide loads up front, so none fades in blank; the first, on screen at once, comes first.
  return (
    <img
      {...imageSources(slide.image)}
      sizes="100vw"
      fetchPriority={index === 0 ? 'high' : 'low'}
      {...common}
    />
  )
}

export function Hero() {
  const [active, setActive] = useState(0)
  // Tabbing into the words and buttons pauses it, so keyboard users are not rushed. Hovering does
  // not: the photo fills the screen, so a resting mouse would hold the first slide indefinitely.
  const [paused, setPaused] = useState(false)
  // Visitors who ask for less motion see one still photo.
  const [stillPhotos] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // The first photo shows at once but starts its zoom a frame later, so it zooms like the rest
  // instead of appearing already zoomed in.
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setStarted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (paused || stillPhotos) return
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [active, paused, stillPhotos])

  return (
    <>
      <header
        data-nav-hero
        className="relative isolate flex h-svh min-h-[36rem] max-h-[64rem] overflow-hidden bg-wine text-white"
      >
        <div className="absolute inset-0 -z-20">
          {slides.map((slide, index) => (
            <SlideImage
              key={slide.caption}
              slide={slide}
              index={index}
              active={index === active}
              zoomed={index === active && started && !stillPhotos}
            />
          ))}
          {/* A light sharpen for the smaller photos (see Slide.sharpen). Its weights add up to 1, so
              brightness is unchanged. */}
          <svg aria-hidden className="absolute size-0">
            <filter id="hero-sharpen" colorInterpolationFilters="sRGB">
              <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0" />
            </filter>
          </svg>
        </div>
        {/* Neutral shade, darker at the foot and top, so text and nav read on any photo. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(18_8_10/0.82)_0%,rgb(18_8_10/0.35)_42%,transparent_68%),linear-gradient(to_bottom,rgb(18_8_10/0.45)_0%,transparent_22%)]"
        />

        <div className="page-padding mt-auto w-full">
          <div
            onFocus={() => setPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
            }}
            className="container-large pb-14 nav:pb-20"
          >
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
