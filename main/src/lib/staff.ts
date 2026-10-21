import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { database, type Application, type Booking, type BookingStatus, type Stored } from './db'
import { DEFAULT_COMMISSION_PERCENT } from './finance'

/**
 * Data for the Saathi and admin websites: which logins are Saathis, the visits assigned to
 * them, the company's share, and the payments Saathis make to the company.
 */

/** staff/{login uid}: lets that login use the Saathi website as the Saathi of `applicationId`. */
export type Staff = { applicationId: string; name: string; phone: string; active: boolean; createdAt: Timestamp | null }

/**
 * A payment of the company's share. `razorpay` ones are written by the server only.
 * `payout` is the other way round: the company paid the Saathi for membership visits. It is
 * stored as a negative amount so every sum of payments nets it off.
 */
export type Settlement = {
  saathiId: string
  amountPaise: number
  method: 'razorpay' | 'manual' | 'payout'
  razorpayPaymentId?: string
  razorpayOrderId?: string
  note?: string
  recordedBy?: string
}

type Rows<T> = (rows: Stored<T>[]) => void
type Fail = (error: Error) => void

const rowsOf = <T>(snapshot: { docs: { id: string; data: () => unknown }[] }) =>
  snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as object) }) as Stored<T>)

/** The signed-in login's Saathi access, live: null when an admin has not given it access. */
export function watchStaff(uid: string, onData: (staff: Staff | null) => void, onError: Fail) {
  return onSnapshot(
    doc(database(), 'staff', uid),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data() as Staff) : null),
    onError,
  )
}

/** The company's share in percent, live, so every screen uses the same figure. */
export function watchCommissionPercent(onData: (percent: number) => void, onError: Fail) {
  return onSnapshot(
    doc(database(), 'config', 'finance'),
    (snapshot) => {
      const value = snapshot.data()?.commissionPercent
      onData(typeof value === 'number' ? value : DEFAULT_COMMISSION_PERCENT)
    },
    onError,
  )
}

/** Every visit assigned to one Saathi, live, soonest first. */
export function watchAssignedVisits(saathiId: string, onData: Rows<Booking>, onError: Fail) {
  return onSnapshot(
    query(collection(database(), 'bookings'), where('assignedSaathiId', '==', saathiId)),
    (snapshot) => {
      const time = (row: Stored<Booking>) =>
        (row.scheduledAt ?? row.preferredStart)?.toMillis() ?? row.createdAt?.toMillis() ?? 0
      onData(rowsOf<Booking>(snapshot).sort((a, b) => time(a) - time(b)))
    },
    onError,
  )
}

/** One Saathi's payments to the company, newest first. */
export function watchSettlements(saathiId: string, onData: Rows<Settlement>, onError: Fail) {
  return onSnapshot(
    query(collection(database(), 'settlements'), where('saathiId', '==', saathiId)),
    (snapshot) =>
      onData(
        rowsOf<Settlement>(snapshot).sort(
          (a, b) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now()),
        ),
      ),
    onError,
  )
}

/** The Saathi has arrived: the customer's tracker moves to "Visit started". */
export function startVisit(bookingId: string) {
  return updateDoc(doc(database(), 'bookings', bookingId), {
    status: 'started' satisfies BookingStatus,
    startedAt: serverTimestamp(),
  })
}

// ---------- Admin ----------

/** Admin: every login with Saathi access. */
export function watchAllStaff(onData: Rows<Staff>, onError: Fail) {
  return onSnapshot(collection(database(), 'staff'), (snapshot) => onData(rowsOf<Staff>(snapshot)), onError)
}

/** Admin: every payment from every Saathi, newest first. */
export function watchAllSettlements(onData: Rows<Settlement>, onError: Fail) {
  return onSnapshot(
    collection(database(), 'settlements'),
    (snapshot) =>
      onData(
        rowsOf<Settlement>(snapshot).sort(
          (a, b) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now()),
        ),
      ),
    onError,
  )
}

/** Admin: let a login (by its user ID) use the Saathi website as this verified Saathi. */
export function grantAccess(uid: string, application: Stored<Application>) {
  return setDoc(doc(database(), 'staff', uid.trim()), {
    applicationId: application.id,
    name: application.name,
    phone: application.mobile,
    active: true,
    createdAt: serverTimestamp(),
  })
}

/** Admin: pause or resume a login without removing it. */
export function setStaffActive(uid: string, active: boolean) {
  return updateDoc(doc(database(), 'staff', uid), { active })
}

/** Admin: remove a login's access entirely. */
export function removeAccess(uid: string) {
  return deleteDoc(doc(database(), 'staff', uid))
}

/** Admin: remove every login of one Saathi, e.g. when their application is no longer verified. */
export async function removeAllAccess(applicationId: string) {
  const logins = await getDocs(query(collection(database(), 'staff'), where('applicationId', '==', applicationId)))
  await Promise.all(logins.docs.map((login) => deleteDoc(login.ref)))
}

export function setCommissionPercent(percent: number) {
  return setDoc(doc(database(), 'config', 'finance'), { commissionPercent: percent, updatedAt: serverTimestamp() })
}

/** Admin: money the company paid a Saathi, e.g. their share of membership visits by UPI. */
export function recordPayout(input: { saathiId: string; amountPaise: number; note: string; adminUid: string }) {
  return addDoc(collection(database(), 'settlements'), {
    saathiId: input.saathiId,
    amountPaise: -Math.abs(input.amountPaise),
    method: 'payout',
    note: input.note.trim(),
    recordedBy: input.adminUid,
    createdAt: serverTimestamp(),
  })
}

/** Admin: a payment received outside Razorpay, e.g. cash handed in at the office. */
export function recordManualSettlement(input: { saathiId: string; amountPaise: number; note: string; adminUid: string }) {
  return addDoc(collection(database(), 'settlements'), {
    saathiId: input.saathiId,
    amountPaise: input.amountPaise,
    method: 'manual',
    note: input.note.trim(),
    recordedBy: input.adminUid,
    createdAt: serverTimestamp(),
  })
}
