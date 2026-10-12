import { ButtonLink } from '../components/Button'
import { Process } from '../sections/Process'

export default function HowItWorks() {
  return (
    <>
      {/* Extra room on small screens so the heading clears the fixed header. */}
      <div className="pt-8 nav:pt-0">
        <Process heading="h1" />
      </div>
      <div className="page-padding flex justify-center pb-20 nav:pb-28">
        <ButtonLink to="/contact" variant="solid">
          Book a Saathi
        </ButtonLink>
      </div>
    </>
  )
}
