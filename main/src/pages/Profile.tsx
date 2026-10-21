import { GoogleAuthProvider, linkWithPopup, linkWithRedirect, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth'
import { CalendarCheck, Check, LogOut, Mail, Pencil, Smartphone, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { sendVerification } from '../auth/verify'
import { VerifyPhone } from '../auth/VerifyPhone'
import { auth } from '../lib/firebase'

const providerNames: Record<string, string> = {
  'google.com': 'Google',
  phone: 'Mobile number',
  password: 'Email and password',
}

const field =
  'h-14 w-full rounded-2xl border border-burgundy/20 bg-white px-4 text-lg font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30'
const smallAction =
  'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-burgundy ring-1 ring-burgundy/20 transition-colors hover:bg-burgundy/10'

/** One labelled row: icon, label, value, and an optional action or editor below. */
function Row({ icon: Icon, label, value, action, children }: {
  icon: LucideIcon
  label: string
  value: ReactNode
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="grid gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-burgundy/10 text-burgundy">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 grow">
          <p className="text-sm font-semibold text-ink-muted">{label}</p>
          <p className="truncate text-lg font-medium">{value}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function NameRow() {
  const { displayName, refreshUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle')

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const user = auth?.currentUser
    if (!user || !name.trim()) return
    setState('saving')
    try {
      await updateProfile(user, { displayName: name.trim() })
      await refreshUser()
      setEditing(false)
      setState('idle')
    } catch {
      setState('failed')
    }
  }

  return (
    <Row
      icon={UserRound}
      label="Name"
      value={displayName || <span className="text-ink-muted">Not added yet</span>}
      action={
        !editing && (
          <button type="button" onClick={() => setEditing(true)} className={smallAction}>
            <Pencil aria-hidden className="size-4" />
            {displayName ? 'Edit' : 'Add'}
          </button>
        )
      }
    >
      {editing && (
        <form noValidate onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            aria-label="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            autoComplete="name"
            autoFocus
            className={field}
          />
          <button
            type="submit"
            disabled={state === 'saving' || !name.trim()}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-burgundy px-6 font-semibold text-blush hover:bg-wine disabled:opacity-55"
          >
            <Check aria-hidden className="size-5" />
            {state === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-14 rounded-2xl px-4 font-semibold text-ink-muted hover:bg-wine/10">
            Cancel
          </button>
          {state === 'failed' && (
            <p role="alert" className="text-sm font-medium text-[#8c1d18] sm:col-span-3">
              Could not save. Check your connection and try again.
            </p>
          )}
        </form>
      )}
    </Row>
  )
}

function PhoneRow() {
  const { phoneNumber } = useAuth()
  const [editing, setEditing] = useState(false)
  const [changed, setChanged] = useState(false)
  const shown = phoneNumber?.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2') ?? ''

  return (
    <Row
      icon={Smartphone}
      label="Mobile number"
      value={
        <>
          {shown || <span className="text-ink-muted">Not added yet</span>}
          {phoneNumber && <span className="ml-2 align-middle text-xs font-semibold text-emerald-700">Verified</span>}
        </>
      }
      action={
        !editing && (
          <button type="button" onClick={() => { setEditing(true); setChanged(false) }} className={smallAction}>
            <Pencil aria-hidden className="size-4" />
            {phoneNumber ? 'Change' : 'Add'}
          </button>
        )
      }
    >
      {editing && (
        <div className="rounded-2xl bg-blush/60 p-4">
          <p className="mb-4 text-sm text-ink-muted">
            We will text a code to the new number. Your bookings stay with your account. Future bookings will use the new number;
            for a visit already booked, please also tell us.
          </p>
          <VerifyPhone
            onDone={() => {
              setEditing(false)
              setChanged(true)
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
      {changed && (
        <p role="status" className="text-sm font-medium text-emerald-800">
          Your mobile number is updated. You can now sign in with it too.
        </p>
      )}
    </Row>
  )
}

const emailErrors: Record<string, string> = {
  'auth/credential-already-in-use':
    'That Google account already has its own Saathi First account. Sign out and sign in with Google instead, or use a different email.',
  'auth/email-already-in-use': 'That email already belongs to another Saathi First account. Please use a different email.',
  'auth/account-exists-with-different-credential':
    'That email already belongs to another Saathi First account. Please use a different email.',
  'auth/provider-already-linked': 'A Google account is already connected.',
  'auth/requires-recent-login': 'For your safety, please sign out, sign in again, and then add your email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network problem. Please check your connection.',
}

function describeEmailError(caught: unknown) {
  const code = (caught as { code?: string })?.code ?? ''
  console.warn('Email update failed:', code || caught)
  return emailErrors[code] ?? 'Something went wrong. Please try again.'
}

// Firebase refuses to send the email when this site's address is not in its authorised domains;
// the link then goes to Firebase's own confirmation page instead.
const continueUrlRejected = ['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri', 'auth/missing-continue-uri']
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-6">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/**
 * Add a verified email to the account: connect Google (Gmail is verified straight away and
 * Google sign-in then works too), or type any email and click the link we send to it.
 */
function EmailRow() {
  const { email, emailVerified, providers, refreshUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const hasGoogle = providers.split(',').includes('google.com')

  // After clicking the emailed link in another tab, coming back here shows the new email.
  useEffect(() => {
    if (!sentTo) return
    const check = () => {
      if (document.visibilityState === 'visible') void refreshUser().catch(() => undefined)
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [sentTo, refreshUser])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (caught) {
      const code = (caught as { code?: string })?.code ?? ''
      // Closing the Google window is a choice, not an error worth showing.
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code)) setError(describeEmailError(caught))
    } finally {
      setBusy(false)
    }
  }

  const connectGoogle = () =>
    run(async () => {
      const user = auth?.currentUser
      if (!user) return
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await linkWithPopup(user, provider)
      } catch (caught) {
        // Some phone browsers block pop-ups; a full-page redirect works there.
        if ((caught as { code?: string })?.code === 'auth/popup-blocked') return linkWithRedirect(user, provider)
        throw caught
      }
      await refreshUser()
      setEditing(false)
    })

  const sendLink = (event: FormEvent) => {
    event.preventDefault()
    const address = typed.trim()
    if (!looksLikeEmail(address)) return setError('Please enter a valid email address.')
    void run(async () => {
      const user = auth?.currentUser
      if (!user) return
      try {
        await verifyBeforeUpdateEmail(user, address, { url: window.location.href })
      } catch (caught) {
        if (!continueUrlRejected.includes((caught as { code?: string })?.code ?? '')) throw caught
        await verifyBeforeUpdateEmail(user, address)
      }
      setSentTo(address)
      setEditing(false)
    })
  }

  const resend = () =>
    run(async () => {
      if (auth?.currentUser) await sendVerification(auth.currentUser)
      setSentTo(email ?? '')
    })

  const badge = !email ? null : emailVerified ? (
    <span className="ml-2 align-middle text-xs font-semibold text-emerald-700">Verified</span>
  ) : (
    <span className="ml-2 align-middle text-xs font-semibold text-rosewood">Not verified</span>
  )

  const openEditor = () => {
    setEditing(true)
    setError('')
    setSentTo('')
  }

  return (
    <Row
      icon={Mail}
      label="Email"
      value={
        <>
          {email || <span className="text-ink-muted">Not added yet</span>}
          {badge}
        </>
      }
      action={
        !editing &&
        (email && !emailVerified ? (
          <button type="button" disabled={busy} onClick={() => void resend()} className={smallAction}>
            {busy ? 'Sending…' : 'Verify'}
          </button>
        ) : (
          <button type="button" onClick={openEditor} className={smallAction}>
            <Pencil aria-hidden className="size-4" />
            {email ? 'Change' : 'Add'}
          </button>
        ))
      }
    >
      {editing && (
        <div className="grid gap-4 rounded-2xl bg-blush/60 p-4">
          {!hasGoogle && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void connectGoogle()}
                className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-burgundy/20 bg-white text-lg font-semibold text-ink transition-colors hover:border-burgundy/40 disabled:opacity-55"
              >
                <GoogleMark />
                {busy ? 'Please wait…' : 'Add my Gmail with Google'}
              </button>
              <p className="-mt-2 text-sm text-ink-muted">Verified straight away, and you can then sign in with Google too.</p>
              <p className="flex items-center gap-4 text-sm font-semibold text-ink-muted before:h-px before:grow before:bg-burgundy/15 after:h-px after:grow after:bg-burgundy/15">
                or type an email
              </p>
            </>
          )}
          <form noValidate onSubmit={sendLink} className="grid gap-3">
            <input
              aria-label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@gmail.com"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              maxLength={254}
              className={field}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !typed.trim()}
                className="inline-flex h-12 grow items-center justify-center rounded-2xl bg-burgundy px-5 font-semibold text-blush hover:bg-wine disabled:opacity-55"
              >
                {busy ? 'Sending…' : 'Send verification link'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="h-12 rounded-2xl px-4 font-semibold text-ink-muted hover:bg-wine/10">
                Cancel
              </button>
            </div>
            <p className="text-sm text-ink-muted">We email a link to this address. It is saved to your account once you click the link.</p>
          </form>
        </div>
      )}
      {sentTo && !editing && (
        <p role="status" className="rounded-xl bg-gold/20 px-4 py-3 text-sm font-medium">
          We sent a link to <strong className="break-all">{sentTo}</strong>. Open it to confirm, then come back to this page. It can
          take a minute; check Spam too.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-[#b3261e]/10 px-4 py-3 text-sm font-medium text-[#8c1d18]">
          {error}
        </p>
      )}
    </Row>
  )
}

function ProfileDetails() {
  const { user, signOut } = useAuth()
  if (!user) return null
  const methods = user.providerData.map((provider) => providerNames[provider.providerId]).filter(Boolean)

  return (
    <div className="grid gap-6">
      <section aria-label="Your details" className="divide-y divide-burgundy/10 rounded-3xl bg-white/90 p-6 shadow-[0_20px_50px_-30px_rgb(58_17_25/0.5)] ring-1 ring-gold/25 nav:p-8">
        <NameRow />
        <PhoneRow />
        <EmailRow />
      </section>

      <section aria-label="Sign-in" className="rounded-3xl bg-white/70 p-6 ring-1 ring-gold/20 nav:p-8">
        <p className="text-sm font-semibold text-ink-muted">You can sign in with</p>
        <p className="mt-1 text-lg font-medium">{methods.join(' · ') || 'Your current sign-in'}</p>
        <p className="mt-3 text-sm text-ink-muted">
          All of these reach the same account and the same bookings.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/bookings"
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-burgundy px-5 font-semibold text-blush transition-colors hover:bg-wine"
        >
          <CalendarCheck aria-hidden className="size-5" />
          My bookings
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 font-semibold text-ink-muted transition-colors hover:bg-wine/10 hover:text-wine"
        >
          <LogOut aria-hidden className="size-5" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Profile() {
  return (
    <div className="page-padding">
      <div className="container-large pb-16 pt-28 nav:pb-24 nav:pt-36">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-3xl font-light tracking-tight nav:text-4xl">
            My <span className="accent text-rosewood">profile</span>
          </h1>
          <AuthGate action="see your profile">
            <ProfileDetails />
          </AuthGate>
        </div>
      </div>
    </div>
  )
}
