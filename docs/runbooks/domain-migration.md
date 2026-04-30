# Domain migration runbook — invest-com-au.vercel.app → invest.com.au

**Migration window: October–December 2026**
**Agent #16 (Domain Migration Agent) owns execution.**

The domain has ~30 years of continuous registration (since 1996/97) and deep
topical association with Australian financial services. A mishandled cutover risks
30–50% authority loss and a 6–12 month recovery cycle. Follow every step in order.

---

## Overview

| Phase | When | Duration | Owner |
|---|---|---|---|
| Pre-migration audit | T-30 days | 3–5 days | Agent #16 + founder |
| DNS TTL reduction | T-14 days | 30 min | Founder (registrar) |
| Vercel custom domain setup | T-7 days | 30 min | Founder (Vercel) |
| GSC property + change-of-address | T-7 days | 1 h | Founder (Google) |
| Final env var + canonical check | T-1 day | 30 min | Agent #16 |
| DNS cutover | T = 0 | 15 min | Founder |
| Post-cutover monitoring | T+1 h … T+90 days | ongoing | Agent #16 |
| Authority validation | T+30 days | 1 h | Agent #16 |

---

## Phase 0 — Pre-migration audit (T-30 days)

### 0-1. URL inventory

Run the site crawler against `invest-com-au.vercel.app` and export every
URL responding 2xx. Store the list at `docs/audits/url-inventory-pre-migration.txt`.

```bash
# Install if needed: npm install -g broken-link-checker
blc https://invest-com-au.vercel.app --recursive --ordered \
  --exclude-external \
  --get 2>/dev/null | grep "─────" | grep "^200" | \
  awk '{print $2}' > docs/audits/url-inventory-pre-migration.txt
```

Or use Screaming Frog / Sitebulb — export all internal URLs.

**Target:** full list of live URLs (typically 500–5000 for this codebase).

### 0-2. GSC baseline snapshot

In Google Search Console (property: `https://invest-com-au.vercel.app`):
- Export Performance report → Last 3 months (CSV).
- Note: total clicks, impressions, average position for top-50 pages.
- Save to `docs/audits/gsc-baseline-pre-migration-<date>.csv`.

### 0-3. Ahrefs / Moz authority snapshot

Record current Domain Rating (DR) / Domain Authority (DA) for both:
- `invest-com-au.vercel.app`
- `invest.com.au` (the destination — verify it has no competing content)

If `invest.com.au` currently has any live pages, crawl them and confirm they
return 4xx / redirect to the Vercel project. If not, investigate before
proceeding — live content on the destination causes duplicate-content problems.

### 0-4. Identify redirect dependencies

```bash
# Pages that embed the Vercel URL in canonical / OG / schema
grep -rn "invest-com-au.vercel.app" app/ lib/ public/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"
```

Expected result: zero. If any hits, fix them (replace with
`process.env.NEXT_PUBLIC_SITE_URL` references) before proceeding.

### 0-5. 301 redirect map for legacy WordPress URLs

`invest.com.au` has ~30 years of inbound links to old URL patterns
(WordPress slugs, `/category/`, `/author/`, `/feed/`, etc.).

- Export legacy URLs from Google Search Console → Coverage → "Crawled - currently not indexed" + "Not found (404)".
- Separately, request a URL export from the registrar / hosting history if available.
- Build the redirect map in `next.config.ts` under `async redirects()`.
- Format: `{ source: '/old-path', destination: '/new-path', permanent: true }`.
- Commit to `docs/audits/legacy-redirect-map.md` for audit trail.

Template redirect patterns (fill in after URL inventory):
```typescript
// next.config.ts — add to async redirects()
{ source: '/category/:slug', destination: '/:slug', permanent: true },
{ source: '/author/:slug', destination: '/', permanent: true },
{ source: '/feed', destination: '/sitemap.xml', permanent: true },
{ source: '/wp-content/:path*', destination: '/', permanent: true },
{ source: '/wp-admin/:path*', destination: '/admin', permanent: true },
```

---

## Phase 1 — DNS TTL reduction (T-14 days)

Lower TTL on the `invest.com.au` DNS records to 60s so the propagation
window during cutover is minimal.

**Registrar steps** (exact UI varies by registrar — auDA accredited):

