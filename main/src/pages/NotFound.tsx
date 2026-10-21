import { ButtonLink } from '../components/Button'

export default function NotFound() {
  return (
    <div className="page-padding">
      <div className="container-large flex min-h-[70vh] flex-col items-start justify-center pb-24 pt-44">
        <p className="text-eyebrow font-semibold text-rosewood">Page not found</p>
        <h1 className="text-display mt-4">
          We couldn’t find <span className="accent text-rosewood">that page.</span>
        </h1>
        <ButtonLink to="/" variant="solid" className="mt-10">
          Back to home
        </ButtonLink>
      </div>
    </div>
  )
}
