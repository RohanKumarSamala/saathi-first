import {
  CalendarClock,
  ClipboardList,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { useAuth } from '../auth/context'
import { PageHero } from '../components/PageHero'
import { services } from '../content/site'
import {
  applicationStatuses,
  bookingStatuses,
  publishSaathi,
  setApplicationStatus,
  setStatus,
  watchCollection,
  type Application,
  type Booking,
  type Saathi,
  type Stored,
} from '../lib/db'
import { idTypes } from '../lib/identity'

type Tab = 'bookings' | 'applications'
type Feed<T> = { rows: Stored<T>[] | null; error: string }

const statusTone: Record<string, string> = {
  new: 'bg-gold text-wine',
  pending: 'bg-gold text-wine',
  assigned: 'bg-rosewood text-white',
  completed: 'bg-emerald-700 text-white',
  verified: 'bg-emerald-700 text-white',
  cancelled: 'bg-wine/15 text-ink-muted',
  rejected: 'bg-wine/15 text-ink-muted',
}

const formatDate = (row: Stored<unknown>) =>
  row.createdAt
    ? row.createdAt.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Just now'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

/** Subscribes to a collection while the admin page is open. */
function useFeed<T>(name: Tab | 'saathis'): Feed<T> {
  const [rows, setRows] = useState<Stored<T>[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => watchCollection<T>(name, setRows, (caught) => setError(caught.message)), [name])
  return { rows, error }
}

function Stat({ icon: Icon, label, value, highlight }: {
  icon: LucideIcon
  label: string
  value: number | null
  highlight?: boolean
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-card p-6 shadow-card nav:p-7 ${
        highlight
          ? 'bg-[linear-gradient(135deg,#6b1e2e,#8f2f42_60%,#b9545c)] text-blush'
          : 'bg-white/90 ring-1 ring-gold/30'
      }`}
    >
      <div aria-hidden className={`absolute -right-10 -top-10 -z-10 size-36 rounded-full border ${highlight ? 'border-gold/40' : 'border-gold/50'}`} />
      <span className={`grid size-12 place-items-center rounded-2xl ${highlight ? 'bg-blush/15 text-gold' : 'bg-burgundy/10 text-burgundy'}`}>
        <Icon aria-hidden className="size-6" strokeWidth={1.6} />
      </span>
      <p className="mt-5 text-5xl font-light tracking-tight">{value ?? '–'}</p>
      <p className={`text-eyebrow mt-1 font-semibold ${highlight ? 'text-blush/80' : 'text-ink-muted'}`}>{label}</p>
    </div>
  )
}

function StatusSelect({ value, options, onChange }: {
  value: string
  options: readonly string[]
  onChange: (status: string) => void
}) {
  return (
    <label>
      <span className="sr-only">Status</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold capitalize shadow-sm ${statusTone[value] ?? ''}`}
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-white text-ink">
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Detail({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  if (!children) return null
  return (
    <div className={wide ? 'sm:col-span-2 nav:col-span-3' : ''}>
      <dt className="text-eyebrow text-[0.6875rem] font-semibold text-rosewood">{label}</dt>
      <dd className="mt-0.5 font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

function Card({ name, date, status, children }: {
  name: string
  date: string
  status: ReactNode
  children: ReactNode
}) {
  return (
    <li className="overflow-hidden rounded-card bg-white/90 shadow-card ring-1 ring-gold/25 transition-transform duration-500 ease-out-soft hover:-translate-y-1">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-burgundy/10 bg-blush/60 px-6 py-5 nav:px-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-burgundy text-lg font-semibold text-blush">
            {initials(name) || '?'}
          </span>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <CalendarClock aria-hidden className="size-4" />
              {date}
            </p>
          </div>
        </div>
        {status}
      </div>
      <dl className="grid gap-x-8 gap-y-5 px-6 py-6 sm:grid-cols-2 nav:grid-cols-3 nav:px-8">{children}</dl>
    </li>
  )
}

const actionLink =
  'inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-1.5 font-semibold text-burgundy transition-colors hover:bg-burgundy hover:text-blush'

function BookingCard({ row }: { row: Stored<Booking> }) {
  return (
    <Card
      name={row.name}
      date={formatDate(row)}
      status={
        <StatusSelect
          value={row.status}
          options={bookingStatuses}
          onChange={(status) => void setStatus('bookings', row.id, status)}
        />
      }
    >
      <Detail label="Phone">
        <a href={`tel:${row.phone}`} className={actionLink}>
          <Phone aria-hidden className="size-4" />
          {row.phone}
        </a>
      </Detail>
      <Detail label="Service">{row.serviceName}</Detail>
      <Detail label="Saathi">
        {row.saathiName
          ? `${row.saathiName} (${row.saathiChoice === 'random' ? 'picked at random' : 'customer’s choice'})`
          : row.serviceName && 'Team to assign'}
      </Detail>
      <Detail label="Plan">{row.planName ? `${row.planName} (${row.planPrice})` : 'Not chosen'}</Detail>
      <Detail label="Location">
        {row.location ? (
          <a
            href={`https://www.google.com/maps?q=${row.location.lat},${row.location.lng}`}
            target="_blank"
            rel="noreferrer"
            className={actionLink}
          >
            <MapPin aria-hidden className="size-4" />
            Open in Maps (±{row.location.accuracy} m)
          </a>
        ) : (
          'Not shared'
        )}
      </Detail>
      <Detail label="Address" wide>{row.address}</Detail>
      <Detail label="Message" wide>{row.message}</Detail>
    </Card>
  )
}

/** `saathi` is the applicant's public profile, present once they are verified. */
function ApplicationCard({ row, saathi }: { row: Stored<Application>; saathi?: Stored<Saathi> }) {
  const offered = saathi?.services ?? row.services ?? []
  const toggle = (id: string) =>
    void publishSaathi(row, offered.includes(id) ? offered.filter((item) => item !== id) : [...offered, id])

  return (
    <Card
      name={row.name}
      date={formatDate(row)}
      status={
        <StatusSelect
          value={row.status}
          options={applicationStatuses}
          onChange={(status) => void setApplicationStatus(row, status)}
        />
      }
    >
      <Detail label="Mobile">
        <a href={`tel:${row.mobile}`} className={actionLink}>
          <Phone aria-hidden className="size-4" />
          {row.mobile}
        </a>
      </Detail>
      <Detail label="Age">{row.age}</Detail>
      <Detail label="Area">{row.area}</Detail>
      <Detail label="Indian citizen">{row.indianCitizen ? 'Yes (self-declared)' : 'No'}</Detail>
      <Detail label={idTypes.find((item) => item.id === row.idType)?.label ?? 'ID'}>{row.idNumber}</Detail>
      <Detail label="Verification consent">{row.consent ? 'Given' : 'Not given'}</Detail>
      <Detail label="Languages" wide>{row.languages}</Detail>
      <Detail label="Experience / skills" wide>{row.experience}</Detail>
      <Detail label={row.status === 'verified' ? 'Listed on Our Saathis for' : 'Services offered'} wide>
        {row.status === 'verified' ? (
          <span className="mt-1.5 flex flex-wrap gap-2">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                aria-pressed={offered.includes(service.id)}
                onClick={() => toggle(service.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-300 ${
                  offered.includes(service.id)
                    ? 'bg-burgundy text-blush'
                    : 'bg-white/80 text-burgundy ring-1 ring-burgundy/15 hover:bg-burgundy/10'
                }`}
              >
                {service.name}
              </button>
            ))}
          </span>
        ) : (
          services
            .filter((service) => offered.includes(service.id))
            .map((service) => service.name)
            .join(', ') || 'Not specified'
        )}
      </Detail>
    </Card>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-card bg-white/90 p-10 text-center text-lg font-medium shadow-card ring-1 ring-gold/25">
      {children}
    </p>
  )
}

/** Search box, status chips and the filtered list for one collection. */
function Listing<T extends { name: string; status: string }>({ feed, statuses, emptyText, searchText, render }: {
  feed: Feed<T>
  statuses: readonly string[]
  emptyText: string
  searchText: (row: Stored<T>) => string
  render: (row: Stored<T>) => ReactNode
}) {
  const [status, setStatusFilter] = useState('all')
  const [term, setTerm] = useState('')

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase()
    return (feed.rows ?? []).filter(
      (row) =>
        (status === 'all' || row.status === status) &&
        (!needle || searchText(row).toLowerCase().includes(needle)),
    )
  }, [feed.rows, status, term, searchText])

  if (feed.error) return <Notice>Could not load: {feed.error}</Notice>
  if (!feed.rows) return <Notice>Loading…</Notice>
  if (feed.rows.length === 0) return <Notice>{emptyText}</Notice>

  const count = (value: string) => feed.rows?.filter((row) => row.status === value).length ?? 0

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {['all', ...statuses].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors duration-300 ${
                status === value ? 'bg-burgundy text-blush' : 'bg-white/80 text-burgundy ring-1 ring-burgundy/15 hover:bg-burgundy/10'
              }`}
            >
              {value}
              <span className="ml-2 opacity-70">{value === 'all' ? feed.rows?.length : count(value)}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search</span>
          <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
            placeholder="Search name, phone, area…"
            className="field-light min-h-12! py-2.5! pl-13!"
          />
        </label>
      </div>
      {visible.length === 0 ? (
        <Notice>Nothing matches that filter.</Notice>
      ) : (
        <ul className="grid gap-6">{visible.map(render)}</ul>
      )}
    </>
  )
}

const bookingSearch = (row: Stored<Booking>) => `${row.name} ${row.phone} ${row.serviceName ?? ''} ${row.saathiName ?? ''} ${row.planName} ${row.address}`
const applicationSearch = (row: Stored<Application>) => `${row.name} ${row.mobile} ${row.area} ${row.languages}`
const renderBooking = (row: Stored<Booking>) => <BookingCard key={row.id} row={row} />

function Dashboard() {
  const [tab, setTab] = useState<Tab>('bookings')
  const bookings = useFeed<Booking>('bookings')
  const applications = useFeed<Application>('applications')
  const saathis = useFeed<Saathi>('saathis')
  const renderApplication = (row: Stored<Application>) => (
    <ApplicationCard key={row.id} row={row} saathi={saathis.rows?.find((saathi) => saathi.id === row.id)} />
  )
  const count = <T extends { status: string }>(feed: Feed<T>, status?: string) =>
    feed.rows ? feed.rows.filter((row) => !status || row.status === status).length : null

  const tabs: { id: Tab; label: string; total: number | null }[] = [
    { id: 'bookings', label: 'Customer requests', total: count(bookings) },
    { id: 'applications', label: 'Saathi applications', total: count(applications) },
  ]

  return (
    <>
      <div className="mb-12 grid gap-5 sm:grid-cols-2 nav:grid-cols-4">
        <Stat icon={ClipboardList} label="New requests" value={count(bookings, 'new')} highlight />
        <Stat icon={CalendarClock} label="Requests in total" value={count(bookings)} />
        <Stat icon={UserRoundPlus} label="Awaiting verification" value={count(applications, 'pending')} />
        <Stat icon={ShieldCheck} label="Verified Saathis" value={count(applications, 'verified')} />
      </div>

      <div role="tablist" aria-label="Admin sections" className="mb-8 inline-flex flex-wrap gap-1 rounded-full bg-burgundy/10 p-1.5">
        {tabs.map(({ id, label, total }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-6 py-3 font-semibold transition-colors duration-300 ${
              tab === id ? 'bg-burgundy text-blush shadow-[0_10px_24px_-12px_rgb(107_30_46/0.9)]' : 'text-burgundy'
            }`}
          >
            {label}
            {total !== null && <span className="ml-2 opacity-70">{total}</span>}
          </button>
        ))}
      </div>

      {tab === 'bookings' ? (
        <Listing
          feed={bookings}
          statuses={bookingStatuses}
          emptyText="No customer requests yet."
          searchText={bookingSearch}
          render={renderBooking}
        />
      ) : (
        <Listing
          feed={applications}
          statuses={applicationStatuses}
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

export default function Admin() {
  return (
    <>
      <PageHero
        title="Admin"
        intro="Customer requests from the Contact page and applications from Become a Saathi, newest first."
        tagline={
          <>
            Everything in <span className="accent text-rosewood">one place.</span>
          </>
        }
      />
      <div className="page-padding">
        <div className="container-large py-16 nav:py-24">
          <AuthGate action="open the admin page">
            <AdminOnly />
          </AuthGate>
        </div>
      </div>
    </>
  )
}
