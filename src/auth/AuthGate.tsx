import { ArrowRight, LockKeyhole, Mail, Smartphone } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from './context'

type Props = {
  /** What signing in unlocks, e.g. "book a Saathi". */
  action: string
  tone?: 'light' | 'dark'
  children: ReactNode
}

/**
 * Shows `children` only to signed-in visitors. Everyone else gets the sign-in
 * pop-up straight away, with a prompt left behind in case they dismiss it.
 */
export function AuthGate({ action, tone = 'light', children }: Props) {
  const { user, loading, openAuth } = useAuth()
  const locked = !loading && !user

  useEffect(() => {
    if (locked) openAuth()
  }, [locked, openAuth])

  if (user) return children

  const dark = tone === 'dark'
  return (
    <div
      className={`relative isolate overflow-hidden rounded-card p-8 nav:p-12 ${
        dark
          ? 'border border-gold/30 bg-wine/45 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)] backdrop-blur-md'
          : 'bg-white/90 shadow-card ring-1 ring-gold/40'
      }`}
    >
      <div aria-hidden className="absolute -right-16 -top-16 -z-10 size-56 rounded-full border border-gold/30" />
      <div aria-hidden className="absolute -right-6 -top-6 -z-10 size-56 rounded-full border border-dashed border-gold/25" />

      {loading ? (
        <p role="status" className="text-large font-medium">
          Checking your sign-in…
        </p>
      ) : (
        <>
          <span className="grid size-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c9a26b,#f3dcc0)] text-wine shadow-[0_16px_32px_-14px_rgb(201_162_107/0.9)]">
            <LockKeyhole aria-hidden className="size-7" strokeWidth={1.6} />
          </span>
          <h2 className="mt-6 text-3xl font-light leading-tight tracking-tight nav:text-4xl">
            Sign in to <span className={`accent ${dark ? 'text-gold' : 'text-rosewood'}`}>{action}</span>
          </h2>
          <p className={`text-large mt-3 max-w-md ${dark ? 'text-blush/80' : 'text-ink-muted'}`}>
            It takes less than a minute. Use your mobile number or your email address.
          </p>
          <button
            type="button"
            onClick={openAuth}
            className="group mt-8 inline-flex h-14 items-center gap-3 rounded-full px-8 text-lg font-semibold text-wine shadow-[0_16px_32px_-14px_rgb(201_162_107/0.9)] transition-[transform,filter] duration-300 ease-out-soft [background-image:var(--grad-primary)] hover:-translate-y-0.5 hover:brightness-105"
          >
            Sign in
            <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <p className={`mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium ${dark ? 'text-blush/70' : 'text-ink-muted'}`}>
            <span className="inline-flex items-center gap-2">
              <Smartphone aria-hidden className="size-4" /> Phone code
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail aria-hidden className="size-4" /> Email and password
            </span>
          </p>
        </>
      )}
    </div>
  )
}
