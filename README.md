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

Aadhaar numbers are stored masked (last four digits only); other ID numbers are stored in full.

## Before launch

- **The footer enquiry form still uses email.** It calls `openEnquiryEmail` in
  `src/lib/enquiry.ts`; the Contact and Become a Saathi forms save to Firestore.
- **Policy pages are placeholders** (`src/pages/Policy.tsx`). Add the approved legal text,
  including how ID details and location are used.
- **Social links are omitted** because no profile URLs were supplied.
- **Hosting needs an SPA fallback**: serve `index.html` for unknown paths so deep links
  such as `/plans` work on refresh.
