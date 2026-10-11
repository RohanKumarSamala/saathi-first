/** Government IDs accepted on the Saathi application, with a basic format check each. */
export const idTypes = [
  { id: 'aadhaar', label: 'Aadhaar', hint: '12 digits', pattern: /^\d{12}$/ },
  { id: 'pan', label: 'PAN card', hint: 'e.g. ABCDE1234F', pattern: /^[A-Z]{5}\d{4}[A-Z]$/ },
  { id: 'voter', label: 'Voter ID', hint: 'e.g. ABC1234567', pattern: /^[A-Z]{3}\d{7}$/ },
  { id: 'licence', label: 'Driving licence', hint: 'As printed on the licence', pattern: /^[A-Z]{2}\d{2}[A-Z0-9]{9,13}$/ },
  { id: 'passport', label: 'Indian passport', hint: 'e.g. A1234567', pattern: /^[A-Z]\d{7}$/ },
] as const

export type IdTypeId = (typeof idTypes)[number]['id']

export const normaliseId = (value: string) => value.replace(/[\s-]/g, '').toUpperCase()

export function isValidId(type: string, value: string) {
  const entry = idTypes.find((item) => item.id === type)
  return Boolean(entry?.pattern.test(normaliseId(value)))
}

/**
 * Full Aadhaar numbers should not be kept by organisations that are not
 * authorised to store them, so only the last four digits are saved. The
 * physical card is checked in person during verification.
 */
export function maskIdNumber(type: string, value: string) {
  const clean = normaliseId(value)
  return type === 'aadhaar' ? `XXXX XXXX ${clean.slice(-4)}` : clean
}
