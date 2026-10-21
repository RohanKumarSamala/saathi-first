const pad = (value: number) => String(value).padStart(2, '0')

/** "2026-10-25", a stable key for a calendar day in local time. */
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Saathi First works in Hyderabad, so visit times are always India time (UTC+5:30, no daylight saving). */
export const INDIA_TIME_ZONE = 'Asia/Kolkata'
const IST_OFFSET_MINUTES = 330

const shiftToIndia = (date: Date) => (IST_OFFSET_MINUTES + date.getTimezoneOffset()) * 60_000

/**
 * The current moment as a Date whose local fields (getHours, getDate…) read India's wall clock,
 * so the booking calendar shows India's days and times even on a phone set to another country.
 */
export const indiaWallClock = (date = new Date()) => new Date(date.getTime() + shiftToIndia(date))

/** Turns an India wall-clock Date back into the real moment, e.g. for saving a visit time. */
export const fromIndiaWallClock = (wall: Date) => new Date(wall.getTime() - shiftToIndia(wall))

/** True when this device is not set to India time, so times need an "India time" label. */
export const outsideIndiaTime = () => new Date().getTimezoneOffset() !== -IST_OFFSET_MINUTES
