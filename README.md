# Saathi First website

Marketing site for Saathi First (elder care and personal assistance, Hyderabad).
React 19 + Vite + TypeScript + Tailwind CSS v4.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to dist/
npm run lint
```

## Where things live

| Path | What it holds |
| --- | --- |
| `src/content/site.ts` | All copy and business data: contact details, services, plans, FAQs, process steps |
| `src/index.css` | Design tokens (brand palette, fonts, radii) and the shared type scale |
| `src/sections/` | Home page sections, in page order |
| `src/pages/` | Routed pages: Home, Services, Plans, Become a Saathi, Contact, Policies |
| `src/components/` | Shared pieces: header, footer, buttons, form fields, responsive image |
| `src/assets/logo/` | Logo SVGs extracted from the brand deck's vector artwork |
| `public/images/` | Optimised WebP photos (generated from the supplied originals) |

## Sign-in, bookings and admin (Firebase)

Contact, Become a Saathi and `/admin` require sign-in (phone OTP or email and password).
Submissions are saved to Firestore: `bookings` and `applications`.

1. Copy `.env.example` to `.env.local` and paste the web app config from the Firebase console.
2. Firebase console > Authentication > Sign-in method: enable **Phone** and **Email/Password**.
   Under Settings > Authorised domains, add the live domain.
3. Firebase console > Firestore Database: create the database, then paste `firestore.rules` into Rules.
4. To make someone an admin: sign in on the site, open `/admin`, copy the user ID shown, and
   create a document with that ID in an `admins` collection (any field, e.g. `role: "owner"`).

Our Saathis (`/saathis`) lists services, then the Saathis who provide each one. It reads the public
`saathis` collection. Setting an application to **verified** in `/admin` publishes that Saathi's
profile (first name and last initial, area, languages, services); any other status removes it.
Admins can change the listed services on the verified application card. Re-paste `firestore.rules`
after pulling this change, or the page stays empty.

Contact Us (`/contact`) lists the services with a Book now button; `/contact/<service id>` is the
booking form. It shows the Saathis listed for that service, and the customer picks one or leaves
"Choose for me", which picks one at random when the form is sent. The booking stores the service
and the Saathi as a preference only: there is no calendar, so the team confirms availability by phone.

Email and password accounts are sent a verification email on sign-up and cannot book, apply or open
`/admin` until they click the link (`src/auth/verify.ts`, enforced again by `verifiedContact()` in
`firestore.rules`). Google and phone accounts are already verified.

Password reset and email verification links open `/auth/action` on this site (new password with
confirmation, then back to sign-in). This needs Firebase > Authentication > Templates > (any template) >
edit > **Customize action URL** set to `<site address>/auth/action`, e.g.
`http://localhost:5173/auth/action` locally; change it to the live domain at launch.

Aadhaar numbers are stored masked (last four digits only); other ID numbers are stored in full.

### Booking: hours, time and place

The booking form is four numbered steps with a summary before **Confirm booking**:
1. **How long** — 2 hrs, 4 hrs, 8 hrs or **Whole day**, or exact hours with − / +. The smallest plan that
   covers the hours is used (3 hours → Care Companion). Property Monitoring is one visit, so it has no hours.
2. **When** — Today (90 minutes' notice), Tomorrow or another day up to 90 days ahead; 7 am to 8 pm.
3. **Where** — share location, type an address, or both (one is required).
4. **Your details** — name, mobile, optional note.

Plan hours, names and prices live in `plans` (`src/content/site.ts`) **and** in `planHours`, `planNames`
and `planPrices` in `firestore.rules`, which reject any other price. Change both together and run
`npm run test:rules`. Customers can ask for more time on a confirmed visit (up to a whole day); admins
approve or decline it on the booking, and approving moves it to the covering plan.

### Booking tracking

After booking, customers follow their request on **My bookings** (`/bookings`, also in the account menu):
a tracker (Requested → Saathi assigned → Visit started → Completed), the assigned Saathi's name and visit
time, and WhatsApp / Call buttons, plus past bookings with Book again. Customers can cancel only while a
request is unassigned; after that they call.

In `/admin`, each booking has an **Assigned Saathi** panel: choose a verified Saathi (those offering the
service and the customer's choice are marked), confirm their WhatsApp number and set the visit time, then
**Mark visit started** and **Mark completed**. The Saathi's number is stored on that booking only, so only
that customer and admins can see it; it never appears on the public Our Saathis page.

### Security rules tests

`firestore.rules` checks who may write **and** exactly what they may write (fields, types, lengths,
allowed values, server timestamps, masked Aadhaar), because anyone signed in can bypass the website
and write to Firestore directly. `tests/firestore.rules.test.js` covers each role and each known attack.
Run it after any rules change (needs Java and the Firebase CLI; it uses a local emulator, not your data):

```bash
npm run test:rules
```

## Before launch

- **The footer enquiry form still uses email.** It calls `openEnquiryEmail` in
  `src/lib/enquiry.ts`; the Contact and Become a Saathi forms save to Firestore.
- **Policy pages are placeholders** (`src/pages/Policy.tsx`). Add the approved legal text,
  including how ID details and location are used.
- **Social links are omitted** because no profile URLs were supplied.
- **Hosting needs an SPA fallback**: serve `index.html` for unknown paths so deep links
  such as `/plans` work on refresh.
