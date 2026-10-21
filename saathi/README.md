# Saathi website (`saathi.<your domain>`)

The website Saathis use on their phones. It runs on Cloudflare Pages and uses the same Firebase
project as the main and admin websites.

What a Saathi can do:

1. Sign in with Google (Gmail) or their mobile number.
2. See the visits the office assigned to them, live, with the customer's name, number, address and note.
3. Tap **Open in Google Maps** for directions (the customer's shared pin, or the typed address).
4. Tap **I have arrived — start visit**, then **Complete visit & record payment**: the plan price is
   fixed, any extra needs a reason, and they choose UPI/QR or cash. The screen shows the total, the
   company's share (20% unless changed in the admin site) and their own share before saving.
5. Open **Payments** to see what they owe the company, by when (48 hours after each visit), and pay
   it all with Razorpay (UPI apps such as GPay and PhonePe open from there). Every payment is listed
   in **Payment history**.

## How the money stays accurate

- Amounts are whole paise everywhere, so nothing is lost to rounding. The company's share is the
  percentage rounded to the nearest paisa.
- `firestore.rules` rejects a completion whose bill is not the booked plan's price, whose share uses
  a different percentage, or whose numbers do not add up.
- The amount to pay is worked out on the server (`server/settlement.ts`) from the saved visits and
  payments. The browser never says how much to charge.
- A payment is recorded only after the server checks Razorpay's signature **and** asks Razorpay that
  the money was captured. The payment ID is the record's ID, so a payment cannot be counted twice.
  Razorpay's webhook records it too, in case the Saathi closes the page too early.
- Paying twice by mistake leaves a credit that covers the next visits; dues never go negative.

## Run it locally

```bash
npm run dev:saathi
```

This opens http://localhost:5174. The Pay button needs the server functions, which `vite` does not
run. To test payments locally, build first and use Cloudflare's tool, with the same settings in a
`saathi/.dev.vars` file (git-ignored):

```bash
npm run build:saathi
```

```bash
cd saathi && npx wrangler pages dev dist
```

## Deploy on Cloudflare Pages

Create a Pages project connected to this repository with:

| Setting | Value |
| --- | --- |
| Root directory | `saathi` |
| Build command | `cd .. && npm ci && npm run build:saathi` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |

Cloudflare picks up the server code in `saathi/functions/` because it sits in the root directory.
Check the first deploy's log for "Compiled Worker successfully" or a similar functions step.

Then add these under **Settings > Variables and Secrets** (type: Secret):

| Name | Where it comes from |
| --- | --- |
| `VITE_FIREBASE_*` (all six, as in `.env.example`) | Same values as the main site. These are build variables. |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID, e.g. `saathi-first` |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase console > Project settings > Service accounts > Generate new private key. Copy `client_email` and `private_key` from the downloaded file, then delete the file. Never commit it. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard > Account & Settings > API keys. Use the test keys (`rzp_test_…`) first. |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you type when adding the webhook below. |

**Custom domain:** in the Pages project, open Custom domains and add `saathi.<your domain>`. Cloudflare
shows the DNS record to create. Since the domain stays at GoDaddy, add that CNAME record in GoDaddy's
DNS. Cloudflare issues the HTTPS certificate.

## Razorpay settings

1. **Payment capture:** set to automatic (Dashboard > Account & Settings > Payment capture). Until
   a payment is captured, the Saathi sees "Razorpay is confirming it" and nothing is recorded.
2. **Webhook:** Dashboard > Webhooks > Add. URL `https://saathi.<your domain>/api/razorpay-webhook`,
   event `payment.captured`, and the secret you set as `RAZORPAY_WEBHOOK_SECRET`.
3. **Fees:** Razorpay charges the company its fee on each payment, so the company receives the
   amount due minus that fee. Check your plan's pricing for UPI.
4. Test a full payment in test mode before switching to the live keys.

## Firebase settings

- Authentication > Settings > Authorised domains: add `saathi.<your domain>`. Google and phone
  sign-in do not work on a domain missing from this list.
- Publish the latest `firestore.rules` (Firestore > Rules). Without it, Saathis cannot see visits
  and the admin site cannot give access.

## Giving a Saathi access (admin site)

Verify their application, then open **Saathis** in the admin site and tap **Give access to the login
they applied with**. If they sign in another way (e.g. phone instead of Google), the Saathi website
shows them a code; paste it in **Or paste the code from their screen**. Pause or remove a login at
any time; it takes effect immediately.

## Capacity

Phone screens read from Firestore directly. Only Pay calls the server functions: one request to open
an order and one to confirm it. Cloudflare's free plan allows 100,000 function requests a day, and
static files are free. This has not been load-tested with 200 Saathis at once; test before relying on it.