1. Log in to registrar control panel.
2. Navigate to DNS management for `invest.com.au`.
3. Change TTL on the **A** (and **AAAA** if present) record from current value
   (typically 3600 or 86400) to **60**.
4. Save. Changes propagate within the old TTL window.
5. Verify after the old TTL window: `dig invest.com.au A +short` should return
   the current IP (pointing to whatever hosts the domain today).

If `invest.com.au` currently serves no content, a low TTL is already fine.

---

## Phase 2 — Vercel custom domain setup (T-7 days)

### 2-1. Add custom domain to Vercel project

```bash
# Via Vercel dashboard or CLI
# Project: prj_miPLXyjwXbqNnGLOFijBHbjXWESY
# Team: team_B2xJT8ZXX4ItHwOiQBp1tOyl
vercel domains add invest.com.au --project prj_miPLXyjwXbqNnGLOFijBHbjXWESY
```

Or in the Vercel dashboard:
- Project Settings → Domains → Add `invest.com.au`.
- Vercel will show the required DNS records (typically a CNAME for `www` and
  an A/ALIAS record for the apex).

### 2-2. Add www redirect

Also add `www.invest.com.au` → redirect to `invest.com.au` (Vercel handles
this automatically when both are added; confirm the redirect direction is
`www` → apex, not apex → `www`).

### 2-3. Verify domain ownership (Vercel TXT record)

Vercel requires a TXT record for ownership verification. Add it at the
registrar before the DNS cutover.

```
_vercel.invest.com.au  TXT  <value-from-Vercel-dashboard>
```

### 2-4. Update `NEXT_PUBLIC_SITE_URL` env var

In Vercel project settings → Environment Variables:
- **Before cutover:** `NEXT_PUBLIC_SITE_URL=https://invest-com-au.vercel.app`
- **At cutover (T=0):** change to `NEXT_PUBLIC_SITE_URL=https://invest.com.au`

This single change propagates to `lib/seo.ts` → `SITE_URL`, `app/robots.ts`,
`app/sitemap.ts`, all canonical tags, and all schema.org `@id` / `url` fields.
It also updates the Resend confirmation email links, Stripe success/cancel URLs,
and any other `getSiteUrl()` callers.

**Do this at T=0, not before** — changing it before the DNS cutover means
pre-cutover pages emit `invest.com.au` canonicals while the domain hasn't
resolved yet (canonical mismatch).

### 2-5. Test Vercel domain in staging mode

After adding the domain to Vercel but before updating `NEXT_PUBLIC_SITE_URL`:
- Vercel issues a Let's Encrypt TLS certificate (< 60s once DNS resolves).
- Visit `https://invest.com.au` — it should serve the Next.js app.
- Confirm TLS is valid (no browser cert warning).
- Confirm the old `.vercel.app` URL still works (no breakage).

---

## Phase 3 — GSC setup (T-7 days)

### 3-1. Verify `invest.com.au` in Google Search Console

GSC property types:
- **Domain property:** `invest.com.au` — requires DNS TXT verification.
  Preferred (covers all subdomains + protocols).
- **URL prefix property:** `https://invest.com.au` — easier but narrower.

Add the DNS TXT record provided by GSC:
```
invest.com.au  TXT  google-site-verification=<token>
```

Verify the property in GSC.

### 3-2. Submit XML sitemap to new property

Once the `invest.com.au` GSC property is verified:
- Submit sitemap: `https://invest.com.au/sitemap.xml`.
- GSC will crawl it within 24–72 hours of DNS resolution.

### 3-3. GSC change-of-address tool

After the DNS cutover resolves and `invest.com.au` is serving traffic:

1. In GSC, open the **old** property (`invest-com-au.vercel.app`).
2. Settings → Change of Address.
3. Select the verified `invest.com.au` destination property.
4. Click "Validate & Update".

GSC will:
- Signal to Googlebot that the old URLs have permanently moved.
- Accelerate transfer of ranking signals (typically 6–12 months for full
  transfer, but change-of-address compresses this to 2–4 months).

**Prerequisites:** 301 redirects from `invest-com-au.vercel.app` to
`invest.com.au` must be active before submitting change-of-address.

### 3-4. Permanent 301 redirect from Vercel subdomain

After cutover, configure Vercel to redirect `invest-com-au.vercel.app` → `invest.com.au`:

