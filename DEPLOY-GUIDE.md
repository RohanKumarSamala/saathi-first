# Saathi First: going live, step by step

| Website | Address | Hosted on | Upload file |
| --- | --- | --- | --- |
| Main | https://saathifirst.in (and www) | GoDaddy Web Hosting Starter (cPanel) | `main-site-upload.zip` |
| Admin | https://admin.saathifirst.in | Cloudflare Pages (free) | `admin-site-upload.zip` |
| Saathi | https://saathi.saathifirst.in | Cloudflare Pages (free) | later; it has server functions, so it gets deployed differently |

All three use the same Firebase project (`saathi-first`) for login and data.
SSL (the padlock) is free for all of them through Cloudflare.

Do the parts in order. **Wait times are marked with ⏳.**

---

## Part 1: Get the GoDaddy server IP

1. Go to GoDaddy → **My Products → Web Hosting**.
2. Wait until the site name shows **saathifirst.in** instead of `dni.3fd.mytemp.website`.
   ⏳ About 10 minutes after you changed the domain. If you see "Domain is not ready", come back later.
3. Click **⋯ → Settings**.
4. Find the **IP address** (under Server / Account details) and write it down, e.g. `160.153.x.x`.

## Part 2: Upload the main website to cPanel

1. GoDaddy → Web Hosting → **⋯ → cPanel Admin**.
2. Open **File Manager**, then click **public_html** on the left.
3. Click **Settings** (top right), tick **Show Hidden Files (dotfiles)**, then **Save**.
4. Delete any default files in `public_html` (like `index.html`, `default.html`, `index.php`).
   Leave `cgi-bin` and `.well-known` alone if they are there.
5. Click **Upload**, choose `main-site-upload.zip` from the project folder, and wait for 100%.
6. Back in File Manager, right-click `main-site-upload.zip` → **Extract** → extract into `/public_html`.
7. Delete `main-site-upload.zip` from `public_html`.
8. Check that `public_html` now directly contains: `index.html`, `.htaccess`, `favicon.svg`, `assets/`, `images/`.
   If they are inside a sub-folder, move them up into `public_html`.

## Part 3: Put saathifirst.in on Cloudflare (free DNS and SSL)

### 3a. Before you start (in GoDaddy)
- GoDaddy → **My Products → Domains → saathifirst.in → DNS**.
- If **DNSSEC** is **On**, turn it **Off** first. Otherwise the domain stops working after the nameserver change.
- If you use, or plan to use, email on @saathifirst.in, tell me before step 3c.

### 3b. Add the site to Cloudflare
1. Sign up or log in at https://dash.cloudflare.com.
2. Click **Add a domain**, type `saathifirst.in`, keep **Quick scan for DNS records**, and click **Continue**.
3. Choose the **Free** plan.
4. Cloudflare shows the DNS records it found. Make them look like this:

   | Type | Name | Content | Proxy |
   | --- | --- | --- | --- |
   | A | `saathifirst.in` (shown as `@`) | the GoDaddy IP from Part 1 | 🟠 Proxied |
   | CNAME | `www` | `saathifirst.in` | 🟠 Proxied |

   - Delete any other **A** record for `@` or `www` that points somewhere else (GoDaddy parking or website builder).
   - Leave MX / TXT records (email) as they are.
5. Click **Continue**. Cloudflare shows **two nameservers**, e.g. `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`. Keep this page open.

### 3c. Switch the nameservers (in GoDaddy)
1. GoDaddy → **Domains → saathifirst.in → DNS → Nameservers → Change Nameservers**.
2. Choose **I'll use my own nameservers**.
3. Paste the two Cloudflare nameservers, remove any extra ones, and click **Save** / **Continue**.
4. Back in Cloudflare, click **Check nameservers now**.
5. ⏳ Wait for Cloudflare's email **"saathifirst.in is now active"**. Usually 1 to 4 hours, at most 24.

**Test:** open `http://saathifirst.in`. Your site should load.

## Part 4: Free SSL (padlock) for saathifirst.in

Only start this after Cloudflare says **Active**.

### 4a. Create the free certificate (Cloudflare)
1. Cloudflare → saathifirst.in → **SSL/TLS → Origin Server → Create Certificate**.
2. Keep the defaults: **RSA (2048)**, hostnames `*.saathifirst.in` and `saathifirst.in`, validity **15 years**. Click **Create**.
3. Keep the page open. You will copy two things:
   - **Origin Certificate** (begins `-----BEGIN CERTIFICATE-----`)
   - **Private Key** (begins `-----BEGIN PRIVATE KEY-----`). It is shown **only once**. Save both into a text file on your computer and keep it private.

