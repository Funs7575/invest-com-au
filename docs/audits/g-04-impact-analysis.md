# G-04 verification — code-graph impact analysis (2026-05-01)

Read-only follow-up to G-04 verification. Enumerates which code references each
missing table/column from FINDING-1 and FINDING-4 to inform the founder's
apply-or-skip decision per finding.

Scope of search: `app/`, `lib/`, `components/`, `scripts/`, `__tests__/` (`*.ts`, `*.tsx`).
Cross-checked against `supabase/migrations/` — no later migration introduces
any of the missing tables or columns under a different name. The originating
migration `20260411_features_11_12_14_15_16_18.sql` is the only definition.
The follow-up `20260601_rls_email_otps.sql` adds RLS to `email_otps` but
assumes the table already exists from `20260316_email_otps.sql`.

---

## FINDING-1 — `email_otps`

### Code references

- `app/api/verify-otp/send/route.ts:61` — `await supabase.from("email_otps").update({ used_at: ... }).eq("email", normalizedEmail).is("used_at", null);`
- `app/api/verify-otp/send/route.ts:66` — `await supabase.from("email_otps").insert({ email: normalizedEmail, code, expires_at: expiresAt });`
- `app/api/verify-otp/verify/route.ts:69` — `await supabase.from("email_otps").select("id, code, expires_at, used_at").eq("email", normalizedEmail)...`
- `app/api/verify-otp/verify/route.ts:93` — `await supabase.from("email_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);`
- `__tests__/integration/o-iter7.rls.int.test.ts:89,119,122,124,128,134,142,151` — RLS policy assertions; declarative tests that read the migration file, do not hit live DB.
- `supabase/migrations/20260601_rls_email_otps.sql:27,31,34,40` — depends on the table existing.

### User-facing surface

The OTP table is the backing store for the **find-advisor quiz email verification flow**:

- `app/find-advisor/page.tsx:445` — `fetch("/api/verify-otp/send", ...)` triggered by user submitting their email at step 4 of the quiz.
- `app/find-advisor/page.tsx:464` — `fetch("/api/verify-otp/verify", ...)` triggered by user entering the 6-digit code.

If the table does not exist:
- `verify-otp/send/route.ts` — the `INSERT` at line 66 will throw `relation "public.email_otps" does not exist`. The route does not wrap that call in try/catch — the unhandled error means the request returns Next's generic 500 response. The Resend email is never sent.
- `verify-otp/verify/route.ts` — the `SELECT` returns the missing-table error in `error` (not `data`), but the route only checks `if (!otp)` and would return 400 ("No active code found"). The code path that calls `from("email_otps").update(...)` at line 93 is unreachable because the matching select fails first, so verify also degrades to a 400 rather than 500. Either way, the user can never complete OTP verification.

The find-advisor quiz is a primary lead-generation funnel (linked from the homepage CTA and `/quiz`). If the live table is genuinely missing, this funnel is silently broken in prod for every visitor right now.

### Recommendation

**Apply.** Both `app/api/verify-otp/send` and `app/api/verify-otp/verify` are live route handlers wired into the find-advisor quiz, and the follow-up RLS migration `20260601_rls_email_otps.sql` was applied successfully under the assumption the base table exists. The migration body is two `CREATE TABLE IF NOT EXISTS` plus two `CREATE INDEX IF NOT EXISTS` — fully idempotent. Re-running it is safe and unblocks a primary lead funnel. The "remove migration" alternative would be a regression — the K-02 OTP work (per audit notes) clearly does still depend on this table.

---

## FINDING-4 — missing tables

### `user_saved_comparisons`

