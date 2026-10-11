import { faqs } from '../content/site'

/** The reference presents FAQs as an open list with fading rules, not an accordion. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="page-padding">
      <div className="container-large section-y">
        <h2 id="faq-heading" className="text-heading mb-16 text-center nav:mb-20">
          Frequently Asked Questions
        </h2>
        <dl className="grid gap-10">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="text-wine before:divider-left before:mb-10 before:block first:before:hidden"
            >
              <dt className="mb-2 text-xl font-normal leading-tight tracking-tight nav:text-2xl">
                {faq.q}
              </dt>
              <dd className="text-large max-w-5xl">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
