/**
 * All brand copy and business data lives here so pages stay presentational.
 * Facts come from the Saathi First demo site and brand deck. Anything not
 * supplied is marked PLACEHOLDER and must be confirmed before launch.
 */

export const site = {
  name: 'Saathi First',
  tagline: "Someone you trust, when you can't be there.",
  city: 'Hyderabad, Telangana',
  phoneDisplay: '+91 97043 92250',
  phoneHref: 'tel:+919704392250',
  email: 'saathifirst@gmail.com',
  emailHref: 'mailto:saathifirst@gmail.com',
}

export type Service = {
  id: string
  name: string
  /** One-line summary used in the home showcase list. */
  summary: string
  /** Long-form copy used on the Services page. */
  heading: string
  paragraphs: string[]
  points: string[]
  image: string
  imageAlt: string
  /** Where the people are in the photo, so tall crops keep their faces in view. */
  imagePosition?: string
}

export const services: Service[] = [
  {
    id: 'hospital-assistance',
    name: 'Hospital Assistance',
    summary:
      'Support through hospital visits, doctor appointments, lab visits and medicine pickup.',
    heading: 'Making every hospital visit easier and stress-free.',
    paragraphs: [
      'We provide reliable support to seniors during hospital visits and appointments.',
      'Your Saathi can accompany your loved one and provide assistance throughout the hospital visit.',
    ],
    points: [
      'Hospital visit and appointment assistance.',
      'Support during registration and waiting.',
      'Accompaniment during consultations.',
    ],
    image: 'svc-hospital',
    imageAlt: 'A Saathi First companion handing a glass of water to an elderly woman in a hospital bed',
    imagePosition: '40% 40%',
  },
  {
    id: 'elder-companionship',
    name: 'Elder Companionship',
    summary:
      'Caring company and everyday support so seniors feel comfortable, valued and connected.',
    heading: 'Compassionate elder companionship for your loved ones.',
    paragraphs: [
      'Trusted support services designed to make everyday life easier and more comfortable for senior citizens.',
      'Saathi First provides caring companionship and emotional support for elderly loved ones, ensuring they feel valued, comfortable and never alone, even when their families live far away.',
    ],
    points: [
      'Friendly visits and meaningful conversations with seniors.',
      'Emotional support to reduce loneliness and isolation.',
      'Assistance with daily activities and personal needs.',
    ],
    image: 'svc-elder',
    imageAlt: 'A Saathi First companion reading with a smiling elderly woman holding a cup of tea',
    imagePosition: '45% 40%',
  },
  {
    id: 'banking-assistance',
    name: 'Banking Assistance',
    summary:
      'Help with bank visits, routine banking, pension enquiries and government paperwork.',
    heading: 'Reliable assistance for everyday banking and government services.',
    paragraphs: [
      'From banking services to government documentation and application processes, we accompany seniors and make their visits smoother and less stressful while keeping their families informed.',
    ],
    points: [
      'Accompany seniors to banks and government offices.',
      'Assist with bank visits and routine banking procedures.',
      'Support pension-related enquiries and documentation.',
    ],
    image: 'svc-banking',
    imageAlt: 'A Saathi First companion helping an elderly man fill in a form at a bank',
    imagePosition: '42% 40%',
  },
  {
    id: 'transportation-assistance',
    name: 'Transportation Assistance',
    summary:
      'Safe, comfortable travel to hospitals, appointments and essential errands.',
    heading: 'Safe and comfortable travel assistance for seniors.',
    paragraphs: [
      'From coordinating pickups to accompanying seniors to their destinations, we focus on their comfort and safety while keeping family members informed throughout the journey.',
      'Whether they need to visit a hospital, attend a bank appointment or run essential errands, we help make every journey convenient and worry-free.',
    ],
    points: [
      'Arrange transportation for hospital visits and medical appointments.',
      'Provide pickup and drop-off assistance for elderly individuals.',
      'Keep family members updated about pickup, arrival and drop-off.',
    ],
    image: 'svc-travel',
    imageAlt: 'A Saathi First companion helping an elderly woman step out of a car',
    imagePosition: '45% 40%',
  },
  {
    id: 'creche-services',
    name: 'Creche Services',
    summary:
      'Supervised childcare for weddings, family celebrations, corporate events and homes.',
    heading: 'Reliable creche services for events and residences.',
    paragraphs: [
      'From weddings and family celebrations to private residences and special gatherings, we help parents balance their commitments while ensuring their little ones receive attentive care and supervision.',
      'Our childcare support ensures children remain comfortable, engaged and cared for in a safe and welcoming environment.',
    ],
    points: [
      'Supervised childcare during weddings, parties and family events.',
      'Creche facilities for corporate events and special occasions.',
      'In-home childcare support at residential locations.',
    ],
    image: 'svc-children',
    imageAlt: 'A Saathi First companion playing with building blocks with children at a creche',
    imagePosition: '45% 40%',
  },
  {
    id: 'emergency-support',
    name: 'Emergency Support',
    summary:
      'Prompt coordination with family, assistance and transport when the unexpected happens.',
    heading: 'Support and coordination in times of need.',
    paragraphs: [
      'Saathi First provides prompt and dependable emergency coordination for elderly loved ones, ensuring they receive timely assistance and support during unexpected situations.',
      'When family members are unavailable or live far away, we help coordinate the necessary steps to ensure seniors are not left alone during stressful moments.',
    ],
    points: [
      'Coordinate immediate assistance during unexpected emergencies.',
      'Contact family members and designated emergency contacts promptly.',
      'Help arrange transportation to nearby hospitals or medical facilities.',
    ],
    image: 'svc-emergency',
    imageAlt: 'A Saathi First companion offering water to an unwell elderly man beside a first-aid kit',
    imagePosition: '45% 40%',
  },
  {
    id: 'property-monitoring',
    name: 'Property Monitoring',
    summary:
      'Scheduled visits, photo and video updates and maintenance help while you are away.',
    heading: 'Property monitoring and management.',
    paragraphs: [
      'We help you stay connected to your property even when you are away. Our property monitoring service provides regular visits, visual updates, and assistance with maintenance, tenants, documentation and unexpected issues.',
    ],
    points: [
      'Scheduled property visits and inspections, plus on-demand visits.',
      'Photos and videos with every inspection and regular condition reports.',
      'Early alerts for maintenance or unauthorised activity.',
      'Coordination with plumbers, electricians, cleaners and other service providers.',
      'Support with government or local-authority visits and documentation.',
      'Regular updates to property owners and NRI family members.',
    ],
    image: 'svc-property',
    imageAlt: 'A Saathi First team member reviewing a property report with an owner on a laptop',
    imagePosition: '50% 40%',
  },
]

