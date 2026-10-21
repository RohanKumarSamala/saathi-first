// Security tests for firestore.rules, run against the local Firestore emulator.
// Run with: npm run test:rules
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

let env

// Identities. Google and verified email users carry email_verified; phone users a phone_number.
const VERIFIED = { email: 'priya@example.com', email_verified: true }
const UNVERIFIED = { email: 'new@example.com', email_verified: false }
const PHONE = { phone_number: '+919876543210' }

const db = (uid, claims) => env.authenticatedContext(uid, claims).firestore()
const stranger = () => env.unauthenticatedContext().firestore()

/** Seeds data with rules switched off, as the console or an admin would. */
const seed = (path, data) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data))

const inDays = (days) => Timestamp.fromDate(new Date(Date.now() + days * 86_400_000))
/** A visit `days` from now at an India time such as 10:30 (IST is UTC+5:30). */
const istSlot = (days, hh = 10, mm = 30) => {
  const day = new Date(Date.now() + days * 86_400_000)
  return Timestamp.fromDate(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh, mm) - 330 * 60_000))
}

const booking = (uid, overrides = {}) => ({
  uid,
  name: 'Priya Sharma',
  phone: '98765 43210',
  planId: 'care',
  planName: 'Care Companion',
  planPrice: '₹499 / up to 4 hrs',
  hours: 3,
  preferredStart: istSlot(2),
  location: { lat: 17.385, lng: 78.4867, accuracy: 20 },
  address: 'Near the metro station',
  message: 'Hospital visit on Friday',
  serviceId: 'hospital-assistance',
  serviceName: 'Hospital Assistance',
  saathiId: '',
  saathiName: '',
  saathiChoice: 'none',
  status: 'new',
  createdAt: serverTimestamp(),
  ...overrides,
})

const application = (uid, overrides = {}) => ({
  uid,
  name: 'Ravi Kumar',
  mobile: '9123456780',
  age: 28,
  area: 'Kukatpally',
  languages: 'Telugu, Hindi',
  experience: 'Hospital front desk',
  services: ['hospital-assistance'],
  indianCitizen: true,
  idType: 'aadhaar',
  idNumber: 'XXXX XXXX 1234',
  consent: true,
  status: 'pending',
  createdAt: serverTimestamp(),
  ...overrides,
})

/**
 * Books the way the website does: the booking, and the customer's list of bookings in progress
 * (customers/{uid}.active), saved together in one write.
 */
async function book(store, data, asUid = data.uid) {
  const mine = await getDocs(query(collection(store, 'bookings'), where('uid', '==', asUid)))
  const active = mine.docs.filter((row) => ['new', 'assigned', 'started'].includes(row.data().status)).map((row) => row.id)
  const ref = doc(collection(store, 'bookings'))
  const batch = writeBatch(store)
  batch.set(ref, data)
  batch.set(doc(store, 'customers', asUid), { active: [...active, ref.id] })
  await batch.commit()
  return ref
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-saathi-first',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181 },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  await seed('admins/admin1', { role: 'owner' })
})

after(async () => {
  await env?.cleanup()
})

describe('admin role', () => {
  test('nobody can make themselves an admin', async () => {
    await assertFails(setDoc(doc(db('mallory', VERIFIED), 'admins/mallory'), { role: 'owner' }))
  })
  test('an admin cannot create other admins from the site', async () => {
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'admins/friend'), { role: 'owner' }))
  })
  test('users can check only their own admin record', async () => {
    await assertSucceeds(getDoc(doc(db('alice', VERIFIED), 'admins/alice')))
    await assertFails(getDoc(doc(db('alice', VERIFIED), 'admins/admin1')))
  })
})

describe('bookings: who may create', () => {
  test('a signed-out visitor cannot book', async () => {
    await assertFails(book(stranger(), booking('anyone')))
  })
  test('an email account that has not confirmed its address cannot book', async () => {
    await assertFails(book(db('newbie', UNVERIFIED), booking('newbie')))
  })
  test('verified email and phone accounts can book', async () => {
    await assertSucceeds(book(db('alice', VERIFIED), booking('alice')))
    await assertSucceeds(book(db('bob', PHONE), booking('bob')))
  })
  test('phone numbers typed with +91, spaces or a leading 0 are accepted', async () => {
    for (const phone of ['+91 98765 43210', '098765-43210', '9876543210']) {
      await assertSucceeds(book(db('alice', VERIFIED), booking('alice', { phone })))
    }
  })
  test('visit times follow the form: 7 am first, ending by 11 pm, property visits by 8 pm', async () => {
    const alice = () => db('alice', VERIFIED)
    await assertSucceeds(book(alice(), booking('alice', { preferredStart: istSlot(2, 7, 0) })))
    await assertSucceeds(book(alice(), booking('alice', { preferredStart: istSlot(2, 20, 0) }))) // 3 hours, ends 11 pm
    await assertFails(book(alice(), booking('alice', { preferredStart: istSlot(2, 6, 30) })))
    const property = { planId: 'property', planName: 'Property Monitoring', planPrice: '₹99 / per visit', hours: null,
      serviceId: 'property-monitoring', serviceName: 'Property Monitoring' }
    await assertSucceeds(book(alice(), booking('alice', { ...property, preferredStart: istSlot(2, 20, 0) })))
    await assertFails(book(alice(), booking('alice', { ...property, preferredStart: istSlot(2, 20, 30) })))
  })
  test('a booking without a location (typed address only) is accepted', async () => {
    await assertSucceeds(book(db('alice', VERIFIED), booking('alice', { location: null })))
  })
  test('the booking form’s exact payload is accepted (address in one line, +91 account number)', async () => {
    await assertSucceeds(
      book(db('alice', VERIFIED), booking('alice', {
          phone: '+919876543210',
          address: 'Flat 302, Green Residency, Road No. 12, Banjara Hills, near City Centre Mall, 500034',
          location: null,
          message: '',
          hours: 4,
          saathiId: '',
          saathiName: '',
          saathiChoice: 'none',
        }),
      ),
    )
  })
  test('a booking with no Saathi preference is accepted', async () => {
    const plain = booking('alice')
    for (const key of ['saathiId', 'saathiName', 'saathiChoice']) delete plain[key]
    await assertSucceeds(book(db('alice', VERIFIED), plain))
  })
  test('a whole-day booking (12 hours, Extended Companion) is accepted', async () => {
    await assertSucceeds(
      book(db('alice', VERIFIED), booking('alice', { hours: 12, planId: 'extended', planName: 'Extended Companion', planPrice: '₹1,299 / up to 12 hrs' }),
      ),
    )
  })
  test('a property visit is booked per visit, with no hours', async () => {
    await assertSucceeds(
      book(db('alice', VERIFIED), booking('alice', {
          serviceId: 'property-monitoring',
          serviceName: 'Property Monitoring',
          planId: 'property',
          planName: 'Property Monitoring',
          planPrice: '₹99 / per visit',
          hours: null,
        }),
      ),
    )
  })
  test('nobody can book in someone else’s name', async () => {
    await assertFails(book(db('mallory', VERIFIED), booking('alice'), 'mallory'))
  })
})

