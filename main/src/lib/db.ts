import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Collection } from './finance'
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
  /** What the Saathi collected when they completed the visit, and how it splits. */
  collection?: Collection
}

export const applicationStatuses = ['pending', 'verified', 'rejected'] as const
export type ApplicationStatus = (typeof applicationStatuses)[number]

export type Application = {
  uid: string
  name: string
  mobile: string
  /** The sign-in email; missing for phone sign-ins and applications made before this field existed. */
  email?: string
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

export function database() {
  if (!db) throw new Error('Firebase is not configured yet.')
  return db
}

export type NewBooking = Omit<Booking, 'status' | 'preferredStart'> & { preferredStart: Date }

/** How many bookings a customer can have in progress (new, assigned or started) at once. Mirrors firestore.rules. */
export const MAX_ACTIVE_BOOKINGS = 3
const inProgress: BookingStatus[] = ['new', 'assigned', 'started']

/** Thrown by createBooking when the customer already has MAX_ACTIVE_BOOKINGS in progress. */
export class TooManyBookingsError extends Error {
  code = 'too-many-active'
}

/**
 * Saves a booking together with the customer's list of bookings in progress
 * (customers/{uid}.active), in one write. firestore.rules allow at most 3 on that list, and an
 * entry leaves it only once its booking is cancelled or completed, which is done here too.
 */
export async function createBooking({ preferredStart, ...booking }: NewBooking) {
  const store = database()
  const mine = await getDocs(query(collection(store, 'bookings'), where('uid', '==', booking.uid)))
  const active = mine.docs.filter((row) => inProgress.includes(row.data().status)).map((row) => row.id)
  if (active.length >= MAX_ACTIVE_BOOKINGS) throw new TooManyBookingsError('Too many bookings in progress')

  const ref = doc(collection(store, 'bookings'))
  const batch = writeBatch(store)
  batch.set(ref, {
    ...booking,
    preferredStart: Timestamp.fromDate(preferredStart),
    status: 'new' satisfies BookingStatus,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(store, 'customers', booking.uid), { active: [...active, ref.id] })
  await batch.commit()
  return ref
}

/**
 * Saves an application. A full Aadhaar number never goes on the application itself (which
 * keeps only the masked form); it is written in the same batch to applicationSecrets/{id},
 * which only admins can read. Both documents are saved together or not at all.
 */
export function createApplication(application: Omit<Application, 'status'>, fullAadhaar?: string) {
  const store = database()
  // Saved under the applicant's user ID, so each person can apply only once (firestore.rules).
  const ref = doc(store, 'applications', application.uid)
  const batch = writeBatch(store)
  batch.set(ref, { ...application, status: 'pending' satisfies ApplicationStatus, createdAt: serverTimestamp() })
  if (fullAadhaar) {
    batch.set(doc(store, 'applicationSecrets', ref.id), {
      uid: application.uid,
      idNumber: fullAadhaar,
      createdAt: serverTimestamp(),
    })
  }
  return batch.commit()
}

/** The signed-in person's own applications (older ones were saved under random IDs), live. */
export function watchMyApplications(uid: string, onData: (rows: Stored<Application>[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    query(collection(database(), 'applications'), where('uid', '==', uid)),
    (snapshot) => onData(snapshot.docs.map((row) => ({ id: row.id, ...row.data() }) as Stored<Application>)),
    onError,
  )
}

/** Admin only: the applicant's full Aadhaar number, or null if it was never stored. */
export async function readFullAadhaar(applicationId: string) {
  const snapshot = await getDoc(doc(database(), 'applicationSecrets', applicationId))
  return snapshot.exists() ? String(snapshot.data().idNumber ?? '') : null
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

/** The visit is finished and paid for, by the assigned Saathi on the Saathi website. */
export function markCompleted(bookingId: string, collection: Collection) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    status: 'completed' satisfies BookingStatus,
    completedAt: serverTimestamp(),
    collection,
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
