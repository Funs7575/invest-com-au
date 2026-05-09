# Stream SP — Startup Portal (founder-side auth + round management + data room)

**Source:** Founder directive 2026-05-09 — startup vertical deserves its own dedicated portal mirroring the advisor-portal pattern. AU has no AngelList equivalent. Lead-gen-platform pattern preserves AFSL exemption.
**Drafted:** 2026-05-09. **Owner:** audit-remediation cloud loop.
**Branch convention:** `claude/audit-remediation/sp-<phase>-<slug>` per `REMEDIATION_DEFAULTS.md`.
**Tier classifications:** mostly Tier C (new auth context, new schema, new RLS, new portal routes — security-sensitive, announce-before-merge).
**Dependency:** **starts AFTER `MM-V09` ships.** SP references the listings model that MM-V09 reshapes; building SP against a moving target risks rework.

## What this is

A new founder-side portal — `/startup-portal/*` — mirroring the existing `/advisor-portal/*` pattern. Lets startup founders:
- Sign up + KYC as an issuer (separate from regular user / advisor / broker accounts)
- Manage live rounds (status, target, raised, instrument, lead investor)
- Maintain a company profile (ABN, founded, stage, team, sector tags)
- Host pitch decks + redacted financials in a data room with per-investor access grants
- See investor pipeline (inquiries, status, communication log)
- Get ESIC eligibility verified via an admin-reviewed flow

Investor-side enhancements ride alongside:
- Platform-level wholesale-investor (s708) certification (one-time, not per-listing)
- Sector-thesis profile (preferences for stage, sector, ticket size, geography)
- Match feed against new round openings

## Why now

- 6-month pre-launch window (per `project_pre_launch_window.md`) — capacity to spare
- Reuses ~80% of advisor-portal patterns (sessions, KYC, billing, dashboard shell, route protection)
- Real product moat — no AU AngelList equivalent
- Fits lead-gen platform compliance pattern; no AFSL upgrade required
- Network effect potential: founders post → investors register → more founders post

## Out of scope

