import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { planForHours, priceLabel } from './pricing'

export type SharedLocation = { lat: number; lng: number; accuracy: number }

/** A booking moves new -> assigned -> started -> completed, or to cancelled before it starts. */
export const bookingStatuses = ['new', 'assigned', 'started', 'completed', 'cancelled'] as const
export type BookingStatus = (typeof bookingStatuses)[number]

export type Booking = {
  uid: string
  name: string
  phone: string
  planId: string
  planName: string
  planPrice: string
  location: SharedLocation | null
  address: string
  message: string
  /** Service and Saathi preference; missing on requests made before service booking existed. */
  serviceId?: string
  serviceName?: string
  /** Empty when no Saathi was listed for the service, so the team assigns one. */
  saathiId?: string
  saathiName?: string
  /** Whether the customer picked the Saathi or asked us to pick one at random. */
  saathiChoice?: 'chosen' | 'random' | 'none'
  status: BookingStatus
  /** Hours the customer asked for; null for per-visit Property Monitoring. Missing on older bookings. */
  hours?: number | null
  /** When the customer would like the visit to start. Missing on older bookings. */
  preferredStart?: Timestamp
  /** A pending "Need more time?" request from the customer, in hours. */
  extraHoursRequested?: number
  extraRequestedAt?: Timestamp
  /** Set when an admin turns down an extra-time request. */
  extraDeclinedAt?: Timestamp
  /** Set by the admin when a Saathi is assigned. Only the customer and admins can read these. */
  assignedSaathiId?: string
  assignedSaathiName?: string
  /** The assigned Saathi's WhatsApp / call number, shown to this booking's customer only. */
  assignedSaathiPhone?: string
  scheduledAt?: Timestamp
  assignedAt?: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
  cancelledAt?: Timestamp
  cancelledBy?: 'customer' | 'admin'
}

export const applicationStatuses = ['pending', 'verified', 'rejected'] as const
export type ApplicationStatus = (typeof applicationStatuses)[number]

export type Application = {
  uid: string
  name: string
  mobile: string
  age: number
  area: string
  languages: string
  experience: string
  indianCitizen: boolean
  idType: string
  /** Aadhaar is stored masked (last four digits only); see maskIdNumber. */
  idNumber: string
  consent: boolean
  /** Service ids from content/site.ts; missing on applications made before this field existed. */
  services?: string[]
  status: ApplicationStatus
}

/** Public profile of a verified Saathi, shown on the Our Saathis page. Holds nothing private. */
export type Saathi = {
  name: string
  area: string
  languages: string
  services: string[]
}

export type Stored<T> = T & { id: string; createdAt: Timestamp | null }

function database() {
  if (!db) throw new Error('Firebase is not configured yet.')
  return db
}

export type NewBooking = Omit<Booking, 'status' | 'preferredStart'> & { preferredStart: Date }

export function createBooking({ preferredStart, ...booking }: NewBooking) {
  return addDoc(collection(database(), 'bookings'), {
    ...booking,
    preferredStart: Timestamp.fromDate(preferredStart),
    status: 'new' satisfies BookingStatus,
    createdAt: serverTimestamp(),
  })
}

export function createApplication(application: Omit<Application, 'status'>) {
  return addDoc(collection(database(), 'applications'), {
    ...application,
    status: 'pending' satisfies ApplicationStatus,
    createdAt: serverTimestamp(),
  })
}

/** Live, newest-first feed of a collection. */
export function watchCollection<T>(
  name: 'bookings' | 'applications' | 'saathis',
  onData: (rows: Stored<T>[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(database(), name), orderBy('createdAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((row) => ({ id: row.id, ...row.data() }) as Stored<T>)),
    onError,
  )
}

export function setStatus(name: 'bookings' | 'applications', id: string, status: string) {
  return updateDoc(doc(database(), name, id), { status })
}

/** The signed-in customer's bookings, live. Sorted here, so no composite index is needed. */
export function watchMyBookings(
  uid: string,
  onData: (rows: Stored<Booking>[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(database(), 'bookings'), where('uid', '==', uid)),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((row) => ({ id: row.id, ...row.data() }) as Stored<Booking>)
          .sort((a, b) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now())),
      ),
    onError,
  )
}

export type Assignment = { saathiId: string; name: string; phone: string; scheduledAt: Date }

/** Admin: assign (or re-assign) a Saathi and the visit time. */
export function assignSaathi(bookingId: string, assignment: Assignment) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    assignedSaathiId: assignment.saathiId,
    assignedSaathiName: assignment.name.trim(),
    assignedSaathiPhone: assignment.phone.trim(),
    scheduledAt: Timestamp.fromDate(assignment.scheduledAt),
    status: 'assigned' satisfies BookingStatus,
    assignedAt: serverTimestamp(),
  })
}

/** Admin: the Saathi has arrived and the visit is under way. */
export function markStarted(bookingId: string) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    status: 'started' satisfies BookingStatus,
    startedAt: serverTimestamp(),
  })
}

/** Admin: the visit is finished. */
export function markCompleted(bookingId: string) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    status: 'completed' satisfies BookingStatus,
    completedAt: serverTimestamp(),
  })
}

/** Customers may cancel only while no Saathi is assigned; admins at any point before completion. */
export function cancelBooking(bookingId: string, by: 'customer' | 'admin') {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    status: 'cancelled' satisfies BookingStatus,
    cancelledAt: serverTimestamp(),
    cancelledBy: by,
  })
}

/** Customer: ask for more time on a confirmed or running visit. The admin approves or declines. */
export function requestMoreTime(bookingId: string, extraHours: number) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    extraHoursRequested: extraHours,
    extraRequestedAt: serverTimestamp(),
  })
}

/** Admin: accept the extra time. The booking moves to the plan that covers the new total. */
export function approveMoreTime(booking: Stored<Booking>) {
  const hours = (booking.hours ?? 0) + (booking.extraHoursRequested ?? 0)
  const plan = planForHours(hours)
  if (!plan) throw new Error('No plan covers that many hours.')
  return updateDoc(doc(database(), 'bookings', booking.id), {
    hours,
    planId: plan.id,
    planName: plan.name,
    planPrice: priceLabel(plan),
    extraHoursRequested: deleteField(),
    extraRequestedAt: deleteField(),
  })
}

/** Admin: turn the extra time down; the customer is told to call. */
export function declineMoreTime(bookingId: string) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    extraHoursRequested: deleteField(),
    extraRequestedAt: deleteField(),
    extraDeclinedAt: serverTimestamp(),
  })
}

/** First name and last initial, so the public listing never shows a full name. */
export const publicName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0].toUpperCase()}.` : first
}

/** Creates or updates the public profile at saathis/{application id}. */
export function publishSaathi(application: Stored<Application>, services: string[]) {
  return setDoc(doc(database(), 'saathis', application.id), {
    name: publicName(application.name),
    area: application.area,
    languages: application.languages,
    services,
    createdAt: application.createdAt ?? serverTimestamp(),
  })
}

/** Only verified applicants have a public profile; any other status removes it. */
export async function setApplicationStatus(application: Stored<Application>, status: string) {
  await setStatus('applications', application.id, status)
  if (status === 'verified') await publishSaathi(application, application.services ?? [])
  else await deleteDoc(doc(database(), 'saathis', application.id))
}
