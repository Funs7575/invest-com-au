# Cutover runbook — invest.com.au apex domain migration

The technical procedure for migrating the production apex domain
`invest.com.au` from the prior host to Vercel. Operational steps
(monitoring, alerts, launch announcements) are in `launch-day.md`.

**Timing:** Oct–Dec 2026 — AFSL license grant is the trigger.
**Gate:** `LAUNCH_GATE_9_5.md` score ≥ 9.5/10 before proceeding.

---

## T − 7 days

### 1. Reduce DNS TTL

Log in to the domain registrar (`.com.au` — likely auDA-accredited
registrar, e.g. VentraIP, Netfleet, or similar).

1. Find the `A`, `AAAA`, and `CNAME` records for `invest.com.au` and
   `www.invest.com.au`.
2. Change TTL on those records to **300 seconds** (5 min). The old TTL
   will expire within its current value — wait that long before the
   next step. If the current TTL is 86400 (24h), wait 24h after
   setting 300s before doing the T−1h step.

### 2. Add the domain in Vercel

1. Open Vercel → project `invest-com-au` → Settings → Domains.
2. Add `invest.com.au` and `www.invest.com.au`.
3. Vercel will show the DNS records it needs (76.76.21.21 A record, or
   the cname.vercel-dns.com CNAME). **Note these down** — you need
   them at T=0.
4. Do NOT yet point DNS at Vercel. Just stage the domain.

### 3. Verify `NEXT_PUBLIC_SITE_URL` in Vercel production

1. Vercel → project → Settings → Environment Variables → Production.
2. Ensure `NEXT_PUBLIC_SITE_URL` = `https://invest.com.au`.
3. Ensure `NEXT_PUBLIC_BASE_URL` = `https://invest.com.au`.
4. If either is set to `https://invest-com-au.vercel.app`, update now
   (requires a redeploy — trigger via empty commit or Vercel dashboard
   redeploy button).

`lib/seo.ts` falls back to `https://invest.com.au` if the var is
unset, so canonicals are already correct — but an explicit env var
makes it auditable.

### 4. GSC and GA4 verification tokens

For Google Search Console (`invest.com.au` property):
- Get the HTML meta tag verification token from GSC.
- Add it to `app/layout.tsx` `metadata.verification.google` field, or
  drop the `google-site-verification.html` file into `/public/`. Open
  a PR for this before cutover.

For GA4 (`invest.com.au` property):
- Create the `invest.com.au` property in GA4 (if not already exists).
- Verify via Measurement ID — already configured in `NEXT_PUBLIC_GA_ID`.

### 5. Generate the 301 redirect map

Before launch, document every significant URL from the prior
`invest.com.au` host that has inbound links or GSC search traffic.
See `CO-01` queue item. Without this list, SEO equity from the prior
host will be lost. Minimum:
- Homepage (already: `/` → `/`)
- Any blog posts or article URLs (old WP `/year/month/post-slug` →
  new article route, or `/` if no direct equivalent)
- Category pages (old `/category/*` → new vertical hub)
- Contact/about pages (already exist at `/contact`, `/about`)

Add to `next.config.ts` `redirects()` array.

---

## T − 24 hours

1. Confirm `LAUNCH_GATE_9_5.md` — all criteria green.
2. PR freeze — no merges until T+24h unless P0 fix.
3. Final smoke test on `invest-com-au.vercel.app`:
   - `/` loads, no console errors
   - `/compare`, `/advisors`, `/super`, `/quiz` load
   - Lead form submission end-to-end (use a test email)
   - Stripe payment flow (test mode, verify intent created)
4. Verify `next.config.ts` redirects cover old → new URL shapes.
5. Run `npm run build` on a clean branch — zero TS errors, no build
   failures.
6. Verify SSL certificate will auto-provision via Vercel (automatic for
   Vercel-managed domains — no action needed beyond domain binding).

---

## T − 1 hour

1. Reduce DNS TTL to **60 seconds**.
2. Final anonymity audit (CL-09):
   ```bash
   grep -rn "finn@invest\.com\.au\|finnduns@gmail\.com\|Finn Webster" \
     --include="*.ts" --include="*.tsx" \
     --exclude="*.test.ts" --exclude="*.test.tsx" \
     lib app components proxy.ts
   ```
   Must return zero matches.
3. Open in separate tabs: Vercel deployments, Sentry issues, Supabase
   dashboard, uptime monitor admin.