describe('bookings: at most 3 in progress per customer', () => {
  const alice = () => db('alice', VERIFIED)
  const list = async () => (await env.withSecurityRulesDisabled(async (ctx) => (await getDoc(doc(ctx.firestore(), 'customers/alice'))).data()))?.active ?? []

  test('a fourth booking is refused while three are in progress', async () => {
    for (let n = 0; n < 3; n++) await assertSucceeds(book(alice(), booking('alice')))
    await assertFails(book(alice(), booking('alice')))
  })
  test('once one is cancelled or completed, the customer can book again', async () => {
    const first = await book(alice(), booking('alice'))
    await book(alice(), booking('alice'))
    const third = await book(alice(), booking('alice'))
    await assertSucceeds(updateDoc(first, { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer' }))
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'bookings', third.id), { status: 'completed' }))
    await assertSucceeds(book(alice(), booking('alice')))
    await assertSucceeds(book(alice(), booking('alice')))
    await assertFails(book(alice(), booking('alice')))
  })
  test('a booking cannot be created without being listed', async () => {
    await assertFails(addDoc(collection(alice(), 'bookings'), booking('alice')))
  })
  const fakeBooking = (store) => {
    const ref = doc(collection(store, 'bookings'))
    return { ref, batch: writeBatch(store) }
  }
  test('a booking still in progress cannot be dropped from the list to make room', async () => {
    for (let n = 0; n < 3; n++) await book(alice(), booking('alice'))
    const [, ...rest] = await list()
    const store = alice()
    const { ref, batch } = fakeBooking(store)
    batch.set(ref, booking('alice'))
    batch.set(doc(store, 'customers', 'alice'), { active: [...rest, ref.id] })
    await assertFails(batch.commit())
  })
  test('the list cannot be filled with made-up, other people’s or more than 3 entries', async () => {
    await assertFails(setDoc(doc(alice(), 'customers', 'alice'), { active: ['made-up'] }))
    const bobs = await book(db('bob', PHONE), booking('bob'))
    await assertFails(setDoc(doc(alice(), 'customers', 'alice'), { active: [bobs.id] }))
    await assertFails(setDoc(doc(alice(), 'customers', 'alice'), { active: [], extra: true }))
    const store = alice()
    const { ref, batch } = fakeBooking(store)
    batch.set(ref, booking('alice'))
    batch.set(doc(store, 'customers', 'alice'), { active: [ref.id, ref.id, ref.id, ref.id] })
    await assertFails(batch.commit())
  })
  test('only the customer and admins can see the list', async () => {
    await book(alice(), booking('alice'))
    await assertSucceeds(getDoc(doc(alice(), 'customers', 'alice')))
    await assertSucceeds(getDoc(doc(db('admin1', VERIFIED), 'customers', 'alice')))
    await assertFails(getDoc(doc(db('mallory', VERIFIED), 'customers', 'alice')))
    await assertFails(deleteDoc(doc(alice(), 'customers', 'alice')))
  })
})

describe('bookings: what may be written', () => {
  const tries = {
    'start already completed': { status: 'completed' },
    'smuggle in an extra field': { isAdmin: true },
    'back-date the request': { createdAt: Timestamp.fromDate(new Date('2000-01-01')) },
    'send a 50 KB message': { message: 'x'.repeat(50_000) },
    'send a name that is not text': { name: { first: 'x' } },
    'leave the name empty': { name: '' },
    'send a fake location': { location: { lat: 'javascript:alert(1)', lng: 0, accuracy: 0 } },
    'send an impossible location': { location: { lat: 500, lng: 0, accuracy: 0 } },
    'send a phone number made of letters': { phone: 'call me maybe' },
    'set an unknown Saathi choice': { saathiChoice: 'hacked' },
    'pay a made-up price': { planPrice: '₹1 / up to 4 hrs' },
    'rename the plan': { planName: 'Free Companion' },
    'book more hours than the plan covers': { hours: 5 },
    'book zero hours': { hours: 0 },
    'book fractional hours': { hours: 2.5 },
    'book more than a whole day': { hours: 13, planId: 'extended', planName: 'Extended Companion', planPrice: '₹1,299 / up to 12 hrs' },
    'use an unknown plan': { planId: 'vip', planName: 'VIP', planPrice: '₹0' },
    'put a companion service on the per-visit property plan': {
      planId: 'property', planName: 'Property Monitoring', planPrice: '₹99 / per visit', hours: null,
    },
    'book hours for a property visit': {
      serviceId: 'property-monitoring', serviceName: 'Property Monitoring',
      planId: 'care', planName: 'Care Companion', planPrice: '₹499 / up to 4 hrs', hours: 3,
    },
    'book a visit in the past': { preferredStart: inDays(-1) },
    'book a visit a year ahead': { preferredStart: inDays(365) },
    'send a visit time that is not a date': { preferredStart: 'tomorrow 10am' },
    'book a visit at 3 am India time': { preferredStart: istSlot(2, 3, 0) },
    'book a visit off the half hour': { preferredStart: istSlot(2, 10, 15) },
    'book a 3-hour visit that ends after 11 pm': { preferredStart: istSlot(2, 21, 0) },
    'give no place at all (no location, no address)': { location: null, address: '' },
  }
  for (const [label, overrides] of Object.entries(tries)) {
    test(`cannot ${label}`, async () => {
      await assertFails(book(db('alice', VERIFIED), booking('alice', overrides)))
    })
  }
  test('cannot leave out required fields (phone, hours, visit time, service)', async () => {
    for (const key of ['phone', 'hours', 'preferredStart', 'serviceId']) {
      const missing = booking('alice')
      delete missing[key]
      await assertFails(book(db('alice', VERIFIED), missing))
    }
  })
})