```javascript
// next.config.ts
async redirects() {
  return [
    // Redirect the Vercel subdomain to the canonical domain
    // (active only after invest.com.au DNS resolves)
    ...(process.env.VERCEL_URL?.includes('invest-com-au') ? [{
      source: '/:path*',
      destination: `https://invest.com.au/:path*`,
      permanent: true,
      has: [{ type: 'host', value: 'invest-com-au.vercel.app' }],
    }] : []),
  ];
},
```

Or handle it via Vercel's "Redirect" setting in the dashboard for the
`invest-com-au.vercel.app` domain.

---

## Phase 4 — Final pre-cutover checks (T-1 day)

Run this checklist the day before the DNS cutover.

- [ ] `NEXT_PUBLIC_SITE_URL` is still pointing to `.vercel.app` (correct — don't change yet).
- [ ] Vercel shows `invest.com.au` as "Valid Configuration" (green in dashboard).
- [ ] TLS certificate for `invest.com.au` is issued and valid.
- [ ] `dig invest.com.au A +short` still returns the old IP (not Vercel's yet — correct).
- [ ] 301 redirect map committed in `next.config.ts` and deployed.
- [ ] Legacy WordPress redirects verified: `curl -I https://invest-com-au.vercel.app/category/investing` → 301 to target.
- [ ] GSC `invest.com.au` property is verified (TXT record active).
- [ ] Sitemap submitted to `invest.com.au` GSC property.
- [ ] Baseline authority metrics recorded (see Phase 0-2, 0-3).
- [ ] Sentry `SENTRY_AUTH_TOKEN` set for production sourcemap upload (pairs with L-01).
- [ ] Resend sending domain confirmed for `@invest.com.au` (not `@invest-com-au.vercel.app`).

---

## Phase 5 — DNS cutover (T = 0)

Cutover is ideally on a Tuesday–Thursday, 09:00–11:00 AEST (lowest traffic,
fastest support response from registrar / Vercel if needed).

### 5-1. Update DNS at registrar

Change the **A** record for `invest.com.au` to Vercel's IP(s):
- Vercel provides 2 x A records (76.76.21.21 and 76.76.21.22 as of 2026).
  Confirm current IPs from Vercel dashboard.
- TTL is already 60s from Phase 1.

If apex A record isn't supported (some registrars don't support ALIAS),
use Vercel's anycast IP or switch to Cloudflare as a DNS proxy.

For `www.invest.com.au`:
- CNAME → `cname.vercel-dns.com.`

### 5-2. Update `NEXT_PUBLIC_SITE_URL` in Vercel

Immediately after DNS update:
1. Vercel → Project Settings → Environment Variables.
2. Change `NEXT_PUBLIC_SITE_URL` from `https://invest-com-au.vercel.app` to `https://invest.com.au`.
3. Trigger a redeployment (Vercel → Deployments → Redeploy latest).

### 5-3. Smoke test (within 5 minutes of propagation)

```bash
# Wait for DNS to propagate (60s TTL)
sleep 90

# Verify apex resolves to Vercel
dig invest.com.au A +short

# Verify TLS
curl -sI https://invest.com.au | head -5

# Verify canonical in <head>
curl -s https://invest.com.au | grep 'rel="canonical"'

# Verify robots.txt domain
curl -s https://invest.com.au/robots.txt | head -5

# Verify sitemap domain
curl -s https://invest.com.au/sitemap.xml | head -10

# Verify old Vercel URL 301s to new domain
curl -sI https://invest-com-au.vercel.app | head -5
```

Expected:
- `invest.com.au` → 200 with correct `<link rel="canonical" href="https://invest.com.au/">`
- `invest-com-au.vercel.app` → 301 to `https://invest.com.au`
- `robots.txt` Sitemap line: `Sitemap: https://invest.com.au/sitemap.xml`

### 5-4. Form + email smoke tests

- Submit a test lead from the `/quiz` page — confirm Resend sends from `@invest.com.au`.
- Confirm Stripe success_url shows `invest.com.au` (check a test checkout).
- Confirm Sentry captures events under `invest.com.au` hostname.

---

## Phase 6 — Post-cutover monitoring (T+1h … T+90 days)

### Immediate (T+1h)

- [ ] GSC `invest.com.au` property: Coverage → check for "Crawled - not indexed" spikes.
- [ ] Ahrefs/Moz: re-crawl `invest.com.au` — confirms Domain Rating pick-up.
- [ ] No 5xx in Vercel function logs.
- [ ] `/api/health` returns 200.

