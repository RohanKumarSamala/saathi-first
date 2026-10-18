const pad = (value: number) => String(value).padStart(2, '0')

/** "2026-10-25", a stable key for a calendar day in local time. */
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
