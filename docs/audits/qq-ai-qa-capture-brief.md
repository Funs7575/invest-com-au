# Stream QQ — Public AI Q&A capture surface

**Source:** `docs/strategy/FIN_NOTEBOOK.md` ship-now item #7 (audited 2026-04-30, status: 80% built, 2–3 wks).
**Drafted:** 2026-05-09. **Owner:** audit-remediation cloud loop (`/audit-remediation-iteration`).
**Branch:** `claude/audit-remediation/qq-01-public-qa-surface` (one draft PR per stream per `REMEDIATION_DEFAULTS.md`).
**Tier classification:** Tier B / Tier C mix — most sub-tasks are additive (Tier B: tests, ISR routes, components). `QQ-02` (schema migration), `QQ-05` (new public API route), and `QQ-08` (compliance copy in `lib/compliance.ts`) are Tier C — announce intent before merge per `MERGE_AUTHORIZATION.md`.

## What this is

Promote the production RAG chatbot from admin-only to a public SEO/lead-capture surface. Every question becomes a long-tail indexed page; every answer ends in a CTA into the comparison and advisor-match funnels.

The strategic case is in the notebook. The engineering case: `lib/chatbot.ts` is production-ready (Claude+OpenAI fallback, prompt-injection classifier, AFSL guardrails, conversation audit logging, cost caps via `lib/ai-cost-caps.ts`, embeddings via `lib/embeddings.ts`). Today it serves `app/api/chatbot` admin-side only. We're not building a chatbot — we're publishing one.

## Why ship now (not later)

- 80% of the work is already done. Remaining scope is plumbing, not invention.
- Net-new SEO surface: every persisted Q becomes a `/answers/<slug>` page. AU finance-question long-tail is uncontested vs. Reddit/Quora.
- Lead capture is a structural by-product — every answer page ends in a CTA into `/best/[slug]` or `/find-advisor`.
- It generates the dataset that unlocks #11 Market-intelligence data product (P2, gated on 6 months of question data — see notebook).

## Out of scope

