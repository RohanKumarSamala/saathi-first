import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import wordmark from '../assets/logo/wordmark.svg'
import { policies, site } from '../content/site'
import { EnquiryForm } from './EnquiryForm'

const year = new Date().getFullYear()

const contactItems = [
  { icon: Phone, label: 'Call us', value: site.phoneDisplay, href: site.phoneHref },
  { icon: Mail, label: 'Email', value: site.email, href: site.emailHref },
  { icon: MapPin, label: 'Based in', value: site.city },
]

export function Footer({ showEnquiry = true }: { showEnquiry?: boolean }) {
  return (
    <footer className="page-padding bg-wine text-blush [background-image:radial-gradient(circle_at_50%_125%,rgb(185_84_92/0.45),transparent_54%)]">
      <div className="container-large pt-16">
        {showEnquiry && (
          <section aria-labelledby="footer-cta" className="pb-4">
            <h2 id="footer-cta" className="text-huge">
              Looking for a Saathi?
              <br />
              <span className="accent text-gold">Let’s talk!</span>
            </h2>
            <p className="text-large mt-2">
              Complete the form below and a member of our team will contact you.
            </p>
            <div className="mt-16 grid gap-x-16 gap-y-12 nav:grid-cols-[35rem_1fr]">
              <EnquiryForm />
              <ul className="flex flex-col gap-7 nav:pl-8">
                {contactItems.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blush/10 text-gold">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span>
                      <span className="text-eyebrow block text-blush/70">{label}</span>
                      {href ? (
                        <a href={href} className="text-xlarge font-light transition-colors hover:text-gold">
                          {value}
                        </a>
                      ) : (
                        <span className="text-xlarge font-light">{value}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="flex flex-col gap-x-8 gap-y-4 pt-12 text-sm nav:flex-row nav:items-center nav:justify-between">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link to="/become-a-saathi" className="transition-colors hover:text-gold">
                Become a Saathi
              </Link>
            </li>
            {policies.map((policy) => (
              <li key={policy.slug}>
                <Link to={`/policies/${policy.slug}`} className="transition-colors hover:text-gold">
                  {policy.title}
                </Link>
              </li>
            ))}
          </ul>
          <p>© {year} Saathi First. All rights reserved.</p>
        </div>

        <img
          src={wordmark}
          alt=""
          aria-hidden
          width={1280}
          height={224}
          loading="lazy"
          className="mt-5 block w-full select-none"
        />
      </div>
    </footer>
  )
}