describe('bookings: reading and changing', () => {
  beforeEach(async () => {
    await seed('bookings/b1', { ...booking('alice'), createdAt: Timestamp.now() })
  })
  test('customers can read their own booking only', async () => {
    await assertSucceeds(getDoc(doc(db('alice', VERIFIED), 'bookings/b1')))
    await assertFails(getDoc(doc(db('mallory', VERIFIED), 'bookings/b1')))
    await assertFails(getDoc(doc(stranger(), 'bookings/b1')))
  })
  test('customers cannot list everyone’s bookings, only their own', async () => {
    await assertFails(getDocs(collection(db('mallory', VERIFIED), 'bookings')))
    await assertSucceeds(getDocs(query(collection(db('alice', VERIFIED), 'bookings'), where('uid', '==', 'alice'))))
  })
  test('customers cannot change or delete their booking', async () => {
    await assertFails(updateDoc(doc(db('alice', VERIFIED), 'bookings/b1'), { status: 'completed' }))
    await assertFails(updateDoc(doc(db('alice', VERIFIED), 'bookings/b1'), { message: 'edited' }))
    await assertFails(deleteDoc(doc(db('alice', VERIFIED), 'bookings/b1')))
  })
  test('admins can read every booking', async () => {
    await assertSucceeds(getDocs(collection(db('admin1', VERIFIED), 'bookings')))
  })
  test('admins cannot set a made-up status or rewrite the customer’s details', async () => {
    await assertFails(updateDoc(doc(db('admin1', VERIFIED), 'bookings/b1'), { status: 'hacked' }))
    await assertFails(updateDoc(doc(db('admin1', VERIFIED), 'bookings/b1'), { phone: '0000000000' }))
    await assertFails(updateDoc(doc(db('admin1', VERIFIED), 'bookings/b1'), { address: 'Somewhere else' }))
  })
})

// What a Saathi records for a Care Companion visit (₹499) at the default 20% company share.
const paid = (overrides = {}) => ({
  billPaise: 49900,
  extraPaise: 0,
  totalPaise: 49900,
  method: 'upi',
  commissionPercent: 20,
  companySharePaise: 9980,
  saathiSharePaise: 39920,
  ...overrides,
})

describe('bookings: assigning a Saathi and tracking the visit', () => {
  const visit = Timestamp.fromDate(new Date('2030-01-10T10:30:00+05:30'))
  const assignment = {
    assignedSaathiId: 's1',
    assignedSaathiName: 'Ravi K.',
    assignedSaathiPhone: '+91 91234 56780',
    scheduledAt: visit,
    status: 'assigned',
    assignedAt: serverTimestamp(),
  }
  const admin = () => doc(db('admin1', VERIFIED), 'bookings/b1')
  const owner = () => doc(db('alice', VERIFIED), 'bookings/b1')

  beforeEach(async () => {
    await seed('bookings/b1', { ...booking('alice'), createdAt: Timestamp.now() })
  })

  test('an admin assigns, but only the assigned Saathi starts or completes the visit', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertFails(updateDoc(admin(), { status: 'started', startedAt: serverTimestamp() }))
    await assertFails(updateDoc(admin(), { status: 'completed', completedAt: serverTimestamp() }))
    await assertFails(updateDoc(admin(), { status: 'completed', completedAt: serverTimestamp(), collection: paid() }))
    await assertFails(updateDoc(admin(), { collection: paid() }))
  })
  test('an admin can cancel a started visit, but not complete it or move it back to assigned', async () => {
    await seed('bookings/b1', {
      ...booking('alice'),
      ...assignment,
      assignedAt: Timestamp.now(),
      status: 'started',
      startedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    })
    await assertFails(updateDoc(admin(), { status: 'completed', completedAt: serverTimestamp(), collection: paid() }))
    await assertFails(updateDoc(admin(), assignment))
    await assertSucceeds(updateDoc(admin(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'admin' }))
  })
  test('the customer can see their assigned Saathi, number and visit time', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    const snap = await assertSucceeds(getDoc(owner()))
    if (snap.data().assignedSaathiPhone !== '+91 91234 56780') throw new Error('phone not readable by owner')
  })
  test('nobody else can see the Saathi’s number on someone’s booking', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertFails(getDoc(doc(db('mallory', VERIFIED), 'bookings/b1')))
    await assertFails(getDoc(doc(stranger(), 'bookings/b1')))
  })
  test('an admin cannot mark a booking assigned without a Saathi, number and time', async () => {
    await assertFails(updateDoc(admin(), { status: 'assigned', assignedAt: serverTimestamp() }))
    await assertFails(updateDoc(admin(), { ...assignment, assignedSaathiPhone: 'no number' }))
    await assertFails(updateDoc(admin(), { ...assignment, scheduledAt: 'tomorrow' }))
    await assertFails(updateDoc(admin(), { ...assignment, assignedSaathiName: '' }))
  })
  test('an admin cannot start or complete a visit that has no Saathi', async () => {
    await assertFails(updateDoc(admin(), { status: 'started', startedAt: serverTimestamp() }))
    await assertFails(updateDoc(admin(), { status: 'completed', completedAt: serverTimestamp() }))
  })
  test('progress times cannot be back-dated', async () => {
    const past = Timestamp.fromDate(new Date('2000-01-01'))
    await assertFails(updateDoc(admin(), { ...assignment, assignedAt: past }))
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertFails(updateDoc(admin(), { status: 'completed', completedAt: past }))
  })
  test('an admin can cancel, recorded as cancelled by the admin', async () => {
    await assertFails(updateDoc(admin(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer' }))
    await assertSucceeds(updateDoc(admin(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'admin' }))
  })
  test('a customer can cancel their own request while it is still unassigned', async () => {
    await assertSucceeds(updateDoc(owner(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer' }))
  })
  test('a customer cannot cancel once a Saathi is assigned (they call instead)', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertFails(updateDoc(owner(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer' }))
  })
  test('a customer cannot assign a Saathi, start or complete their own booking', async () => {
    await assertFails(updateDoc(owner(), assignment))
    await assertFails(updateDoc(owner(), { status: 'completed', completedAt: serverTimestamp() }))
    await assertFails(updateDoc(owner(), { assignedSaathiPhone: '9999999999' }))
  })
  test('a customer cannot sneak other changes into a cancellation', async () => {
    await assertFails(
      updateDoc(owner(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer', message: 'edited' }),
    )
    await assertFails(updateDoc(owner(), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'admin' }))
  })
  test('customers cannot ask for more time from the website (agreed with the Saathi at the visit instead)', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertFails(updateDoc(owner(), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp() }))
  })
  test('an admin approves extra time by moving to the plan that covers it', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'bookings/b1'), { extraHoursRequested: 2, extraRequestedAt: Timestamp.now() }))
    await assertFails(
      updateDoc(admin(), { hours: 5, extraHoursRequested: deleteField(), extraRequestedAt: deleteField() }),
    )
    await assertFails(
      updateDoc(admin(), { hours: 5, planId: 'day', planName: 'Day Companion', planPrice: '₹1 / up to 8 hrs' }),
    )
    await assertSucceeds(
      updateDoc(admin(), {
        hours: 5, planId: 'day', planName: 'Day Companion', planPrice: '₹999 / up to 8 hrs',
        extraHoursRequested: deleteField(), extraRequestedAt: deleteField(),
      }),
    )
  })
  test('an admin can decline extra time, and cannot invent a customer request', async () => {
    await assertFails(updateDoc(admin(), { extraHoursRequested: 3 }))
    await assertSucceeds(updateDoc(admin(), assignment))
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'bookings/b1'), { extraHoursRequested: 2, extraRequestedAt: Timestamp.now() }))
    await assertSucceeds(
      updateDoc(admin(), { extraHoursRequested: deleteField(), extraRequestedAt: deleteField(), extraDeclinedAt: serverTimestamp() }),
    )
  })
  test('nobody can cancel someone else’s booking', async () => {
    await assertFails(
      updateDoc(doc(db('mallory', VERIFIED), 'bookings/b1'), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer' }),
    )
  })
})

