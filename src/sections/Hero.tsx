import { ButtonLink } from '../components/Button'
import { TrustMarquee } from './TrustMarquee'

const delay = (ms: number) => ({ animationDelay: `${ms}ms` })

export function Hero() {
  return (
    <header className="relative isolate overflow-hidden bg-burgundy bg-[radial-gradient(circle_at_85%_0%,#a8454f,transparent_60%)] text-blush">
      <picture>
        <source media="(max-width: 767px)" srcSet="/images/hero-mobile-900.webp" />
        <img
          src="/images/hero-2400.webp"
          srcSet="/images/hero-2400.webp 2400w, /images/hero-3072.webp 3072w"
          sizes="(min-width: 1600px) 3072px, 2400px"
          alt="A Saathi First companion walking arm in arm with an elderly woman beside a car"
          width={3072}
          height={1152}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-x-0 top-[21%] -z-20 h-[60%] w-full object-cover object-[45%_0%] [mask-image:linear-gradient(to_bottom,transparent,black_30%)] md:inset-x-auto md:bottom-0 md:left-[98%] md:top-auto md:h-[56%] md:w-auto md:max-w-none md:-translate-x-[67%] md:[mask-composite:intersect] md:[mask-image:linear-gradient(to_bottom,transparent,black_30%),linear-gradient(to_right,transparent,black_32%)] nav:h-[64%] xl:h-[76%]"
        />
      </picture>
      {/* Brand wash: keeps copy legible and ties the photo to the burgundy palette. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(107_30_46/0.7)_0%,rgb(107_30_46/0.45)_30%,rgb(107_30_46/0.05)_38%,rgb(107_30_46/0.2)_44%,rgb(88_24_38/0.94)_52%,rgb(58_17_25/0.97)_100%)] md:bg-[linear-gradient(90deg,rgb(107_30_46/0.98)_0%,rgb(107_30_46/0.92)_34%,rgb(124_38_56/0.45)_54%,rgb(185_84_92/0.06)_72%,transparent_100%),linear-gradient(180deg,transparent_0%,transparent_62%,rgb(58_17_25/0.9)_100%)]"
      />

      <div className="page-padding">
        <div className="container-large">
          <div className="pb-12 pt-[6.5rem] nav:pb-20 nav:pt-44">
            <h1 className="text-display max-w-3xl animate-rise">
              Someone you trust, when you <span className="accent">can’t be there.</span>
            </h1>
            <p className="text-heading mt-5 animate-rise nav:mt-6" style={delay(120)}>
              Hospital + Home + Everyday care.
            </p>
            <p
              className="text-large mt-52 max-w-3xl animate-rise font-medium md:mt-12 md:max-w-md lg:max-w-lg xl:max-w-xl min-[1400px]:max-w-3xl"
              style={delay(240)}
            >
              Saathi First brings trained, verified companions to your loved ones in Hyderabad,
              helping with hospital visits, banking, travel and everyday company, while keeping
              your family informed at every step.
            </p>
            <div className="mt-8 animate-rise" style={delay(360)}>
              <ButtonLink to="/contact">Book a Saathi</ButtonLink>
            </div>
          </div>
          <div aria-hidden className="divider-fade text-blush/80" />
        </div>
      </div>

      <TrustMarquee />
    </header>
  )
}
