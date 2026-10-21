# Saathi First

Three websites in one repository, sharing one Firebase project:

| Folder | Website | Hosting |
| --- | --- | --- |
| `main/` | Main site `<domain>`: company information, services, customer booking | to be decided |
| `saathi/` | Saathi website `saathi.<domain>`: assigned visits, Google Maps, recording payments, paying the company share through Razorpay. See [saathi/README.md](saathi/README.md). | Cloudflare Pages |
| `admin/` | Admin website `admin.<domain>`: bookings, applications, Saathi logins, money. See [admin/README.md](admin/README.md). | Cloudflare Pages |

`main/src/lib`, `main/src/auth`, `main/src/content` and `main/src/components/CollectionForm.tsx` are shared by all three.
`firestore.rules` protects all three. Firebase settings live in `.env.local` at the repo root and are
read by all three; Firebase, the rules tests and `package.json` also stay at the root.

To host the main site later: the build command is `npm ci && npm run build`, run from the repo root, and
the output is `main/dist`. It needs the `VITE_FIREBASE_*` values, plus `VITE_ADMIN_URL` if you want the
Admin link. It also needs a single-page-app fallback (see Before launch).

```bash
npm run dev:saathi   # http://localhost:5174
npm run dev:admin    # http://localhost:5175
npm run build:all    # builds main/dist/, saathi/dist/ and admin/dist/
```

### Trying everything with test accounts

`npm run emulators` starts Firebase's local Auth and Firestore emulators (project `demo-saathi-first`,
which cannot reach the real project). Then `npm run dev:test`, `npm run dev:test:saathi` and
`npm run dev:test:admin` run the three sites against them on ports 5183–5185. SMS codes and email
links are not sent: read them from `http://127.0.0.1:9099/emulator/v1/projects/demo-saathi-first/verificationCodes`
and `.../oobCodes`. Data disappears when the emulators stop.

## Main site

React 19 + Vite + TypeScript + Tailwind CSS v4.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to main/dist/
npm run lint
```

## Where things live

| Path | What it holds |
| --- | --- |
| `main/src/content/site.ts` | All copy and business data: contact details, services, plans, FAQs, process steps |
| `main/src/index.css` | Design tokens (brand palette, fonts, radii) and the shared type scale |
| `main/src/sections/` | Home page sections, in page order |
| `main/src/pages/` | Routed pages: Home, Services, Plans, Become a Saathi, Contact, Policies |
| `main/src/components/` | Shared pieces: header, footer, buttons, form fields, responsive image |
| `main/src/assets/logo/` | Logo SVGs extracted from the brand deck's vector artwork |
| `main/public/images/` | Optimised WebP photos (generated from the supplied originals) |

## Sign-in, bookings and admin (Firebase)

Contact and Become a Saathi require sign-in (phone OTP or email and password).
Submissions are saved to Firestore: `bookings` and `applications`.

1. Copy `.env.example` to `.env.local` and paste the web app config from the Firebase console.
2. Firebase console > Authentication > Sign-in method: enable **Phone** and **Email/Password**.
   Under Settings > Authorised domains, add the live domain.
3. Firebase console > Firestore Database: create the database, then paste `firestore.rules` into Rules.
4. To make someone an admin: sign in on the admin website, copy the user ID it shows, and
   create a document with that ID in an `admins` collection (any field, e.g. `role: "owner"`).

Our Saathis (`/saathis`) lists services, then the Saathis who provide each one. It reads the public
`saathis` collection. Setting an application to **verified** in the admin website publishes that Saathi's
profile (first name and last initial, area, languages, services); any other status removes it.
Admins can change the listed services on the verified application card. Re-paste `firestore.rules`
after pulling this change, or the page stays empty.

Contact Us (`/contact`) lists the services with a Book now button; `/contact/<service id>` is the
booking form. Customers do not choose a Saathi: one listed for that service is picked at random when
the form is sent, and the confirmation names them. The booking stores the service
and the Saathi as a preference only: there is no calendar, so the team confirms availability by phone.

Email and password accounts are sent a verification email on sign-up and cannot book, apply or open
the admin website until they click the link (`main/src/auth/verify.ts`, enforced again by `verifiedContact()` in
`firestore.rules`). Google and phone accounts are already verified.

Password reset and email verification links open `/auth/action` on this site (new password with
confirmation, then back to sign-in). This needs Firebase > Authentication > Templates > (any template) >
edit > **Customize action URL** set to `<site address>/auth/action`, e.g.
`http://localhost:5173/auth/action` locally; change it to the live domain at launch.

