import { CalendarCheck, Copy, ShieldAlert, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../../main/src/auth/context'
import type { Booking, Stored } from '../../main/src/lib/db'
import { formatRupees, ledger } from '../../main/src/lib/finance'
import {
  watchAssignedVisits,
  watchCommissionPercent,
  watchSettlements,
  watchStaff,
  type Settlement,
  type Staff,
} from '../../main/src/lib/staff'
import { Payments } from './Payments'
import { Visits } from './Visits'

export function Notice({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' }) {
  return (
    <div
      role="status"
      className={`rounded-2xl p-5 text-center font-medium ${
        tone === 'warn' ? 'bg-gold/25 text-wine' : 'bg-white/90 ring-1 ring-gold/25'
      }`}
    >
      {children}
    </div>
  )
}

const friendlyError = (message: string) =>
  /permission|insufficient/i.test(message)
    ? 'Your access was changed. Please sign out and sign in again, or call the office.'
    : 'Could not load. Check your internet connection.'

/** Shown to a login the office has not linked to a Saathi yet, with the ID they need. */
function NoAccess({ uid, paused }: { uid: string; paused: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(uid).then(() => setCopied(true))
  }
  return (
    <div className="rounded-3xl bg-white/90 p-6 shadow-card ring-1 ring-gold/30">
      <ShieldAlert aria-hidden className="size-9 text-rosewood" />
      <h1 className="mt-4 text-2xl font-semibold">{paused ? 'Your access is paused' : 'Almost there'}</h1>
      <p className="mt-2 text-ink-muted">
        {paused
          ? 'The office has paused this login. Please call them to turn it back on.'
          : 'This login is not linked to a Saathi yet. Send the office this code so they can link it.'}
      </p>
      {!paused && (
        <button
          type="button"
          onClick={copy}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-blush px-4 py-3 text-left"
        >
          <code className="min-w-0 break-all text-sm font-semibold">{uid}</code>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-burgundy">
            <Copy aria-hidden className="size-4" />
            {copied ? 'Copied' : 'Copy'}
          </span>
        </button>
      )}
    </div>
  )
}

type Tab = 'visits' | 'payments'

/** The Saathi's two screens, once the login is linked: visits, and payments to the company. */
function Work({ staff }: { staff: Staff }) {
  const [tab, setTab] = useState<Tab>('visits')
  const [visits, setVisits] = useState<Stored<Booking>[] | null>(null)
  const [settlements, setSettlements] = useState<Stored<Settlement>[] | null>(null)
  const [percent, setPercent] = useState<number | null>(null)
  const [error, setError] = useState('')
  const saathiId = staff.applicationId

  useEffect(() => {
    const fail = (caught: Error) => setError(caught.message)
    const stops = [
      watchAssignedVisits(saathiId, setVisits, fail),
      watchSettlements(saathiId, setSettlements, fail),
      watchCommissionPercent(setPercent, fail),
    ]
    return () => stops.forEach((stop) => stop())
  }, [saathiId])

  // Re-check "overdue" every minute while the page stays open.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const account = useMemo(
    () =>
      ledger(
        visits ?? [],
        (settlements ?? []).reduce((sum, row) => sum + row.amountPaise, 0),
        now,
      ),
    [visits, settlements, now],
  )

  if (error) return <Notice tone="warn">{friendlyError(error)}</Notice>
  if (!visits || !settlements || percent === null) return <Notice>Loading your visits…</Notice>

  const tabs: { id: Tab; label: string; icon: typeof Wallet; badge?: string }[] = [
    { id: 'visits', label: 'Visits', icon: CalendarCheck, badge: String(visits.filter((v) => v.status === 'assigned' || v.status === 'started').length || '') },
    { id: 'payments', label: 'Payments', icon: Wallet, badge: account.duePaise > 0 ? formatRupees(account.duePaise) : '' },
  ]

  return (
    <>
      <p className="mb-4 text-sm text-ink-muted">
        Namaste, <strong className="font-semibold text-ink">{staff.name.split(/\s+/)[0]}</strong>
      </p>
      {tab === 'visits' ? (
        <Visits visits={visits} percent={percent} account={account} onPay={() => setTab('payments')} />
      ) : (
        <Payments account={account} settlements={settlements} visits={visits} />
      )}

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-burgundy/10 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-xl grid-cols-2">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id)
                window.scrollTo({ top: 0 })
              }}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
                tab === id ? 'text-burgundy' : 'text-ink-muted'
              }`}
            >
              <span className="relative">
                <Icon aria-hidden className="size-6" strokeWidth={tab === id ? 2.2 : 1.8} />
                {badge && (
                  <span className="absolute -right-3 -top-1.5 translate-x-1/2 whitespace-nowrap rounded-full bg-rosewood px-1.5 text-[0.625rem] leading-4 text-white">
                    {badge}
                  </span>
                )}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

export function Portal() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const [staff, setStaff] = useState<Staff | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return
    return watchStaff(uid, setStaff, (caught) => setError(caught.message))
  }, [uid])

  if (error) return <Notice tone="warn">{friendlyError(error)}</Notice>
  if (staff === undefined) return <Notice>Checking your access…</Notice>
  if (!staff || !staff.active) return <NoAccess uid={uid} paused={Boolean(staff && !staff.active)} />
  return <Work staff={staff} />
}
