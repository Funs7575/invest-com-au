# AI Journey report — 2026-06-03

**Target:** https://lambent-sawine-17c3dd.netlify.app (live Netlify mirror) · **Firewall:** ON (0 real payments / `/go/` / leads / writes)
**Run by:** continuous-improvement loop, post-merge smoke + revenue-funnel personas.

## What ran

- **Persona A — comparison shopper** (`/best`, 12 steps, goal: compare two brokers → reach an affiliate CTA without clicking). Browser drove live; goal reached.
- **Smoke-sweep** of `/invest`, `/best`, `/compare`, `/advisors`, `/super`, `/etfs`, `/tax`.
- Persona B (quiz) not completed: the get-matched quiz's async fetches are dropped by the sandbox TLS-MITM proxy (`ai-form.cjs` needs a real network / Vercel deploy) — known limitation, not a site bug.

## Health (confirmed good)

- All 7 key routes return **200** with real rendered content — JS executes, no CSP-blank pages. The CSP/ISR fix lineage + recent merges (#1310/#1311/#1313) deployed cleanly.
- **12/12** swept pages carried both fee and risk disclosures (compliance signal healthy).
- Affiliate funnel rendered ~33 `/go/` CTAs across compare surfaces — all firewall-mocked (0 real clicks). No real dead-ends.

## Findings

### F1 — `GET/POST /api/versus/vote` 500s site-wide — `versus_votes` table never migrated in  ·  **P1**  ·  **HELD (migration)**
- **Repro (consistent, 5/5):** `GET /api/versus/vote?a=commsec&b=cmc-markets` → `500 {"error":"Failed to fetch votes"}`. (Malformed requests correctly 400; the 500 is the DB-query path in `app/api/versus/vote/route.ts:54`.)
- **Root cause:** `grep -rn versus_votes supabase/ lib/` finds the table referenced by the route (SELECT + INSERT on `versus_votes`, cols `broker_a_slug`/`broker_b_slug`/`chosen_slug`) but **no migration ever creates it** (only the unrelated `versus_editorials` exists, in `20260309_content_tables.sql`). The Supabase query errors with `relation "versus_votes" does not exist`, so the route returns 500. Uses the service-role admin client, so this is not RLS.
- **User impact:** the broker-vs-broker community voting feature is fully broken on every comparison page (vote counts never load; votes can't be cast).
- **Why HELD:** the fix is a new DB migration (`supabase/migrations/*`) — a never-autonomous hard line (merging may trigger application). Surfaced for founder, not built. See founder brief below.

### F2 — `404 /_vercel/speed-insights/script.js`  ·  **P3 (cosmetic)**  ·  not actioned
- Vercel Speed Insights client script 404s on the Netlify mirror (the script is Vercel-platform-specific). Harmless on Netlify; console noise only. Will resolve naturally on the Vercel deploy, or guard the injection by host. Not worth a fix this fire.

## Rejected as transient (re-verified, not real)
- 12 sandbox-proxy errors during the journey (403/503/000) — re-curling the affected routes 4–6× returned consistent 200s. Classic TLS-MITM proxy noise; discarded. (The live root URL itself flapped 000×3 → 200×6 on re-probe — same noise.)

## Founder brief — FB-2026-06-03-02 (versus_votes table)
**Decision needed:** the `versus_votes` table is missing from the schema. Suggested forward-only, idempotent migration (RLS-enabled per repo convention — service-role writes, anon read of aggregate counts only):

```sql
-- supabase/migrations/<ts>_versus_votes.sql  — PROPOSAL, not applied
CREATE TABLE IF NOT EXISTS versus_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_a_slug text NOT NULL,            -- normalised: a < b alphabetically
  broker_b_slug text NOT NULL,
  chosen_slug   text NOT NULL,
  voter_hash    text NOT NULL,            -- sha256(ip + VOTE_SALT), see route
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT versus_votes_chosen_chk CHECK (chosen_slug IN (broker_a_slug, broker_b_slug))
);
CREATE UNIQUE INDEX IF NOT EXISTS versus_votes_dedup
  ON versus_votes (broker_a_slug, broker_b_slug, voter_hash);   -- one vote per pair per voter
ALTER TABLE versus_votes ENABLE ROW LEVEL SECURITY;
-- service-role (admin client) bypasses RLS; no anon policy needed since the route reads via admin client.
```
**Confirm against the live route's exact columns before applying** (route inserts `broker_a_slug`, `broker_b_slug`, `chosen_slug`, and a voter-dedup hash). Apply via the normal prod migration path — loop will not merge or apply it.
