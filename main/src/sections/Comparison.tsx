import { Check, X } from 'lucide-react'
import { comparison } from '../content/site'

const columns = 'grid grid-cols-[1.3fr_1fr_1fr] nav:grid-cols-[1.5fr_1fr_1fr]'

export function Comparison() {
  return (
    <section aria-labelledby="comparison-heading" className="page-padding">
      <div className="container-large section-y">
        <div className="mb-16 text-center nav:mb-20">
          <p className="text-xlarge mb-6">See how Saathi First compares</p>
          <h2 id="comparison-heading" className="text-heading">
            A better way to <span className="accent text-rosewood">be there</span>
          </h2>
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Highlight behind the Saathi First column (grid tracks are 1.5 : 1 : 1). */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-[39.4%] w-[30.3%] rounded-3xl bg-[radial-gradient(circle_farthest-side_at_50%_5%,#fdeeee,#c9a26b_74%)] nav:left-[42.86%] nav:w-[28.57%] nav:rounded-card"
          />

          <div role="table" aria-labelledby="comparison-heading" className="relative">
            <div role="row" className={columns}>
              <div role="columnheader">
                <span className="sr-only">What you get</span>
              </div>
              {[comparison.ours, comparison.theirs].map((title) => (
                <div
                  key={title}
                  role="columnheader"
                  className="flex items-center justify-center px-2 py-4 text-center text-sm font-normal leading-tight nav:p-6 nav:text-[1.75rem] nav:font-light nav:leading-[1.3] nav:tracking-tight"
                >
                  <span className="max-w-[11rem]">{title}</span>
                </div>
              ))}
            </div>

            {comparison.rows.map((row) => (
              <div
                key={row.label}
                role="row"
                className={`${columns} relative text-wine before:absolute before:inset-x-0 before:top-0 before:divider-fade before:opacity-80`}
              >
                <div role="rowheader" className="py-4 pr-3 nav:pr-6">
                  <span className="text-eyebrow hidden nav:block">{row.label}</span>
                  <span className="block text-sm font-medium leading-snug nav:text-base nav:leading-6">
                    {row.value}
                  </span>
                </div>
                <div role="cell" className="grid place-items-center px-2 py-4">
                  <Check aria-hidden className="size-6" strokeWidth={2} />
                  <span className="sr-only">Included</span>
                </div>
                <div role="cell" className="grid place-items-center px-2 py-4">
                  <X aria-hidden className="size-5" strokeWidth={2} />
                  <span className="sr-only">Not guaranteed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
