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
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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

const booking = (uid, overrides = {}) => ({
  uid,
  name: 'Priya Sharma',
  phone: '98765 43210',
  planId: 'care',
  planName: 'Care Companion',
  planPrice: '₹499 / up to 4 hrs',
  hours: 3,
  preferredStart: inDays(2),
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
    await assertFails(addDoc(collection(stranger(), 'bookings'), booking('anyone')))
  })
  test('an email account that has not confirmed its address cannot book', async () => {
    await assertFails(addDoc(collection(db('newbie', UNVERIFIED), 'bookings'), booking('newbie')))
  })
  test('verified email and phone accounts can book', async () => {
    await assertSucceeds(addDoc(collection(db('alice', VERIFIED), 'bookings'), booking('alice')))
    await assertSucceeds(addDoc(collection(db('bob', PHONE), 'bookings'), booking('bob')))
  })
  test('phone numbers typed with +91, spaces or a leading 0 are accepted', async () => {
    for (const phone of ['+91 98765 43210', '098765-43210', '9876543210']) {
      await assertSucceeds(addDoc(collection(db('alice', VERIFIED), 'bookings'), booking('alice', { phone })))
    }
  })
  test('a booking without a location (typed address only) is accepted', async () => {
    await assertSucceeds(addDoc(collection(db('alice', VERIFIED), 'bookings'), booking('alice', { location: null })))
  })
  test('a booking with no Saathi preference is accepted', async () => {
    const plain = booking('alice')
    for (const key of ['saathiId', 'saathiName', 'saathiChoice']) delete plain[key]
    await assertSucceeds(addDoc(collection(db('alice', VERIFIED), 'bookings'), plain))
  })
  test('a whole-day booking (12 hours, Extended Companion) is accepted', async () => {
    await assertSucceeds(
      addDoc(
        collection(db('alice', VERIFIED), 'bookings'),
        booking('alice', { hours: 12, planId: 'extended', planName: 'Extended Companion', planPrice: '₹1,299 / up to 12 hrs' }),
      ),
    )
  })
  test('a property visit is booked per visit, with no hours', async () => {
    await assertSucceeds(
      addDoc(
        collection(db('alice', VERIFIED), 'bookings'),
        booking('alice', {
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
    await assertFails(addDoc(collection(db('mallory', VERIFIED), 'bookings'), booking('alice')))
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
    'give no place at all (no location, no address)': { location: null, address: '' },
  }
  for (const [label, overrides] of Object.entries(tries)) {
    test(`cannot ${label}`, async () => {
      await assertFails(addDoc(collection(db('alice', VERIFIED), 'bookings'), booking('alice', overrides)))
    })
  }
  test('cannot leave out required fields (phone, hours, visit time, service)', async () => {
    for (const key of ['phone', 'hours', 'preferredStart', 'serviceId']) {
      const missing = booking('alice')
      delete missing[key]
      await assertFails(addDoc(collection(db('alice', VERIFIED), 'bookings'), missing))
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

  test('the full journey works: assign, start, complete', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertSucceeds(updateDoc(admin(), { status: 'started', startedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(admin(), { status: 'completed', completedAt: serverTimestamp() }))
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
  test('a customer can ask for more time once their Saathi is confirmed', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertSucceeds(updateDoc(owner(), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp() }))
  })
  test('a customer cannot ask for more time before confirmation, past a whole day, or for others', async () => {
    await assertFails(updateDoc(owner(), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertFails(updateDoc(owner(), { extraHoursRequested: 10, extraRequestedAt: serverTimestamp() }))
    await assertFails(updateDoc(owner(), { extraHoursRequested: 0, extraRequestedAt: serverTimestamp() }))
    await assertFails(updateDoc(owner(), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp(), hours: 5 }))
    await assertFails(
      updateDoc(doc(db('mallory', VERIFIED), 'bookings/b1'), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp() }),
    )
  })
  test('an admin approves extra time by moving to the plan that covers it', async () => {
    await assertSucceeds(updateDoc(admin(), assignment))
    await assertSucceeds(updateDoc(owner(), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp() }))
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
    await assertSucceeds(updateDoc(owner(), { extraHoursRequested: 2, extraRequestedAt: serverTimestamp() }))
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
    await assertSucceeds(addDoc(collection(db('ravi', PHONE), 'applications'), application('ravi')))
  })
  test('a PAN-card applicant can apply with the full PAN', async () => {
    await assertSucceeds(
      addDoc(collection(db('ravi', PHONE), 'applications'), application('ravi', { idType: 'pan', idNumber: 'ABCDE1234F' })),
    )
  })
  test('unconfirmed email accounts and signed-out visitors cannot apply', async () => {
    await assertFails(addDoc(collection(db('newbie', UNVERIFIED), 'applications'), application('newbie')))
    await assertFails(addDoc(collection(stranger(), 'applications'), application('x')))
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
      await assertFails(addDoc(collection(db('ravi', PHONE), 'applications'), application('ravi', overrides)))
    })
  }
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

describe('everything else is closed', () => {
  test('unknown collections cannot be read or written', async () => {
    await assertFails(setDoc(doc(db('alice', VERIFIED), 'users/alice'), { anything: true }))
    await assertFails(getDocs(collection(db('admin1', VERIFIED), 'secrets')))
  })
})
