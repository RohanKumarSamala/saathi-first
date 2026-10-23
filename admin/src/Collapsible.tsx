import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/**
 * The detail area of an admin card: exactly four lines, each kept to one line, so
 * cards stay compact. When something is hidden, "Show more" opens the full details as an
 * extension floating over the card, so the card and its row never change size.
 * "Show less", Escape or a click outside closes it.
 */
export function Collapsible({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  // While open, the folded height is kept as a placeholder so nothing below moves.
  const [placeholder, setPlaceholder] = useState(0)
  const wrapper = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    const element = box.current
    if (!element || open) return
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    // Measure once straight away too, rather than waiting for the first resize report.
    queueMicrotask(measure)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !wrapper.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const toggle = () => {
    if (!open) setPlaceholder(wrapper.current?.clientHeight ?? 0)
    setOpen((value) => !value)
  }

  const button = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={toggle}
      className="inline-flex items-center gap-1 text-xs font-semibold text-rosewood transition-colors hover:text-burgundy"
    >
      {open ? 'Show less' : 'Show more'}
      <ChevronDown aria-hidden className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )

  return (
    <div ref={wrapper} className="relative" style={open ? { height: placeholder } : undefined}>
      <div className="relative">
        <div
          ref={box}
          id={id}
          data-collapsed={!open}
          className={`group/clamp ${
            open
              ? 'absolute -inset-x-3 -top-2 z-20 rounded-2xl bg-white p-3 pt-2 shadow-[0_24px_50px_-20px_rgb(58_17_25/0.5)] ring-1 ring-gold/40'
              : // Four 1.25rem lines and the three 0.375rem gaps between them, cut cleanly.
                'relative max-h-[6.125rem] overflow-hidden'
          }`}
        >
          <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-1.5">{children}</div>
          {open && <div className="mt-2">{button}</div>}
        </div>
      </div>
      {!open && overflowing && <div className="mt-1">{button}</div>}
    </div>
  )
}
