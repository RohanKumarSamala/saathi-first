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

## Before launch

- **Forms have no backend.** Every form calls `openEnquiryEmail` in `src/lib/enquiry.ts`,
  which opens a pre-filled email to `support@saathifirst.in`. Replace that one function
  when a form endpoint or CRM is available.
- **Policy pages are placeholders** (`src/pages/Policy.tsx`). Add the approved legal text.
- **Social links are omitted** because no profile URLs were supplied.
- **Hosting needs an SPA fallback**: serve `index.html` for unknown paths so deep links
  such as `/plans` work on refresh.