describe('applications', () => {
  test('a verified applicant can apply', async () => {
    await assertSucceeds(setDoc(doc(db('ravi', PHONE), 'applications', 'ravi'), application('ravi')))
  })
  test('a PAN-card applicant can apply with the full PAN', async () => {
    await assertSucceeds(
      setDoc(doc(db('ravi', PHONE), 'applications', 'ravi'), application('ravi', { idType: 'pan', idNumber: 'ABCDE1234F' })),
    )
  })
  test('an applicant can save their own sign-in email, but not anyone else’s', async () => {
    await assertSucceeds(
      setDoc(doc(db('priya', VERIFIED), 'applications', 'priya'), application('priya', { email: 'priya@example.com' })),
    )
    await assertFails(
      setDoc(doc(db('ravi', VERIFIED), 'applications', 'ravi'), application('ravi', { email: 'someone@example.com' })),
    )
    await assertFails(
      setDoc(doc(db('asha', PHONE), 'applications', 'asha'), application('asha', { email: 'asha@example.com' })),
    )
  })
  test('unconfirmed email accounts and signed-out visitors cannot apply', async () => {
    await assertFails(setDoc(doc(db('newbie', UNVERIFIED), 'applications', 'newbie'), application('newbie')))
    await assertFails(setDoc(doc(stranger(), 'applications', 'x'), application('x')))
  })
  const tries = {
    'store a full Aadhaar number': { idNumber: '123412341234' },
    'claim not to be an Indian citizen': { indianCitizen: false },
    'skip verification consent': { consent: false },
    'be under 18': { age: 12 },
    'use an unknown ID type': { idType: 'library-card', idNumber: 'LIB123' },
    'send a PAN in the wrong format': { idType: 'pan', idNumber: 'not-a-pan' },
    'start already verified': { status: 'verified' },
    'list no services': { services: [] },
    'smuggle in an extra field': { approvedBy: 'admin1' },
    'back-date the application': { createdAt: Timestamp.fromDate(new Date('2000-01-01')) },
    'apply for someone else': { uid: 'someone-else' },
  }
  for (const [label, overrides] of Object.entries(tries)) {
    test(`cannot ${label}`, async () => {
      await assertFails(setDoc(doc(db('ravi', PHONE), 'applications', 'ravi'), application('ravi', overrides)))
    })
  }
  test('one application per person: it is saved under their own user ID', async () => {
    await assertFails(setDoc(doc(db('ravi', PHONE), 'applications', 'random-id'), application('ravi')))
    await assertFails(setDoc(doc(db('ravi', PHONE), 'applications', 'sita'), application('ravi')))
    await assertSucceeds(setDoc(doc(db('ravi', PHONE), 'applications', 'ravi'), application('ravi')))
    // A second application would overwrite the first, which only admins may change.
    await assertFails(setDoc(doc(db('ravi', PHONE), 'applications', 'ravi'), application('ravi', { name: 'Again' })))
  })
  test('an applicant can look up their own application', async () => {
    await seed('applications/ravi', { ...application('ravi'), createdAt: Timestamp.now() })
    await assertSucceeds(getDocs(query(collection(db('ravi', PHONE), 'applications'), where('uid', '==', 'ravi'))))
  })
  test('applicants cannot approve themselves; admins can, but only to a real status', async () => {
    await seed('applications/a1', { ...application('ravi'), createdAt: Timestamp.now() })
    await assertFails(updateDoc(doc(db('ravi', PHONE), 'applications/a1'), { status: 'verified' }))
    await assertFails(updateDoc(doc(db('admin1', VERIFIED), 'applications/a1'), { status: 'hacked' }))
    await assertSucceeds(updateDoc(doc(db('admin1', VERIFIED), 'applications/a1'), { status: 'verified' }))
  })
  test('other applicants cannot read an application (it holds ID details)', async () => {
    await seed('applications/a1', { ...application('ravi'), createdAt: Timestamp.now() })
    await assertFails(getDoc(doc(db('mallory', PHONE), 'applications/a1')))
    await assertFails(getDocs(collection(db('mallory', PHONE), 'applications')))
  })
})

