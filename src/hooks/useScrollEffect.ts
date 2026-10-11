import { useEffect, type RefObject } from 'react'

type Effect = (element: HTMLElement, rect: DOMRect, viewportHeight: number) => void

/**
 * Runs `effect` with the element's viewport rect on every scroll frame.
 * Elements keep their natural CSS when JavaScript is unavailable or the
 * visitor prefers reduced motion, so content is never hidden by default.
 */
export function useScrollEffect(ref: RefObject<HTMLElement | null>, effect: Effect) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      effect(element, element.getBoundingClientRect(), window.innerHeight)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      element.style.opacity = ''
      element.style.transform = ''
    }
  }, [ref, effect])
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
