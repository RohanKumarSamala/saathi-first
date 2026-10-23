import { KeyRound, Pause, Play, Plus, Trash2, TriangleAlert, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../main/src/auth/context'
import { friendlyWhen } from '../../main/src/lib/contact'
import type { Application, Stored } from '../../main/src/lib/db'
import { formatRupees, rupeesToPaise } from '../../main/src/lib/finance'
import { grantAccess, recordManualSettlement, recordPayout, removeAccess, setStaffActive, type Staff } from '../../main/src/lib/staff'
import { tooManyUnpaid, UNPAID_VISIT_LIMIT, unpaidVisits, type Accounts } from './accounts'

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

/**
 * Record money a Saathi paid outside Razorpay (e.g. cash handed in at the office), or a payout:
 * money the company paid the Saathi for membership visits.
 */
function RecordPayment({ saathiId, kind, suggestedPaise, onDone }: {
  saathiId: string
  kind: 'received' | 'payout'
  /** Filled in to start with (the full balance), and can be changed for a part payment. */
  suggestedPaise: number
  onDone: () => void
}) {
  const { user } = useAuth()
  const { busy, error, setError, run } = useAction()
  const [amount, setAmount] = useState(() => (suggestedPaise / 100).toFixed(2).replace(/\.00$/, ''))
  const [note, setNote] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amountPaise = rupeesToPaise(amount)
    if (!amountPaise || amountPaise < 100) return setError('Enter at least ₹1, e.g. 250 or 250.50.')
    if (note.trim().length < 3) return setError(kind === 'payout' ? 'Say how it was paid, e.g. "UPI to Saathi".' : 'Say how it was paid, e.g. "Cash at office".')
    const what = kind === 'payout' ? `paid to this Saathi` : 'received from this Saathi'
    if (!window.confirm(`Record ${formatRupees(amountPaise)} ${what}? This cannot be edited later.`)) return
    const input = { saathiId, amountPaise, note, adminUid: user?.uid ?? '' }
    if (await run(() => (kind === 'payout' ? recordPayout(input) : recordManualSettlement(input)))) onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-xl bg-blush/70 p-3">
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <input aria-label="Amount in rupees" inputMode="decimal" placeholder="₹ amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        <input aria-label="How it was paid" placeholder={kind === 'payout' ? 'e.g. UPI to Saathi' : 'e.g. Cash at office'} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`${smallButton} bg-burgundy text-blush hover:bg-wine`}>Save payment</button>
        <button type="button" onClick={onDone} className={`${smallButton} text-ink-muted hover:bg-wine/10`}>Close</button>
      </div>
      {error && <p role="alert" className="text-xs text-[#b3261e]">{error}</p>}
    </form>
  )
}

/** One part of the working on a Saathi card: a few named amounts and what they come to. */
function Working({ title, rows, result }: {
  title: string
  rows: { label: string; note: string; value: string; tone?: string }[]
  result: string
}) {
  return (
    <dl className="grid gap-2">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ink-muted">{title}</dt>
      {rows.map((row) => (
        <dd key={row.label} className="flex items-start justify-between gap-3">
          <span>
            <span className="block font-medium text-ink">{row.label}</span>
            <span className="text-ink-muted">{row.note}</span>
          </span>
          <span className={`shrink-0 font-semibold ${row.tone ?? 'text-ink'}`}>{row.value}</span>
        </dd>
      ))}
      <dd className="border-t border-dashed border-burgundy/15 pt-1 text-right font-semibold">{result}</dd>
    </dl>
  )
}

/** "So far, Priya owes us ₹50" or "So far, we owe Priya ₹334.80", from what each side earned. */
const owedLine = (netPaise: number, first: string, lead: string) =>
  netPaise > 0
    ? `${lead}, ${first} owes us ${formatRupees(netPaise)}`
    : netPaise < 0
      ? `${lead}, we owe ${first} ${formatRupees(-netPaise)}`
      : `${lead}, nothing owed either way`

/** Which way the money moved overall. */
const cashLine = (netPaise: number, first: string) =>
  netPaise > 0
    ? `Overall, we received ${formatRupees(netPaise)} from ${first}`
    : netPaise < 0
      ? `Overall, we paid ${first} ${formatRupees(-netPaise)}`
      : 'Overall, nothing has changed hands'

