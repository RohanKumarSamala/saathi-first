import { plans, site } from './site'

/**
 * Text of the four policy pages (footer links). Written from how the websites actually work
 * (see firestore.rules and the booking, Saathi and admin code); keep them in step when that
 * changes. Have a lawyer review the text before launch.
 *
 * Business details only the owners can supply live in `legal`. Fill them in and set
 * `reviewed: true` once the text is approved; until then each page shows a "draft" note.
 */
export const legal = {
  /** Registered business name, e.g. "Saathi First Care Services LLP". Empty shows the brand name. */
  businessName: '',
  /** Registered office address. Empty hides the address line. */
  registeredAddress: '',
  /** Grievance Officer's name (Consumer Protection (E-Commerce) Rules, 2020). Empty: contact details only. */
  grievanceOfficer: '',
  lastUpdated: '19 October 2026',
  /** Days after a visit within which a customer can report an overcharge or a missed service. CONFIRM. */
  refundClaimDays: 7,
  /** Working days to pay an approved refund. CONFIRM. */
  refundProcessingDays: 7,
  /** True once a lawyer has approved the text. Until then the pages carry a draft note. */
  reviewed: false,
}

export type Block = string | { list: string[] }
export type Section = { heading: string; body: Block[] }
export type PolicyText = { summary: string; sections: Section[] }

const business = legal.businessName || site.name
const contactLine = `Email ${site.email} or call ${site.phoneDisplay} (WhatsApp on the same number).`
const grievance = legal.grievanceOfficer
  ? `Our Grievance Officer is ${legal.grievanceOfficer}. ${contactLine}`
  : `Write to us with “Grievance” in the subject. ${contactLine}`

const contactSection: Section = {
  heading: 'Contact us',
  body: [
    `${business}, ${legal.registeredAddress || site.city}.`,
    contactLine,
    `For complaints: ${grievance} We acknowledge complaints within 48 hours and aim to resolve them within one month.`,
  ],
}

const planLines = plans.map((plan) => `${plan.name}: ${plan.price} ${plan.unit}`)

