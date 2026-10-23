import {
  Briefcase,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  IdCard,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Search,
  ShieldCheck,
  Star,
  TriangleAlert,
  UserRound,
  UserRoundCheck,
  Wallet,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { EmailAuthProvider, linkWithCredential } from 'firebase/auth'
import logo from '../../main/src/assets/logo/logo-horizontal-light.svg'
import { AuthGate } from '../../main/src/auth/AuthGate'
import { useAuth } from '../../main/src/auth/context'
import { services } from '../../main/src/content/site'
import {
  applicationStatuses,
  publishSaathi,
  readFullAadhaar,
  setApplicationStatus,
  watchCollection,
  type Application,
  type Booking,
  type Saathi,
  type Stored,
} from '../../main/src/lib/db'
import { auth } from '../../main/src/lib/firebase'
import { idTypes } from '../../main/src/lib/identity'
import { callLink, friendlyWhen, whatsappLink } from '../../main/src/lib/contact'
import { hoursLabel } from '../../main/src/lib/pricing'
import { DEFAULT_COMMISSION_PERCENT, formatRupees } from '../../main/src/lib/finance'
import {
  removeAllAccess,
  watchAllSettlements,
  watchAllStaff,
  watchCommissionPercent,
  type Settlement,
  type Staff,
} from '../../main/src/lib/staff'
import { currentPlanOf, watchAllMemberships, type Membership } from '../../main/src/lib/membership'
import { accountsBySaathi, tooManyUnpaid, unpaidVisits, type Accounts } from './accounts'
import { Memberships } from './Memberships'
import { BookingAssignment } from './BookingAssignment'
import { Money } from './Money'
import { Team } from './Team'
import { Collapsible } from './Collapsible'

type Tab = 'bookings' | 'applications' | 'memberships' | 'team' | 'money'
type Feed<T> = { rows: Stored<T>[] | null; error: string }

const formatDate = (row: Stored<unknown>) =>
  row.createdAt
    ? row.createdAt.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : 'Just now'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

/** Like useFeed, for the Saathi website's collections (logins and payments). */
function useLive<T>(watch: (onData: (rows: Stored<T>[]) => void, onError: (error: Error) => void) => () => void): Feed<T> {
  const [rows, setRows] = useState<Stored<T>[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => watch(setRows, (caught) => setError(caught.message)), [watch])
  return { rows, error }
}

/** Subscribes to a collection while the admin page is open. */
function useFeed<T>(name: 'bookings' | 'applications' | 'saathis'): Feed<T> {
  const [rows, setRows] = useState<Stored<T>[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => watchCollection<T>(name, setRows, (caught) => setError(caught.message)), [name])
  return { rows, error }
}

/** One number at a glance; clicking it opens the list behind it. Highlighted only when not zero. */
function Stat({ icon: Icon, label, value, highlight, onClick }: {
  icon: LucideIcon
  label: string
  value: number | null
  highlight?: boolean
  onClick: () => void
}) {
  const strong = Boolean(highlight && value)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgb(58_17_25/0.6)] ${
        strong ? 'bg-burgundy text-blush' : 'bg-white/90 ring-1 ring-gold/25'
      }`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${strong ? 'bg-blush/15 text-gold' : 'bg-burgundy/10 text-burgundy'}`}>
        <Icon aria-hidden className="size-5" strokeWidth={1.8} />
      </span>
      <span className="grid">
        <span className="text-2xl font-semibold leading-none">{value ?? '–'}</span>
        <span className={`mt-1 text-sm ${strong ? 'text-blush/80' : 'text-ink-muted'}`}>{label}</span>
      </span>
    </button>
  )
}

const statusTone: Record<string, string> = {
  new: 'bg-gold/30 text-wine',
  pending: 'bg-gold/30 text-wine',
  assigned: 'bg-rosewood/15 text-burgundy',
  started: 'bg-burgundy text-blush',
  completed: 'bg-emerald-100 text-emerald-800',
  verified: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-wine/10 text-ink-muted',
  rejected: 'bg-wine/10 text-ink-muted',
}

