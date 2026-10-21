import { INDIA_TIME_ZONE } from './dates'

/**
 * Contact links for a phone number as people type it ("98765 43210", "+91 98765-43210", "098...").
 * Only digits reach the URL, so a stored number can never inject anything into the link.
 */
export function indianNumber(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits
}

export const callLink = (phone: string) => `tel:+${indianNumber(phone)}`

export const whatsappLink = (phone: string, message: string) =>
  `https://wa.me/${indianNumber(phone)}?text=${encodeURIComponent(message)}`

/**
 * "Friday, 18 October at 10:30 am" — the form older visitors read most easily. Always India
 * time, where the visits happen, so a family booking from abroad sees the same time as the Saathi.
 */
export function friendlyWhen(date: Date) {
  const day = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: INDIA_TIME_ZONE })
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: INDIA_TIME_ZONE })
  return `${day} at ${time}`
}