### 4b. Install it (cPanel)
1. cPanel → search **SSL/TLS** → open it → **Manage SSL sites** (under "Install and Manage SSL for your site (HTTPS)").
2. Domain: choose **saathifirst.in**.
3. Paste the **Origin Certificate** into **Certificate (CRT)**.
4. Paste the **Private Key** into **Private Key (KEY)**.
5. Leave **CA Bundle** empty, then click **Install Certificate**. Ignore any warning that it is "self-signed"; that is expected.

### 4c. Turn on strict SSL (Cloudflare)
1. Cloudflare → **SSL/TLS → Overview → Configure**, choose **Full (strict)**, and save.
2. Cloudflare → **SSL/TLS → Edge Certificates** → turn on **Always Use HTTPS**.
3. On the same page, set **Minimum TLS Version** to **TLS 1.2**.

**Test:** open `https://saathifirst.in` and `https://www.saathifirst.in`. Both should show the padlock.

> If cPanel on the Starter plan does not let you install a certificate (no SSL/TLS page, or an error),
> set the Cloudflare SSL mode to **Flexible** instead of Full (strict). Visitors still get the padlock,
> and the site works the same. Tell me so I can note it.

You never renew anything: the Cloudflare side renews itself, and the origin certificate lasts 15 years.

## Part 5: Admin website on Cloudflare Pages

1. Cloudflare dashboard (main menu, not inside the domain) → **Workers & Pages → Create**.
2. Choose the **Pages** tab → **Upload assets** (direct upload).
   If you only see Workers options, look for the link "Looking to deploy Pages? Get started".
3. Project name: `saathi-first-admin`, then click **Create project**.
4. Upload `admin-site-upload.zip` (or drag the unzipped folder), then click **Deploy site**.
5. ⏳ About 1 minute. You get a test address like `https://saathi-first-admin.pages.dev`. Open it to check that it loads.
6. In the project → **Custom domains → Set up a custom domain** → type `admin.saathifirst.in` → **Continue → Activate domain**.
   Because saathifirst.in is already on Cloudflare, it creates the DNS record and SSL for you.
7. ⏳ 5 to 30 minutes until it shows **Active**.

**Test:** open `https://admin.saathifirst.in`. It should show the padlock and the admin sign-in.

## Part 6: Firebase settings (needed for login to work)

### 6a. Allow the domains
Firebase console → project **saathi first** → **Authentication → Settings → Authorized domains → Add domain**. Add each of these:
- `saathifirst.in`
- `www.saathifirst.in`
- `admin.saathifirst.in`
- `saathi.saathifirst.in` (for later)

### 6b. Publish the latest database rules
The rules in `firestore.rules` control who can read and write what (admins, Saathis, customers).
In a terminal in the project folder:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project saathi-first
```

### 6c. Make yourself an admin
1. Sign in once on `https://saathifirst.in` with the Google account that will run the admin site.
2. Firebase console → **Authentication → Users**, then copy that account's **User UID**.
3. Firebase console → **Firestore Database → Start collection** (or open it if it already exists) → collection ID `admins`.
4. Document ID: **paste the UID**. Add one field, e.g. `name` (string) = your name. Click **Save**.
5. Repeat for every office person who needs admin access.

## Part 7: Final checks

- [ ] `https://saathifirst.in` loads with the padlock.
- [ ] `http://saathifirst.in` jumps to `https://` automatically.
- [ ] `https://www.saathifirst.in` loads too.
- [ ] Open a page like `/services` and press refresh. No 404.
- [ ] Google sign-in works on the main site.
- [ ] The account menu shows **Admin** for your admin account, and it opens `https://admin.saathifirst.in`.
- [ ] The admin site signs in and shows the Bookings / Applications / Saathis / Money tabs.
- [ ] A test booking on the main site appears in the admin Bookings tab.

---

## Updating the sites later

Ask Claude to rebuild the zips (or run `npm run build` and `npm run build:admin`), then:

- **Main:** cPanel → File Manager → `public_html`. Delete the old `assets` folder and `index.html`, upload `main-site-upload.zip`, extract it, then delete the zip.
- **Admin:** Cloudflare → Workers & Pages → `saathi-first-admin` → **Create deployment** → upload `admin-site-upload.zip`.
- If visitors still see the old version: Cloudflare → saathifirst.in → **Caching → Configuration → Purge Everything**.

## Costs

| Item | Cost |
| --- | --- |
| GoDaddy Web Hosting Starter | paid, 1-year term (renews yearly) |
| Cloudflare DNS, SSL, Pages | free |
| Firebase (Blaze) | pay-as-you-go from the ₹1,000 prepaid; free limits cover testing |