/**
 * Everything on the Book a Saathi page: the services above plus one-time visits booked online on
 * their own plan (`onlyFor` in `plans`). These extras are not on the Our Services page.
 */
export const bookableServices: Service[] = [
  ...services,
  {
    id: 'event-temple',
    name: 'Event & Temple Visit Assistance',
    summary: 'Accompany your loved ones to family functions, weddings and temple visits.',
    heading: 'Accompany your loved ones to family functions, weddings and temple visits.',
    paragraphs: ['Accompany your loved ones to family functions, weddings and temple visits.'],
    points: ['Travel and entry assistance', 'Support with belongings', 'Companionship throughout'],
    image: 'travel-bus',
    imageAlt: 'A Saathi First companion travelling beside a smiling elderly woman',
    imagePosition: '50% 30%',
  },
]

export type Plan = {
  id: string
  name: string
  price: string
  unit: string
  description: string
  includes: string[]
  /**
   * Companion plans cover up to this many hours; customers pick their hours and the
   * smallest plan that covers them is used. Property Monitoring is per visit, so it has none.
   * Keep in step with planHours / planPrices in firestore.rules.
   */
  hours?: number
  /** Offered to customers as the "Whole day" option. */
  wholeDay?: boolean
  /**
   * The one plan for this service: booking it skips the "How long" step and uses this price and
   * these hours (Emergency Care). Such plans are not among the hourly companion plans.
   */
  onlyFor?: string
}

