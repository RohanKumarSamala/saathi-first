import { KeyRound, Pause, Play, Plus, Trash2, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../main/src/auth/context'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Application, Stored } from '../../main/src/lib/db'
import { formatRupees, rupeesToPaise } from '../../main/src/lib/finance'
import { grantAccess, recordManualSettlement, removeAccess, setStaffActive, type Staff } from '../../main/src/lib/staff'
import type { Accounts } from './accounts'

const field =
  'h-10 w-full min-w-0 rounded-xl border border-burgundy/20 bg-white px-3 text-sm font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40'
const smallButton =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50'

function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<unknown>, failure = 'That did not save. Check your connection and admin access.') => {
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch {
      setError(failure)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

/** Which logins can use the Saathi website as this Saathi. */
function Logins({ saathi, logins }: { saathi: Stored<Application>; logins: Stored<Staff>[] }) {
  const { busy, error, setError, run } = useAction()
  const [code, setCode] = useState('')
  const hasOwn = logins.some((login) => login.id === saathi.uid)

  const add = async (event: FormEvent) => {
    event.preventDefault()
    const uid = code.trim()
    if (!/^[A-Za-z0-9]{20,128}$/.test(uid)) return setError('Paste the code exactly as it shows on their Saathi screen.')
    if (await run(() => grantAccess(uid, saathi))) setCode('')
  }

  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        <KeyRound aria-hidden className="size-3.5" /> Saathi website logins
      </p>
      {logins.length === 0 && <p className="text-sm text-ink-muted">None yet: they cannot see visits.</p>}
      {logins.map((login) => (
        <div key={login.id} className="flex items-center gap-2 rounded-xl bg-blush/60 px-3 py-2 text-sm">
          <span className="min-w-0 grow truncate">
            {login.id === saathi.uid ? 'The login they applied with' : `Login ${login.id.slice(0, 8)}…`}
            {!login.active && <strong className="ml-1.5 text-rosewood">paused</strong>}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => setStaffActive(login.id, !login.active))}
            title={login.active ? 'Pause access' : 'Resume access'}
            aria-label={login.active ? 'Pause access' : 'Resume access'}
            className="grid size-8 place-items-center rounded-full text-burgundy hover:bg-burgundy/10"
          >
            {login.active ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => window.confirm('Remove this login? They will no longer see their visits.') && void run(() => removeAccess(login.id))}
            title="Remove access"
            aria-label="Remove access"
            className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-wine/10 hover:text-wine"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      ))}
      {!hasOwn && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => grantAccess(saathi.uid, saathi))}
          className={`${smallButton} justify-self-start bg-burgundy text-blush hover:bg-wine`}
        >
          <Plus aria-hidden className="size-4" /> Give access to the login they applied with
        </button>
      )}
      <form onSubmit={add} className="flex gap-2">
        <input
          aria-label="Code from their Saathi screen"
          placeholder="Or paste the code from their screen"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={field}
        />
        <button type="submit" disabled={busy || !code.trim()} className={`${smallButton} text-burgundy ring-1 ring-burgundy/20 hover:bg-burgundy/10`}>
          Link
        </button>
      </form>
      {error && <p role="alert" className="text-xs text-[#b3261e]">{error}</p>}
    </div>
  )
}

/** Record money a Saathi paid outside Razorpay, e.g. cash handed in at the office. */
function RecordPayment({ saathiId, onDone }: { saathiId: string; onDone: () => void }) {
  const { user } = useAuth()
  const { busy, error, setError, run } = useAction()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amountPaise = rupeesToPaise(amount)
    if (!amountPaise || amountPaise < 100) return setError('Enter at least ₹1, e.g. 250 or 250.50.')
    if (note.trim().length < 3) return setError('Say how it was paid, e.g. "Cash at office".')
    if (!window.confirm(`Record ${formatRupees(amountPaise)} received from this Saathi? This cannot be edited later.`)) return
    if (await run(() => recordManualSettlement({ saathiId, amountPaise, note, adminUid: user?.uid ?? '' }))) onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-xl bg-blush/70 p-3">
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <input aria-label="Amount in rupees" inputMode="decimal" placeholder="₹ amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        <input aria-label="How it was paid" placeholder="e.g. Cash at office" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${smallButton} bg-burgundy text-blush hover:bg-wine`}>Save payment</button>
        <button type="button" onClick={onDone} className={`${smallButton} text-ink-muted hover:bg-wine/10`}>Close</button>
      </div>
      {error && <p role="alert" className="text-xs text-[#b3261e]">{error}</p>}
    </form>
  )
}

function SaathiCard({ saathi, logins, account }: {
  saathi: Stored<Application>
  logins: Stored<Staff>[]
  account: Accounts extends Map<string, infer A> ? A : never
}) {
  const [recording, setRecording] = useState(false)
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{saathi.name}</h3>
          <p className="text-xs text-ink-muted">{saathi.area} · {saathi.mobile}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            account.overdue ? 'bg-rosewood text-white' : account.duePaise ? 'bg-gold/30 text-wine' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {account.overdue ? 'Overdue' : account.duePaise ? 'Due' : 'Settled'}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['To pay', account.duePaise],
          ['Company share', account.owedPaise],
          ['Paid', account.paidPaise],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-cream px-2 py-2">
            <dt className="text-[0.6875rem] font-semibold text-ink-muted">{label}</dt>
            <dd className="font-semibold">{formatRupees(value as number)}</dd>
          </div>
        ))}
      </dl>
      {account.nextDue && (
        <p className={`-mt-2 text-xs ${account.overdue ? 'font-semibold text-rosewood' : 'text-ink-muted'}`}>
          {account.overdue ? 'Overdue since' : 'Next due'} {friendlyWhen(account.nextDue)}
        </p>
      )}

      {recording ? (
        <RecordPayment saathiId={saathi.id} onDone={() => setRecording(false)} />
      ) : (
        <button type="button" onClick={() => setRecording(true)} className={`${smallButton} justify-self-start text-burgundy ring-1 ring-burgundy/20 hover:bg-burgundy/10`}>
          <Wallet aria-hidden className="size-4" /> Record a payment received
        </button>
      )}

      <div className="border-t border-burgundy/10 pt-3">
        <Logins saathi={saathi} logins={logins} />
      </div>
    </li>
  )
}

/** Verified Saathis: who can use the Saathi website, and what each owes the company. */
export function Team({ saathis, staff, accounts }: {
  saathis: Stored<Application>[]
  staff: Stored<Staff>[]
  accounts: Accounts
}) {
  if (saathis.length === 0) {
    return (
      <p role="status" className="rounded-2xl bg-white/90 p-6 text-center font-medium ring-1 ring-gold/25">
        No verified Saathis yet. Verify an application first.
      </p>
    )
  }
  const sorted = [...saathis].sort((a, b) => (accounts.get(b.id)?.duePaise ?? 0) - (accounts.get(a.id)?.duePaise ?? 0))
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((saathi) => (
        <SaathiCard
          key={saathi.id}
          saathi={saathi}
          logins={staff.filter((login) => login.applicationId === saathi.id)}
          account={accounts.get(saathi.id)!}
        />
      ))}
    </ul>
  )
}