- Real-time conversational chat UI for the public site (admin-only stays admin-only this iteration; we're shipping a question→answer page model, not threaded chat).
- Personalised advice (RG 246 / RG 175 line). All answers are general informational with the standard `lib/compliance.ts` disclaimer block. **Compliance review (QQ-08) is a hard gate before public exposure.**
- Multilingual / locale variants. AU English only for v1.
- User accounts on Q&A. Anonymous question submission with email capture optional.

## Done-when (stream completion gate)

All of these must be true before stream QQ closes:

- [ ] 100+ seed questions live at `/answers/<slug>`, each indexed in `sitemap.ts`, each with FAQPage JSON-LD, each with a CTA link to the relevant `/best/[slug]` or `/find-advisor?specialty=...`
- [ ] Public question-capture form embeds on `/best/[slug]`, `/find-advisor`, and the homepage Q&A strip
- [ ] User-submitted questions land in `qa_questions` with status `pending_moderation`; admin queue at `app/admin/qa/page.tsx` lets approver promote → `published` (which triggers ISR revalidate of the answer page)
- [ ] AFSL disclaimer block from `lib/compliance.ts` rendered on every answer page (verified by snapshot test)
- [ ] Cost guardrails: `lib/ai-cost-caps.ts` enforces `qa_capture` daily/monthly cap distinct from existing `chatbot_admin` cap; rate limit on `/api/answers/ask` via `lib/rate-limit.ts` (10 req / IP / hour for v1)
- [ ] Compliance sign-off recorded in `docs/audits/qq-compliance-signoff.md` (Tier C precondition for QQ-08 merge)
- [ ] Tests: route-handler test for `/api/answers/ask`, RLS isolation test for `qa_questions`/`qa_answers`, Playwright golden flow (anon user submits question → sees pending state → after admin approval, page is live with CTA), snapshot test for compliance block presence

## Sub-tasks

### QQ-01 — Capability audit & API surface spec (Tier B, ≤1 day)

**What:** Read `lib/chatbot.ts`, `lib/embeddings.ts`, `lib/ai-cost-caps.ts`. Document the existing API surface, identify the safe-to-expose-publicly subset, list assumptions the admin chatbot makes that won't hold for an anonymous public caller (auth context, conversation history, rate limits, prompt-injection class taxonomy).

**Output:** `docs/audits/qq-01-capability-audit.md` covering: callable surface, dependencies, what hardens trivially, what needs a public-mode wrapper, what stays admin-only.

**Verification gate:** before declaring complete, grep for every consumer of `lib/chatbot.ts` exports to ensure no admin-only assumption is silently inherited.

**Done-when:** audit doc merged; QQ-02..QQ-10 sub-task scopes have been refined against findings.

---

### QQ-02 — Schema migration: `qa_questions`, `qa_answers`, `qa_question_views` (Tier C)

**What:** New migration `supabase/migrations/<date>_qa_capture_schema.sql`. Tables:

- `qa_questions` — `id uuid pk`, `slug text unique`, `question_text text`, `submitted_email text nullable`, `status text` (one of `pending_moderation`, `published`, `rejected`, `archived`), `submitted_at timestamptz`, `published_at timestamptz nullable`, `category text` (FK-shape onto `verticals.ts` slugs), `metadata jsonb default '{}'`
- `qa_answers` — `id uuid pk`, `question_id uuid fk`, `answer_markdown text`, `model_id text` (e.g. `claude-opus-4-7`), `prompt_version text`, `cost_usd numeric`, `cited_sources jsonb`, `compliance_review_at timestamptz nullable`, `created_at timestamptz`
- `qa_question_views` — `id bigserial pk`, `question_id uuid fk`, `viewed_at timestamptz`, `viewer_hash text` (rate-limit + analytics, no PII)

RLS:
- `qa_questions`: `service_role FOR ALL`. Anon `SELECT` allowed only `WHERE status = 'published'`. Anon `INSERT` allowed with `WITH CHECK (status = 'pending_moderation')` — submitted by capture form.
- `qa_answers`: `service_role FOR ALL`. Anon `SELECT` allowed only when joined to a `qa_questions` row with `status = 'published'`.
- `qa_question_views`: `service_role FOR ALL`, no anon access (write goes via API route).

Idempotent (`IF NOT EXISTS`), rollback header per `CONTRIBUTING.md`. Follow the **New RLS migration on existing table** verification gate from `REMEDIATION_DEFAULTS.md` if any of these names already exist.

**Done-when:** migration applied to staging Supabase, types regenerated via Supabase MCP `generate_typescript_types`, RLS isolation tests in `__tests__/integration/qa-rls.int.test.ts` cover anon-cannot-read-pending + anon-cannot-mutate-after-insert + service-role-bypasses.

---

### QQ-03 — Public `/answers/[slug]` route with ISR (Tier B, ~1 day)

**What:** New route `app/answers/[slug]/page.tsx` + `app/answers/page.tsx` (index).

- ISR `revalidate = 3600` per content-page convention
- Fetches `qa_questions` + most recent `qa_answers` row for the slug via `lib/supabase/server.ts` (anon RLS handles the published-only filter)
- Renders question, answer, AFSL disclaimer block from `lib/compliance.ts`, cited sources, **CTA into the relevant `/best/[slug]` or `/find-advisor?specialty=<...>`** based on `qa_questions.category`
- 404s on unpublished questions (don't leak draft existence)
- JSON-LD FAQPage via `lib/schema-markup.ts`; breadcrumb via `lib/seo.ts`
- Index page lists 50 most-recent published Qs grouped by category

**Done-when:** route renders for 5 hand-seeded test questions in dev; canonical URL matches `lib/seo.ts:absoluteUrl` output; no `console.*` (use `lib/logger.ts`).

---

### QQ-04 — Question-capture form component (Tier B)

**What:** New `components/QuestionCaptureForm.tsx`. Single textarea + optional email field + category select (pre-fills from page context). Embeds on:
- `/best/[slug]` (passes `category=<slug>`)
- `/find-advisor` (passes `category=advisor`)
- New homepage Q&A strip (one row, "Got a question? Ask our research desk")

Submit posts to `/api/answers/ask` (QQ-05). On success: shows pending-moderation state with the slug ("we'll publish once a human reviews — usually within 24h").

Validates: question length 10–500 chars, email optional but if present must be RFC5322-shaped (`zod` schema in `app/api/answers/ask/route.ts`).

**Done-when:** form renders + submits + shows pending state + works on mobile (320px viewport); component test covers happy-path + validation errors.

---

### QQ-05 — Public API route `/api/answers/ask` (Tier C)

**What:** New `app/api/answers/ask/route.ts`. POST-only.

- Wrap with `withValidatedBody` from `lib/validation/withValidatedBody.ts` per `CLAUDE.md`
- Rate limit via `lib/rate-limit.ts` (10/IP/hr; bump to 30/IP/hr for IPs already in `qa_questions` with at least 1 published answer)
- Run prompt-injection classifier from `lib/chatbot.ts` — reject + log on detection
- Persist to `qa_questions` with `status = 'pending_moderation'`
- Auto-generate `slug` (`lib/slugify` if exists; else SHA1-prefix + slugified-keywords pattern)
- Trigger Resend notification to admin queue if `ADMIN_EMAILS` is set
- Return `{ slug, status: 'pending_moderation' }`
- **No model call on submission** — the model only runs on admin approval (QQ-09) to avoid wasted spend on spam/abuse. Cost cap reservation in `lib/ai-cost-caps.ts` is on the approval path, not the submission path.

**Done-when:** route-handler test covers happy-path + rate-limit-exceeded + prompt-injection-rejected + invalid-body + admin-notification-sent paths; coverage ≥ 60% of branches per `REMEDIATION_DEFAULTS.md`.

---

### QQ-06 — SEO wiring + sitemap (Tier B)

**What:**
- `app/sitemap.ts` includes published `qa_questions` (priority 0.5, `changeFrequency: 'monthly'`)
- `lib/schema-markup.ts` adds `faqPageJsonLd(question, answer)` builder
- `lib/seo.ts` no changes needed (existing `absoluteUrl`, `breadcrumbJsonLd`, `CURRENT_YEAR` cover this)
- Homepage Q&A strip links to `/answers` index

**Done-when:** sitemap includes ≥1 seeded answer URL; FAQPage JSON-LD validates against schema.org Validator (manual check); strip renders on homepage with 5 most-recent Qs.

---

### QQ-07 — CTA wiring (Tier B)

**What:** Per-category CTA mapping in a new `lib/qa-ctas.ts` module:
- `share_broker` → `/best/share-trading`
- `super_fund` → `/best/super-funds`
- `crypto_exchange` → `/best/crypto-exchanges`
- `cross_border:uk` → `/find-advisor?specialty=UK+Pension+Transfer` (links to the Phase A specialty taxonomy shipped 2026-05-02 in `lib/advisor-specialties.ts:122–138`)
- `cross_border:us` → `/find-advisor?specialty=FATCA-Aware+US+Expat+Planning`
- `cross_border:firb` → `/find-advisor?specialty=FIRB+Property+%28Non-Resident%29`
- ... (cover all 9 `PlatformType` enums + the 4 cross-border specialties)
- Default fallback: `/find-advisor`

Tracking: CTA clicks fire `track_event` with `{ source: 'qa_answer', slug, category }` so revenue attribution is wired from day 1.

**Done-when:** every published answer page renders ≥1 CTA; click events appear in `track_event` table for one round-trip test.

---

### QQ-08 — Compliance review & disclaimer rendering (Tier C, **GATE**)

**What:** Compliance sign-off is the gate that prevents this from shipping prematurely.

- New compliance copy block in `lib/compliance.ts`: `aiAnswerDisclaimer()` returning: "This is general information only, prepared with AI assistance and reviewed by [editorial team / no human review for v1?]. It is not personal advice. Read our [methodology link]. Consider speaking to a licensed advisor for advice tailored to your situation."
- Decision required: do answers ship with **human review** (slow, defensible, RG 175 safer) or **AI-only** (fast, requires stronger disclaimer + audit trail)? Default for v1 per scope = **human review on first publish**, AI-generated draft, admin approves before `status='published'`.
- Document in `docs/audits/qq-compliance-signoff.md`: who reviewed, what they reviewed, what's in scope, what's out (e.g. no individual security recommendations, no "buy/sell" language, no projected returns)
- Snapshot test: every answer page contains the exact disclaimer string

**Done-when:** disclaimer renders on every test answer page; sign-off doc merged with reviewer attribution; snapshot test passes.

---

### QQ-09 — Admin review queue (Tier B)

**What:** New `app/admin/qa/page.tsx` + `app/api/admin/qa/[id]/route.ts`.

- Lists `qa_questions WHERE status = 'pending_moderation'`
- Admin clicks "Generate draft" → calls `lib/chatbot.ts` with public-mode wrapper (QQ-01 output) → persists `qa_answers` row + reserves cost in `lib/ai-cost-caps.ts`
- Admin reviews + edits + clicks "Publish" → updates `qa_questions.status = 'published'`, `published_at = now()`, fires Vercel ISR revalidate for `/answers/<slug>`
- Reject path → `status = 'rejected'`, optional reason, no public exposure
- Use `createAdminClient()` from `lib/supabase/admin.ts` (legitimate admin route per `CLAUDE.md`)

**Done-when:** end-to-end flow works in staging — anon submits → admin sees in queue → admin generates + edits + publishes → public route renders.

---

### QQ-10 — Tests + Playwright golden flow (Tier A)

**What:**
- Route-handler tests (`__tests__/api/answers-ask.test.ts`, `__tests__/api/admin-qa.test.ts`)
- RLS isolation tests (`__tests__/integration/qa-rls.int.test.ts`)
- Component test (`__tests__/components/QuestionCaptureForm.test.tsx`)
- Playwright spec (`__tests__/e2e/qa-capture.spec.ts`) — anon submits question → sees pending → admin (separate fixture) approves → anon revisits and sees the published answer page with disclaimer + CTA

**Coverage gate:** new tests must lift `vitest.config.mts` floor for `app/api/` slightly (per ratchet convention).

**Done-when:** all tests green in CI; Playwright spec passes on chromium + webkit.

---

## Risks / pre-known gotchas

- **Prompt-injection on public surface:** the existing classifier in `lib/chatbot.ts` was tuned against admin traffic. Public traffic is adversarial. Plan a follow-up after 30 days of real submissions to retune. Track FP/FN rate in `qa_questions.metadata`.
- **Cost runaway:** if 1000 spam submissions/day land and admin auto-generates drafts, model spend balloons. **Mitigation:** drafts only run on admin click (QQ-09), not on submission (QQ-05). Cost cap is on the approval path. Spam filtering happens before the approval queue (admin can reject without generating).
- **AFSL disclaimer drift:** if `lib/compliance.ts` text changes after answers are persisted, the disclaimer rendered on old answer pages updates automatically (helper-fetched at render time). Don't snapshot the literal string into `qa_answers` rows.
- **ISR revalidate on publish:** `app/api/admin/qa/[id]/route.ts` must call `revalidatePath('/answers/<slug>')` and `revalidatePath('/answers')` on publish — otherwise published answers won't appear for up to an hour.
- **Slug collisions:** if two users submit semantically similar questions, slugs collide. Mitigation: slug = first 60 chars of question + 6-char hash suffix. Index queue UI groups likely-duplicates for admin to merge.
- **Vitest `vi.mock()` hoisting:** any new test that mocks `lib/chatbot.ts` must use the `vi.hoisted(...)` pattern per `CLAUDE.md` gotcha.

## Out of scope (defer to follow-up streams)

- Conversational threading (multi-turn) — model serves one Q → one A.
- User-driven re-asks ("ask again with different framing") — admin-side only for v1.
- Cross-link recommendations between answer pages (related Qs surface) — wait for the dataset to grow first.
- Per-question advisor sponsorship slots (notebook idea #5 hybrid auction overlap) — gated on legal sign-off for hybrid auction stream.
- Migration of admin chatbot UI to share components with the public surface — keep separate until the public surface is stable.

## Estimated cadence

Per `REMEDIATION_DEFAULTS.md` per-iteration discipline (≤2500 LOC/iter, file-targeted `tsc`, append commits to one draft PR per stream):

| Sub-task | Iters | Calendar (cloud loop, 30-min cadence × ~16 iters/8h) |
|---|---|---|
| QQ-01 audit | 1 | day 1 morning |
| QQ-02 schema | 2–3 | day 1 |
| QQ-03 public route | 2 | day 2 |
| QQ-04 capture form | 1–2 | day 2 |
| QQ-05 ask API | 2 | day 3 |
| QQ-06 SEO wiring | 1 | day 3 |
| QQ-07 CTA wiring | 1 | day 3 |
| QQ-08 compliance | 1 (+ founder review) | day 4 (gated) |
| QQ-09 admin queue | 2 | day 4–5 |
| QQ-10 tests | 2–3 | day 5 |

Total: ~15–18 iterations of cloud loop work + founder time on QQ-01 sign-off, QQ-08 compliance review, and seeding the first 100 questions (which is editorial work, not engineering — happens in parallel with QQ-09 onwards).

**Realistic landing window:** all engineering merged within 7–10 calendar days from when QQ-01 starts. Public launch (with 100 seed questions) within 14 calendar days.

## Pickup procedure

To start this stream:

1. Add the row below to `docs/audits/REMEDIATION_QUEUE.md` "In-flight" table:
   ```
   | QQ | `claude/audit-remediation/qq-01-public-qa-surface` | (none yet) | QQ-01..QQ-10 pending. See `qq-ai-qa-capture-brief.md`. | All QQ tasks merged |
   ```
2. Confirm cloud loop is running (`RemoteTrigger action=list`); if paused, resume.
3. The next loop fire reads the queue, picks QQ-01 as the highest-priority unblocked item (per `REMEDIATION_DEFAULTS.md` priority order), and ships the capability audit doc on its first iteration.
4. Founder review gate at QQ-08 — loop will surface to Blocked until `docs/audits/qq-compliance-signoff.md` is committed by a human.

If you want to see #4 (rate alerts) brief in this same format, ask — it's roughly half this size since it's mostly Resend pipeline reuse + a cron + an alert-subscription model.
