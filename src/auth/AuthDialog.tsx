import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import logo from '../assets/logo/logo-horizontal-light.svg'
import { Img } from '../components/Img'
import { isValidIndianMobile } from '../lib/enquiry'
import { auth, firebaseReady } from '../lib/firebase'
import { OtpInput } from './OtpInput'

type Method = 'phone' | 'email'

const messages: Record<string, string> = {
  'auth/invalid-phone-number': 'That mobile number does not look right.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/invalid-verification-code': 'That code is incorrect. Please check and try again.',
  'auth/code-expired': 'That code has expired. Please request a new one.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists with that email. Try signing in.',
  'auth/weak-password': 'Please choose a password with at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet.',
  'auth/network-request-failed': 'Network problem. Please check your connection.',
}

function describe(error: unknown) {
  const code = (error as { code?: string })?.code ?? ''
  return messages[code] ?? 'Something went wrong. Please try again.'
}

const inputClass =
  'h-16 w-full rounded-2xl border border-burgundy/20 bg-white px-5 text-lg font-medium text-ink shadow-[inset_0_2px_6px_rgb(107_30_46/0.05)] transition-[border-color,box-shadow] duration-200 placeholder:font-normal placeholder:text-ink/40 focus-visible:border-burgundy focus-visible:shadow-[0_0_0_4px_rgb(201_162_107/0.35)] focus-visible:outline-none'

const labelClass = 'mb-2 block text-sm font-semibold text-ink-muted'
const textLink = 'font-semibold text-burgundy underline decoration-gold decoration-2 underline-offset-4 transition-colors hover:text-rosewood disabled:opacity-50'

function Submit({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="group flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#6b1e2e,#8f2f42_60%,#b9545c)] text-lg font-semibold text-blush shadow-[0_18px_36px_-16px_rgb(107_30_46/0.9)] transition-[transform,box-shadow,filter] duration-300 ease-out-soft hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-16px_rgb(107_30_46/0.95)] hover:brightness-110 disabled:pointer-events-none disabled:opacity-55"
    >
      {busy ? 'Please wait…' : children}
      {!busy && (
        <ArrowRight aria-hidden className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
      )}
    </button>
  )
}

