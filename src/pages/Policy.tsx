import { useParams } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { policies, site } from '../content/site'
import NotFound from './NotFound'

const linkClass = 'font-semibold text-burgundy underline underline-offset-4'

export default function Policy() {
  const { slug } = useParams()
  const policy = policies.find((item) => item.slug === slug)
  if (!policy) return <NotFound />

  return (
    <>
      <PageHero
        title={policy.title}
        intro={`${site.name} · ${site.city}`}
        tagline={<span className="accent text-rosewood">Being finalised.</span>}
      />
      <div className="page-padding">
        <div className="container-large py-16 nav:py-24">
          {/* PLACEHOLDER: replace with the approved legal text before launch. */}
          <div className="max-w-3xl rounded-card bg-white/85 p-8 shadow-card nav:p-12">
            <p className="text-large">
              Our {policy.title} is being finalised and will be published on this page.
            </p>
            <p className="mt-4 text-ink-muted">
              In the meantime, if you have any questions, write to us at{' '}
              <a className={linkClass} href={site.emailHref}>
                {site.email}
              </a>{' '}
              or call{' '}
              <a className={linkClass} href={site.phoneHref}>
                {site.phoneDisplay}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
