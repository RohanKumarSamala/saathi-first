import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export type SharedLocation = { lat: number; lng: number; accuracy: number }

export const bookingStatuses = ['new', 'assigned', 'completed', 'cancelled'] as const
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

export function createBooking(booking: Omit<Booking, 'status'>) {
  return addDoc(collection(database(), 'bookings'), {
    ...booking,
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

/** First name and last initial, so the public listing never shows a full name. */
const publicName = (name: string) => {
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
