# AI Journey — expanded run (2026-06-05)

Second AI-driven sweep of the live site (`lambent-sawine-17c3dd.netlify.app`),
covering the personas/funnels the 2026-06-02 run skipped. In-session on the Max
plan (Claude is the judgment brain); side-effect firewall on throughout.

## What ran

**6 personas, ~12 steps each (~72 pages walked):**

| Persona | Start | Verdict |
|---|---|---|
| intl-investor (SG-based, country mode) | `/foreign-investment` | ✅ healthy |
| smsf-saver | `/smsf` | ✅ healthy |
| crypto-buyer | `/crypto` | ✅ healthy |
| wholesale-hnw | `/wholesale` | ✅ healthy |
| wealth-stack | `/wealth-stack` | ✅ healthy page; surfaced the versus bug |
| quiz-taker | `/get-matched` | ✅ healthy (entry + advisor nav) |

Every candidate finding was re-verified with retries before reporting (the
sandbox TLS-MITM proxy throws transient 403/SSL/`Failed to fetch` noise).

## 🔴 Confirmed bug — every `/versus/*` vote widget is broken (FIX SHIPPED)

`GET /api/versus/vote` returns **500 on every pair** (verified 5/5 retries across
broker-vs-broker *and* savings-vs-super pairs — not cross-category-specific).

**Root cause (confirmed by direct DB query, proxy-independent):** the
`versus_votes` table **does not exist** in production —
`to_regclass('public.versus_votes')` is `NULL`, and no `CREATE TABLE` for it
exists in `supabase/migrations/`. The feature
(`app/api/versus/vote/route.ts` + the versus-page Community Vote widget) shipped
without its schema. Visible symptom: the Community Vote widget renders both
options but no tallies/percentages.

**Fix:** `supabase/migrations/20260831010000_create_versus_votes.sql` — creates
the table with the exact columns the route reads/writes, the pair+ip_hash dedup
unique index, RLS enabled, service-role-only policy (all access is mediated by
the route's admin client). Additive and safe to auto-apply on merge.

## ✅ Prior finding resolved — `/wholesale` hub now exists

The 2026-06-02 run flagged `/wholesale` as a 404 (links from
`investing-for/[occupation]` + the dashboard pointed at a missing page). It has
since been **built** into a polished hub (eligibility cards, wholesale-vs-retail
table, a "what you give up — read this first" risk-disclosure block, FAQs).
Confirmed 200 with real content. No action needed.

## Rejected (false positives — proxy artifacts, not prod defects)

- **`/crypto` `TypeError: Failed to fetch`** — accompanied by `403` +
  "SSL certificate error fetching the script" in `proxyNoise`; the TLS-MITM
  proxy dropping a script. `/crypto` serves 200 consistently.
- **Advisor profile pages — React #419** (`/advisor/priya-sharma-mortgage-broker`,
  `/advisor/sarah-mitchell-…`). Reproduced 2–3/3 in a real browser, but **always
  co-occurring with proxy SSL/403 noise** (the proxy drops the page's SSR/Suspense
  data fetch → boundary can't finish → #419 → client fallback). Page still 200s
  and client-renders. Not confirmable in-sandbox; **re-check on a non-proxied
  deploy** (Vercel) before treating as real.

## UX / UI observations (no code change — product calls)

- **Content → conversion path is loose on non-affiliate verticals.** Deep SMSF/
  super/wholesale content pages carry few inline provider CTAs — partly by design
  (super funds and wholesale have no/limited affiliate program; super CPA = $0),
  but a content reader has to navigate back to `/compare` to act. Worth a
  "next step" nudge on these guides.
- **Cross-category versus pages look thin.** On `…-vs-australiansuper` (savings
  vs super), the "Head-to-Head Comparison" and "Pros & Cons" sections rendered
  blank in the capture. Likely proxy-dropped SSR (same confound as #419), but
  cross-category pairings may also legitimately have sparse comparison data —
  worth checking whether these pairings should be generated at all.
- **Positive:** ~72 pages across 6 funnels with **zero real 404s/dead-ends**,
  fees + risk disclosures present on every content page walked, and strong
  internal deep-linking. `/wholesale` and `/wealth-stack` are clean, well-
  structured pages.

## Harness note
The link-crawler follows links, so multi-step **forms** (the get-matched quiz,
the wealth-stack builder) aren't completed end-to-end in-sandbox — the proxy
drops their async fetches. Run `ai-form.cjs` against the Vercel deploy to walk a
flow all the way to a result.