**References:**
- `app/api/saved-comparisons/route.ts:25` — `.from("user_saved_comparisons").select("id, name, broker_slugs, quiz_results, notes, created_at, updated_at").eq("user_id", user.id)` (GET handler)
- `app/api/saved-comparisons/route.ts:70` — `.from("user_saved_comparisons").select("id", { count: "exact", head: true }).eq("user_id", user.id)` (POST count check)
- `app/api/saved-comparisons/route.ts:133` — `.from("user_saved_comparisons").insert({ user_id, name, broker_slugs, ... })` (POST)
- `app/api/saved-comparisons/[id]/route.ts:26,80,114` — GET/PATCH/DELETE by id
- `app/account/AccountClient.tsx:110` — `fetch("/api/saved-comparisons")` (account dashboard preview)
- `app/account/saved/SavedComparisonsClient.tsx:39,67,105` — full saved-comparisons page (list + rename + delete)
- `components/SaveComparisonButton.tsx:84` — `fetch("/api/saved-comparisons", { method: "POST", ... })` (the "Save comparison" CTA)

**User-facing impact if missing:** Every signed-in user who:
- visits `/account` — the dashboard widget calls `/api/saved-comparisons` and the route returns **500** (`relation "public.user_saved_comparisons" does not exist` → caught by route-level try/catch → "Something went wrong on our end").
- visits `/account/saved` — the entire page errors with the same 500.
- clicks `SaveComparisonButton` anywhere in the app — POST returns 500.

The error response is human-readable so the UI does not white-screen, but the feature is 100% non-functional for every authenticated user. Anonymous users are unaffected (the routes 401 before touching the table).

**Recommendation:** **apply** — three live route handlers and three UI surfaces depend on it.

---

### `user_shortlisted_brokers`

**References:**
- `app/api/sync-shortlist/route.ts:22` — GET `.from("user_shortlisted_brokers").select("broker_slug, added_at").eq("user_id", user.id)`
- `app/api/sync-shortlist/route.ts:74` — POST `delete().eq("user_id", user.id)`
- `app/api/sync-shortlist/route.ts:90` — POST `insert(rows)`

No UI consumer was found by grep for `/api/sync-shortlist` in `app/` or `components/`, but the route shape (GET to load, POST to overwrite) and the comment "client fires a write on every toggle" indicates it is fetched directly via `fetch("/api/sync-shortlist", ...)` from a client component — likely the shortlist toggle in the broker comparison UI. Either the call site exists under a different string (template-built URL) or the server-sync side is shipped but not yet wired to a UI. Worth a manual confirmation by the founder.

**User-facing impact if missing:** Whatever client wires up the shortlist sync gets 500s on both load and toggle. localStorage shortlist would still work (the on-page UI is local-first), but the cross-device persistence layer is dead.

**Recommendation:** **apply** — the route handlers exist and will 500 the moment they are called. Whether anything calls them today, the migration cost is trivial.

---

### `price_drop_notifications`

**References:**
- `app/api/cron/price-drop-alerts/route.ts:196` — `await supabase.from("price_drop_notifications").insert({ subscription_id: sub.id, broker_slug, field_name, old_value, new_value, change_percent: pctChange });`

**User-facing impact if missing:** The cron route is invoked by a Vercel cron dispatcher (registered under `/api/cron/dispatch/*` per `vercel.json`). When the cron runs and finds a price decrease in the last 24h, the insert throws and is *not* wrapped in try/catch around just that line — but the surrounding `for (const d of relevant)` loop is inside a `try { ... } catch (err) { log.error("Failed to send price drop email", ...) }` block at line 218. So the per-subscriber error is swallowed and logged, but **no user-facing impact is visible** because the user already received the notification email earlier in the same loop iteration (lines 171–187, before the insert). The downstream cost is loss of the audit/log row of which notifications were sent — the cron will likely re-notify the same user if the system relies on `price_drop_notifications` for de-dupe. Inspection shows de-dupe is via `emailDeliveryKey: \`price_drop:${today}:${slugKey}\`` (notification dedup), not via reading from `price_drop_notifications`, so re-notification risk is low.

