import { linkWithCredential, PhoneAuthProvider, RecaptchaVerifier, updatePhoneNumber } from 'firebase/auth'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { isValidIndianMobile } from '../lib/enquiry'
import { auth } from '../lib/firebase'
import { useAuth } from './context'
import { OtpInput } from './OtpInput'

const messages: Record<string, string> = {
  'auth/invalid-app-credential':
    'The security check could not be completed. If you use an ad blocker or Brave Shields, turn it off for this site, then reload and try again. Or use Google instead.',
  'auth/missing-app-credential': 'The security check could not be completed. Please reload the page and try again.',
  // Firebase's code when it refuses to text a number it considers risky (SMS fraud protection).
  'auth/error-code:-39': 'We could not send a code to this number right now. Please try again later, or use Google.',
  'auth/invalid-phone-number': 'That mobile number does not look right.',
  'auth/invalid-verification-code': 'That code is incorrect. Please check and try again.',
  'auth/code-expired': 'That code has expired. Please request a new one.',
  'auth/too-many-requests': 'Too many attempts from this number or device. Please wait about an hour and try again, or use Google.',
  'auth/quota-exceeded': 'Too many codes have been sent today. Please try again tomorrow.',
  'auth/captcha-check-failed': 'The security check failed. Please reload the page and try again.',
  'auth/credential-already-in-use':
    'This number already has its own Saathi First account. Sign out and sign in with the number instead, or use a different number.',
  'auth/account-exists-with-different-credential':
    'This number already has its own Saathi First account. Sign out and sign in with the number instead, or use a different number.',
  'auth/requires-recent-login': 'For your safety, please sign out, sign in again, and then change your number.',
  'auth/network-request-failed': 'Network problem. Please check your connection.',
  'auth/operation-not-allowed': 'Text-message codes are not available right now. Please try again later or call us.',
}

function describe(error: unknown) {
  const code = (error as { code?: string })?.code ?? ''
  console.warn('Phone verification failed:', code || error, (error as Error)?.message ?? '')
  // The code stays visible so an unexpected problem can be reported and fixed, not guessed at.
  return messages[code] ?? `Something went wrong. Please try again. (${code || 'unknown error'})`
}

const field =
  'h-14 w-full rounded-2xl border border-burgundy/20 bg-white px-4 text-lg font-medium text-ink placeholder:font-normal placeholder:text-ink/40 focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30'
const button =
  'flex h-14 w-full items-center justify-center rounded-2xl bg-burgundy text-lg font-semibold text-blush transition-colors hover:bg-wine disabled:pointer-events-none disabled:opacity-55'

/**
 * Adds a verified mobile number to the signed-in account, or replaces it. A one-time code
 * is sent by SMS; the number joins the same account, so the person can then sign in with
 * Google, email or that number and reach the same bookings.
 */
export function VerifyPhone({ onDone, onCancel }: { onDone?: () => void; onCancel?: () => void }) {
  const { refreshUser } = useAuth()
  const recaptchaHost = useRef<HTMLDivElement>(null)
  const verifier = useRef<RecaptchaVerifier | null>(null)
  const [phone, setPhone] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const digits = phone.replace(/\D/g, '').slice(-10)

  useEffect(() => () => verifier.current?.clear(), [])

  const sendCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth || !recaptchaHost.current) return
    if (!isValidIndianMobile(phone)) return setError('Please enter a valid 10-digit mobile number.')
    if (auth.currentUser?.phoneNumber === `+91${digits}`) return setError('That is already your number.')
    setBusy(true)
    setError('')
    try {
      // A fresh element each time: reCAPTCHA cannot be drawn twice into the same one after a failed try.
      if (!verifier.current) {
        const holder = document.createElement('div')
        recaptchaHost.current.replaceChildren(holder)
        verifier.current = new RecaptchaVerifier(auth, holder, { size: 'invisible' })
      }
      setVerificationId(await new PhoneAuthProvider(auth).verifyPhoneNumber(`+91${digits}`, verifier.current))
    } catch (caught) {
      setError(describe(caught))
      verifier.current?.clear()
      verifier.current = null
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (event: FormEvent) => {
    event.preventDefault()
    const user = auth?.currentUser
    if (!user) return
    setBusy(true)
    setError('')
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code.replace(/\D/g, ''))
      if (user.phoneNumber) await updatePhoneNumber(user, credential)
      else await linkWithCredential(user, credential)
      // A fresh sign-in token carries the number, which bookings are checked against.
      await refreshUser()
      onDone?.()
    } catch (caught) {
      setError(describe(caught))
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      {verificationId ? (
        <form noValidate onSubmit={confirm} className="grid gap-4">
          <p className="text-ink-muted">
            Enter the 6-digit code we sent to <strong className="font-semibold text-ink">+91 {digits}</strong>
          </p>
          <OtpInput value={code} onChange={setCode} />
          <button type="submit" disabled={busy || code.replace(/\D/g, '').length < 6} className={button}>
            {busy ? 'Please wait…' : 'Verify number'}
          </button>
          <button
            type="button"
            onClick={() => {
              setVerificationId('')
              setCode('')
              setError('')
            }}
            className="justify-self-start text-sm font-semibold text-burgundy underline underline-offset-4"
          >
            Use a different number
          </button>
        </form>
      ) : (
        <form noValidate onSubmit={sendCode} className="grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink-muted">Mobile number</span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-2 left-2 grid place-items-center rounded-xl bg-burgundy/10 px-3 font-semibold text-burgundy">
                +91
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                maxLength={16}
                placeholder="98765 43210"
                className={`${field} pl-[4.5rem] tracking-wide`}
              />
            </span>
          </label>
          <button type="submit" disabled={busy} className={button}>
            {busy ? 'Sending…' : 'Send verification code'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="justify-self-start text-sm font-semibold text-ink-muted underline underline-offset-4">
              Cancel
            </button>
          )}
        </form>
      )}
      <div ref={recaptchaHost} />
      {error && (
        <p role="alert" className="rounded-2xl bg-[#b3261e]/10 px-4 py-3 text-sm font-medium text-[#8c1d18]">
          {error}
        </p>
      )}
    </div>
  )
}
