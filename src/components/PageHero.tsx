import type { ReactNode } from 'react'

type Props = { title: string; intro: string; tagline: ReactNode }

/** Shared opening block for inner pages, mirroring the reference's light sub-page header. */
export function PageHero({ title, intro, tagline }: Props) {
  return (
    <header className="page-padding">
      <div className="container-large pt-32 nav:pt-[11.8rem]">
        <h1 className="text-display animate-rise">{title}</h1>
        <p
          className="mt-5 max-w-5xl animate-rise font-medium text-ink-muted"
          style={{ animationDelay: '100ms' }}
        >
          {intro}
        </p>
        <p className="text-heading mt-8 animate-rise nav:mt-10" style={{ animationDelay: '200ms' }}>
          {tagline}
        </p>
        <div aria-hidden className="divider-left mt-10 text-wine nav:mt-12" />
      </div>
    </header>
  )
}