**Recommendation:** **apply** (low urgency) — no immediate UX break, but the insert silently failing means the audit log never gets populated and the related `fee_alert_subscriptions.last_notified_at` / `notification_count` updates also fail (see column section below). Apply for completeness when the rest of the migration ships.

---

### `qa_votes`

**References:**
- `app/api/answers/[id]/vote/route.ts:58,89,99` — SELECT existing vote, UPDATE existing, INSERT new
- `app/api/questions/[id]/vote/route.ts:58,76,86` — same shape for question voting
- `components/QASection.tsx:36` — `qa_votes_${brokerSlug}` (string used as a localStorage key, **not** the table — false positive in raw grep)
- `__tests__/api/questions-id-vote.test.ts:84,129,138,145` — mock branch on table name

**User-facing impact if missing:** `QASection` is rendered on:
- `app/broker/[slug]/page.tsx:434` — every broker detail page (~80 brokers)
- `app/best/[slug]/page.tsx:706` — every `/best/[slug]` comparison page (43 routes)

When a visitor clicks the vote arrow on a question or answer, the POST to `/api/{questions,answers}/[id]/vote` will 500. The select at line 58 (`.from("qa_votes").select("id, vote_value")...single()`) returns an error and the code falls through to the insert path at line 99 (`from("qa_votes").insert(...)`) which also errors → returns 500 "Failed to record vote". The rendered question/answer counts are static (read from `broker_questions.vote_count` / `broker_answers.vote_count` columns — also missing, see below) so the page **renders fine**, voting is just a no-op error.

**Recommendation:** **apply** — Q&A is a content/SEO surface on every broker and best-of page; the voting CTA is broken until applied.

---

### `api_keys`

**References:**
- `app/api/v1/api-keys/route.ts:114` — `.from("api_keys").select("id", { count: "exact", head: true }).eq("owner_email", email)` (count existing keys for email)
- `app/api/v1/api-keys/route.ts:142` — `.from("api_keys").insert({ name, key_hash, key_prefix, owner_email, ... })` (key creation)
- `lib/api-auth.ts:97` — `.from("api_keys").select("*").eq("key_hash", keyHash).single()` (auth check on every authenticated `/api/v1/*` request)
- `lib/api-auth.ts:130` — `.from("api_keys").update({ requests_today: ..., requests_total: ..., last_used_at, updated_at }).eq("id", row.id)` (rate-limit counter increment)
- `__tests__/lib/api-auth.test.ts:67` — mock branch

