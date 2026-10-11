import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'alternate' | 'solid'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill py-3 text-base font-semibold leading-6 transition-[transform,box-shadow,filter] duration-300 ease-out-soft hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60'

const variants: Record<Variant, string> = {
  primary:
    'px-6 text-wine [background-image:var(--grad-primary)] shadow-[0_8px_24px_-10px_rgb(201_162_107/0.9)] hover:brightness-105 hover:shadow-[0_14px_30px_-10px_rgb(201_162_107/0.95)]',
  alternate:
    'px-8 text-wine [background-image:var(--grad-alternate)] shadow-[inset_1px_1px_0_rgb(255_255_255/0.75),inset_-1px_-1px_0_rgb(58_17_25/0.25)] hover:brightness-[1.03]',
  solid:
    'px-8 bg-burgundy text-blush shadow-[0_10px_24px_-12px_rgb(107_30_46/0.9)] hover:bg-wine',
}

type LinkProps = { to: string; variant?: Variant; className?: string; children: ReactNode }

export function ButtonLink({ to, variant = 'primary', className = '', children }: LinkProps) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