describe('full Aadhaar numbers', () => {
  const applyWithAadhaar = async (ctx, uid, appOverrides = {}, secretOverrides = {}) => {
    const store = ctx
    const appRef = doc(store, 'applications', uid)
    const batch = writeBatch(store)
    batch.set(appRef, application(uid, appOverrides))
    batch.set(doc(store, 'applicationSecrets', appRef.id), {
      uid,
      idNumber: '123412341234',
      createdAt: serverTimestamp(),
      ...secretOverrides,
    })
    await batch.commit()
    return appRef.id
  }

  test('an applicant saves the full number together with their Aadhaar application', async () => {
    await assertSucceeds(applyWithAadhaar(db('ravi', PHONE), 'ravi'))
  })
  test('only admins can read the full number; the applicant and others cannot', async () => {
    const id = await applyWithAadhaar(db('ravi', PHONE), 'ravi')
    await assertSucceeds(getDoc(doc(db('admin1', VERIFIED), 'applicationSecrets', id)))
    await assertFails(getDoc(doc(db('ravi', PHONE), 'applicationSecrets', id)))
    await assertFails(getDoc(doc(db('mallory', PHONE), 'applicationSecrets', id)))
    await assertFails(getDoc(doc(stranger(), 'applicationSecrets', id)))
    await assertFails(getDocs(collection(db('mallory', PHONE), 'applicationSecrets')))
  })
  test('a full number cannot be saved on its own, without its application', async () => {
    await assertFails(
      setDoc(doc(db('ravi', PHONE), 'applicationSecrets/orphan'), {
        uid: 'ravi', idNumber: '123412341234', createdAt: serverTimestamp(),
      }),
    )
  })
  test('the full number must be 12 digits and belong to an Aadhaar application', async () => {
    await assertFails(applyWithAadhaar(db('ravi', PHONE), 'ravi', {}, { idNumber: '1234' }))
    await assertFails(applyWithAadhaar(db('ravi', PHONE), 'ravi', { idType: 'pan', idNumber: 'ABCDE1234F' }))
    await assertFails(applyWithAadhaar(db('ravi', PHONE), 'ravi', {}, { uid: 'someone-else' }))
    await assertFails(applyWithAadhaar(db('ravi', PHONE), 'ravi', {}, { extra: 'field' }))
  })
  test('the application itself still holds only the masked number', async () => {
    await assertFails(setDoc(doc(db('ravi', PHONE), 'applications', 'ravi'), application('ravi', { idNumber: '123412341234' })))
  })
  test('nobody can change or delete a stored number, not even admins', async () => {
    const id = await applyWithAadhaar(db('ravi', PHONE), 'ravi')
    await assertFails(updateDoc(doc(db('admin1', VERIFIED), 'applicationSecrets', id), { idNumber: '999999999999' }))
    await assertFails(updateDoc(doc(db('ravi', PHONE), 'applicationSecrets', id), { idNumber: '999999999999' }))
    await assertFails(deleteDoc(doc(db('ravi', PHONE), 'applicationSecrets', id)))
  })
})

describe('public Saathi profiles', () => {
  const profile = { name: 'Ravi K.', area: 'Kukatpally', languages: 'Telugu', services: ['hospital-assistance'], createdAt: Timestamp.now() }
  test('anyone can read the public list', async () => {
    await seed('saathis/s1', profile)
    await assertSucceeds(getDocs(collection(stranger(), 'saathis')))
  })
  test('only admins can publish, edit or remove a profile', async () => {
    await assertFails(setDoc(doc(db('ravi', PHONE), 'saathis/s1'), profile))
    await assertSucceeds(setDoc(doc(db('admin1', VERIFIED), 'saathis/s1'), profile))
    await assertFails(updateDoc(doc(db('ravi', PHONE), 'saathis/s1'), { name: 'Hacked' }))
    await assertSucceeds(deleteDoc(doc(db('admin1', VERIFIED), 'saathis/s1')))
  })
  test('admins can publish with a server timestamp, as the admin page does for new profiles', async () => {
    await assertSucceeds(setDoc(doc(db('admin1', VERIFIED), 'saathis/s2'), { ...profile, createdAt: serverTimestamp() }))
  })
  test('even admins cannot put private details (phone, ID) on a public profile', async () => {
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'saathis/s1'), { ...profile, mobile: '9123456780' }))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'saathis/s1'), { ...profile, idNumber: 'ABCDE1234F' }))
  })
})

describe('Saathi website: access', () => {
  beforeEach(async () => {
    await seed('applications/s1', { ...application('ravi', { status: 'verified' }), createdAt: Timestamp.now() })
    await seed('applications/s2', { ...application('sita', { status: 'verified', name: 'Sita Rao' }), createdAt: Timestamp.now() })
    await seed('applications/p1', { ...application('pending-person'), createdAt: Timestamp.now() })
  })
  const staff = (applicationId, overrides = {}) => ({
    applicationId, name: 'Ravi Kumar', phone: '9123456780', active: true, createdAt: serverTimestamp(), ...overrides,
  })

  test('only admins can give a login access, and only for a verified application', async () => {
    await assertFails(setDoc(doc(db('ravi', PHONE), 'staff/ravi'), staff('s1')))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'staff/someone'), staff('p1')))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'staff/ravi'), staff('s1', { role: 'admin' })))
    await assertSucceeds(setDoc(doc(db('admin1', VERIFIED), 'staff/ravi'), staff('s1')))
    await assertSucceeds(updateDoc(doc(db('admin1', VERIFIED), 'staff/ravi'), { active: false }))
  })
  test('a Saathi can read their own access record, not others’', async () => {
    await seed('staff/ravi', { ...staff('s1'), createdAt: Timestamp.now() })
    await seed('staff/sita', { ...staff('s2'), createdAt: Timestamp.now() })
    await assertSucceeds(getDoc(doc(db('ravi', PHONE), 'staff/ravi')))
    await assertFails(getDoc(doc(db('ravi', PHONE), 'staff/sita')))
    await assertFails(getDocs(collection(db('ravi', PHONE), 'staff')))
  })
})