4. All-hands on Slack #launch.

---

## T = 0 (cutover)

### Step 1 — Remove old DNS records

In the registrar, **delete** the existing `A`, `AAAA`, `CNAME`, and
`ALIAS` records pointing `invest.com.au` / `www.invest.com.au` at the
prior host. Do not delete MX/TXT records (email + DMARC/SPF/DKIM).

### Step 2 — Add Vercel DNS records

Add the records Vercel showed at T−7 days, step 2:

| Name | Type | Value |
|------|------|-------|
| `invest.com.au` | A | `76.76.21.21` |
| `www.invest.com.au` | CNAME | `cname.vercel-dns.com` |

If Vercel shows a different IP (check Vercel dashboard at T=0 for the
current recommended value), use that instead.

### Step 3 — Verify Vercel domain status

In Vercel → Domains, wait for `invest.com.au` to show "Valid
Configuration". This confirms the DNS change is detected (typically
2–5 min at 60s TTL).

### Step 4 — SSL/TLS

Vercel automatically provisions a Let's Encrypt certificate for the
new domain. It appears in Vercel → Domains → Certificate within
5–10 min. No manual action required.

### Step 5 — Confirm canonical URLs

```bash
curl -s https://invest.com.au/sitemap.xml | grep '<loc>' | head -5
# Should show https://invest.com.au/... not https://invest-com-au.vercel.app/...
```

---

## T + 5 minutes

- `curl -I https://invest.com.au/` — HTTP 200, `content-type: text/html`
- `curl -I https://www.invest.com.au/` — HTTP 301 → `https://invest.com.au/`
- No P1 errors in Sentry.
- `/api/health` returning 200.

---

## T + 30 minutes

- GSC: Submit `https://invest.com.au/sitemap.xml` for indexing.
- Verify `X-Robots-Tag` and `robots.txt` are not blocking Google:
  ```bash
  curl -s https://invest.com.au/robots.txt
  ```
- Verify 301 redirects for prior-host URL patterns:
  ```bash
  curl -I https://invest.com.au/super-funds
  # → 301 https://invest.com.au/super
  ```
- Send launch comms (tweet, LinkedIn, Product Hunt if applicable).

---

## Rollback procedure

If the cutover must be undone within the first 24 hours (before DNS
fully propagates / before SSL is trusted):

1. In the registrar, **delete** the Vercel A/CNAME records.
2. Re-add the prior host's DNS records (have them documented in a text
   file before T=0 — copy from registrar before deleting).
3. DNS TTL is 60s, so recovery time is 1–5 minutes.
4. The Vercel deployment at `invest-com-au.vercel.app` remains live
   throughout — it is the fallback.
5. In Slack #launch: post incident summary, link to `launch-rollback.md`.

After rollback: investigate the failure before re-attempting. Common
causes: SSL provisioning timeout (wait 15 min and re-check), old DNS
cache on specific ISPs (use `https://dnschecker.org/` to verify global
propagation), or Vercel domain validation mismatch (delete + re-add
the domain in Vercel dashboard).

---

## Environment variable changes at cutover

No code changes are needed if `NEXT_PUBLIC_SITE_URL` was set to
`https://invest.com.au` in Vercel production at T−7 days (step 3).
All canonical URLs, sitemap, and structured data already reference
`invest.com.au`.

If `NEXT_PUBLIC_SITE_URL` was inadvertently pointing at the Vercel
preview URL, redeploy production after updating the env var in Vercel
dashboard.

---

## Post-cutover checklist (T + 48 hours)

- [ ] GSC `invest.com.au` property shows successful crawl.
- [ ] No significant drop in organic sessions vs the 7 days prior
      (Analytics → Acquisition).
- [ ] All cron routes responding: check heartbeat at
      `/api/cron/heartbeat` returns 200 with auth.
- [ ] Stripe webhooks arriving at `https://invest.com.au/api/stripe/webhook`
      — verify in Stripe dashboard → Developers → Webhooks.
- [ ] Resend sender domain verified (if send-from domain is
      `@invest.com.au` and records needed updating).
- [ ] BetterStack / UptimeRobot monitor URL updated to
      `https://invest.com.au/api/health`.
- [ ] Sentry DSN source-map upload now uses the new domain — update
      `sentry.properties` if it hard-codes a URL.
- [ ] `invest-com-au.vercel.app` Vercel alias left active as fallback
      for 30 days, then removed.
