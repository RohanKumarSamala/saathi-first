import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
  status: ApplicationStatus
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

/** Live, newest-first feed of a collection for the admin page. */
export function watchCollection<T>(
  name: 'bookings' | 'applications',
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