function Feedback({ error, notice }: { error: string; notice?: string }) {
  if (!error && !notice) return null
  return (
    <p
      role="status"
      className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
        error ? 'bg-[#b3261e]/10 text-[#8c1d18]' : 'bg-gold/20 text-wine'
      }`}
    >
      {error || notice}
    </p>
  )
}

function PhoneForm() {
  const recaptchaHost = useRef<HTMLDivElement>(null)
  const verifier = useRef<RecaptchaVerifier | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const digits = phone.replace(/\D/g, '').slice(-10)

  useEffect(() => () => verifier.current?.clear(), [])

  const sendCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth || !recaptchaHost.current) return
    if (!isValidIndianMobile(phone)) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    setBusy(true)
    setError('')
    try {
      verifier.current ??= new RecaptchaVerifier(auth, recaptchaHost.current, { size: 'invisible' })
      setConfirmation(await signInWithPhoneNumber(auth, `+91${digits}`, verifier.current))
    } catch (caught) {
      setError(describe(caught))
      verifier.current?.clear()
      verifier.current = null
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!confirmation) return
    setBusy(true)
    setError('')
    try {
      await confirmation.confirm(code.replace(/\D/g, ''))
    } catch (caught) {
      setError(describe(caught))
      setBusy(false)
    }
  }

  return (
    <>
      {confirmation ? (
        <form noValidate onSubmit={verify} className="grid gap-5">
          <p className="text-ink-muted">
            Enter the 6-digit code we sent to{' '}
            <strong className="font-semibold text-ink">+91 {digits}</strong>
          </p>
          <OtpInput value={code} onChange={setCode} />
          <Submit busy={busy} disabled={code.replace(/\D/g, '').length < 6}>
            Verify and continue
          </Submit>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null)
              setCode('')
              setError('')
            }}
            className={`${textLink} justify-self-start text-sm`}
          >
            Use a different number
          </button>
        </form>
      ) : (
        <form noValidate onSubmit={sendCode} className="grid gap-5">
          <div>
            <label htmlFor="auth-phone" className={labelClass}>
              Mobile number
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-2 left-2 grid place-items-center rounded-xl bg-burgundy/10 px-3.5 font-semibold text-burgundy">
                +91
              </span>
              <input
                id="auth-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                autoFocus
                placeholder="98765 43210"
                className={`${inputClass} pl-20 tracking-wide`}
              />
            </div>
          </div>
          <Submit busy={busy}>Send verification code</Submit>
        </form>
      )}
      <div ref={recaptchaHost} />
      <Feedback error={error} />
    </>
  )
}

function EmailForm() {
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const run = creating ? createUserWithEmailAndPassword : signInWithEmailAndPassword
      await run(auth, email.trim(), password)
    } catch (caught) {
      setError(describe(caught))
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!auth) return
    setError('')
    setNotice('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNotice('If an account exists for that email, a reset link is on its way.')
    } catch (caught) {
      setError(describe(caught))
    }
  }

  return (
    <>
      <form noValidate onSubmit={submit} className="grid gap-5">
        <div>
          <label htmlFor="auth-email" className={labelClass}>
            Email address
          </label>
          <input
            id="auth-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="auth-password" className={labelClass}>
              Password
            </label>
            {!creating && (
              <button type="button" onClick={reset} disabled={!email} className={`${textLink} text-sm`}>
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="auth-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete={creating ? 'new-password' : 'current-password'}
              placeholder={creating ? 'At least 6 characters' : 'Your password'}
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-burgundy/10 hover:text-burgundy"
            >
              {showPassword ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            </button>
          </div>
        </div>
        <Submit busy={busy} disabled={!email || !password}>
          {creating ? 'Create my account' : 'Sign in'}
        </Submit>
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">
        {creating ? 'Already have an account?' : 'New to Saathi First?'}{' '}
        <button type="button" onClick={() => setCreating((value) => !value)} className={textLink}>
          {creating ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <Feedback error={error} notice={notice} />
    </>
  )
}

const tabs: { id: Method; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'phone', label: 'Phone', hint: 'One-time code', icon: Smartphone },
  { id: 'email', label: 'Email', hint: 'With a password', icon: Mail },
]

const promises: { icon: LucideIcon; text: string }[] = [
  { icon: BadgeCheck, text: 'Verified, trained Saathis' },
  { icon: BellRing, text: 'Family updates at every step' },
  { icon: ShieldCheck, text: 'Your details stay private' },
]

/**
 * Sign-in pop-up. A plain positioned layer (not a native <dialog>) so the
 * reCAPTCHA challenge Firebase may show for phone sign-in can sit above it.
 */
export function AuthDialog({ onClose }: { onClose: () => void }) {
  const [method, setMethod] = useState<Method>('phone')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[radial-gradient(circle_at_30%_20%,rgb(107_30_46/0.82),rgb(34_9_14/0.9))] p-4 backdrop-blur-lg"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative grid w-full max-w-[66rem] animate-rise overflow-hidden rounded-[2.5rem] bg-cream shadow-[0_60px_120px_-30px_rgb(0_0_0/0.75)] ring-1 ring-gold/40 md:grid-cols-[11fr_13fr]"
      >
        {/* Brand panel: the deck's arch-framed portrait over burgundy. */}
        <div className="relative isolate hidden overflow-hidden bg-burgundy p-10 text-blush md:flex md:flex-col lg:p-12">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,rgb(185_84_92/0.75),transparent_55%),radial-gradient(circle_at_0%_100%,rgb(58_17_25/0.9),transparent_60%)]"
          />
          <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-72 rounded-full border border-gold/25" />
          <div aria-hidden className="absolute -right-10 -top-10 -z-10 size-72 rounded-full border border-dashed border-gold/20" />

          <img src={logo} alt="Saathi First" width={373} height={112} className="h-12 w-auto self-start" />

          <div className="relative mx-auto my-8 w-[78%] max-w-[17rem]">
            <div aria-hidden className="absolute -inset-3 rounded-t-full border border-gold/70" />
            <Img
              name="couple"
              alt="A smiling elderly couple in their garden"
              sizes="17rem"
              eager
              position="50% 15%"
              className="aspect-[4/5] w-full rounded-t-full shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]"
            />
          </div>

          <p className="text-subheading mt-auto">
            Care that feels <span className="accent text-gold">like family.</span>
          </p>
          <ul className="mt-5 grid gap-3">
            {promises.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-medium text-blush/90">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush/10 text-gold">
                  <Icon aria-hidden className="size-[1.125rem]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative px-6 pb-8 pt-14 sm:px-12 sm:pb-12 sm:pt-16">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#6b1e2e,#b9545c,#c9a26b)] md:hidden" />
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-burgundy/[0.07] text-burgundy transition-[background-color,transform] duration-300 hover:rotate-90 hover:bg-burgundy hover:text-blush"
          >
            <X aria-hidden className="size-5" />
          </button>

          <p className="text-eyebrow inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 font-semibold text-wine">
            <span aria-hidden className="size-1.5 rounded-full bg-rosewood" />
            Welcome to Saathi First
          </p>
          <h2 id="auth-title" className="mt-5 text-4xl font-light leading-tight tracking-tight sm:text-5xl">
            Sign in to <span className="accent text-rosewood">continue</span>
          </h2>
          <p className="text-large mt-3 text-ink-muted">
            It takes less than a minute, and lets us reach you about your request.
          </p>

          {firebaseReady ? (
            <>
              <div role="tablist" aria-label="Sign-in method" className="my-8 grid grid-cols-2 gap-3">
                {tabs.map(({ id, label, hint, icon: Icon }) => {
                  const selected = method === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setMethod(id)}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out-soft sm:p-4 ${
                        selected
                          ? 'border-burgundy bg-white shadow-[0_16px_32px_-18px_rgb(107_30_46/0.7)]'
                          : 'border-transparent bg-burgundy/[0.06] hover:-translate-y-0.5 hover:bg-burgundy/10'
                      }`}
                    >
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                          selected ? 'bg-burgundy text-blush' : 'bg-white text-burgundy'
                        }`}
                      >
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{label}</span>
                        <span className="hidden truncate text-sm text-ink-muted sm:block">{hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {method === 'phone' ? <PhoneForm /> : <EmailForm />}
            </>
          ) : (
            <p className="mt-8 rounded-3xl border border-gold/50 bg-gold/15 p-6 font-medium">
              Sign-in is not connected yet. Add the Firebase keys to <code>.env.local</code> (see{' '}
              <code>.env.example</code>) and restart the site.
            </p>
          )}

          <p className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <LockKeyhole aria-hidden className="size-4 shrink-0 text-rosewood" />
            We only use your details to contact you about your request.
          </p>
        </div>
      </div>
    </div>
  )
}
