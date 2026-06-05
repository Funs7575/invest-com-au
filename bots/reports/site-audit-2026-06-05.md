# Full-site page-sweep — 2026-06-05

Deterministic launch-readiness crawl (`bots/journey/site-audit.cjs`) against the
live Netlify mirror, firewall on. **65 routes audited · 886 internal links
discovered · 80 re-probed with retries.**

## Result: structurally healthy — zero current-code bugs

- **0 broken links** of 80 probed (with retry verification).
- **All 11 flagged routes resolve to false positives** once verified:

| Flag | Routes | Verdict |
|---|---|---|
| HTTP 403/503/502, "Failed to fetch" | `/`, `/compare`, `/robo-advisors`, `/property-platforms`, `/advisors/tax-agents`, `/grants` | **Proxy noise** — every one returns **200 on 5/5** retry probes. The sandbox TLS-MITM proxy throws transient 4xx/5xx + SSL errors. |
| `gated-not-redirected` | `/admin`, `/org-portal` | **By design** — client-gated (AdminAuthGuard / portal login), 200 + client redirect, not a server 3xx. The 401 console on `/org-portal` is its data fetch correctly refusing an unauthenticated caller. |
| `no-h1` | `/quiz`, `/get-matched`, `/start` | **Stale deploy, not a code bug** (see below). |

## Meta-finding: the live mirror is stale (deploy-side of the Vercel block)

The `no-h1` flags are real *on the live site* but **current code already has the
headings**:
- `/quiz` — sr-only `<h1>` at `app/quiz/page.tsx:987`, added **2026-06-04**
  (commit `81c49d6`) — not present on the live build.
- `/get-matched` — visible `<h1>` in `GetMatchedClient.tsx:638`.
- `/start` — a server `redirect("/quiz")`, so it inherits `/quiz`.

The live mirror is missing code merged as recently as **yesterday (2026-06-04)**.
This is the **deploy-side twin of the cron outage** (`CRON-HEALTH-2026-06-05.md`):
the blocked Vercel account has frozen both scheduled jobs *and* deploys, so the
live site no longer reflects `main`. Any live-site audit currently measures a
stale build, not current code.

## Conclusion

The site is healthy at the code level — clean link graph, no broken pages, no
real 5xx. The single systemic problem remains the **blocked Vercel account**,
which is now confirmed to affect three things at once:
1. CI deploy status (red on every PR),
2. the cron fleet (dark ~13 days),
3. production deploys (live build behind `main`).

**No code PR from this sweep.** Re-run it once Vercel is unblocked and `main` is
deployed, to audit current code against a fresh build.

## Method
`bots/journey/site-audit.cjs` (route list + site-wide link crawl, proxy-noise
filtered, retry-verified) · per-flag HTTP retry probes (5×) · browser h1 checks ·
`git log -S` to date the heading code vs the live build.