const privacy: PolicyText = {
  summary:
    'What personal information we collect when you book a Saathi, apply to become one, or use our websites, why we need it, who sees it, and the choices you have.',
  sections: [
    {
      heading: 'Who we are',
      body: [
        `${business} (“we”, “us”) arranges verified companions, called Saathis, to accompany and help seniors and families in ${site.city}. This policy covers our main website, the Saathi website our Saathis use, and the admin website our team uses.`,
        'We handle your information under the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000. By using our websites you agree to the uses described here; where we rely on your consent, you can withdraw it at any time (see “Your rights”).',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        { list: [
          'Your account: your mobile number, email address and name, depending on how you sign in (phone code, email and password, or Google). Passwords are handled by Google Firebase Authentication; we never see them.',
          'Your bookings: the name and mobile number you give, the service, hours and plan, the date and time you choose, the visit address, any note you add, and your device’s location if you tap “Use my current location” (taken once, only when you tap).',
          'Your visits: which Saathi was assigned, visit times, the amount you paid the Saathi, how you paid (UPI or cash) and any extra charge with its reason.',
          'Saathi applicants: name, mobile number, age, area, languages, experience, the services offered, a declaration of Indian citizenship, and a government ID type and number. An Aadhaar number is kept in a separate restricted record that only our verification team can open; elsewhere only its last four digits are shown. Other ID numbers are stored in full.',
          'Saathis: the visits assigned to them, what they collected, and their payments to us. Those payments go through Razorpay; we receive the payment reference, amount and time, not card or UPI login details.',
        ] },
        'Bookings often concern someone else, such as a parent. Please share their details only with their agreement. Notes are not the place for medical records; include only what the Saathi needs, such as the hospital name.',
      ],
    },
    {
      heading: 'Cookies and tracking',
      body: [
        'We do not use advertising or analytics cookies. Your browser stores sign-in information so you stay signed in. When you sign in with a phone code, Google reCAPTCHA checks that you are not an automated program and may set its own cookies.',
      ],
    },
    {
      heading: 'How we use it',
      body: [
        { list: [
          'To take your booking, assign a Saathi, and contact you about it by phone or WhatsApp.',
          'To give the assigned Saathi what they need for the visit.',
          'To verify Saathi applicants before any customer assignment.',
          'To record payments for visits and the share Saathis pay to us.',
          'To keep our service safe, investigate complaints, and meet legal and tax requirements.',
        ] },
        'We do not sell your personal information or use it for advertising.',
      ],
    },
    {
      heading: 'Who can see it',
      body: [
        { list: [
          'The Saathi assigned to your visit sees your name, mobile number, address, shared location, note and visit details, for that visit only.',
          'You see your assigned Saathi’s name and phone number on My bookings.',
          'The public “Our Saathis” page shows verified Saathis’ first name and last initial, area, languages and services. Never their phone number or ID.',
          'Our admin team sees bookings, applications and payments to run the service.',
          'Service providers who run parts of the service for us: Google (Firebase sign-in and database, Google sign-in, reCAPTCHA, and Google Maps when a Saathi opens directions), Cloudflare (website hosting) and Razorpay (Saathi payments). Their servers may be outside India.',
          'WhatsApp, only when you choose to message us or your Saathi; the message is sent from your own app.',
          'Government authorities, when the law requires it.',
        ] },
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'We keep booking, visit and payment records for as long as we need them for the purposes above and as tax and other laws require. Saathi verification records are kept while the Saathi works with us and afterwards only as long as the law requires. When we no longer need information, we delete it.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'You can ask us to:',
        { list: [
          'tell you what personal information we hold about you and who we have shared it with;',
          'correct or complete it;',
          'delete it, and close your account (we may keep records the law requires us to keep);',
          'withdraw a consent you gave;',
          'name someone to act for you if you are unable to.',
        ] },
        `To use any of these rights, ${contactLine} If you are not satisfied with our answer, you can complain to the Data Protection Board of India.`,
      ],
    },
    {
      heading: 'How we protect it',
      body: [
        'Our websites use HTTPS. You must sign in to book or apply. Our database rules let customers see only their own bookings, Saathis only the visits assigned to them, and only our admin team everything else; full Aadhaar numbers are restricted further. No system is perfectly secure, so please keep your sign-in details and phone to yourself and tell us at once if you think your account has been misused.',
      ],
    },
    {
      heading: 'Children',
      body: [
        'You must be 18 or older to create an account or book. For Creche Services we collect details about a child only from their parent or guardian, and only what the visit needs.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [`If we change this policy we will update this page and the “Last updated” date. Significant changes will be shown on the website before they apply.`],
    },
    contactSection,
  ],
}

const payment: PolicyText = {
  summary:
    'What our services cost, how and when you pay, and how payments between Saathis and Saathi First work.',
  sections: [
    {
      heading: 'Prices',
      body: [
        'Each booking is for one plan. Companion plans cover up to the hours shown; you choose your hours and the smallest plan that covers them is used.',
        { list: planLines },
        'The price for your booking is shown before you confirm it and appears on My bookings. Monthly memberships and premium add-ons are arranged with our team on WhatsApp or by phone, and their price and payment terms are confirmed with you then.',
      ],
    },
    {
      heading: 'How you pay',
      body: [
        'You do not pay anything on our website. You pay at the visit, directly to your assigned Saathi, by UPI (scanning the Saathi’s QR code) or in cash.',
        { list: [
          'You pay the price of your plan.',
          'If you agree extra time with your Saathi during the visit, it is added as an extra charge.',
          'Any other extra charge must be agreed with you before it is added, and the Saathi records what it was for.',
          'After the visit, the amount the Saathi recorded appears on My bookings. If it is not what you paid, contact us.',
        ] },
      ],
    },
    {
      heading: 'Stay safe',
      body: [
        { list: [
          'Pay only your assigned Saathi, whose name and number are on My bookings, and only at the visit.',
          'Nobody from Saathi First will ask you for an OTP, UPI PIN, card number or password. Never share them.',
          `If anyone asks for an advance payment, or for payment to a different person or account, do not pay and call us on ${site.phoneDisplay}.`,
        ] },
      ],
    },
    {
      heading: 'Receipts',
      body: ['Your record of each visit and payment is on My bookings. If you need a receipt, contact us.'],
    },
    {
      heading: 'For Saathis',
      body: [
        'Saathis collect the customer’s payment at the visit and record it truthfully on the Saathi website, including any extra charge and its reason. The company’s share of each visit, at the percentage agreed with Saathi First, is due within 48 hours of the visit ending.',
        'Saathis pay it on the Saathi website through Razorpay, using UPI or the other methods Razorpay offers, or in another way agreed with our office. Razorpay processes the payment; we do not see card or UPI login details. Each payment is listed in the Saathi’s payment history. Paying more than is due is kept as credit against the next visits.',
      ],
    },
    contactSection,
  ],
}

const refund: PolicyText = {
  summary: 'How to cancel a booking, and how refunds work when you have paid for a visit.',
  sections: [
    {
      heading: 'Cancelling a booking',
      body: [
        { list: [
          'Before a Saathi is assigned (“Finding your Saathi” on My bookings), you can cancel there yourself.',
          'Once a Saathi is assigned, message or call us to cancel or change the time.',
          'Because you pay at the visit, nothing is charged for a cancelled booking, and we do not charge a cancellation fee.',
          'If we cannot find a Saathi for your time, we will contact you to change it or cancel it, at no charge.',
        ] },
      ],
    },
    {
      heading: 'When you can ask for a refund',
      body: [
        'You pay the Saathi at the visit, so a refund applies when something went wrong with a payment:',
        { list: [
          'you were charged more than your plan and the extras you agreed to;',
          'you paid, but the visit did not take place, or was cut short by us or the Saathi;',
          'you paid twice for the same visit.',
        ] },
        'A visit completed as booked is not refundable.',
      ],
    },
    {
      heading: 'How to ask',
      body: [
        `Contact us within ${legal.refundClaimDays} days of the visit with the booking (name, service and date) and, if you have it, your UPI transaction reference. ${contactLine}`,
        `We check the visit record and speak to the Saathi, and tell you our decision. If we approve a refund, we pay it within ${legal.refundProcessingDays} working days: to the UPI account you paid from, or by UPI or cash as agreed with you if you paid in cash.`,
      ],
    },
    {
      heading: 'Memberships and add-ons',
      body: ['Cancellation and refund terms for monthly memberships and premium add-ons are confirmed with you when you arrange them with our team.'],
    },
    contactSection,
  ],
}

const terms: PolicyText = {
  summary: `The terms for using ${site.name}’s websites and booking our services. Please read them with our Privacy, Payment and Refund policies.`,
  sections: [
    {
      heading: 'About our service',
      body: [
        `${business} arranges Saathis, companions who have completed identity and background verification and training, to accompany and assist seniors and families in ${site.city}: hospital visits, companionship, banking and government-office visits, transport, creche services, emergency coordination and property monitoring.`,
        'Saathis are not doctors, nurses or medical staff and do not give medical treatment or advice. In a medical emergency, call 108 or 112 first.',
        'For banking and documents, a Saathi accompanies and helps; decisions and transactions remain the senior’s own. Never share bank PINs, OTPs or passwords with anyone, including a Saathi.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'You need to sign in to book, using a phone code, email and password, or Google. You must be 18 or older, give accurate details, and keep your sign-in to yourself. You are responsible for bookings made from your account.',
      ],
    },
    {
      heading: 'Bookings',
      body: [
        { list: [
          'A booking is a request. We confirm it, assign a Saathi who offers the service, and may contact you to confirm details. A Saathi is assigned subject to availability.',
          'All times are India time (IST). Visits can start from 7 am, must end by 11 pm (Property Monitoring visits start by 8 pm), and can be booked from at least 90 minutes ahead up to 90 days ahead.',
          'You can have up to 3 bookings in progress at a time.',
          'We may change the assigned Saathi if needed, and will tell you.',
        ] },
      ],
    },
    {
      heading: 'Your responsibilities',
      body: [
        { list: [
          'Give a correct address and a number we can reach, and book for others only with their agreement.',
          'Make sure the place of the visit is safe, and tell us in the note about anything the Saathi should know.',
          'Do not ask a Saathi to do anything unlawful, unsafe, or outside the booked service.',
          'Treat Saathis with respect. A Saathi may end a visit, and we may decline future bookings, if a Saathi is abused or put at risk.',
        ] },
      ],
    },
    {
      heading: 'Payments, cancellations and refunds',
      body: ['These are covered by our Payment Policy and our Refund Policy, which form part of these terms.'],
    },
    {
      heading: 'Saathis',
      body: [
        'Saathis using the Saathi website must keep customer details confidential and use them only for the assigned visit, record each payment truthfully, and pay the company’s share within 48 hours of each visit. We may pause or remove a Saathi’s access for breaking these terms.',
      ],
    },
    {
      heading: 'Our responsibility',
      body: [
        'We take care in choosing, verifying and training Saathis and in arranging visits. To the extent the law allows, we are not responsible for indirect losses, and our total responsibility for a visit is limited to the amount paid for that visit. Nothing in these terms limits rights you have under the Consumer Protection Act, 2019 or other law that cannot be limited.',
        'We are not responsible for delays or cancellations caused by events outside our control, such as severe weather, strikes or public emergencies.',
      ],
    },
    {
      heading: 'Changes and law',
      body: [
        'We may update these terms; the version on this page with its “Last updated” date applies to bookings made after that date.',
        'These terms are governed by the laws of India, and the courts at Hyderabad, Telangana have jurisdiction.',
      ],
    },
    contactSection,
  ],
}

export const policyText: Record<string, PolicyText> = {
  'privacy-policy': privacy,
  'payment-policy': payment,
  'terms-and-conditions': terms,
  'refund-policy': refund,
}