- Securities trading / custody / settlement (Version B P2P marketplace pattern — explicitly killed in `FIN_NOTEBOOK.md` #16)
- Issuing actual financial products (issuer of record stays the founder's company; you're the introduction layer)
- Replacement for Equitise / Birchal / OnMarket — those are the licensed CSF intermediaries; SP aggregates and showcases, doesn't replace
- Investor secondary trading of held positions (#12 wholesale secondaries — separate spin-out candidate, post-AFSL+)
- Auto-execution of investor → founder commitments (always introduction → off-platform deal closure)

## Done-when (stream completion)

All of these must be true before stream SP closes:

- [ ] `/startup-signup` + `/startup-portal` routes live, parallel to `/advisor-signup` + `/advisor-portal`
- [ ] Founder can: sign up → complete KYC → create startup profile → open a round → upload data-room files → grant per-investor access → see inquiry pipeline → close round
- [ ] Investor can: complete one-time wholesale (s708) certification at platform level → certification recognised across all listings (not per-listing self-attestation)
- [ ] ESIC verification: admin-reviewed flow with audit log; ESIC-eligible badge appears on startup profile + round listing
- [ ] All 7 portal routes protected via `proxy.ts` + `require-startup-session.ts`
- [ ] RLS isolation: `startup_profiles`, `startup_rounds`, `startup_investor_inquiries`, `startup_data_room_files` all deny anon, restrict to issuer's `auth.uid()` for read/write
- [ ] Tests: route-handler tests for each new API route; RLS isolation tests for each new table; Playwright golden flow (founder signup → round open → investor inquiry → data-room access grant)
- [ ] Compliance review recorded in `docs/audits/sp-compliance-signoff.md`: lead-gen pattern preserved, no securities-dealing language in UI, AFSL exemption rationale documented

## Sub-tasks

### SP-01 — Capability audit + advisor-portal-pattern reuse map (Tier B, ≤1 day)

**What:** Read `app/advisor-portal/`, `lib/require-advisor-session.ts`, `app/api/advisor-portal/*`, `proxy.ts` advisor route protection. Document what reuses verbatim, what needs founder-specific modification, what's genuinely new.

**Output:** `docs/audits/sp-01-capability-audit.md` covering: shared auth primitives, copy-paste-with-substitutions modules, founder-specific schema, founder-specific UI surfaces.

**Verification gate:** before declaring complete, grep `app/advisor-portal/**` for hard-coded "advisor" terminology that the SP equivalent must avoid.

---

### SP-02 — Schema migration: founder-side tables (Tier C)

**What:** New migration `supabase/migrations/<date>_startup_portal_schema.sql`. Tables (rough — refine in SP-01):

- `startup_profiles` — `id uuid pk`, `slug text unique`, `company_name text`, `abn text nullable`, `founded_at date`, `stage text` (one of `pre_seed`, `seed`, `series_a`, `series_b`, `series_c`, `growth`), `sector text[]`, `team jsonb`, `linkedin_url text`, `pitch_deck_url text nullable`, `esic_eligible_self_attested boolean`, `esic_verified_at timestamptz nullable`, `esic_verified_by text nullable`, `owner_user_id uuid fk → auth.users.id`, `status text` (one of `draft`, `active`, `archived`), `created_at`, `updated_at`
- `startup_rounds` — `id uuid pk`, `startup_id uuid fk`, `instrument text` (one of `safe`, `safe_t`, `convertible_note`, `priced_equity`), `status text` (one of `open`, `committed`, `closed`, `withdrawn`), `target_aud_cents bigint`, `raised_aud_cents bigint default 0`, `lead_investor_name text nullable`, `valuation_cap_aud_cents bigint nullable`, `discount_pct numeric nullable`, `interest_rate_pct numeric nullable`, `maturity_months int nullable`, `min_ticket_aud_cents bigint`, `closes_at timestamptz nullable`, `wholesale_only boolean default true`, `created_at`, `updated_at`
- `startup_investor_inquiries` — `id uuid pk`, `round_id uuid fk`, `investor_user_id uuid fk → auth.users.id`, `status text` (one of `pending`, `accepted`, `declined`, `expired`), `inquiry_message text`, `wholesale_cert_id uuid fk nullable`, `data_room_access_granted_at timestamptz nullable`, `created_at`
- `startup_data_room_files` — `id uuid pk`, `startup_id uuid fk`, `round_id uuid fk nullable`, `filename text`, `storage_path text`, `category text` (one of `pitch_deck`, `financials`, `cap_table`, `legal`, `product_demo`, `other`), `requires_wholesale_cert boolean default true`, `uploaded_at`
- `startup_data_room_access` — junction: `id uuid pk`, `file_id uuid fk`, `granted_to_user_id uuid fk`, `granted_at`, `revoked_at nullable`, `granted_by_user_id uuid fk`
- `wholesale_investor_certifications` — `id uuid pk`, `user_id uuid fk → auth.users.id`, `certification_type text` (one of `s708_sophisticated`, `professional_investor`), `evidence_doc_path text` (accountant cert / professional registration), `verified_at timestamptz nullable`, `verified_by text nullable`, `expires_at timestamptz` (s708 certs are 6-month expiry per practice), `status text` (one of `pending`, `verified`, `expired`, `rejected`), `created_at`
- `startup_sessions` — mirror `advisor_sessions`: `id uuid pk`, `user_id uuid fk`, `startup_id uuid fk`, `expires_at`, `created_at`
- `esic_verifications` — `id uuid pk`, `startup_id uuid fk`, `evidence_doc_path text`, `ato_register_check jsonb`, `reviewed_by_user_id uuid fk nullable`, `reviewed_at nullable`, `outcome text` (one of `pending`, `approved`, `rejected`), `notes text`, `created_at`

RLS:
- `startup_profiles`: anon `SELECT WHERE status = 'active' AND owner_user_id IS NOT NULL`. Authenticated owner read/write own. Service role full.
- `startup_rounds`: anon `SELECT WHERE status IN ('open', 'committed', 'closed')` joined to active startup. Owner full on own startup's rounds. Service role full.
- `startup_investor_inquiries`: investor read/write own (`investor_user_id = auth.uid()`). Startup owner read inquiries on own rounds. Service role full.
- `startup_data_room_files`: anon never. Authenticated read only if entry in `startup_data_room_access` exists for `auth.uid()` AND `revoked_at IS NULL` AND (file `requires_wholesale_cert = false` OR user has active `wholesale_investor_certifications` row). Owner full. Service role full.
- `startup_data_room_access`: same as above — owner manages, granted user reads own row.
- `wholesale_investor_certifications`: user read/write own. Service role full (admin verifies).
- `startup_sessions`: deny-all anon by design (matches `advisor_sessions` pattern); accessed via service-role helper `require-startup-session.ts`.
- `esic_verifications`: user read/write own startup's records. Service role full (admin reviews).

Idempotent (`IF NOT EXISTS`), rollback header per `CONTRIBUTING.md`. Follow the **New RLS migration on existing table** verification gate from `REMEDIATION_DEFAULTS.md` for any column additions to `auth.users` references.

**Done-when:** migration applied to staging, types regenerated, RLS isolation tests in `__tests__/integration/sp-rls.int.test.ts` cover anon-cannot-read-draft + owner-cannot-read-other-startups + investor-cannot-read-data-room-without-grant + wholesale-cert-gates-restricted-files.

---

### SP-03 — Auth surface: `require-startup-session.ts` + proxy.ts protection (Tier C)

**What:** New `lib/require-startup-session.ts` mirroring `lib/require-advisor-session.ts`. Uses `createAdminClient()` per CLAUDE.md service-role allowed-scope (`advisor_sessions` is deny-all by design — same pattern for `startup_sessions`).

`proxy.ts` route protection for `/startup-portal/*` — match the advisor-portal pattern.

**Done-when:** unit tests for `require-startup-session.ts` pass; proxy.ts e2e test confirms `/startup-portal/*` rejects unauthenticated requests.

---

### SP-04 — Founder onboarding: `/startup-signup` (Tier C)

**What:** New route `app/startup-signup/page.tsx` + `app/api/startups/signup/route.ts`. Multi-step onboarding:
1. Email + password (Supabase auth)
2. Company basics (name, ABN, founded, stage)
3. Founder verification (LinkedIn URL + optional ID upload)
4. Sector tags + team profile
5. ESIC self-attestation (with disclaimer that admin verification follows)

Re-uses `AdvisorOptInCheckboxes` consent component pattern. Submit creates `startup_profiles` row in `draft` status pending admin review (mirror advisor-application pattern).

**Done-when:** end-to-end signup works in staging; admin can promote `draft → active` via existing admin-application-resolver pattern adapted to startups.

---

### SP-05 — `/startup-portal` dashboard (Tier B)

**What:** New routes:
- `/startup-portal` — dashboard (round status snapshot, inquiry pipeline summary, data-room view count, ESIC verification status)
- `/startup-portal/round` — round management (open / close / update target / set lead)
- `/startup-portal/round/new` — open a new round
- `/startup-portal/data-room` — file upload + per-file wholesale-gating + access-grant management
- `/startup-portal/investors` — pipeline (inquiry list with status, communication log)
- `/startup-portal/profile` — company profile editing
- `/startup-portal/team` — team member management

Each route guarded via `require-startup-session.ts` per `proxy.ts`. Use `lib/supabase/server.ts` (carries cookies) for owner-scoped reads; `createAdminClient()` only where the existing CLAUDE.md allowed-scope applies (e.g., cross-startup admin views).

**Done-when:** founder can complete the loop: signup → admin-approved → portal → open round → upload deck → invite investor → grant data-room access → close round.

---

### SP-06 — Round-instrument modelling (Tier B)

**What:** Different round instruments (SAFE / SAFE-T / convertible note / priced equity) have different fields. The `startup_rounds` schema covers them all conditionally — the UI in SP-05 must show the right fields per instrument:

- SAFE: valuation cap, discount, MFN
- SAFE-T: valuation cap, discount, MFN, target close
- Convertible note: principal, interest rate, maturity, conversion discount, valuation cap
- Priced equity: pre-money valuation, share class, drag-along, tag-along

Form-side conditional rendering + Zod schema variants on `app/api/startups/round/route.ts`.

**Done-when:** founder can open any of the 4 instrument types with the right fields; investor sees the instrument-specific terms on the public listing.

---

### SP-07 — Data room with per-investor access grants (Tier C)

**What:** `app/startup-portal/data-room` UI + `/api/startups/data-room/{upload, grant, revoke}` routes. Upload to Supabase Storage with signed URLs. Per-file `requires_wholesale_cert` flag + per-grant access. RLS enforces that anon never reads, authenticated reads only if grant exists + (cert valid OR file unrestricted).

Investor side: `/invest/startups/listings/<slug>` page shows "Request data room access" button if investor has wholesale cert; sends inquiry, founder reviews + grants in `/startup-portal/data-room`.

**Done-when:** end-to-end test — founder uploads cap-table.pdf with `requires_wholesale_cert=true`, anonymous user can't see it, authenticated user without cert can't see it, authenticated user with cert + grant can see it via signed URL.

---

### SP-08 — Wholesale (s708) investor certification flow (Tier C)

**What:** New routes `/account/wholesale-cert` + `/api/wholesale-investor-cert/{submit, verify}`. Investor uploads accountant certificate or professional-investor evidence; admin reviews + verifies; verified status writes `wholesale_investor_certifications.status='verified'` with 6-month expiry.

Cert is recognised across the platform — pre-IPO listings, digital-infrastructure wholesale tranches, startup data rooms all check the same `wholesale_investor_certifications` row instead of asking the investor to self-attest per-listing.

**Done-when:** investor completes cert once, sees it active across pre-IPO + digital-infra + startups; expiry triggers re-verification flow.

---

### SP-09 — ESIC verification flow (Tier B)

**What:** New routes `/startup-portal/esic-verification` + `/api/startups/esic-verify`. Founder uploads ATO ESIC qualification confirmation OR provides ATO Register lookup details. Admin reviews + writes `esic_verifications.outcome='approved'`. ESIC-eligible badge then appears on startup profile + all live rounds.

**Done-when:** founder requests verification → admin approves → badge renders on `/invest/startups/listings/<slug>`.

---

### SP-10 — Sector-thesis profile for investors (Tier B)

**What:** Extend `account/profile` with investor preferences: sector tags, stage preferences, ticket size range, geography. Used by SP-11 match feed.

**Done-when:** investor sets thesis; preferences persist; visible on profile page; consumable by match queries.

---

### SP-11 — Match feed (investor side) (Tier B)

**What:** New route `/invest/startups/for-you` — personalised feed of new round openings matching investor's thesis profile + wholesale-cert status. Reads `startup_rounds WHERE status='open'`, joins startup profile, filters by investor preferences.

**Done-when:** authenticated investor sees a personalised list; ranking deterministic (most-recent + thesis-match score).

---

### SP-12 — Compliance review & sign-off (Tier C, **GATE**)

**What:** Compliance review of: (1) lead-gen pattern preservation across all SP routes — no securities-dealing language; (2) ESIC verification disclaimer doesn't claim platform-side tax advice; (3) wholesale-cert flow language matches s708 statutory wording; (4) data-room signed URLs don't leak past expiry; (5) all consent + privacy text from `lib/compliance.ts`.

Output `docs/audits/sp-compliance-signoff.md` with named reviewer.

**Done-when:** sign-off doc merged. Loop surfaces stream to Blocked until this gate clears.

---

### SP-13 — Tests + Playwright golden flow (Tier A)

**What:**
- Route-handler tests for every new `/api/startups/*` and `/api/wholesale-investor-cert/*` route
- RLS isolation tests for every new table
- Component tests for portal UI components
- Playwright spec covering founder signup → admin approval → round open → investor wholesale-cert → data-room grant → round close

**Done-when:** all tests green in CI; Playwright passes on chromium + webkit.

---

## Risks / pre-known gotchas

- **Auth surface proliferation.** Adding a 4th portal type (user / advisor / broker / startup-founder) means more `proxy.ts` routes, more session-helper modules, more RLS surfaces to keep aligned. Mitigation: SP-01 capability audit identifies copy-paste-with-substitutions vs new code; reuse advisor-portal patterns wherever possible.
- **Service-role usage scope.** `require-startup-session.ts` is a security-sensitive escape hatch (per CLAUDE.md). Keep its scope tight — only for `startup_sessions` deny-all-anon RLS bypass, mirroring the advisor pattern. Don't pull service-role into general portal queries.
- **Data-room signed URL leaks.** Supabase signed URLs are time-bounded but copyable. Set 5-minute expiry on data-room downloads and log every access in `startup_data_room_access.granted_at` audit trail. Consider watermarking for sensitive docs (cap-tables) — defer to follow-up.
- **ESIC verification false positives.** Founder self-attestation + admin review reduces but doesn't eliminate risk. The platform claim should be "ESIC-eligible per founder attestation, admin-reviewed; investors must verify ESIC status independently for tax purposes." Compliance copy in `lib/compliance.ts` must be unambiguous.
- **Round-instrument complexity.** SAFE / SAFE-T / convertible note / priced equity each have edge cases (caps + floors + MFN + drag-along). SP-06 ships a deliberately-simplified model; sophisticated rounds may need founder to indicate "see term sheet" with manual clarification. Don't over-engineer the form.
- **CSF aggregation tension.** If SP showcases CSF raises run on Equitise/Birchal/OnMarket, those platforms may push back commercially. Mitigation: aggregate from public data only (CSF disclosure documents are public), link out to the licensed intermediary for actual investment, never front-run their UX.

## Estimated cadence

Per `REMEDIATION_DEFAULTS.md` (≤2500 LOC/iter, file-targeted `tsc`, append commits to one draft PR per stream):

| Sub-task | Iters | Calendar |
|---|---|---|
| SP-01 audit | 1 | day 1 |
| SP-02 schema | 3–4 | days 1–3 |
| SP-03 auth surface | 1–2 | day 3 |
| SP-04 signup | 2 | days 4–5 |
| SP-05 dashboard | 4–5 | week 2 |
| SP-06 round-instruments | 2 | week 2 |
| SP-07 data room | 3–4 | week 3 |
| SP-08 wholesale cert | 2–3 | week 3 |
| SP-09 ESIC verification | 1–2 | week 3 |
| SP-10 investor thesis | 1 | week 4 |
| SP-11 match feed | 2 | week 4 |
| SP-12 compliance gate | 1 (+ founder review) | week 4 (gated) |
| SP-13 tests + e2e | 3–4 | week 4 |

Total: ~25–35 iterations of cloud loop work + founder time on SP-04 admin-approval flow setup, SP-12 compliance review, and seed founder accounts. **Realistic landing window: 3–4 calendar weeks from when SP-01 starts**, comfortably inside the 6-month pre-launch window.

## Pickup procedure

1. **Wait for MM-V09 to complete** (~1 week of cloud loop work) — SP references the listings model that MM-V09 reshapes.
2. Add `SP` row to `docs/audits/REMEDIATION_QUEUE.md` "In-flight" table — done in same commit as this brief.
3. SP starts as Blocked on `MM-V09 done` until the trigger date; then unblocked.
4. Cloud loop's first SP iteration ships SP-01 audit doc.
5. Founder review at SP-04 (admin-approval flow setup) and SP-12 (compliance review).