const companionServices = [
  'Hospital Assistance',
  'Elder Companionship',
  'Banking Assistance',
  'Transportation Assistance',
  'Creche Services',
]

export const plans: Plan[] = [
  {
    id: 'property',
    name: 'Property Monitoring',
    price: '₹199',
    unit: 'per visit',
    description:
      'Regular property visits with basic inspection, photos and updates to keep you informed.',
    includes: [
      'On-demand property visits',
      'Photos and videos with inspection reports',
      'Early alerts for unauthorised activity',
    ],
  },
  {
    id: 'quick',
    name: 'Quick Companion',
    price: '₹399',
    unit: 'up to 2 hrs',
    hours: 2,
    description: 'Ideal for quick and reliable support when you need it.',
    includes: companionServices,
  },
  {
    id: 'care',
    name: 'Care Companion',
    price: '₹699',
    unit: 'up to 4 hrs',
    hours: 4,
    description: 'Reliable companionship and assistance for your essential needs.',
    includes: companionServices,
  },
  {
    id: 'day',
    name: 'Day Companion',
    price: '₹999',
    unit: 'up to 8 hrs',
    hours: 8,
    description: 'Dedicated companionship and assistance throughout the day.',
    includes: companionServices,
  },
  {
    id: 'extended',
    name: 'Extended Companion',
    price: '₹1,299',
    unit: 'up to 12 hrs',
    hours: 12,
    wholeDay: true,
    description: 'Personalised companionship and support for a full day.',
    includes: companionServices,
  },
  {
    id: 'emergency',
    name: 'Emergency Care',
    price: '₹999',
    unit: 'up to 2 hrs',
    hours: 2,
    onlyFor: 'emergency-support',
    description: 'Prompt help from a Saathi when something unexpected happens.',
    includes: [
      'Emergency coordination',
      'Hospital or doctor visit support',
      'Updates to family and emergency contacts',
    ],
  },
  {
    id: 'event-temple',
    name: 'Event & Temple Visit Assistance',
    price: '₹499',
    unit: 'up to 4 hrs',
    hours: 4,
    onlyFor: 'event-temple',
    description: 'Accompany your loved ones to family functions, weddings and temple visits.',
    includes: ['Travel and entry assistance', 'Support with belongings', 'Companionship throughout'],
  },
]

export type Membership = {
  id: string
  name: string
  price: string
  description: string
  visits: string
  /** Free visits each calendar month; unused ones expire. Mirrors membershipVisits() in firestore.rules. */
  visitsPerMonth: number
  hoursEach: string
  includes: string[]
  /** One line listing what the plan does not cover. */
  notIncluded: string
  image: string
  imageAlt: string
  imagePosition: string
}

/**
 * Monthly memberships, taken from the plans artwork supplied on 18 Oct 2026.
 * Bought through the office (WhatsApp / UPI); an admin then switches it on (main/src/lib/membership.ts).
 */
export const memberships: Membership[] = [
  {
    id: 'silver-care',
    name: 'Silver Care',
    price: '₹1,499',
    description: 'For occasional companionship and everyday assistance.',
    visits: '4 visits per month',
    visitsPerMonth: 4,
    hoursEach: 'Up to 2 hours each',
    includes: [
      'Elder companionship',
      'Basic errands and shopping',
      'Appointment reminders',
      'Family updates after visits',
    ],
    notIncluded: 'Hospital accompaniment, bank/government office visits, transport',
    image: 'companionship',
    imageAlt: 'A Saathi First companion sharing tea with an elderly woman at home',
    imagePosition: '62% 40%',
  },
  {
    id: 'golden-care',
    name: 'Golden Care',
    price: '₹2,999',
    description: 'For regular support for elderly loved ones.',
    visits: '8 visits per month',
    visitsPerMonth: 8,
    hoursEach: 'Up to 2 hours each',
    includes: [
      'Hospital appointment support',
      'Bank & government office visits',
      'Grocery and medicine pickup',
      'Family updates after every visit',
    ],
    notIncluded: 'Medical procedures, long-term nursing, special transport',
    image: 'banking',
    imageAlt: 'A Saathi First companion going through papers with an elderly man at a bank desk',
    imagePosition: '50% 40%',
  },
]