describe('Saathi website: visits and collections', () => {
  const visit = Timestamp.fromDate(new Date('2030-01-10T10:30:00+05:30'))
  const assignedTo = (saathiId) => ({
    ...booking('alice'),
    createdAt: Timestamp.now(),
    assignedSaathiId: saathiId,
    assignedSaathiName: 'Ravi K.',
    assignedSaathiPhone: '9123456780',
    scheduledAt: visit,
    assignedAt: Timestamp.now(),
    status: 'assigned',
  })
  const ravi = () => db('ravi', PHONE)
  const complete = (extra = {}) => ({ status: 'completed', completedAt: serverTimestamp(), collection: paid(), ...extra })

  beforeEach(async () => {
    await seed('applications/s1', { ...application('ravi', { status: 'verified' }), createdAt: Timestamp.now() })
    await seed('applications/s2', { ...application('sita', { status: 'verified' }), createdAt: Timestamp.now() })
    await seed('staff/ravi', { applicationId: 's1', name: 'Ravi Kumar', phone: '9123456780', active: true, createdAt: Timestamp.now() })
    await seed('staff/sita', { applicationId: 's2', name: 'Sita', phone: '9123456781', active: true, createdAt: Timestamp.now() })
    await seed('bookings/b1', assignedTo('s1'))
    await seed('bookings/b2', assignedTo('s2'))
  })

  test('a Saathi sees the visits assigned to them, with the customer’s address', async () => {
    const mine = await assertSucceeds(getDocs(query(collection(ravi(), 'bookings'), where('assignedSaathiId', '==', 's1'))))
    if (mine.size !== 1 || !mine.docs[0].data().address) throw new Error('expected one visit with an address')
    await assertSucceeds(getDoc(doc(ravi(), 'bookings/b1')))
  })
  test('a Saathi cannot see other Saathis’ visits or list all bookings', async () => {
    await assertFails(getDoc(doc(ravi(), 'bookings/b2')))
    await assertFails(getDocs(query(collection(ravi(), 'bookings'), where('assignedSaathiId', '==', 's2'))))
    await assertFails(getDocs(collection(ravi(), 'bookings')))
  })
  test('a switched-off login loses access straight away', async () => {
    await seed('staff/ravi', { applicationId: 's1', name: 'Ravi Kumar', phone: '9123456780', active: false, createdAt: Timestamp.now() })
    await assertFails(getDoc(doc(ravi(), 'bookings/b1')))
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), complete()))
  })
  test('a login without access cannot read or change visits', async () => {
    await assertFails(getDoc(doc(db('stranger', PHONE), 'bookings/b1')))
    await assertFails(updateDoc(doc(db('stranger', PHONE), 'bookings/b1'), complete()))
  })
  test('a Saathi starts and completes their visit with what was collected', async () => {
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b1'), { status: 'started', startedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b1'), complete()))
  })
  test('a Saathi can complete straight from assigned, and record an extra charge with a reason', async () => {
    await assertSucceeds(
      updateDoc(doc(ravi(), 'bookings/b1'), complete({
        collection: paid({ extraPaise: 10000, extraNote: 'One extra hour', totalPaise: 59900, companySharePaise: 11980, saathiSharePaise: 47920, method: 'cash' }),
      })),
    )
  })
  const cheats = {
    'record a lower bill than the plan price': paid({ billPaise: 100, totalPaise: 100, companySharePaise: 20, saathiSharePaise: 80 }),
    'lower the company share': paid({ companySharePaise: 100, saathiSharePaise: 49800 }),
    'use a lower percentage': paid({ commissionPercent: 5, companySharePaise: 2495, saathiSharePaise: 47405 }),
    'make the split not add up': paid({ saathiSharePaise: 49900 }),
    'make the total not add up': paid({ totalPaise: 10000, companySharePaise: 2000, saathiSharePaise: 8000 }),
    'add an extra charge with no reason': paid({ extraPaise: 5000, totalPaise: 54900, companySharePaise: 10980, saathiSharePaise: 43920 }),
    'record a negative extra': paid({ extraPaise: -5000, extraNote: 'discount', totalPaise: 44900, companySharePaise: 8980, saathiSharePaise: 35920 }),
    'use fractional paise': paid({ companySharePaise: 9980.5, saathiSharePaise: 39919.5 }),
    'use an unknown payment method': paid({ method: 'crypto' }),
    'add unknown fields': paid({ settled: true }),
  }
  for (const [label, collectionData] of Object.entries(cheats)) {
    test(`a Saathi cannot ${label}`, async () => {
      await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), complete({ collection: collectionData })))
    })
  }
  test('rounding: the company share rounds to the nearest paisa', async () => {
    await seed('config/finance', { commissionPercent: 33, updatedAt: Timestamp.now() })
    await seed('bookings/b3', { ...assignedTo('s1'), planId: 'quick', planName: 'Quick Companion', planPrice: '₹249 / up to 2 hrs', hours: 2 })
    const extra = { extraPaise: 1, extraNote: 'one paisa extra' }
    // 24901 paise at 33% = 8217.33 paise, so the share is 8217, not 8218.
    await assertFails(updateDoc(doc(ravi(), 'bookings/b3'), complete({
      collection: paid({ billPaise: 24900, ...extra, totalPaise: 24901, commissionPercent: 33, companySharePaise: 8218, saathiSharePaise: 16683 }),
    })))
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b3'), complete({
      collection: paid({ billPaise: 24900, ...extra, totalPaise: 24901, commissionPercent: 33, companySharePaise: 8217, saathiSharePaise: 16684 }),
    })))
  })
  test('the percentage must be the one the admin set', async () => {
    await seed('config/finance', { commissionPercent: 25, updatedAt: Timestamp.now() })
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), complete()))
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b1'), complete({
      collection: paid({ commissionPercent: 25, companySharePaise: 12475, saathiSharePaise: 37425 }),
    })))
  })
  test('a Saathi cannot change anything else on the visit', async () => {
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), { address: 'elsewhere' }))
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), { assignedSaathiId: 's2' }))
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), complete({ planId: 'property' })))
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), { status: 'cancelled' }))
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), { status: 'started', startedAt: Timestamp.fromDate(new Date('2000-01-01')) }))
  })
  test('a Saathi cannot complete someone else’s visit, or change a finished one', async () => {
    await assertFails(updateDoc(doc(ravi(), 'bookings/b2'), complete()))
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b1'), complete()))
    await assertFails(updateDoc(doc(ravi(), 'bookings/b1'), complete({ collection: paid({ method: 'cash' }) })))
  })
  test('admins can correct a collection, but a finished visit cannot be re-opened or moved', async () => {
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b1'), complete()))
    const admin = doc(db('admin1', VERIFIED), 'bookings/b1')
    await assertSucceeds(updateDoc(admin, { collection: paid({ method: 'cash' }) }))
    await assertFails(updateDoc(admin, { collection: paid({ companySharePaise: 1, saathiSharePaise: 49899 }) }))
    await assertFails(updateDoc(admin, { status: 'started' }))
    await assertFails(updateDoc(admin, { assignedSaathiId: 's2' }))
    await assertFails(updateDoc(admin, { collection: deleteField() }))
  })
  test('the customer can read what was collected on their visit', async () => {
    await assertSucceeds(updateDoc(doc(ravi(), 'bookings/b1'), complete()))
    await assertSucceeds(getDoc(doc(db('alice', VERIFIED), 'bookings/b1')))
  })
})

