# Admin website (`admin.<your domain>`)

This is for the office. Only accounts with a document in the Firestore `admins` collection can use it,
and `firestore.rules` enforces that whatever the page shows.

| Tab | What it does |
| --- | --- |
| Bookings | Assign a verified Saathi with a visit time, cancel, approve extra time. Starting and completing a visit is done by the Saathi on the Saathi website only. Saathis without a website login are marked in the list. |
| Applications | Verify or reject applicants, see their ID (full Aadhaar on **Show**), and edit listed services. Un-verifying a Saathi removes their website logins. |
| Saathis | Each verified Saathi's website logins (give, pause, remove) and their account: to pay, company share, paid, overdue. **Record a payment received** for cash or bank payments made outside Razorpay. |
| Money | The company share percentage, totals, things that need a look (overdue Saathis, extra charges, visits completed without a record), and every payment. |

## Run it locally

```bash
npm run dev:admin
```

This opens http://localhost:5175.

## Deploy on Cloudflare Pages

| Setting | Value |
| --- | --- |
| Root directory | `admin` |
| Build command | `cd .. && npm ci && npm run build:admin` |
| Build output directory | `dist` |
| Environment variables | `NODE_VERSION` = `22`, the six `VITE_FIREBASE_*` values, and `VITE_MAIN_SITE_URL` = `https://<your domain>` |

Then:

1. Add the custom domain `admin.<your domain>` and create the CNAME record Cloudflare shows in GoDaddy's DNS.
2. Add `admin.<your domain>` under Firebase Authentication > Settings > Authorised domains.
3. On the main site, set `VITE_ADMIN_URL` = `https://admin.<your domain>` so admins see an Admin link there.