export type IndividualService = {
  id: string
  name: string
  description: string
  points: string[]
  price: string
  unit: string
  /** Project photo; services without a fitting photo show their icon instead. */
  image?: string
  imageAlt?: string
  imagePosition?: string
}

/**
 * One-time services for the Individual Plans tab, taken from the artwork supplied on 18 Oct 2026.
 * Booked by WhatsApp for now: firestore.rules only accepts the per-visit plans above.
 */
export const individualServices: IndividualService[] = [
  {
    id: 'elder-companion',
    name: 'Elder Companion',
    description: 'Friendly companionship for your loved ones, keeping them happy, active and engaged.',
    points: ['Meaningful conversations', 'Walks and outdoor time', 'Social engagement & activities'],
    price: '₹199',
    unit: 'hour',
    image: 'companionship',
    imageAlt: 'A Saathi First companion sharing tea with an elderly woman at home',
    imagePosition: '62% 40%',
  },
  {
    id: 'hospital-appointment',
    name: 'Hospital Appointment Assistance',
    description: 'Accompany your loved ones to hospital appointments and help with the process.',
    points: ['Queue management', 'Doctor consultation support', 'Reports & prescription handling'],
    price: '₹299',
    unit: 'visit',
    image: 'hospital',
    imageAlt: 'A Saathi First companion sitting with an elderly man at his hospital bedside',
    imagePosition: '62% 45%',
  },
  {
    id: 'bank-government',
    name: 'Bank & Government Office Assistance',
    description: 'Help with banking, bill payments and government office visits.',
    points: ['Form filling and documentation', 'Token and queue support', 'Safe and reliable assistance'],
    price: '₹299',
    unit: 'visit',
    image: 'banking',
    imageAlt: 'A Saathi First companion going through papers with an elderly man at a bank desk',
    imagePosition: '50% 40%',
  },
  {
    id: 'transportation',
    name: 'Transportation Assistance',
    description: 'Safe and comfortable travel for your loved ones, within the city.',
    points: ['Pick-up and drop-off', 'Auto/cab coordination', 'Help with luggage and seating'],
    price: '₹349',
    unit: 'trip',
    image: 'transport',
    imageAlt: 'A Saathi First companion helping an elderly woman out of a car',
    imagePosition: '50% 35%',
  },
  {
    id: 'grocery-shopping',
    name: 'Grocery & Essential Shopping',
    description: 'Get daily essentials, groceries and household items, without the hassle.',
    points: ['List-based shopping', 'Bill and purchase updates', 'Safe and timely delivery'],
    price: '₹299',
    unit: 'visit',
  },
  {
    id: 'meal-routine',
    name: 'Meal & Daily Routine Assistance',
    description: 'Support with meals, hydration and daily routine activities.',
    points: ['Meal preparation / serving', 'Hydration reminders', 'Light housekeeping support'],
    price: '₹299',
    unit: 'visit',
  },
  {
    id: 'digital-assistance',
    name: 'Digital Assistance for Seniors',
    description: 'Help your loved ones stay connected and confident with technology.',
    points: ['Video calls & messaging', 'Online appointments & bill payments', 'Smartphone / app training'],
    price: '₹199',
    unit: 'session',
    image: 'caring-call',
    imageAlt: 'A Saathi First companion on a phone call beside an elderly woman at home',
    imagePosition: '58% 40%',
  },
  {
    id: 'event-temple',
    name: 'Event & Temple Visit Assistance',
    description: 'Accompany your loved ones to family functions, weddings and temple visits.',
    points: ['Travel and entry assistance', 'Support with belongings', 'Companionship throughout'],
    price: '₹499',
    unit: 'up to 4 hrs',
    image: 'travel-bus',
    imageAlt: 'A Saathi First companion travelling beside a smiling elderly woman',
    imagePosition: '50% 30%',
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance Coordination',
    description: 'Get trusted help for everyday home maintenance needs.',
    points: ['Plumber, electrician, cleaning & pest control', 'Timely coordination and follow-up', 'Verified professionals'],
    price: '₹199',
    unit: 'coordination fee',
  },
]

