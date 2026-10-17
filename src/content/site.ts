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
    imageAlt:
      'Two Saathi First companions helping an elderly couple at a hospital outpatient desk',
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
    imageAlt: 'A Saathi First companion holding hands with a smiling elderly woman at home',
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
    imageAlt: 'Saathi First companions assisting an elderly couple at a bank counter',
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
    imageAlt: 'Saathi First companions travelling with seniors by bus and by car',
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
    imageAlt: 'A Saathi First companion playing with children at an event creche',
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
    imageAlt: 'Saathi First companions supporting seniors arriving at an emergency department',
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
}

const companionServices = [
  'Hospital Assistance',
  'Elder Companionship',
  'Banking Assistance',
  'Transportation Assistance',
  'Creche Services',
  'Emergency Support',
]

export const plans: Plan[] = [
  {
    id: 'property',
    name: 'Property Monitoring',
    price: '₹99',
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
    price: '₹249',
    unit: 'up to 2 hrs',
    hours: 2,
    description: 'Ideal for quick and reliable support when you need it.',
    includes: companionServices,
  },
  {
    id: 'care',
    name: 'Care Companion',
    price: '₹499',
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
]

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
    { label: 'Pricing', value: 'Clear plans from ₹99 per visit' },
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
    a: 'Property Monitoring starts at ₹99 per visit. Companion plans are ₹249 for up to 2 hours, ₹499 for up to 4 hours, ₹999 for up to 8 hours and ₹1,299 for up to 12 hours.',
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