### T+24h

- [ ] GSC impressions appear for `invest.com.au` property.
- [ ] Submit GSC change-of-address (Phase 3-3) if not already done.
- [ ] Raise DNS TTL back to 3600.
- [ ] Verify all internal links use `invest.com.au` (no `.vercel.app` in rendered HTML).

### T+7 days

- [ ] GSC: compare impressions (invest.com.au) to baseline (invest-com-au.vercel.app last-7d).
  Target: ≥ 80% of pre-migration impressions transferred.
- [ ] Top-10 ranking URLs still ranking (compare positions to GSC baseline snapshot).
- [ ] No major referral traffic drop in GA4.

### T+30 days

Run full authority audit:
- DR/DA recovered to pre-migration baseline (or higher — aged domain may improve).
- Top-50 pages indexed in GSC `invest.com.au` property.
- No "URL not on Google" for main money pages (`/quiz`, `/compare`, etc.).

If rankings dropped > 20% for core pages:
- Check 301 redirect chain — ensure single-hop (not double-redirect).
- Confirm GSC change-of-address was submitted and accepted.
- Confirm `invest.com.au` is not blocked in `robots.txt` (check `Disallow:` entries).
- Submit a recrawl request for affected URLs via GSC "URL Inspection" → "Request Indexing".

### T+90 days

- Decommission the `invest-com-au.vercel.app` redirects if GSC shows
  no remaining indexed pages under the old domain.
- Archive the pre-migration GSC data export.
- Update `COMPANY.md` "Live URL" field to `invest.com.au`.

---

## Rollback procedure

Rollback undoes the DNS cutover (not the Vercel deploy).

1. At registrar: change `invest.com.au` A record back to the old IP (or remove
   to make domain unreachable — this stops bleed while you diagnose).
2. In Vercel: revert `NEXT_PUBLIC_SITE_URL` to `https://invest-com-au.vercel.app`.
3. Trigger Vercel redeploy.
4. DNS propagates within the reduced TTL (60s).
5. Do NOT raise TTL back to 3600 until you've fixed the root cause and are
   ready to re-attempt the cutover.

**Rollback is only worth it in the first 2 hours.** After 2 hours, GSC may
have already crawled the new domain. Rolling back after that point can cause
more harm than fixing forward.

---

## Key URLs + credentials

| Item | Value |
|---|---|
| Vercel project ID | `prj_miPLXyjwXbqNnGLOFijBHbjXWESY` |
| Vercel team ID | `team_B2xJT8ZXX4ItHwOiQBp1tOyl` |
| Pre-launch URL | `https://invest-com-au.vercel.app` |
| Post-cutover URL | `https://invest.com.au` |
| NEXT_PUBLIC_SITE_URL (pre) | `https://invest-com-au.vercel.app` |
| NEXT_PUBLIC_SITE_URL (post) | `https://invest.com.au` |
| GSC property (pre) | `https://invest-com-au.vercel.app` |
| GSC property (post) | `invest.com.au` (Domain property, DNS verified) |
| lib/seo.ts SITE_URL fallback | `"https://invest.com.au"` (already correct post-cutover) |

---

## Files affected by cutover

Only **one env var** needs updating at T=0:

```
NEXT_PUBLIC_SITE_URL=https://invest.com.au
```

This cascades automatically to:
- `lib/seo.ts` → `SITE_URL` → all canonical tags, OG URLs, schema.org `@id`
- `app/robots.ts` → `Sitemap:` directive
- `app/sitemap.ts` → all sitemap entries
- `lib/stripe.ts` / `getSiteUrl()` → Stripe success/cancel URLs
- Email confirmation links via Resend (uses `absoluteUrl()`)
- PostHog `$current_url` events (client-side, auto-captured)

No code changes are required for the cutover itself — only the env var.

---

## References

- `COMPANY.md` § Aged domain protection
- `docs/launch/manual-ops-during-ai-pause.md`
- `docs/runbooks/launch-day.md`
- Audit item M-07 · `docs/audits/codebase-health-2026-04-24.md` §8
- Google Search Console Help: [Change of address](https://support.google.com/webmasters/answer/9476592)
- Vercel Docs: [Custom Domains](https://vercel.com/docs/projects/domains)