export type AddOn = { id: string; name: string; description: string; price: string; unit: string }

/** Premium add-ons, supplied on 18 Oct 2026. Booked by WhatsApp, like the memberships. */
export const premiumAddOns: AddOn[] = [
  {
    id: 'extra-hospital-visit',
    name: 'Extra Hospital Visit',
    description: 'Additional hospital accompaniment beyond the visits included in a membership.',
    price: '₹399',
    unit: 'visit',
  },
  {
    id: 'extended-companionship',
    name: 'Extended Companionship',
    description: 'Add extra hours of companionship, conversation, and everyday assistance.',
    price: '₹199',
    unit: 'extra hour',
  },
  {
    id: 'special-transportation',
    name: 'Special Transportation',
    description: 'Arrange additional trips for medical appointments, shopping, or family functions.',
    price: '₹349',
    unit: 'trip',
  },
  {
    id: 'medicine-pickup',
    name: 'Medicine Pickup',
    description: 'Collect prescribed medicines and arrange refills with family approval.',
    price: '₹199',
    unit: 'pickup',
  },
  {
    id: 'special-event-assistance',
    name: 'Special Event Assistance',
    description: 'Additional support for weddings, family celebrations, and religious outings.',
    price: '₹499',
    unit: 'outing',
  },
  {
    id: 'priority-booking',
    name: 'Priority Booking',
    description: 'Priority scheduling for available appointment slots, subject to staff availability.',
    price: '₹199',
    unit: 'booking',
  },
]

const allCompanionPlans = ['quick', 'care', 'day', 'extended']

/**
 * What the Our Services "See plans" pop-up lists for each service, mirroring the Our Plans page:
 * `perVisit` (Individual Plans tab, booked online), `individual` (one-time services from that tab),
 * `memberships` (Monthly Memberships tab) and `addOns` (Premium Add-ons tab).
 */
export const servicePlans: Record<
  string,
  { perVisit: string[]; individual: string[]; memberships: string[]; addOns: string[] }
> = {
  'hospital-assistance': {
    perVisit: allCompanionPlans,
    individual: [],
    memberships: ['golden-care'],
    addOns: ['extra-hospital-visit', 'medicine-pickup', 'priority-booking'],
  },
  'elder-companionship': {
    perVisit: [...allCompanionPlans, 'event-temple'],
    individual: [],
    memberships: ['silver-care'],
    addOns: ['extended-companionship', 'special-event-assistance'],
  },
  'banking-assistance': {
    perVisit: allCompanionPlans,
    individual: [],
    memberships: ['golden-care'],
    addOns: ['priority-booking'],
  },
  'transportation-assistance': {
    perVisit: [...allCompanionPlans, 'event-temple'],
    individual: [],
    memberships: [],
    addOns: ['special-transportation'],
  },
  'creche-services': {
    perVisit: allCompanionPlans,
    individual: [],
    memberships: [],
    addOns: ['special-event-assistance'],
  },
  'emergency-support': {
    perVisit: ['emergency'],
    individual: [],
    memberships: [],
    addOns: ['medicine-pickup', 'priority-booking'],
  },
  'property-monitoring': {
    perVisit: ['property'],
    individual: [],
    memberships: [],
    addOns: [],
  },
}