const pillClass = 'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize'

function StatusSelect({ value, options, onChange }: {
  value: string
  options: readonly string[]
  onChange: (status: string) => void
}) {
  return (
    <select
      aria-label="Status"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${pillClass} cursor-pointer ${statusTone[value] ?? ''}`}
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-white text-ink">
          {option}
        </option>
      ))}
    </select>
  )
}

/**
 * One detail on one line behind an icon, with no visible heading. The label is still
 * read out to screen readers so the card stays understandable without sight.
 */
function Line({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-rosewood" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 [overflow-wrap:anywhere] group-data-[collapsed=true]/clamp:truncate">{children}</span>
    </p>
  )
}

function Card({ name, date, status, children }: {
  name: string
  date: string
  status: ReactNode
  children: ReactNode
}) {
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-2xl bg-white/90 p-4 shadow-[0_10px_30px_-20px_rgb(58_17_25/0.45)] ring-1 ring-gold/25">
      {/* The status tags drop below the name when the card is narrow, rather than squeezing it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-burgundy text-sm font-semibold text-blush">
          {initials(name) || '?'}
        </span>
        <div className="min-w-[8rem] grow basis-0">
          <h3 className="truncate font-semibold leading-tight">{name}</h3>
          <p className="text-xs text-ink-muted">{date}</p>
        </div>
        <div className="ml-auto">{status}</div>
      </div>
      {children}
    </li>
  )
}

/** Round icon-only link or button for quick actions; the name shows on hover and to screen readers. */
const iconAction =
  'grid size-9 shrink-0 place-items-center rounded-full bg-burgundy/10 text-burgundy transition-colors hover:bg-burgundy hover:text-blush'

const bookingStatusLabel: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  started: 'Started',
  completed: 'Done',
  cancelled: 'Cancelled',
}

function BookingCard({ row, saathis, linked, accounts }: {
  row: Stored<Booking>
  saathis: Stored<Application>[]
  linked: Set<string>
  accounts: Accounts
}) {
  const asked = row.saathiName
    ? row.saathiChoice === 'random'
      ? `Suggested at random: ${row.saathiName}`
      : `Customer asked for ${row.saathiName}`
    : ''
  const visitTime = row.scheduledAt ?? row.preferredStart
  const paid = row.collection
  return (
    <Card
      name={row.name}
      date={`Booked ${formatDate(row)}`}
      status={
        <span
          title={row.status === 'cancelled' && row.cancelledBy === 'customer' ? 'Cancelled by the customer' : undefined}
          className={`${pillClass} ${statusTone[row.status] ?? ''}`}
        >
          {bookingStatusLabel[row.status] ?? row.status}
        </span>
      }
    >
      <BookingAssignment
        key={`${row.id}-${row.assignedAt?.toMillis() ?? 0}`}
        row={row}
        saathis={saathis}
        linked={linked}
        accounts={accounts}
        more={
          // On every card, so all cards look alike; an empty detail says so instead of vanishing.
          <>
            <Line icon={Wallet} label="Payment">
              {!paid ? (
                <span className="text-ink-muted">{row.status === 'cancelled' ? 'Cancelled, nothing paid' : 'Not paid yet'}</span>
              ) : paid.method === 'membership' ? (
                <>Nothing collected · we owe the Saathi {formatRupees(paid.saathiSharePaise)}</>
              ) : (
                <>
                  <strong className="font-semibold">{formatRupees(paid.totalPaise)}</strong> by {paid.method === 'cash' ? 'cash' : 'UPI'} · our
                  share {formatRupees(paid.companySharePaise)}
                  {paid.extraPaise > 0 && ` · incl. ${formatRupees(paid.extraPaise)} extra (${paid.extraNote})`}
                </>
              )}
            </Line>
            <Line icon={Star} label="Customer's rating of the Saathi">
              {row.saathiRating ? (
                <>
                  <strong className="text-gold">{'★'.repeat(row.saathiRating)}{'☆'.repeat(5 - row.saathiRating)}</strong>{' '}
                  {row.saathiRating}/5{row.saathiRatingNote && `: “${row.saathiRatingNote}”`}
                </>
              ) : (
                <span className="text-ink-muted">Not rated yet</span>
              )}
            </Line>
            <Line icon={MessageSquareText} label="Message">
              {row.message || <span className="text-ink-muted">No message</span>}
            </Line>
          </>
        }
      >
        {/* The four details every booking has, always in this order; they wrap rather than cut off. */}
        <Line icon={ClipboardList} label="Service">
          {[
            row.serviceName,
            row.hours ? hoursLabel(row.hours) : '',
            row.paidBy === 'membership' ? 'Free (membership)' : row.planName && row.planPrice.split(' / ')[0],
          ]
            .filter(Boolean)
            .join(' · ')}
        </Line>
        <Line icon={CalendarClock} label={row.scheduledAt ? 'Visit' : 'Requested for'}>
          {visitTime && (
            <>
              {friendlyWhen(visitTime.toDate())}
              {!row.scheduledAt && <span className="text-ink-muted"> (requested)</span>}
            </>
          )}
        </Line>
        <Line icon={MapPin} label="Address">
          {row.address || (row.location ? 'Location shared' : '')}
        </Line>
        <Line icon={row.assignedSaathiName ? UserRoundCheck : UserRound} label="Saathi">
          {row.assignedSaathiName ? (
            <>
              <strong className="font-semibold">{row.assignedSaathiName}</strong> · {row.assignedSaathiPhone}
            </>
          ) : row.status === 'new' ? (
            <span className="text-ink-muted">Not assigned yet{asked && ` · ${asked}`}</span>
          ) : (
            ''
          )}
        </Line>
      </BookingAssignment>
    </Card>
  )
}

/**
 * Masked until the admin asks: the full number is fetched from the admin-only
 * applicationSecrets record only when Show is pressed, and hidden again with Hide.
 */
function AadhaarNumber({ row }: { row: Stored<Application> }) {
  const [full, setFull] = useState<string | null>(null)
  const [state, setState] = useState<'hidden' | 'loading' | 'shown' | 'missing' | 'failed'>('hidden')

  const show = async () => {
    setState('loading')
    try {
      const number = await readFullAadhaar(row.id)
      setFull(number)
      setState(number ? 'shown' : 'missing')
    } catch {
      setState('failed')
    }
  }

  const link = 'ml-1.5 font-semibold text-burgundy underline underline-offset-2 hover:text-rosewood'
  if (state === 'shown' && full) {
    return (
      <>
        <span className="font-semibold tracking-wide">{full.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
        <button type="button" onClick={() => { setFull(null); setState('hidden') }} className={link}>
          Hide
        </button>
      </>
    )
  }
  return (
    <>
      {row.idNumber}
      {state === 'missing' ? (
        <span className="ml-1.5 text-ink-muted">(full number not stored)</span>
      ) : (
        <button type="button" onClick={show} disabled={state === 'loading'} className={link}>
          {state === 'loading' ? 'Loading…' : state === 'failed' ? 'Retry' : 'Show'}
        </button>
      )}
    </>
  )
}

/** `saathi` is the applicant's public profile, present once they are verified. */
function ApplicationCard({ row, saathi }: { row: Stored<Application>; saathi?: Stored<Saathi> }) {
  const offered = saathi?.services ?? row.services ?? []
  const verified = row.status === 'verified'
  // Verified Saathis show only their services; Edit reveals every service to toggle.
  const [editingServices, setEditingServices] = useState(false)
  const toggle = (id: string) =>
    void publishSaathi(row, offered.includes(id) ? offered.filter((item) => item !== id) : [...offered, id])
  const idLabel = idTypes.find((item) => item.id === row.idType)?.label ?? 'ID'

  return (
    <Card
      name={row.name}
      date={formatDate(row)}
      status={
        <StatusSelect
          value={row.status}
          options={applicationStatuses}
          onChange={(status) =>
            void (async () => {
              // A Saathi who is no longer verified loses the Saathi website first (the rules
              // only allow access for verified applications).
              if (row.status === 'verified' && status !== 'verified') await removeAllAccess(row.id)
              await setApplicationStatus(row, status)
            })()
          }
        />
      }
    >
      <Collapsible>
        <Line icon={MapPin} label="Area and age">
          {row.area} · {row.age} yrs
        </Line>
        <Line icon={Mail} label="Email">
          {row.email ? (
            <a href={`mailto:${row.email}`} className="break-all underline-offset-2 hover:underline">
              {row.email}
            </a>
          ) : (
            <span className="text-ink-muted">Not given</span>
          )}
        </Line>
        <Line icon={Languages} label="Languages">
          {row.languages}
        </Line>
        <Line icon={IdCard} label="Identity">
          {idLabel} {row.idType === 'aadhaar' ? <AadhaarNumber row={row} /> : row.idNumber}
          {row.indianCitizen && row.consent ? ' · Indian, consented' : ' · check declarations'}
        </Line>
        <Line icon={Briefcase} label="Experience">
          {row.experience}
        </Line>
        <div className="mt-1 flex flex-wrap gap-1.5" aria-label={verified ? 'Listed for services' : 'Services offered'}>
          {services
            .filter((service) => (verified && editingServices) || offered.includes(service.id))
            .map((service) =>
              verified && editingServices ? (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={offered.includes(service.id)}
                  onClick={() => toggle(service.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    offered.includes(service.id) ? 'bg-burgundy text-blush' : 'bg-burgundy/[0.06] text-burgundy hover:bg-burgundy/15'
                  }`}
                >
                  {service.name}
                </button>
              ) : (
                <span key={service.id} className="rounded-full bg-burgundy/[0.06] px-2.5 py-1 text-xs font-semibold text-burgundy">
                  {service.name}
                </span>
              ),
            )}
          {verified && (
            <button
              type="button"
              aria-expanded={editingServices}
              onClick={() => setEditingServices((value) => !value)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-rosewood underline underline-offset-2 hover:text-burgundy"
            >
              {editingServices ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
      </Collapsible>
      <div className="mt-auto flex gap-2 border-t border-burgundy/10 pt-3">
        <a href={callLink(row.mobile)} title={`Call ${row.mobile}`} aria-label={`Call ${row.mobile}`} className={iconAction}>
          <Phone aria-hidden className="size-4" />
        </a>
        <a
          href={whatsappLink(row.mobile, `Hello ${row.name}, this is Saathi First about your Saathi application.`)}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp"
          aria-label={`WhatsApp ${row.name}`}
          className={`${iconAction} bg-[#1f7a46]/10 text-[#1f7a46] hover:bg-[#1f7a46] hover:text-white`}
        >
          <MessageCircle aria-hidden className="size-4" />
        </a>
        <span className="ml-auto self-center text-sm text-ink-muted">{row.mobile}</span>
      </div>
    </Card>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-2xl bg-white/90 p-6 text-center font-medium ring-1 ring-gold/25">
      {children}
    </p>
  )
}

/** Search box, status chips and the filtered list for one collection. */
function Listing<T extends { name: string; status: string }>({ feed, statuses, emptyText, searchText, render, initialStatus = 'all' }: {
  feed: Feed<T>
  /** In the order to show them: what needs doing first. */
  statuses: readonly string[]
  emptyText: string
  searchText: (row: Stored<T>) => string
  render: (row: Stored<T>) => ReactNode
  /** The status chip selected at first, e.g. from a number at the top of the page. */
  initialStatus?: string
}) {
  const [status, setStatusFilter] = useState(initialStatus)
  const [term, setTerm] = useState('')

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase()
    const rank = (row: Stored<T>) => (statuses.includes(row.status) ? statuses.indexOf(row.status) : statuses.length)
    return (feed.rows ?? [])
      .filter(
        (row) =>
          (status === 'all' || row.status === status) &&
          (!needle || searchText(row).toLowerCase().includes(needle)),
      )
      // Just-created rows have no server time yet; they count as newest.
      .sort((a, b) => rank(a) - rank(b) || (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity))
  }, [feed.rows, status, term, searchText, statuses])

  if (feed.error) return <Notice>Could not load: {feed.error}</Notice>
  if (!feed.rows) return <Notice>Loading…</Notice>
  if (feed.rows.length === 0) return <Notice>{emptyText}</Notice>

  const count = (value: string) => feed.rows?.filter((row) => row.status === value).length ?? 0

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {['all', ...statuses].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                status === value ? 'bg-burgundy text-blush' : 'bg-white/80 text-burgundy ring-1 ring-burgundy/15 hover:bg-burgundy/10'
              }`}
            >
              {value}
              <span className="ml-1.5 opacity-70">{value === 'all' ? feed.rows?.length : count(value)}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search</span>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
            placeholder="Search…"
            className="h-10 w-full rounded-full border border-burgundy/15 bg-white/90 pl-10 pr-4 text-sm focus-visible:border-burgundy focus-visible:outline-none"
          />
        </label>
      </div>
      {visible.length === 0 ? (
        <Notice>Nothing matches that filter.</Notice>
      ) : (
        // As many columns as fit with each card at least 22rem wide, so cards never get too
        // narrow for their buttons, whatever the window size or browser zoom.
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4">{visible.map(render)}</ul>
      )}
    </>
  )
}

const bookingSearch = (row: Stored<Booking>) =>
  `${row.name} ${row.phone} ${row.serviceName ?? ''} ${row.saathiName ?? ''} ${row.assignedSaathiName ?? ''} ${row.planName} ${row.address}`
const applicationSearch = (row: Stored<Application>) => `${row.name} ${row.mobile} ${row.email ?? ''} ${row.area} ${row.languages}`

type Feeds = {
  bookings: Feed<Booking>
  applications: Feed<Application>
  saathis: Feed<Saathi>
  staff: Feed<Staff>
  settlements: Feed<Settlement>
  memberships: Feed<Membership>
  percent: number
}

/** Everything the dashboard shows, live from Firestore while the page is open. */
function Dashboard() {
  const bookings = useFeed<Booking>('bookings')
  const applications = useFeed<Application>('applications')
  const saathis = useFeed<Saathi>('saathis')
  const staff = useLive<Staff>(watchAllStaff)
  const settlements = useLive<Settlement>(watchAllSettlements)
  const memberships = useLive<Membership>(watchAllMemberships)
  const [percent, setPercent] = useState(DEFAULT_COMMISSION_PERCENT)
  useEffect(() => watchCommissionPercent(setPercent, () => undefined), [])
  return <DashboardView {...{ bookings, applications, saathis, staff, settlements, memberships, percent }} />
}

/** Bookings in the order they need attention: waiting for a Saathi first, finished last. */
const bookingOrder = ['new', 'started', 'assigned', 'completed', 'cancelled'] as const
const applicationOrder = ['pending', 'verified', 'rejected'] as const

const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

function DashboardView({ bookings, applications, saathis, staff, settlements, memberships, percent }: Feeds) {
  // The open section, and the status chip a number at the top asked for.
  const [view, setView] = useState<{ tab: Tab; status: string }>({ tab: 'bookings', status: 'all' })
  const tab = view.tab
  const setTab = (next: Tab) => setView({ tab: next, status: 'all' })
  const [now] = useState(() => new Date())

  const verified = useMemo(() => (applications.rows ?? []).filter((row) => row.status === 'verified'), [applications.rows])
  const linked = useMemo(
    () => new Set((staff.rows ?? []).filter((login) => login.active).map((login) => login.applicationId)),
    [staff.rows],
  )
  const accounts = useMemo(
    // Everyone who ever applied, so a Saathi who is no longer verified still shows what they owe.
    () => accountsBySaathi(applications.rows ?? [], bookings.rows ?? [], settlements.rows ?? []),
    [applications.rows, bookings.rows, settlements.rows],
  )
  const overdue = [...accounts.values()].filter((account) => account.overdue).length
  const renderBooking = (row: Stored<Booking>) => (
    <BookingCard key={row.id} row={row} saathis={verified} linked={linked} accounts={accounts} />
  )
  const renderApplication = (row: Stored<Application>) => (
    <ApplicationCard key={row.id} row={row} saathi={saathis.rows?.find((saathi) => saathi.id === row.id)} />
  )
  const count = <T extends { status: string }>(feed: Feed<T>, status?: string) =>
    feed.rows ? feed.rows.filter((row) => !status || row.status === status).length : null

  // No counts on the tabs: just a dot when something there needs doing, and what it is.
  const renamedPlans = (memberships.rows ?? []).filter((row) => {
    const plan = currentPlanOf(row)
    return plan.id !== row.planId || plan.visitsPerMonth !== row.visitsPerMonth
  }).length
  const withoutLogin = verified.filter((saathi) => !linked.has(saathi.id)).length
  // Saathis with more than UNPAID_VISIT_LIMIT visits unpaid: named at the top and flagged when assigning.
  const behind = verified.filter((saathi) => tooManyUnpaid(accounts.get(saathi.id)))
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const tabs: { id: Tab; label: string; attention: string }[] = [
    { id: 'bookings', label: 'Bookings', attention: count(bookings, 'new') ? plural(count(bookings, 'new')!, 'new booking', 'new bookings') : '' },
    { id: 'applications', label: 'Applications', attention: count(applications, 'pending') ? plural(count(applications, 'pending')!, 'application to check', 'applications to check') : '' },
    { id: 'memberships', label: 'Memberships', attention: renamedPlans ? plural(renamedPlans, 'membership on an old plan', 'memberships on an old plan') : '' },
    {
      id: 'team',
      label: 'Saathis',
      attention: [
        behind.length ? plural(behind.length, 'Saathi behind on payments', 'Saathis behind on payments') : '',
        withoutLogin ? plural(withoutLogin, 'Saathi without a website login', 'Saathis without a website login') : '',
      ]
        .filter(Boolean)
        .join(', '),
    },
    { id: 'money', label: 'Payments', attention: overdue ? plural(overdue, 'overdue payment', 'overdue payments') : '' },
  ]

  const waiting = count(bookings, 'new')
  const today = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <header className="mb-5">
        <h1 className="text-3xl font-light tracking-tight">{greeting(now.getHours())}</h1>
        <p className="mt-1 text-ink-muted">
          {today}
          {waiting === null ? '' : waiting ? ` · ${waiting} booking${waiting === 1 ? '' : 's'} waiting for a Saathi` : ' · nothing waiting'}
        </p>
      </header>

      {behind.length > 0 && (
        <button
          type="button"
          onClick={() => setTab('team')}
          className="mb-5 flex w-full items-start gap-3 rounded-2xl bg-rosewood/10 px-4 py-3 text-left ring-1 ring-rosewood/30 transition-colors hover:bg-rosewood/15"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-rosewood" />
          <span className="grow text-sm">
            <strong className="font-semibold text-wine">Not paying: </strong>
            {behind
              .map((saathi) => {
                const account = accounts.get(saathi.id)
                return `${saathi.name} (${unpaidVisits(account)} visits unpaid, ${formatRupees(account?.duePaise ?? 0)})`
              })
              .join(' · ')}
            . Collect before giving them more visits.
          </span>
          <span className="shrink-0 self-center text-sm font-semibold text-wine">Saathis →</span>
        </button>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={ClipboardList} label="New bookings" value={waiting} highlight onClick={() => setView({ tab: 'bookings', status: 'new' })} />
        <Stat icon={CalendarClock} label="Visits to run" value={count(bookings, 'assigned')} onClick={() => setView({ tab: 'bookings', status: 'assigned' })} />
        <Stat
          icon={UserRoundPlus}
          label="Applications to check"
          value={count(applications, 'pending')}
          highlight
          onClick={() => setView({ tab: 'applications', status: 'pending' })}
        />
        <Stat icon={ShieldCheck} label="Saathis" value={applications.rows ? verified.length : null} onClick={() => setTab('team')} />
      </div>

      {/* Pinned under the admin bar, so switching sections never needs a scroll back up. */}
      <div className="sticky top-16 z-30 -mx-2 mb-5 px-2 py-2 backdrop-blur-md">
        <div role="tablist" aria-label="Admin sections" className="flex gap-1 overflow-x-auto rounded-2xl [scrollbar-width:none] bg-white/85 p-1 shadow-[0_10px_30px_-24px_rgb(58_17_25/0.6)] ring-1 ring-gold/25">
          {tabs.map(({ id, label, attention }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              title={attention || undefined}
              className={`flex shrink-0 grow items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                tab === id ? 'bg-burgundy text-blush' : 'text-burgundy hover:bg-burgundy/[0.06]'
              }`}
            >
              {label}
              {attention && (
                <>
                  <span aria-hidden className={`size-2 rounded-full ${tab === id ? 'bg-gold' : 'bg-rosewood'}`} />
                  <span className="sr-only">: {attention}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'memberships' ? (
        memberships.error ? (
          <Notice>Could not load memberships: {memberships.error}. Publish the latest firestore.rules.</Notice>
        ) : !memberships.rows || !bookings.rows ? (
          <Notice>Loading…</Notice>
        ) : (
          <Memberships rows={memberships.rows} bookings={bookings.rows} />
        )
      ) : tab === 'team' || tab === 'money' ? (
        staff.error || settlements.error ? (
          <Notice>
            Could not load Saathi logins or payments: {staff.error || settlements.error}. Publish the latest firestore.rules.
          </Notice>
        ) : !staff.rows || !settlements.rows || !bookings.rows || !applications.rows ? (
          <Notice>Loading…</Notice>
        ) : tab === 'team' ? (
          <Team saathis={verified} staff={staff.rows} accounts={accounts} />
        ) : (
          <Money
            percent={percent}
            bookings={bookings.rows}
            settlements={settlements.rows}
            saathis={applications.rows}
            accounts={accounts}
          />
        )
      ) : tab === 'bookings' ? (
        <Listing
          key={`bookings-${view.status}`}
          feed={bookings}
          statuses={bookingOrder}
          initialStatus={view.status}
          emptyText="No customer requests yet."
          searchText={bookingSearch}
          render={renderBooking}
        />
      ) : (
        <Listing
          key={`applications-${view.status}`}
          feed={applications}
          statuses={applicationOrder}
          initialStatus={view.status}
          emptyText="No Saathi applications yet."
          searchText={applicationSearch}
          render={renderApplication}
        />
      )}
    </>
  )
}

function AdminOnly() {
  const { user, isAdmin } = useAuth()
  if (isAdmin) return <Dashboard />
  return (
    <Notice>
      This account does not have admin access. To grant it, create a document in the Firestore{' '}
      <code>admins</code> collection whose ID is this user ID:{' '}
      <code className="font-semibold [overflow-wrap:anywhere]">{user?.uid}</code>
    </Notice>
  )
}

const passwordErrors: Record<string, string> = {
  'auth/weak-password': 'Please choose a password with at least 6 characters.',
  'auth/requires-recent-login': 'For safety, sign out, sign in with Google again, then set the password straight away.',
  'auth/provider-already-linked': 'This account already has a password. Use Forgot password to change it.',
  'auth/credential-already-in-use': 'Another account already uses this email with a password.',
  'auth/email-already-in-use': 'Another account already uses this email with a password.',
}

/**
 * Lets someone who signed in with Google add a password to the same account,
 * so email and password sign-in reaches the same user ID (and admin access).
 */
function SetPassword() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')

  const hasPassword = user?.providerData.some((provider) => provider.providerId === 'password')
  if (!user?.email || (hasPassword && state !== 'done')) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const current = auth?.currentUser
    if (!current?.email) return
    if (password.length < 6) return setError(passwordErrors['auth/weak-password'])
    if (password !== confirm) return setError('The two passwords do not match.')
    setState('saving')
    setError('')
    try {
      await linkWithCredential(current, EmailAuthProvider.credential(current.email, password))
      setState('done')
    } catch (caught) {
      const code = (caught as { code?: string })?.code ?? ''
      setError(passwordErrors[code] ?? 'Could not set the password. Please try again.')
      setState('idle')
    }
  }

  const field =
    'h-12 w-full rounded-xl border border-burgundy/20 bg-white px-4 font-medium text-ink focus-visible:border-burgundy focus-visible:outline-none'

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 transition-colors hover:bg-blush/10 hover:text-gold"
      >
        <KeyRound aria-hidden className="size-4" />
        <span className="hidden sm:inline">Set password</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 rounded-3xl bg-cream p-6 text-ink shadow-card ring-1 ring-gold/40">
          {state === 'done' ? (
            <p role="status" className="font-medium">
              Password set. You can now sign in with <strong className="break-all">{user.email}</strong> and this
              password, or with Google.
            </p>
          ) : (
            <form noValidate onSubmit={submit} className="grid gap-3">
              <p className="text-sm text-ink-muted">
                Add a password so you can also sign in with <strong className="break-all text-ink">{user.email}</strong>.
              </p>
              <label className="grid gap-1 text-sm font-semibold text-ink-muted">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={field}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-ink-muted">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className={field}
                />
              </label>
              <button
                type="submit"
                disabled={state === 'saving'}
                className="mt-1 h-12 rounded-xl bg-burgundy font-semibold text-blush transition-colors hover:bg-wine disabled:opacity-60"
              >
                {state === 'saving' ? 'Saving…' : 'Save password'}
              </button>
              {error && (
                <p role="status" className="text-sm font-medium text-[#8c1d18]">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  )
}

/** The main website's address, e.g. https://yourdomain.com (VITE_MAIN_SITE_URL). */
const mainSite = import.meta.env.VITE_MAIN_SITE_URL as string | undefined

/** Slim admin-only bar: brand, who is signed in, a way back to the site and sign out. */
function AdminBar() {
  const { user, signOut } = useAuth()
  return (
    <header className="page-padding sticky top-0 z-40 bg-wine text-blush shadow-[0_10px_30px_-20px_rgb(0_0_0/0.8)]">
      <div className="container-large flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Saathi First" width={373} height={112} className="h-8 w-auto" />
          <span className="rounded-full bg-blush/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-gold">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium sm:gap-4">
          {user && (
            <span className="hidden max-w-60 truncate text-blush/70 sm:block">{user.email ?? user.phoneNumber}</span>
          )}
          <SetPassword />
          {mainSite && (
            <a href={mainSite} className="flex items-center gap-1.5 rounded-full px-3 py-2 transition-colors hover:bg-blush/10 hover:text-gold">
              <ExternalLink aria-hidden className="size-4" />
              <span className="hidden sm:inline">View site</span>
            </a>
          )}
          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 transition-colors hover:bg-blush/10 hover:text-gold"
            >
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default function Admin() {
  return (
    <>
      <div aria-hidden className="page-wash fixed inset-0 -z-10" />
      <AdminBar />
      <main className="page-padding">
        <div className="container-large py-6 nav:py-8">
          <AuthGate action="open the admin page">
            <AdminOnly />
          </AuthGate>
        </div>
      </main>
    </>
  )
}