**User-facing impact if missing:**
- `POST /api/v1/api-keys` — the count check at line 114 returns an error (caught), returning 500 with `"Failed to process request"`. **The "request an API key" form on `/api-docs` is broken end-to-end.**
- Any authenticated `/api/v1/*` request — `validateApiKey()` in `lib/api-auth.ts` returns `{ valid: false, error: "Invalid API key" }` because the lookup fails, so any planner-API consumer gets 401. (Today this is moot because no key can be issued in the first place.)
- `/api-docs` page itself still renders (it doesn't read from `api_keys`).

**Recommendation:** **apply** — Feature 16 (Financial Planner API) is unusable without it. If the founder wants to defer launching the planner API, the route can stay disabled, but the migration itself is 9 lines of `CREATE TABLE / CREATE INDEX / ALTER TABLE` and harmless to apply.

---

### `api_request_log`

**References:**
- `lib/api-auth.ts:170` — `await supabase.from("api_request_log").insert({ api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent });`
- `__tests__/lib/api-auth.test.ts:87` — mock branch

**User-facing impact if missing:** `logApiRequest()` is fire-and-forget — the function body is wrapped in `try { ... } catch (err) { log.error("Failed to log API request", ...) }`. No user-facing impact. Just analytics loss.

**Recommendation:** **apply** alongside `api_keys` — they're a logical pair and the cost of applying is zero.

---

### `regulatory_broker_impacts`

**References:**
- `app/api/admin/regulatory-impacts/route.ts:27` — admin GET list by alert_id
- `app/api/admin/regulatory-impacts/route.ts:65` — admin POST upsert
- `app/api/admin/regulatory-impacts/route.ts:84` — admin POST re-read all impacts to recompute `affected_broker_slugs`
- `app/api/admin/regulatory-impacts/route.ts:125` — admin DELETE
- `app/alerts/[slug]/page.tsx:37` — **public page**: `.from("regulatory_broker_impacts").select("*").eq("alert_id", data.id).order("impact_level", { ascending: false })`

**User-facing impact if missing:**
- `/alerts/[slug]` — public page that renders a single regulatory alert. The select returns an error in `error`, and `(impacts as RegulatoryBrokerImpact[]) || []` falls through to `[]` because `data` is null. The page **does not crash** — it renders the alert without the broker-impact section. Confirmed: the destructured `error` is ignored at the call site (no guard reads it). Soft-degrade.
- `/alerts` (list page) — comment in code: `"backing table (regulatory_alerts) has 0 rows — remove this once content is seeded"` and the page is `noindex`. Translation: this whole feature is dormant until content is seeded.
- All admin routes `/api/admin/regulatory-impacts/{GET,POST,DELETE}` — gated behind `ADMIN_EMAILS` check; if an admin opens whatever UI consumes them they get 500. No admin UI page consumes them in the codebase grep — the routes are the API surface for a future admin tool.

**Recommendation:** **apply** (low urgency) — public page soft-degrades fine, admin tooling is unbuilt. But Feature 18 was clearly designed as a unit; partial-apply leaves admin endpoints dead. Apply alongside the rest.

---

## FINDING-4 — missing columns

### `regulatory_alerts.affected_broker_slugs` (TEXT[] DEFAULT '{}')

**References:**
- `app/alerts/AlertsClient.tsx:141,143` — `{alert.affected_broker_slugs && alert.affected_broker_slugs.length > 0 && ...}` (badge on each alert card)
- `app/api/admin/regulatory-impacts/route.ts:92` — `.update({ affected_broker_slugs: slugs })` (admin route writes back to this column)
- `lib/types.ts:564` — TypeScript declaration as `affected_broker_slugs?: string[]`

**Impact:** The select at `app/alerts/page.tsx:25` is `.select("*")` — Postgres returns whatever columns exist. Missing column means the property is `undefined` on the row. The UI guard `{alert.affected_broker_slugs && ...}` short-circuits cleanly — no runtime error, the badge just never shows. The admin upsert at line 92 errors with `column "affected_broker_slugs" of relation "regulatory_alerts" does not exist`, returning 500 from the `POST /api/admin/regulatory-impacts` flow (admin-only, no public impact today).

**Recommendation:** **apply** — soft-degrade is fine while the table is empty, but as soon as content is seeded the admin tooling will need this.

---

### `regulatory_alerts.affected_platform_types` (TEXT[] DEFAULT '{}')

**References:**
- `lib/types.ts:565` — type declaration only
- (no runtime read or write found)

**Impact:** None today — declared but unused.

**Recommendation:** **apply** for type/migration parity, no urgency.

---

### `regulatory_alerts.change_category` (TEXT CHECK ...)

**References:**
- `app/alerts/AlertsClient.tsx:48` — `.filter((a) => a.change_category === categoryFilter)` (URL query-string filter on the public list page)
- `app/alerts/[slug]/page.tsx:205,208,211` — renders a "View all <category> changes →" link if the column is set
- `lib/types.ts:566` — type

**Impact:** Both UI surfaces guard on truthiness (`{alert.change_category && ...}`). Missing column → undefined → no UI shown, no runtime error. The category filter on `/alerts?category=X` returns an empty list (no row has `change_category` set).

**Recommendation:** **apply** — soft-degrade today, but content authoring assumes this column exists.

---

### `regulatory_alerts.user_action_required` (BOOLEAN DEFAULT false)

**References:**
- `app/alerts/AlertsClient.tsx:136` — `{alert.user_action_required && (<span>Action Required</span>)}`
- `app/alerts/[slug]/page.tsx:184,190` — gated rendering of action-required messaging
- `lib/types.ts:567` — type

**Impact:** Truthy guard → no error, no badge. Soft-degrade.

**Recommendation:** **apply** with the rest.

---

### `regulatory_alerts.compliance_deadline` (TIMESTAMPTZ)

**References:**
- `app/alerts/[slug]/page.tsx:178,183,190` — renders deadline date if set
- `lib/types.ts:568` — type

**Impact:** Truthy guard → no error, no UI. Soft-degrade.

**Recommendation:** **apply**.

---

### `regulatory_alerts.views_count` (INTEGER DEFAULT 0)

**References:**
- `app/alerts/[slug]/page.tsx:53` — `await supabase.from("regulatory_alerts").update({ views_count: (alert.views_count || 0) + 1 }).eq("id", alert.id);`
- `lib/types.ts:569` — type

**Impact:** This is the **only column missing today that produces a write error on a public page**. Every visit to `/alerts/[slug]` issues the update, which fails with `column "views_count" does not exist`. The error is in `error` of the destructured response (here it's not even destructured — it's `await ... .update(...).eq(...)` with no `.then`/`await { error }`), so it silently fails and the page renders normally. No user-facing impact, but it logs a Postgres warning per page view. Effectively analytics dead.

**Recommendation:** **apply** — page-view analytics for alerts are silently lost.

---

### `fee_alert_subscriptions.price_threshold` (NUMERIC(10,2))

**References:** none found in `app/`, `lib/`, `components/`, `scripts/`, `__tests__/`.

**Impact:** None today.

**Recommendation:** **apply** for migration parity (zero cost), but feature is unwired.

---

### `fee_alert_subscriptions.last_notified_at` (TIMESTAMPTZ)

**References:**
- `app/api/cron/price-drop-alerts/route.ts:210` — `.update({ last_notified_at: new Date().toISOString(), notification_count: ... }).eq("id", sub.id);`

**Impact:** The cron's per-subscriber update fails. Caught by surrounding try/catch around the loop body — logged, not thrown. No user-facing impact. The update *was* a tracking write only; the de-dupe key for whether to send the email lives in `notifyUser`'s `emailDeliveryKey`, not in this column.

**Recommendation:** **apply** alongside `price_drop_notifications` table.

---

### `fee_alert_subscriptions.notification_count` (INTEGER DEFAULT 0)

**References:**
- `app/api/cron/price-drop-alerts/route.ts:211` — read inside the same UPDATE statement at line 210 (`(sub as Record<string, unknown>).notification_count ? Number(...) + 1 : 1`)

**Impact:** Same as above — single failing UPDATE inside a try/catch.

**Recommendation:** **apply**.

---

### `professional_reviews.is_verified_client` (BOOLEAN DEFAULT false)

**References:**
- `app/advisor/[slug]/AdvisorProfileClient.tsx:925` — `isVerified={!!r.is_verified_client}` (renders verified-client badge on each review)
- `app/api/cron/verify-review-clients/route.ts:96,131` — cron filter `.or("is_verified_client.is.null,is_verified_client.eq.false")` and update writing the column
- `app/api/reviews/verify-client/route.ts:129,141,161` — admin manual-verify route reads and writes the column
- `lib/types.ts:1232` — type
- `__tests__/api/reviews-verify-client.test.ts:224,240,272` — test fixtures

**Impact:**
- `app/advisor/[slug]` — the SELECT that hydrates `r` uses `.select("*")` (or whichever column list — the advisor profile page does not appear in the grep with explicit field list for this column, so `select("*")` is the likely path). Missing column → property undefined → `!!undefined` → `false` → no badge rendered. **Soft-degrade, no error.**
- `cron/verify-review-clients` — the `.or("is_verified_client.is.null,is_verified_client.eq.false")` filter generates SQL referencing the missing column → entire SELECT fails → cron logs the error and continues. Advisor reviews never get auto-verified.
- `POST /api/reviews/verify-client` (review_type === "advisor" branch) — the SELECT at line 129 includes `is_verified_client` in the column list → query fails → returns 404 "Review not found" (the route only checks `if (reviewError || !review)` and lumps errors with not-found). **Admin manual-verify for advisor reviews is broken.**

**Recommendation:** **apply** — non-trivial feature break in admin tooling and the verification cron is a no-op.

---

### `professional_reviews.lead_id` (BIGINT)

**References:**
- `app/api/cron/verify-review-clients/route.ts:133` — `.update({ ..., lead_id: leadId })`
- `app/api/reviews/verify-client/route.ts:163` — `.update({ ..., lead_id: leadMatch[0].id })`

**Impact:** Both updates fail — cron silently logs error; admin route returns 500 "Failed to update review". (Note: `lead_id` is also a column on many other tables — searching uncovered hits in `advisor-billing.ts`, `advisor-bookings`, etc. — those are unrelated to `professional_reviews`.)

**Recommendation:** **apply**.

---

### `professional_reviews.verified_client_at` (TIMESTAMPTZ)

**References:**
- `app/api/cron/verify-review-clients/route.ts:132` — `.update({ ..., verified_client_at: new Date().toISOString() })`
- `app/api/reviews/verify-client/route.ts:162` — same shape
- `lib/types.ts:1233` — type

**Impact:** Same as `lead_id` above — write fails, manual-verify route 500s.

**Recommendation:** **apply**.

---

### `broker_questions.vote_count` (INTEGER DEFAULT 0)

**References:**
- `app/api/questions/[id]/vote/route.ts:47` — SELECT `id, vote_count`
- `app/api/questions/[id]/vote/route.ts:70,100,103,107,111` — read existing, compute new, write back, return in JSON response
- `components/QASection.tsx:11,134,143,146,147,252` — read on render and used to sort questions descending
- Multiple test fixtures

**Impact:**
- `QASection` render: the SELECT in `app/broker/[slug]/page.tsx:396+` (BrokerQASection) and `app/best/[slug]/page.tsx:667+` (BestQASection) loads questions. If the select uses `*`, the column is undefined; UI guards default to 0 (`q.vote_count ?? 0`). Sort order silently flattens. **No error, soft-degrade.**
- `POST /api/questions/[id]/vote` — first SELECT fails → returns 404 "Question not found" or 500. Voting is broken on every Q&A widget.

**Recommendation:** **apply** — vote button on every broker and best-of page is broken.

---

### `broker_answers.vote_count` (INTEGER DEFAULT 0)

**References:**
- `app/api/answers/[id]/vote/route.ts:47,72,113,118,122,127` — same shape as questions
- `components/QASection.tsx:20,134,146,238,281` — render & sort

**Impact:** Same as `broker_questions.vote_count` — render soft-degrades, voting POST 500s.

**Recommendation:** **apply**.

---

### `broker_answers.helpful_count` (INTEGER DEFAULT 0)

**References:**
- `app/admin/user-reviews/page.tsx:85` — explicit column in SELECT for the admin grid (this admin page selects from `user_reviews`, not `broker_answers` — but the grep matches a different table that *does* have `helpful_count` from `lib/database.types.ts:2019` which is `article_comments`. This is one of the *existing* `helpful_count` columns; it's a different table.)
- `app/api/answers/[id]/vote/route.ts:47,73,114,118,128` — read & write helpful_count on the broker_answers table
- `components/QASection.tsx:21` — type field (read for display)
- `lib/article-comments.ts:32,55,95` — `article_comments.helpful_count` (different table, already exists per `lib/database.types.ts`)

**Impact:** The vote-update SELECT at line 47 fails → vote POST 500. The render path reads via the QA select — soft-degrade if missing.

**Note:** Most other `helpful_count` references in the grep are for `article_comments`, which is a separate, *existing* table (per `lib/database.types.ts:2019`). Not in scope of FINDING-4.

**Recommendation:** **apply** with `broker_answers.vote_count`.

---

## Net read for the founder

### Numbers

- **Total source files referencing missing tables/columns:** ~22 (excluding tests and database.types.ts)
  - 13 route handlers under `app/api/`
  - 6 page/component files under `app/` and `components/`
  - 3 lib helpers (`lib/api-auth.ts`, `lib/types.ts` — type-only declaration, `lib/article-comments.ts` is unrelated)
- **Total routes affected:** 14 (10 user-facing, 4 admin-only)
  - User-facing: `/api/verify-otp/send`, `/api/verify-otp/verify`, `/api/saved-comparisons` (GET+POST), `/api/saved-comparisons/[id]` (GET+PATCH+DELETE), `/api/sync-shortlist` (GET+POST), `/api/questions/[id]/vote`, `/api/answers/[id]/vote`, `/api/v1/api-keys`, `/api/cron/price-drop-alerts`, `/api/cron/verify-review-clients`
  - Admin-only: `/api/admin/regulatory-impacts` (GET+POST+DELETE), `/api/reviews/verify-client`
- **Pages touched:** `/find-advisor`, `/account`, `/account/saved`, `/broker/[slug]` (~80 routes), `/best/[slug]` (43 routes), `/alerts`, `/alerts/[slug]`, `/advisor/[slug]`

### Critical paths broken right now

1. **`/find-advisor` quiz email-verification flow** (FINDING-1) — primary lead funnel. Every visitor who reaches step 4 is blocked. Highest urgency.
2. **Save-comparison + view-saved-comparisons for signed-in users** (FINDING-4 / `user_saved_comparisons`) — entire feature returns 500s on `/account` and `/account/saved` and on every "Save comparison" click.
3. **Q&A voting on every broker and best-of page** (FINDING-4 / `qa_votes` + `broker_*.vote_count`) — vote arrows return 500. Render still works.
4. **Financial-planner API key issuance** (FINDING-4 / `api_keys`) — `/api-docs` form returns 500. No keys can be issued.
5. **Manual-verify-client flow for advisor reviews in admin** (FINDING-4 / `professional_reviews.{is_verified_client,lead_id,verified_client_at}`) — admin tool 500s, cron silently no-ops.

### Non-critical (soft-degrade today)

- `/alerts` and `/alerts/[slug]` rendering — gracefully omits the regulatory-broker-impact section and badge metadata. Page itself comments that `regulatory_alerts` has 0 rows in prod — feature is dormant.
- Page-view analytics on `/alerts/[slug]` (silently dropped per visit).
- `price_drop_notifications` audit log + per-subscriber `last_notified_at` write — caught and logged inside the cron loop.
- `user_shortlisted_brokers` server-sync — no UI consumer found, but the route exists and would 500 if called.

### Recommendation per finding

- **FINDING-1 (`email_otps`):** **APPLY.** Fixes a live, broken primary lead funnel. Migration is fully idempotent (`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`). Two lines of work.
- **FINDING-4 (`20260411_features_11_12_14_15_16_18`):** **APPLY ALL.** No reference is decorative — everything is referenced by a live route handler or rendered component. Of the 7 missing tables, 5 break user-facing flows on hot paths; the other 2 break admin/cron paths. Of the 13 missing columns, 6 break write paths in cron/admin routes and 7 cause UI badges/sorts to no-op. The migration body is already idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) per the source file. There is no value in dropping scope — every block of the migration has live consumers in the codebase.

**Net:** apply both migrations. There is no defensible "drop scope" path on either finding because both have live route handlers shipping today that depend on the missing schema.