Aadhaar numbers appear masked (last four digits) on applications. The full number is saved in the same write to `applicationSecrets/{application id}`, which only admins can read; on the admin card it stays masked until **Show** is pressed. Applications made before this change have only the masked number. Other ID numbers are stored in full. Storing full Aadhaar numbers is regulated in India: confirm your obligations (secure storage, consent, deletion) with a legal adviser.

### Booking: hours, time and place

The booking form is four numbered steps with a summary before **Confirm booking**:
1. **How long** — 2 hrs, 4 hrs, 8 hrs or **Whole day**, or exact hours with − / +. The smallest plan that
   covers the hours is used (3 hours → Care Companion). Property Monitoring is one visit, so it has no hours.
2. **When** — Today (90 minutes' notice), Tomorrow or another day up to 90 days ahead; 7 am to 8 pm.
3. **Where** — share location, type an address, or both (one is required).
4. **Your details** — name, mobile, optional note.

Plan hours, names and prices live in `plans` (`main/src/content/site.ts`) **and** in `planHours`, `planNames`
and `planPrices` in `firestore.rules`, which reject any other price. Change both together and run
`npm run test:rules`. Once a Saathi is assigned, customers cannot change the hours from the website:
extra time is agreed with the Saathi at the visit and recorded as an extra charge with its reason.
(Requests made before this change can still be approved or declined on the admin booking card.)

### Limit: 3 bookings in progress

A customer can have at most 3 bookings in progress (new, assigned or started) at a time; the fourth
is refused with a message pointing to My bookings. Each booking is saved together with the
customer's `customers/{uid}.active` list, and `firestore.rules` cap that list at 3 and only let a
booking leave it once it is cancelled or completed, so the limit holds even outside the website.
Change it in `MAX_ACTIVE_BOOKINGS` (`main/src/lib/db.ts`) **and** the rules (`size() <= 3` and the
three hand-written checks in `allInProgress` / `keepsInProgress`).

### Booking tracking

After booking, customers follow their request on **My bookings** (`/bookings`, also in the account menu):
a tracker (Requested → Saathi assigned → Visit started → Completed), the assigned Saathi's name and visit
time, and WhatsApp / Call buttons, plus past bookings with Book again. Customers can cancel only while a
request is unassigned; after that they call.

In the admin website, each booking has an **Assigned Saathi** panel: choose a verified Saathi (those offering the
service and the customer's choice are marked), confirm their WhatsApp number and set the visit time, then
**Start** and **Complete** (or the Saathi does both on the Saathi website, recording what the
customer paid). The Saathi's number is stored on that booking only, so only
that customer and admins can see it; it never appears on the public Our Saathis page.

### Security rules tests

`firestore.rules` checks who may write **and** exactly what they may write (fields, types, lengths,
allowed values, server timestamps, masked Aadhaar), because anyone signed in can bypass the website
and write to Firestore directly. `tests/firestore.rules.test.js` covers each role and each known attack.
`tests/settlement.test.ts` covers the Saathi website's payment server code (amount due, Razorpay
checks, no double counting). Run both after any rules or payment change (needs Java and the Firebase
CLI; it uses a local emulator, not your data):

```bash
npm run test:rules
```

## Before launch

- **The footer enquiry form still uses email.** It calls `openEnquiryEmail` in
  `main/src/lib/enquiry.ts`; the Contact and Become a Saathi forms save to Firestore.
- **Policy pages need sign-off.** The Privacy, Payment, Terms and Refund text is in
  `main/src/content/policies.ts`, written from how the websites work. Fill in `legal` (business
  name, address, Grievance Officer, refund time limits), have a lawyer review it, then set
  `reviewed: true` to remove the draft note.
- **Social links are omitted** because no profile URLs were supplied.
- **Hosting needs an SPA fallback**: serve `index.html` for unknown paths so deep links
  such as `/plans` work on refresh.
