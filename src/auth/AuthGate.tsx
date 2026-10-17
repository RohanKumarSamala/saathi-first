import { ArrowRight, LockKeyhole, Mail, MailCheck, Smartphone } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { auth } from '../lib/firebase'
import { useAuth } from './context'
import { needsEmailVerification, sendVerification } from './verify'

type Props = {
  /** What signing in unlocks, e.g. "book a Saathi". */
  action: string
  tone?: 'light' | 'dark'
  children: ReactNode
}

const primaryButton =
  'group inline-flex h-14 items-center gap-3 rounded-full px-8 text-lg font-semibold text-wine shadow-[0_16px_32px_-14px_rgb(201_162_107/0.9)] transition-[transform,filter] duration-300 ease-out-soft [background-image:var(--grad-primary)] hover:-translate-y-0.5 hover:brightness-105 disabled:pointer-events-none disabled:opacity-60'

function Panel({ dark, icon, children }: { dark: boolean; icon: ReactNode; children: ReactNode }) {
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
      <span className="grid size-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c9a26b,#f3dcc0)] text-wine shadow-[0_16px_32px_-14px_rgb(201_162_107/0.9)]">
        {icon}
      </span>
      {children}
    </div>
  )
}

type Sending = 'idle' | 'sending' | 'sent' | 'limited' | 'failed' | 'checking' | 'not-yet'

const sendingNotes: Partial<Record<Sending, string>> = {
  sent: `A new link is on its way from noreply@${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}. It can take a minute; check Spam and Promotions too.`,
  limited: 'We sent several emails already. Please wait a few minutes before asking again.',
  failed: 'We could not send the email. Please try again.',
  'not-yet': 'Not verified yet. Click the link in the email first, then try again.',
}

/** Shown to email and password accounts until they click the link we emailed them. */
function VerifyEmail({ action, dark }: { action: string; dark: boolean }) {
  const { user, refreshUser, signOut } = useAuth()
  const [state, setState] = useState<Sending>('idle')
  // Firebase's error code when sending fails, shown so the cause can be fixed rather than guessed.
  const [failure, setFailure] = useState('')

  // Coming back to this tab after clicking the link unlocks the page without a reload.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void refreshUser().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [refreshUser])

  const resend = async () => {
    const current = auth?.currentUser
    if (!current) return
    setState('sending')
    setFailure('')
    try {
      await sendVerification(current)
      setState('sent')
    } catch (caught) {
      const code = (caught as { code?: string })?.code ?? 'unknown error'
      setFailure(code)
      setState(code === 'auth/too-many-requests' ? 'limited' : 'failed')
    }
  }

  const check = async () => {
    setState('checking')
    try {
      await refreshUser()
    } finally {
      // Once verified, AuthGate swaps this panel for the page, so only "not yet" needs saying.
      if (!auth?.currentUser?.emailVerified) setState('not-yet')
    }
  }

  const muted = dark ? 'text-blush/80' : 'text-ink-muted'
  const link = `font-semibold underline underline-offset-4 ${dark ? 'text-gold' : 'text-burgundy'}`

  return (
    <Panel dark={dark} icon={<MailCheck aria-hidden className="size-7" strokeWidth={1.6} />}>
      <h2 className="mt-6 text-3xl font-light leading-tight tracking-tight nav:text-4xl">
        Confirm your email to <span className={`accent ${dark ? 'text-gold' : 'text-rosewood'}`}>{action}</span>
      </h2>
      <p className={`text-large mt-3 max-w-md ${muted}`}>
        We sent a link to <strong className="break-all font-semibold">{user?.email}</strong>. Click it, then
        come back here.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button type="button" onClick={check} disabled={state === 'checking'} className={primaryButton}>
          {state === 'checking' ? 'Checking…' : 'I’ve verified'}
          <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
        <button type="button" onClick={resend} disabled={state === 'sending'} className={link}>
          {state === 'sending' ? 'Sending…' : 'Resend email'}
        </button>
      </div>
      <p role="status" className={`mt-4 min-h-5 text-sm ${muted}`}>
        {sendingNotes[state]}
        {state === 'failed' && failure && ` (${failure})`}
      </p>
      <p className={`mt-4 text-sm ${muted}`}>
        Wrong email?{' '}
        <button type="button" onClick={() => void signOut()} className={link}>
          Sign out
        </button>{' '}
        and sign in again, or use Google or your phone instead.
      </p>
    </Panel>
  )
}

/**
 * Shows `children` only to signed-in visitors with a confirmed contact. Everyone
 * else gets the sign-in pop-up straight away, with a prompt left behind in case
 * they dismiss it.
 */
export function AuthGate({ action, tone = 'light', children }: Props) {
  const { user, emailVerified, loading, openAuth } = useAuth()
  const locked = !loading && !user
  const dark = tone === 'dark'

  useEffect(() => {
    if (locked) openAuth()
  }, [locked, openAuth])

  if (user && needsEmailVerification(user, emailVerified)) return <VerifyEmail action={action} dark={dark} />
  if (user) return children

  return (
    <Panel dark={dark} icon={<LockKeyhole aria-hidden className="size-7" strokeWidth={1.6} />}>
      {loading ? (
        <p role="status" className="text-large mt-6 font-medium">
          Checking your sign-in…
        </p>
      ) : (
        <>
          <h2 className="mt-6 text-3xl font-light leading-tight tracking-tight nav:text-4xl">
            Sign in to <span className={`accent ${dark ? 'text-gold' : 'text-rosewood'}`}>{action}</span>
          </h2>
          <p className={`text-large mt-3 max-w-md ${dark ? 'text-blush/80' : 'text-ink-muted'}`}>
            It takes less than a minute. Use your mobile number or your email address.
          </p>
          <button type="button" onClick={openAuth} className={`${primaryButton} mt-8`}>
            Sign in
            <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <p
            className={`mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium ${
              dark ? 'text-blush/70' : 'text-ink-muted'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Smartphone aria-hidden className="size-4" /> Phone code
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail aria-hidden className="size-4" /> Email and password
            </span>
          </p>
        </>
      )}
    </Panel>
  )
}