export const valueCards = [
  {
    title: 'By their side, on their schedule.',
    body: 'A Saathi accompanies your loved one wherever the day takes them.',
    image: 'companionship',
    imageAlt: 'A Saathi First companion sharing tea and a book with an elderly woman',
    position: '82% 40%',
    shift: '',
    tone: 'dark' as const,
  },
  {
    title: 'Every update, shared with family.',
    body: 'We keep you informed at pickup, arrival and drop-off, so you are never left guessing.',
    image: 'elder-sofa',
    imageAlt: 'A Saathi First companion laughing with an elderly woman on a sofa',
    position: '74% 50%',
    shift: '',
    tone: 'light' as const,
  },
  {
    title: 'Verified, trained and dependable.',
    body: 'Every Saathi completes identity and background verification and training before their first assignment.',
    image: 'saathi-portrait',
    imageAlt: 'A Saathi First companion in a burgundy polo, ready to help',
    position: '0% 50%',
    // The photo's subject sits on its left, so it is slid right to clear the copy.
    shift: 'translate-x-[28%] nav:translate-x-[40%]',
    tone: 'dark' as const,
  },
]

export const comparison = {
  ours: 'With Saathi First',
  theirs: 'Ad-hoc arrangements',
  rows: [
    { label: 'Who shows up', value: 'An identity and background-verified Saathi' },
    { label: 'Preparation', value: 'Trained before the first assignment' },
    { label: 'Family updates', value: 'Informed at pickup, arrival and drop-off' },
    { label: 'Pricing', value: 'Clear plans from ₹199 per visit' },
    { label: 'Flexibility', value: 'Book from 2 hours to a full 12-hour day' },
    { label: 'Emergencies', value: 'Coordination with family and nearby hospitals' },
    { label: 'Experience', value: 'One team for hospital, bank, travel and home' },
  ],
}

export const steps = [
  {
    title: 'Tell us what you need',
    body: 'Choose the service your loved one needs and a plan that fits, from a single property visit to a full day of companionship.',
  },
  {
    title: 'We assign a Saathi',
    body: 'Our team assigns a trained, verified Saathi to assist your parent or loved one.',
  },
  {
    title: 'Your Saathi is there',
    body: 'At the hospital, the bank, on the road or at home, your Saathi stays alongside and helps at every step.',
  },
  {
    title: 'You stay informed',
    body: 'We keep family members updated about pickup, arrival and drop-off, and share an update once the service is completed.',
  },
  {
    title: 'Peace of mind, every time',
    body: 'Your loved ones feel valued, comfortable and never alone, even when you live far away. Book again whenever you need us.',
  },
]

export const faqs = [
  {
    q: 'What is Saathi First?',
    a: 'Saathi First provides reliable elder-care, personal assistance, property monitoring and support services, helping families stay connected with their loved ones when they cannot be there in person.',
  },
  {
    q: 'Who is a Saathi?',
    a: 'A Saathi is a trusted companion who supports seniors in their everyday needs. Every Saathi goes through identity and background verification and training before any customer assignment.',
  },
  {
    q: 'What services does Saathi First offer?',
    a: 'Hospital assistance, elder companionship, banking assistance, transportation assistance, creche services, emergency support and property monitoring.',
  },
  {
    q: 'How much does it cost?',
    a: 'Property Monitoring starts at ₹199 per visit. Companion plans are ₹399 for up to 2 hours, ₹699 for up to 4 hours, ₹999 for up to 8 hours and ₹1,299 for up to 12 hours. Emergency Care is ₹999 for up to 2 hours.',
  },
  {
    q: 'Will my family be kept informed?',
    a: 'Yes. We keep family members updated about pickup, arrival and drop-off, and you receive an update after the service is completed.',
  },
  {
    q: 'Where does Saathi First operate?',
    a: 'We currently serve families in Hyderabad, Telangana. Get in touch to check availability for your locality.',
  },
  {
    q: 'How do I become a Saathi?',
    a: 'Apply through the Become a Saathi page. The next step is identity and background verification, followed by training, before any customer assignment.',
  },
]

export const policies = [
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'payment-policy', title: 'Payment Policy' },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions' },
  { slug: 'refund-policy', title: 'Refund Policy' },
]

export const navLinks = [
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Our Plans', to: '/plans' },
  { label: 'Become a Saathi', to: '/become-a-saathi' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Contact Us', to: '/contact' },
]
