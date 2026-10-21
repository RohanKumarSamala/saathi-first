import { site } from '../content/site'

/**
 * There is no backend yet, so enquiries are handed to the visitor's own email
 * app as a pre-filled message. Swap this for a real form endpoint once one is
 * available; every form on the site goes through this single function.
 */
export function openEnquiryEmail(subject: string, fields: Record<string, string>) {
  const body = Object.entries(fields)
    .filter(([, value]) => value.trim() !== '')
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join('\n')
  const href = `${site.emailHref}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = href
}

/** Indian mobile number: optional +91 / 0 prefix, then 10 digits starting 6-9. */
export function isValidIndianMobile(value: string) {
  return /^(?:\+?91|0)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ''))
}
