import type { CSSProperties } from 'react'
import { imageSources, type ImageName } from '../lib/images'

type Props = {
  name: ImageName
  alt: string
  /** `sizes` hint so the browser picks the right variant. */
  sizes: string
  className?: string
  position?: string
  eager?: boolean
  style?: CSSProperties
}

export function Img({ name, alt, sizes, className = '', position, eager = false, style }: Props) {
  const source = imageSources(name)
  return (
    <img
      {...source}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`object-cover ${className}`}
      style={{ objectPosition: position, ...style }}
    />
  )
}
