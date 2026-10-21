import type { ReactNode } from 'react'

type Props = {
  id: string
  label: string
  error?: string
  /** Light fields show their label; dark (photo-backed) fields rely on placeholders. */
  tone?: 'light' | 'dark'
  children: ReactNode
}

/** Label + control + inline error. The control is passed in so any input type fits. */
export function Field({ id, label, error, tone = 'light', children }: Props) {
  const dark = tone === 'dark'
  return (
    <div>
      <label
        htmlFor={id}
        className={dark ? 'sr-only' : 'mb-2 block pl-2 text-sm font-semibold text-ink-muted'}
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className={`mt-2 pl-2 text-sm ${dark ? 'text-[#f7c1bc]' : 'text-[#b3261e]'}`}
        >
          {error}
        </p>
      )}
    </div>
  )
}
