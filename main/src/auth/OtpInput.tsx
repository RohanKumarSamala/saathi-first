import { useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

type Props = { value: string; onChange: (value: string) => void; length?: number }

/** Six single-digit boxes that behave like one field (typing, backspace and paste). */
export function OtpInput({ value, onChange, length = 6 }: Props) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  // The latest code, so quick typing never works from a value that has not re-rendered yet.
  const latest = useRef(value)
  useLayoutEffect(() => {
    latest.current = value
  }, [value])
  const focus = (index: number) => boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus()

  const update = (next: string) => {
    latest.current = next
    onChange(next)
  }

  /** Writes digits from box `index` onwards: one when typed, all six when the phone autofills the SMS code. */
  const fill = (index: number, digits: string) => {
    const next = latest.current.padEnd(length, ' ').split('')
    if (!digits) next[index] = ' '
    digits.split('').forEach((digit, offset) => {
      if (index + offset < length) next[index + offset] = digit
    })
    update(next.join('').trimEnd())
    if (digits) focus(index + digits.length)
  }

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !latest.current[index]?.trim()) focus(index - 1)
    if (event.key === 'ArrowLeft') focus(index - 1)
    if (event.key === 'ArrowRight') focus(index + 1)
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    update(digits)
    focus(digits.length)
  }

  return (
    <div role="group" aria-label="Verification code" className="grid grid-cols-6 gap-2 sm:gap-3">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          value={value[index]?.trim() ?? ''}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '')
            // A whole code arrives at once from SMS autofill; one new digit when typed over an old one.
            fill(index, typed.length > 1 && typed.length >= length - index ? typed.slice(0, length - index) : typed.slice(-1))
          }}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={index === 0}
          aria-label={`Digit ${index + 1}`}
          className="aspect-square w-full min-w-0 rounded-2xl border border-burgundy/25 bg-white text-center text-2xl font-semibold text-burgundy shadow-[inset_0_2px_6px_rgb(107_30_46/0.06)] transition-[border-color,box-shadow,transform] duration-200 focus-visible:-translate-y-0.5 focus-visible:border-burgundy focus-visible:shadow-[0_0_0_4px_rgb(201_162_107/0.35)] focus-visible:outline-none"
        />
      ))}
    </div>
  )
}