function SaathiCard({ saathi, logins, account }: {
  saathi: Stored<Application>
  logins: Stored<Staff>[]
  account: Accounts extends Map<string, infer A> ? A : never
}) {
  const [recording, setRecording] = useState<'received' | 'payout' | null>(null)
  const first = saathi.name.split(' ')[0]

  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{saathi.name}</h3>
          <p className="text-xs text-ink-muted">{saathi.area} · {saathi.mobile}</p>
          <p className="mt-1 text-xs font-semibold">
            {account.rating ? (
              <>
                <span className="text-gold">★</span> {account.rating.average.toFixed(1)} from {account.rating.count} customer
                rating{account.rating.count === 1 ? '' : 's'}
              </>
            ) : (
              <span className="font-normal text-ink-muted">No customer ratings yet</span>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            account.overdue
              ? 'bg-rosewood text-white'
              : account.duePaise
                ? 'bg-gold/30 text-wine'
                : account.creditPaise
                  ? 'bg-sky-100 text-sky-900'
                  : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {account.overdue ? 'Overdue' : account.duePaise ? 'Owes us' : account.creditPaise ? 'We owe them' : 'Settled'}
        </span>
      </div>

      {tooManyUnpaid(account) && (
        <p role="alert" className="-mt-1 flex items-start gap-2 rounded-xl bg-rosewood/10 px-3 py-2 text-sm font-semibold text-wine ring-1 ring-rosewood/30">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-rosewood" />
          {unpaidVisits(account)} visits unpaid (more than {UNPAID_VISIT_LIMIT}). Collect before giving {first} more visits.
        </p>
      )}

      {/* The money in three plain lines: what they took in, what they owe us, what we owe them. */}
      <dl className="divide-y divide-burgundy/10 rounded-xl bg-cream/70 ring-1 ring-burgundy/10">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5">
          <dt>
            <span className="block text-sm font-semibold">Received from customers</span>
            <span className="text-xs text-ink-muted">
              {account.paidVisits} paid visit{account.paidVisits === 1 ? '' : 's'}
              {account.membershipVisits > 0 &&
                ` · ${account.membershipVisits} membership visit${account.membershipVisits === 1 ? '' : 's'} (nothing collected)`}
            </span>
          </dt>
          <dd className="text-lg font-semibold">{formatRupees(account.collectedPaise)}</dd>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5">
          <dt>
            <span className="block text-sm font-semibold">{first} owes Saathi First</span>
            <span className={`text-xs ${account.overdue ? 'font-semibold text-rosewood' : 'text-ink-muted'}`}>
              {account.nextDue
                ? `${account.overdue ? 'Overdue since' : 'Due by'} ${friendlyWhen(account.nextDue)}`
                : 'Nothing to collect'}
            </span>
          </dt>
          <dd className={`text-lg font-semibold ${account.duePaise ? 'text-wine' : 'text-ink-muted'}`}>{formatRupees(account.duePaise)}</dd>
          {/* Always there, greyed out while nothing is owed, so both lines read the same way. Each
              opens the form below with the full amount filled in; change it for a part payment. */}
          <button
            type="button"
            disabled={account.duePaise < 100}
            onClick={() => setRecording('received')}
            className={`${smallButton} col-span-2 justify-center bg-burgundy text-blush hover:bg-wine`}
          >
            <Wallet aria-hidden className="size-4" /> Record payment from {first}
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5">
          <dt>
            <span className="block text-sm font-semibold">Saathi First owes {first}</span>
            <span className="text-xs text-ink-muted">
              {account.creditPaise
                ? account.membershipCreditPaise > 0
                  ? 'Their pay for membership visits'
                  : 'They paid more than they owed'
                : 'Nothing to pay'}
            </span>
          </dt>
          <dd className={`text-lg font-semibold ${account.creditPaise ? 'text-sky-900' : 'text-ink-muted'}`}>{formatRupees(account.creditPaise)}</dd>
          <button
            type="button"
            disabled={account.creditPaise < 100}
            onClick={() => setRecording('payout')}
            className={`${smallButton} col-span-2 justify-center bg-sky-900 text-white hover:bg-sky-950`}
          >
            <Wallet aria-hidden className="size-4" /> Record payout
          </button>
        </div>
      </dl>
      {recording && (
        <RecordPayment
          key={recording}
          saathiId={saathi.id}
          kind={recording}
          suggestedPaise={recording === 'payout' ? account.creditPaise : account.duePaise}
          onDone={() => setRecording(null)}
        />
      )}

      {/* How the two balances above are reached, for anyone who wants to check. */}
      <details className="group -mt-2 text-sm">
        <summary className="cursor-pointer list-none text-xs font-semibold text-rosewood hover:text-burgundy">
          <span className="group-open:hidden">Show how this is worked out</span>
          <span className="hidden group-open:inline">Hide the working</span>
        </summary>
        {/* Two parts, read like a statement: what each side earned from the visits, then the money
            that actually moved (in is +, out is −). The balance is what is left between them. */}
        <div className="mt-2 grid gap-3 rounded-xl bg-white px-3 py-2.5 text-xs ring-1 ring-burgundy/10">
          <Working
            title="Earned from visits"
            rows={[
              {
                label: `Our share of ${account.paidVisits} paid visit${account.paidVisits === 1 ? '' : 's'}`,
                note: `${first} collected this from customers for us`,
                value: formatRupees(account.sharePaise),
              },
              {
                label: `${first}'s pay for ${account.membershipVisits} membership visit${account.membershipVisits === 1 ? '' : 's'}`,
                note: 'Customers paid nothing, so we owe this',
                value: formatRupees(account.membershipCreditPaise),
              },
            ]}
            result={owedLine(account.sharePaise - account.membershipCreditPaise, first, 'So far')}
          />
          <Working
            title="Money that changed hands"
            rows={[
              { label: `Received from ${first}`, note: 'Cash, UPI or online', value: `+ ${formatRupees(account.receivedPaise)}`, tone: 'text-emerald-700' },
              { label: `Paid out to ${first}`, note: 'Money we sent them', value: `− ${formatRupees(account.paidOutPaise)}`, tone: 'text-rosewood' },
            ]}
            result={cashLine(account.receivedPaise - account.paidOutPaise, first)}
          />
          <p className="flex justify-between gap-3 rounded-lg bg-cream px-2 py-1.5 font-semibold">
            <span>Balance</span>
            <span>
              {account.duePaise
                ? `${first} owes us ${formatRupees(account.duePaise)}`
                : account.creditPaise
                  ? `We owe ${first} ${formatRupees(account.creditPaise)}`
                  : 'All settled'}
            </span>
          </p>
        </div>
      </details>

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
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4">
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
