import { FileText, Mail, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { legal, policyText, type Block } from '../content/policies'
import { policies, site } from '../content/site'
import NotFound from './NotFound'

const anchor = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function Body({ block }: { block: Block }) {
  if (typeof block === 'string') return <p>{block}</p>
  return (
    <ul className="grid gap-2.5">
      {block.list.map((item) => (
        <li key={item} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-rosewood">
          {item}
        </li>
      ))}
    </ul>
  )
}

/** A legal document laid out for reading: contents on the side, numbered sections, quiet type. */
export default function Policy() {
  const { slug } = useParams()
  const policy = policies.find((item) => item.slug === slug)
  const text = slug ? policyText[slug] : undefined
  if (!policy || !text) return <NotFound />

  // The contact block is the closing panel rather than a numbered section.
  const sections = text.sections.filter((section) => section.heading !== 'Contact us')
  const contact = text.sections.find((section) => section.heading === 'Contact us')

  return (
    <div className="page-padding">
      <div className="container-large pb-20 pt-32 nav:pb-28 nav:pt-40">
        <header className="max-w-3xl border-b border-burgundy/15 pb-8">
          <p className="text-eyebrow flex items-center gap-2 font-semibold text-rosewood">
            <FileText aria-hidden className="size-4" />
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-normal tracking-tight nav:text-5xl">{policy.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{text.summary}</p>
          <p className="mt-5 text-sm text-ink-muted">
            Last updated <time className="font-semibold text-ink">{legal.lastUpdated}</time>
            {!legal.reviewed && <span> · Draft under review; it may change before it is final.</span>}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 nav:mt-14 nav:grid-cols-[15rem_minmax(0,1fr)] nav:gap-16">
          <aside className="nav:sticky nav:top-32 nav:self-start">
            {/* A row of tabs on phones, a list beside the text on wide screens. */}
            <nav aria-label="Policies" className="-mx-1 flex gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none] nav:mx-0 nav:grid nav:overflow-visible nav:px-0">
              <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted nav:block">Policies</p>
              {policies.map((item) => {
                const current = item.slug === slug
                return (
                  <Link
                    key={item.slug}
                    to={`/policies/${item.slug}`}
                    aria-current={current ? 'page' : undefined}
                    className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-medium transition-colors nav:rounded-lg nav:border-l-2 nav:px-3 ${
                      current
                        ? 'bg-burgundy text-blush nav:border-burgundy nav:bg-white/70 nav:text-burgundy'
                        : 'bg-white/60 text-ink-muted hover:text-burgundy nav:border-transparent nav:bg-transparent'
                    }`}
                  >
                    {item.title}
                  </Link>
                )
              })}
            </nav>
            <nav aria-label="On this page" className="mt-8 hidden gap-1.5 text-sm nav:grid">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">On this page</p>
              {sections.map((section, index) => (
                <a key={section.heading} href={`#${anchor(section.heading)}`} className="py-0.5 text-ink-muted transition-colors hover:text-burgundy">
                  {index + 1}. {section.heading}
                </a>
              ))}
            </nav>
          </aside>

          <article className="max-w-3xl">
            <ol className="grid gap-10">
              {sections.map((section, index) => (
                <li key={section.heading} id={anchor(section.heading)} className="scroll-mt-32">
                  <h2 className="flex items-baseline gap-3 text-xl font-semibold text-ink">
                    <span className="text-sm font-semibold tabular-nums text-rosewood">{String(index + 1).padStart(2, '0')}</span>
                    {section.heading}
                  </h2>
                  <div className="mt-3 grid gap-3 text-[1.0625rem] leading-relaxed text-ink/90">
                    {section.body.map((block, position) => (
                      <Body key={position} block={block} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>

            {contact && (
              <section aria-labelledby="policy-contact" className="mt-14 rounded-2xl bg-white/80 p-6 ring-1 ring-burgundy/10 nav:p-8">
                <h2 id="policy-contact" className="text-lg font-semibold">
                  Questions or complaints
                </h2>
                <div className="mt-2 grid gap-2 text-ink-muted">
                  {contact.body.slice(0, 1).map((block, position) => (
                    <Body key={position} block={block} />
                  ))}
                  {contact.body.slice(2).map((block, position) => (
                    <Body key={position} block={block} />
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={site.emailHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-blush transition-colors hover:bg-wine"
                  >
                    <Mail aria-hidden className="size-4" />
                    {site.email}
                  </a>
                  <a
                    href={site.phoneHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-burgundy ring-1 ring-burgundy/25 transition-colors hover:bg-burgundy/10"
                  >
                    <Phone aria-hidden className="size-4" />
                    {site.phoneDisplay}
                  </a>
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
