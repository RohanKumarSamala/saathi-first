import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { CircleAlert, CircleCheck, Eye, EyeOff, KeyRound, MailCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { auth } from '../lib/firebase'

/**
 * Landing page for the links in Firebase's emails (set as the custom action URL
 * in Firebase > Authentication > Templates). Handles password resets and email
 * verification on our own site instead of Firebase's default page.
 */

type View =
  | { kind: 'loading' }
  | { kind: 'reset'; email: string }
  | { kind: 'reset-done'; email: string }
  | { kind: 'verified' }
  | { kind: 'invalid'; reset: boolean }
  | { kind: 'unsupported' }

/** Seconds before a finished page sends the visitor back on its own. */
const redirectDelay = 5

/** Only follow continueUrl back to our own site, never to another domain. */
function returnPath(continueUrl: string | null) {
  if (!continueUrl) return '/'
  try {
    const url = new URL(continueUrl)
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/'
  } catch {
    return '/'
  }
}

const inputClass =
  'h-14 w-full rounded-2xl border border-burgundy/20 bg-white px-5 pr-16 text-lg font-medium text-ink focus-visible:border-burgundy focus-visible:shadow-[0_0_0_4px_rgb(201_162_107/0.35)] focus-visible:outline-none'

function Card({ icon, title, children }: { icon: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <div className="page-padding">
      <div className="container-large flex min-h-[80vh] items-center justify-center pb-20 pt-32">
        <div className="w-full max-w-xl rounded-card bg-white/90 p-8 shadow-card ring-1 ring-gold/40 nav:p-12">
          <span className="grid size-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#c9a26b,#f3dcc0)] text-wine">
            {icon}
          </span>
          <h1 className="mt-6 text-3xl font-light leading-tight tracking-tight nav:text-4xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Counts down, then runs `onDone`; shows the remaining seconds. */
function useCountdown(active: boolean, onDone: () => void) {
  const [left, setLeft] = useState(redirectDelay)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })

  useEffect(() => {
    if (!active) return
    if (left <= 0) {
      done.current()
      return
    }
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [active, left])

  return left
}

function NewPasswordForm({ code, email, onDone, onExpired }: {
  code: string
  email: string
  onDone: () => void
  onExpired: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth) return
    if (password.length < 6) return setError('Please choose a password with at least 6 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    setError('')
    try {
      await confirmPasswordReset(auth, code, password)
      onDone()
    } catch (caught) {
      const reason = (caught as { code?: string })?.code ?? ''
      if (reason === 'auth/expired-action-code' || reason === 'auth/invalid-action-code') onExpired()
      else setError(reason === 'auth/weak-password'
        ? 'Please choose a stronger password with at least 6 characters.'
        : 'Could not set the password. Please try again.')
      setBusy(false)
    }
  }

  const field = (id: string, label: string, value: string, onChange: (value: string) => void) => (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          className={inputClass}
        />
        {id === 'new-password' && (
          <button
            type="button"
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
            aria-pressed={show}
            onClick={() => setShow((current) => !current)}
            className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-burgundy/10 hover:text-burgundy"
          >
            {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <form noValidate onSubmit={submit} className="mt-6 grid gap-5">
      <p className="text-ink-muted">
        For <strong className="break-all font-semibold text-ink">{email}</strong>
      </p>
      {field('new-password', 'New password', password, setPassword)}
      {field('confirm-password', 'Confirm new password', confirm, setConfirm)}
      <Button type="submit" variant="solid" disabled={busy || !password || !confirm}>
        {busy ? 'Saving…' : 'Set new password'}
      </Button>
      {error && (
        <p role="status" className="rounded-2xl bg-[#b3261e]/10 px-4 py-3 text-sm font-medium text-[#8c1d18]">
          {error}
        </p>
      )}
    </form>
  )
}

export default function AuthAction() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { openEmailSignIn, refreshUser } = useAuth()
  const mode = params.get('mode')
  const code = params.get('oobCode') ?? ''
  const back = returnPath(params.get('continueUrl'))
  const [view, setView] = useState<View>(() =>
    !auth || !code
      ? { kind: 'invalid', reset: mode === 'resetPassword' }
      : mode === 'resetPassword' || mode === 'verifyEmail' || mode === 'verifyAndChangeEmail'
        ? { kind: 'loading' }
        : { kind: 'unsupported' },
  )
  // A code works once; React's dev double-run must not spend it twice.
  const started = useRef(false)

  useEffect(() => {
    const firebase = auth
    if (started.current || !firebase || !code) return
    started.current = true
    if (mode === 'resetPassword') {
      verifyPasswordResetCode(firebase, code)
        .then((email) => setView({ kind: 'reset', email }))
        .catch(() => setView({ kind: 'invalid', reset: true }))
    } else if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail') {
      // verifyAndChangeEmail: an email added on My profile, saved to the account once confirmed.
      applyActionCode(firebase, code)
        .then(async () => {
          // If they are signed in on this browser, unlock booking straight away.
          await refreshUser().catch(() => undefined)
          setView({ kind: 'verified' })
        })
        .catch(() => setView({ kind: 'invalid', reset: false }))
    }
  }, [code, mode, refreshUser])

  const resetEmail = view.kind === 'reset-done' ? view.email : ''
  const goSignIn = () => {
    navigate(back)
    openEmailSignIn(resetEmail)
  }
  const left = useCountdown(view.kind === 'reset-done' || view.kind === 'verified', () =>
    view.kind === 'reset-done' ? goSignIn() : navigate(back),
  )

  switch (view.kind) {
    case 'loading':
      return (
        <Card icon={<KeyRound aria-hidden className="size-7" />} title="One moment…">
          <p role="status" className="text-large mt-3 text-ink-muted">
            Checking your link.
          </p>
        </Card>
      )
    case 'reset':
      return (
        <Card icon={<KeyRound aria-hidden className="size-7" />} title="Set a new password">
          <NewPasswordForm
            code={code}
            email={view.email}
            onDone={() => setView({ kind: 'reset-done', email: view.email })}
            onExpired={() => setView({ kind: 'invalid', reset: true })}
          />
        </Card>
      )
    case 'reset-done':
      return (
        <Card icon={<CircleCheck aria-hidden className="size-7" />} title="Your password has been set">
          <p role="status" className="text-large mt-3 text-ink-muted">
            You can now sign in with <strong className="break-all text-ink">{view.email}</strong> and your new
            password. Taking you to sign in in {left} seconds.
          </p>
          <Button type="button" variant="solid" className="mt-8" onClick={goSignIn}>
            Sign in now
          </Button>
        </Card>
      )
    case 'verified':
      return (
        <Card icon={<MailCheck aria-hidden className="size-7" />} title="Your email is confirmed">
          <p role="status" className="text-large mt-3 text-ink-muted">
            Thank you, it is now on your account. If you are asked to, sign in again. Taking you back in {left} seconds.
          </p>
          <Button type="button" variant="solid" className="mt-8" onClick={() => navigate(back)}>
            Continue
          </Button>
        </Card>
      )
    case 'invalid':
      return (
        <Card icon={<CircleAlert aria-hidden className="size-7" />} title="This link has expired">
          <p className="text-large mt-3 text-ink-muted">
            {view.reset
              ? 'Reset links work once and expire after a while. Open sign-in, choose Email, then Forgot password? to get a new one.'
              : 'It may have been used already. If booking still asks you to confirm your email, use Resend email there.'}
          </p>
          <Button type="button" variant="solid" className="mt-8" onClick={() => navigate(back)}>
            Back to Saathi First
          </Button>
        </Card>
      )
    case 'unsupported':
      return (
        <Card icon={<CircleAlert aria-hidden className="size-7" />} title="This link can’t be used here">
          <p className="text-large mt-3 text-ink-muted">
            Please contact us if you need help with your account.
          </p>
          <Button type="button" variant="solid" className="mt-8" onClick={() => navigate('/')}>
            Back to Saathi First
          </Button>
        </Card>
      )
  }
}