describe('company share settings and payments', () => {
  beforeEach(async () => {
    await seed('applications/s1', { ...application('ravi', { status: 'verified' }), createdAt: Timestamp.now() })
    await seed('staff/ravi', { applicationId: 's1', name: 'Ravi Kumar', phone: '9123456780', active: true, createdAt: Timestamp.now() })
    await seed('staff/sita', { applicationId: 's2', name: 'Sita', phone: '9123456781', active: true, createdAt: Timestamp.now() })
    await seed('settlements/pay_1', { saathiId: 's1', amountPaise: 9980, method: 'razorpay', createdAt: Timestamp.now() })
  })
  test('only admins can change the company share, to a whole percent from 0 to 100', async () => {
    await assertFails(setDoc(doc(db('ravi', PHONE), 'config/finance'), { commissionPercent: 0, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'config/finance'), { commissionPercent: 120, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'config/finance'), { commissionPercent: 20.5, updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(db('admin1', VERIFIED), 'config/finance'), { commissionPercent: 20, updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(db('ravi', PHONE), 'config/finance')))
  })
  test('a Saathi sees their own payments only', async () => {
    await assertSucceeds(getDocs(query(collection(db('ravi', PHONE), 'settlements'), where('saathiId', '==', 's1'))))
    await assertFails(getDocs(query(collection(db('sita', PHONE), 'settlements'), where('saathiId', '==', 's1'))))
    await assertFails(getDocs(collection(db('ravi', PHONE), 'settlements')))
  })
  test('a Saathi cannot record a payment themselves (only the server, after Razorpay confirms)', async () => {
    await assertFails(setDoc(doc(db('ravi', PHONE), 'settlements/fake'), { saathiId: 's1', amountPaise: 9980, method: 'razorpay', createdAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db('ravi', PHONE), 'settlements/pay_1'), { amountPaise: 99999 }))
    await assertFails(getDocs(collection(db('ravi', PHONE), 'settlementOrders')))
  })
  test('admins can record a payment received another way, and never edit or delete one', async () => {
    const manual = { saathiId: 's1', amountPaise: 5000, method: 'manual', note: 'Cash at office', recordedBy: 'admin1', createdAt: serverTimestamp() }
    await assertSucceeds(addDoc(collection(db('admin1', VERIFIED), 'settlements'), manual))
    await assertFails(addDoc(collection(db('admin1', VERIFIED), 'settlements'), { ...manual, method: 'razorpay' }))
    await assertFails(addDoc(collection(db('admin1', VERIFIED), 'settlements'), { ...manual, amountPaise: 0 }))
    await assertFails(addDoc(collection(db('admin1', VERIFIED), 'settlements'), { ...manual, recordedBy: 'someone' }))
    await assertFails(updateDoc(doc(db('admin1', VERIFIED), 'settlements/pay_1'), { amountPaise: 1 }))
    await assertFails(deleteDoc(doc(db('admin1', VERIFIED), 'settlements/pay_1')))
  })
})

describe('memberships', () => {
  // The month key the rules compute from a visit's start (UTC), e.g. "2026-10".
  const keyOf = (timestamp) => {
    const date = timestamp.toDate()
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }
  const visitAt = istSlot(3)
  const key = keyOf(visitAt)
  const membership = (overrides = {}) => ({
    uid: 'alice',
    planId: 'silver-care',
    planName: 'Silver Care',
    visitsPerMonth: 8,
    status: 'active',
    validFrom: inDays(-1),
    validUntil: inDays(40),
    used: {},
    note: 'Paid by UPI',
    updatedAt: serverTimestamp(),
    ...overrides,
  })
  const memberVisit = (overrides = {}) =>
    booking('alice', {
      planId: 'quick',
      planName: 'Quick Companion',
      planPrice: '₹249 / up to 2 hrs',
      hours: 2,
      preferredStart: visitAt,
      paidBy: 'membership',
      ...overrides,
    })

  /** Books a membership visit the way the website does: booking, active list and +1 together. */
  async function bookMember(store, data = memberVisit(), uid = 'alice', change = 1) {
    const mine = await getDocs(query(collection(store, 'bookings'), where('uid', '==', uid)))
    const active = mine.docs.filter((row) => ['new', 'assigned', 'started'].includes(row.data().status)).map((row) => row.id)
    const ref = doc(collection(store, 'bookings'))
    const batch = writeBatch(store)
    batch.set(ref, data)
    batch.set(doc(store, 'customers', uid), { active: [...active, ref.id] })
    batch.update(doc(store, 'memberships', uid), new FieldPath('used', keyOf(data.preferredStart)), increment(change), 'lastBookingId', ref.id)
    await batch.commit()
    return ref
  }

  const seedMembership = (overrides = {}) => seed('memberships/alice', { ...membership(overrides), updatedAt: Timestamp.now() })

  test('only admins switch a membership on, with the catalogue’s plan and visit count', async () => {
    await assertFails(setDoc(doc(db('alice', VERIFIED), 'memberships/alice'), membership()))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'memberships/alice'), membership({ visitsPerMonth: 99 })))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'memberships/alice'), membership({ planId: 'gold-care' })))
    await assertFails(setDoc(doc(db('admin1', VERIFIED), 'memberships/alice'), membership({ uid: 'bob' })))
    await assertSucceeds(setDoc(doc(db('admin1', VERIFIED), 'memberships/alice'), membership()))
  })
  test('customers read their own membership only', async () => {
    await seedMembership()
    await assertSucceeds(getDoc(doc(db('alice', VERIFIED), 'memberships/alice')))
    await assertFails(getDoc(doc(db('bob', VERIFIED), 'memberships/alice')))
    await assertFails(getDocs(collection(db('alice', VERIFIED), 'memberships')))
  })
  test('a member books a free visit, which uses one of the month’s visits', async () => {
    await seedMembership()
    await assertSucceeds(bookMember(db('alice', VERIFIED)))
    const after = await env.withSecurityRulesDisabled(async (ctx) => (await getDoc(doc(ctx.firestore(), 'memberships/alice'))).data())
    if (after.used[key] !== 1) throw new Error(`expected 1 visit used, got ${after.used[key]}`)
  })
  test('a free visit cannot be booked without using a visit, or by someone without a membership', async () => {
    await seedMembership()
    await assertFails(book(db('alice', VERIFIED), memberVisit()))
    await assertFails(bookMember(db('alice', VERIFIED), memberVisit(), 'alice', 2))
    await assertFails(bookMember(db('bob', VERIFIED), memberVisit({ uid: 'bob' }), 'bob'))
  })
  test('the monthly limit, dates, service and plan are enforced', async () => {
    await seedMembership({ used: { [key]: 8 } })
    await assertFails(bookMember(db('alice', VERIFIED)))
    await seedMembership({ validUntil: inDays(2) })
    await assertFails(bookMember(db('alice', VERIFIED)))
    await seedMembership({ status: 'cancelled' })
    await assertFails(bookMember(db('alice', VERIFIED)))
    await seedMembership()
    await assertFails(bookMember(db('alice', VERIFIED), memberVisit({ serviceId: 'elder-companionship', serviceName: 'Elder Companionship' })))
    await assertFails(
      bookMember(db('alice', VERIFIED), memberVisit({ planId: 'care', planName: 'Care Companion', planPrice: '₹499 / up to 4 hrs', hours: 4 })),
    )
  })
  test('customers cannot change their membership except through a booking', async () => {
    await seedMembership()
    await assertFails(updateDoc(doc(db('alice', VERIFIED), 'memberships/alice'), { used: {} }))
    await assertFails(updateDoc(doc(db('alice', VERIFIED), 'memberships/alice'), { validUntil: inDays(400) }))
    await assertFails(updateDoc(doc(db('alice', VERIFIED), 'memberships/alice'), { visitsPerMonth: 16 }))
  })
  test('cancelling a free visit gives it back, once', async () => {
    await seedMembership()
    const ref = await bookMember(db('alice', VERIFIED))
    const store = db('alice', VERIFIED)
    const cancel = () => {
      const batch = writeBatch(store)
      batch.update(doc(store, 'bookings', ref.id), { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: 'customer' })
      batch.update(doc(store, 'memberships/alice'), new FieldPath('used', key), increment(-1), 'lastBookingId', ref.id)
      return batch.commit()
    }
    await assertSucceeds(cancel())
    await assertFails(cancel())
  })
  test('a Saathi completes a membership visit with nothing collected; the company owes their share', async () => {
    await seed('applications/s1', { ...application('ravi', { status: 'verified' }), createdAt: Timestamp.now() })
    await seed('staff/ravi', { applicationId: 's1', name: 'Ravi Kumar', phone: '9123456780', active: true, createdAt: Timestamp.now() })
    await seed('bookings/m1', {
      ...memberVisit(),
      createdAt: Timestamp.now(),
      assignedSaathiId: 's1',
      assignedSaathiName: 'Ravi K.',
      assignedSaathiPhone: '9123456780',
      scheduledAt: visitAt,
      assignedAt: Timestamp.now(),
      status: 'assigned',
    })
    const membershipCollection = { billPaise: 24900, extraPaise: 0, totalPaise: 24900, method: 'membership', commissionPercent: 20, companySharePaise: -19920, saathiSharePaise: 19920 }
    const complete = (collectionData) => updateDoc(doc(db('ravi', PHONE), 'bookings/m1'), { status: 'completed', completedAt: serverTimestamp(), collection: collectionData })
    await assertFails(complete({ ...membershipCollection, method: 'cash', companySharePaise: 4980 }))
    await assertFails(complete({ ...membershipCollection, companySharePaise: 4980 }))
    await assertFails(complete({ ...membershipCollection, extraPaise: 5000, extraNote: 'Extra hour', totalPaise: 29900 }))
    await assertSucceeds(complete(membershipCollection))
  })
  test('a paid visit cannot be recorded as a membership visit', async () => {
    await seed('applications/s1', { ...application('ravi', { status: 'verified' }), createdAt: Timestamp.now() })
    await seed('staff/ravi', { applicationId: 's1', name: 'Ravi Kumar', phone: '9123456780', active: true, createdAt: Timestamp.now() })
    await seed('bookings/p1', {
      ...booking('alice', { planId: 'quick', planName: 'Quick Companion', planPrice: '₹249 / up to 2 hrs', hours: 2 }),
      createdAt: Timestamp.now(),
      assignedSaathiId: 's1',
      assignedSaathiName: 'Ravi K.',
      assignedSaathiPhone: '9123456780',
      scheduledAt: visitAt,
      assignedAt: Timestamp.now(),
      status: 'assigned',
    })
    await assertFails(
      updateDoc(doc(db('ravi', PHONE), 'bookings/p1'), {
        status: 'completed',
        completedAt: serverTimestamp(),
        collection: { billPaise: 24900, extraPaise: 0, totalPaise: 24900, method: 'membership', commissionPercent: 20, companySharePaise: -19920, saathiSharePaise: 19920 },
      }),
    )
  })
  test('admins record payouts to Saathis as negative amounts only', async () => {
    await seed('applications/s1', { ...application('ravi', { status: 'verified' }), createdAt: Timestamp.now() })
    const payout = { saathiId: 's1', amountPaise: -19920, method: 'payout', note: 'UPI to Saathi', recordedBy: 'admin1', createdAt: serverTimestamp() }
    await assertSucceeds(addDoc(collection(db('admin1', VERIFIED), 'settlements'), payout))
    await assertFails(addDoc(collection(db('admin1', VERIFIED), 'settlements'), { ...payout, amountPaise: 19920 }))
    await assertFails(addDoc(collection(db('admin1', VERIFIED), 'settlements'), { ...payout, method: 'manual' }))
    await assertFails(addDoc(collection(db('ravi', PHONE), 'settlements'), payout))
  })
})

describe('everything else is closed', () => {
  test('unknown collections cannot be read or written', async () => {
    await assertFails(setDoc(doc(db('alice', VERIFIED), 'users/alice'), { anything: true }))
    await assertFails(getDocs(collection(db('admin1', VERIFIED), 'secrets')))
  })
})
