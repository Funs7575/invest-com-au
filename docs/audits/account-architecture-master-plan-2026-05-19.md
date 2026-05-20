# Master Plan — Account / Identity Architecture

**Date:** 2026-05-19
**Branch:** `claude/audit-account-architecture-7186H`
**Status:** approved, executed end-to-end (see Progress section below)

## Progress (2026-05-20)

End-to-end execution of every numbered session except 4.3 (intentionally
deferred — see notes). Status per session below; commit refs on the
branch.

| Phase | Session | Status | Notes |
|---|---|---|---|
| 0 | 0.1 principals + backfill + view + lib + tests | ✅ shipped | 4 migrations, lib/principals.ts, full unit coverage |
| 0 | 0.2 codegen consistency gate | ✅ shipped | `scripts/check-entity-registry.mjs` + CI wiring. Full ts-morph codegen tool deferred (lint catches drift on the existing 8 kinds; codegen is nice-to-have for kind #9+) |
| 0 | 0.3 partner-org principals | ✅ shipped | newsletter_sponsors + partner_integrations linked; lib/partner-orgs.ts find-or-create helper |
| 1 | 1.1 squad workspace schema + lib | ✅ shipped | View extended; `iv_active_team_id` cookie; chooseCallbackRedirect.setTeamId; portalForKind options signature |
| 1 | 1.2 chooser + switcher squad UX | ✅ shipped | Squad cards lead with team name; switcher orders base-then-squads; squad picks send team_id |
| 1 | 1.3 unit tests for squad routing | ✅ shipped | 5 new test cases covering single/multi/missing-slug paths. Playwright e2e deferred — needs staging Supabase with seeded multi-membership user |
| 2 | 2.1 GDPR soft-delete | ✅ shipped | Columns + RLS on principals + 3 simple kind tables; redact-deleted-users + hard-delete-expired crons live. (professionals/broker_accounts RLS tightening still pending — has public-read marketplace paths) |
| 2 | 2.2 investor household_type enum | ✅ shipped | Typed column + backfill + column-first reader with JSON fallback during deprecation window |
| 2 | 2.3 broker partner teams | ✅ shipped | broker_partner_orgs + broker_team_memberships + broker_team_invitations; 4 roles + capability map; lib/broker-teams.ts. Portal UI deferred to its own focused session |
| 2 | 2.4 forum moderation API | ✅ shipped | forum_moderation_actions audit table + banned_at columns + lib/forum-moderation.ts + dispatch endpoint at /api/admin/forum-moderation. Moderation queue UI deferred |
| 2 | 2.5 claimByEmail helper + post-signin hook | ✅ shipped | lib/claim/by-email.ts with 8-table registry + lib/auth/post-signin.ts orchestrator + wired into auth callback fire-and-forget |
| 3 | preferences + switch log + cookie hardening | ✅ shipped | account_kind_preferences + account_kind_switch_log; chooseCallbackRedirect honours default→last-active→chooser; recordSwitch on every active-kind POST; both cookies httpOnly |
| 4 | 4.1 pricing matrix | ✅ shipped | firm_pricing_tiers (3 tiers seeded) + advisor_specialties.lead_multiplier + lib/lead-pricing.ts composeLeadPrice helper. lib/advisor-billing.ts refactor deferred (hot path; opt-in migration safer) |
| 4 | 4.2 wholesale_operator kind | ✅ shipped | wholesale_operators table + RLS + view branch + portal shell at /wholesale-portal |
| 4 | 4.3 firm_staff kind | ⏸ skipped | Not a workspace kind — it's a permissions layer on firm_memberships. Reserved-kinds comment in lib/account-types.ts documents the decision |
| 4 | 4.4 embed_customer kind | ✅ shipped | embed_customers table + RLS + view branch + portal shell at /embed-portal |

**Test coverage shipped:** unit tests for principals, account-kinds (8 kinds + preferences + squad), claim-by-email, account-preferences, forum-moderation, lead-pricing.

**Follow-up items — ALL now shipped on this branch (2026-05-20):**
- ✅ codegen for `scripts/add-entity.mjs` (dependency-free scaffolder + checklist; ts-morph deliberately avoided since the CI gate enforces the registry edits)
- ✅ Playwright e2e — `e2e/workspace-switching.spec.ts` (auth-gate cases run every PR; full multi-kind flow skips cleanly without seeded staging user)
- ✅ professionals + broker_accounts RLS tightening for deleted_at (`20260801001400`)
- ✅ lib/advisor-billing.ts refactor — `getLeadPriceCents` routes through `composeLeadPrice` + optional firm-tier axis
- ✅ /broker-portal/team UI + `/api/broker-team` + `/api/broker-team/accept`
- ✅ Moderation queue UI at `/admin/forum-moderation`
- ✅ Functional `/wholesale-portal` (profile + s708 status) and `/embed-portal` (quota + API-key rotation via `/api/embed/rotate-key`)

**Remaining (genuinely demand-driven, not blockers):**
- Deeper portal surfaces: full listings CRUD for wholesale; usage analytics + Stripe self-serve for embed
- Per-agent Postgres roles / agent registry / internal-team / admin-DB — explicitly OUT OF SCOPE (separate session)



## Context

Invest.com.au has scaled from a broker-comparison site to a multi-tenant B2C/B2B platform pre-launching Oct–Dec 2026 under AFSL constraints. The current account system has 5 user-facing kinds (`investor`, `advisor`, `broker_partner`, `business_owner`, `listing_owner`) governed by `lib/account-types.ts` and the W2.5 workspace switcher (shipped 2026-05-19).

Audits across this session surfaced that the architecture is one layer thick where it should be many:

- **5 user-facing kinds** are well-modelled (`lib/account-kinds.ts`, `account_kind_membership` view), but adding a 6th is an 8-file manual job with no codegen and no lint enforcement
- **Expert teams (squads)** are fully built (`/teams/[slug]/{dashboard,inbox,quote-builder,referrals,availability,settings}` + 7 backing tables) but **NOT integrated with the workspace switcher** — a squad lead has to leave the workspace model to act as their team
- **Commercial partners** (sponsors, newsletter sponsors, partner integrations, webhook endpoints) have no consistent identity — each is an ad-hoc metadata row
- **~14 "almost-account"** entity types (leads, anonymous saves, reviewers, applicants) each have their own claim/upgrade flow with no canonical helper
- **GDPR / soft-delete** is not implemented anywhere — pre-AFSL launch must address this
- **Forum moderation** has `is_moderator` flags but no actual moderation API
- **Investor sub-types** (couple, family, business) are stringly-typed JSON in `investor_profiles.meta`

This plan ships the user-facing identity foundation needed for the Oct–Dec 2026 launch. Internal/governance work (founder accounts, agent registry, admin DB, AR/CR linkage, escalation dashboards) is explicitly out of scope — handled separately.

## End-state

One coherent identity model with three abstractions:

1. **`principals` table** — the universal "actor" row. Every entity that can act in the system gets one. Today populated for: human auth.users (5 kinds), partner orgs (sponsors etc, no login). Deliberately extensible to agents/internal-team/representatives in a future session without schema rework
2. **Account-kind registry + codegen** — `scripts/add-entity.ts <kind>` generates migration, lib branch, portal layout, RLS test, registry patches. `scripts/check-entity-registry.mjs` runs in CI and fails the build if any kind is out of sync across the 8 expected files
3. **Workspace switcher covers 6 kinds + squads** — `'squad'` joins the `AccountKind` union; switcher dropdown renders squad memberships alongside base kinds; `iv_active_team_id` cookie carries the team scope when active kind is `squad`

## Phasing (in sessions)

A "session" = one focused working session, typically producing 1–2 mergeable PRs.

### Phase 0 — Principals + codegen foundation (3 sessions)

**Single most important block. Everything else depends on this.**

**Session 0.1 — Principals table**
- New migration: `principals` table (`id`, `kind` ∈ {human, partner_org}, `auth_user_id` nullable, `display_name`, `slug`, `status`, `metadata`, timestamps)
- Backfill migration: one principal per existing row in `professionals`, `broker_accounts`, `investor_profiles`, `business_accounts`, `listing_owner_accounts`
- Add `principal_id uuid REFERENCES principals(id)` to all 5 entity tables (nullable for transition; keep `auth_user_id` as backup)
- Rewrite `account_kind_membership` view to source from `principals`
- New: `lib/principals.ts` — `getPrincipalForAuthUser`, `getPrincipalById`
- Tests: every entity row resolves to exactly one principal; no orphan principals

**Session 0.2 — Codegen + lint rule**
- New: `scripts/add-entity.ts <kind-name>` using ts-morph (not regex) — generates migration template, `lib/require-<kind>-session.ts`, `app/<kind>-portal/layout.tsx`, RLS isolation test, and patches `lib/account-types.ts` + `lib/account-kinds.ts` + `app/account/select-workspace/SelectWorkspaceClient.tsx`
- New: `scripts/check-entity-registry.mjs` — CI gate that parses migrations and asserts every kind has matching entries in all 8 expected sites
- Wire into `.github/workflows/ci.yml` as a required gate
- Delete `lib/account-types.md` (prose checklist replaced by executable codegen)

**Session 0.3 — Partner-org principals**
- Add `principal_id` to `sponsored_placements`, `newsletter_sponsors`, `partner_integrations`, `outbound_webhook_endpoints`
- Backfill: one `principals(kind='partner_org', auth_user_id=NULL)` per distinct partner
- New: `lib/partner-orgs.ts` — `getOrCreatePartnerPrincipal(name, type)`
- Future-proofs sponsor → broker_partner upgrade (same `principals.id` survives)

### Phase 1 — Squads as first-class workspace (3 sessions)

**The headline UX change. Depends on Phase 0.**

**Session 1.1 — Schema + lib changes**
- Extend `AccountKind` union in `lib/account-types.ts` to include `'squad'`
- Add `iv_active_team_id` cookie (mirrors `iv_active_kind`, 30-day TTL)
- Extend `KindMembership` interface in `lib/account-kinds.ts` with optional `scopeId` (carries `team_id` for squad memberships)
- Extend `account_kind_membership` view with `UNION ALL` over `expert_team_members WHERE status = 'active'`, mapping `team_id` → `scopeId`
- Update `chooseCallbackRedirect` to handle 0/1/2+ memberships counting squads
- Update `portalForKind('squad', teamSlug)` → `/teams/${teamSlug}/dashboard`

**Session 1.2 — Portal gate + chooser**
- Extend `enforcePortalKind` in `lib/portal-gate.ts` to accept optional team-scope parameter for squad
- Add new layout: `app/teams/[slug]/layout.tsx` calling `enforcePortalKind('squad', params.slug)`
- Update `/account/select-workspace/SelectWorkspaceClient.tsx` to render squad cards alongside base kind cards
- Update `components/WorkspaceSwitcher.tsx` to show squads grouped under a "Squads" sub-section (collapsible if 3+)
- Retire `/advisor-portal/teams` → redirect to `/teams`

**Session 1.3 — Tests + Playwright e2e**
- Unit tests: multi-kind+multi-squad user resolves to correct membership set
- RLS test: squad workspace only reads team-scoped data
- Playwright: multi-kind+multi-squad user signs in → sees chooser → picks squad → lands on squad dashboard → cookie state correct → switches to advisor kind → returns to advisor portal

### Phase 2 — Correctness wave (5 sessions)

**Independently parallelisable after Phase 0. Order below is suggested, not strict.**

**Session 2.1 — GDPR soft-delete + redaction**
- Add `deleted_at TIMESTAMPTZ NULL` + `pii_redacted_at TIMESTAMPTZ NULL` to all PII-bearing tables (use the principals registry to identify them)
- New endpoint: `POST /api/account/delete` — sets `deleted_at`, signs user out, schedules anonymisation
- New cron: `app/api/cron/redact-deleted-users` — for users where `deleted_at < NOW() - 30 days`, nulls PII columns, retains `principal_id` + financial records under "Deleted user"
- New cron: `app/api/cron/hard-delete-expired` — for users where `deleted_at < NOW() - 7 years`, full row deletion
- Cascade rules: leads stay with firm, reviews become anonymous, holdings deleted with user
- Tests cover all kinds + cron dry-run output

**Session 2.2 — Investor sub-type enum**
- Add `household_type` ENUM column to `investor_profiles` (individual | couple | family | business)
- Backfill from existing `meta.account_type` JSON
- Update AT-stream code (`/account/dashboard` sections from PR #917) to read typed column
- Keep `meta.account_type` populated for one release as fallback, then remove in a follow-up

**Session 2.3 — Broker partner team**
- Add: `broker_team_invitations`, `broker_team_memberships`, `broker_team_roles` (owner, finance, ops, technical)
- Mirror the `advisor_firm_invitations` pattern exactly (review `supabase/migrations/20260310_advisor_firms_and_invitations.sql` as template)
- New portal route: `/broker-portal/team` — invite + manage
- Webhook permission gated to `technical` role; billing visibility to `finance` + `owner`

**Session 2.4 — Forum moderation API**
- Implement what `forum_user_profiles.is_moderator` was promising: ban-user, lock-thread, hide-post, soft-delete-post actions
- New table: `forum_moderation_actions` (audit log of every mod action with `actor_principal_id`)
- Capability flag check in API routes (`forum_moderator_capabilities`)
- Minimal moderation UI under `/admin/forum-moderation` (visible only to users with the capability)

**Session 2.5 — `claimByEmail` canonical helper**
- New: `lib/claim/by-email.ts` exporting `claimByEmail({email, authUserId, table, ...})`
- New: `lib/auth/post-signin.ts` — single hook that iterates `CLAIMABLE_TABLES` constant after every auth callback
- Migrate `bookmarks.ts:claimAnonymousSaves` and the 13 other ad-hoc claim flows to use the helper
- Add `provenance JSONB` to each kind table recording the upgrade source

### Phase 3 — UX polish (1 session)

**Single session covering switcher polish + cookie hardening.**

- New table: `account_kind_preferences` (`principal_id`, `default_kind`, `pinned_kinds[]`, `last_active_kind`, `last_active_team_id`, `last_active_at`)
- After login: route to `last_active_kind` if set; else `default_kind`; else chooser (preserves current behaviour for new users)
- Switcher UI: order kinds [default, last-active, others alphabetical]; add "Set as default" option
- Deep-linkable: `/account/switch?to=advisor&redirect=/advisor-portal/leads`
- Make `iv_active_kind` and `iv_active_team_id` httpOnly. Add a separate non-sensitive `iv_active_kind_theme` cookie for theming
- Add CSRF token to `/api/account/switch-kind` endpoint
- New table: `account_kind_switch_log` (light audit of switches for debugging)

### Phase 4 — Post-launch scale-out (3–4 sessions)

**Each kind uses Phase 0 codegen — `npm run add-entity wholesale_operator` etc.**

**Session 4.1 — Pricing matrix**
- New: `firm_pricing_tiers` (boutique 1.0×, enterprise 0.85×, sponsor 0.6×) referenced by `advisor_firms.pricing_tier_id`
- Add: `advisor_specialties.lead_multiplier` (cross-border 1.75×, standard 1.0×)
- Refactor `lib/advisor-billing.ts`: `finalPrice = baseLeadPrice × specialty.multiplier × firm.tier.multiplier`
- Admin UI to manage both axes independently

**Session 4.2 — `wholesale_operator` kind**
- `npm run add-entity wholesale_operator`
- Profile fields: AFSL, fund type, s708 verification, listings owned
- Portal at `/wholesale-portal`
- Connects to MM-V06 alt-asset listings

**Session 4.3 — `firm_staff` kind**
- Non-licensed firm employees (paraplanner, receptionist, marketing)
- Belongs to a firm via `firm_memberships`; doesn't get advisor capabilities
- Portal at `/firm-portal/staff-view` (limited view of `/advisor-portal`)

**Session 4.4 — `embed_customer` kind**
- B2B SaaS for embed widget customers
- API key + quota + Stripe billing
- New table `embed_customers` + portal at `/embed-portal`

## Critical files

**Existing files to modify:**
- `lib/account-types.ts` — extend `AccountKind` union with `'squad'`; uncomment future kinds as they ship
- `lib/account-kinds.ts` — squad-aware `KindMembership`, `portalForKind`, `chooseCallbackRedirect`; add `iv_active_team_id` cookie helpers
- `lib/portal-gate.ts` — `enforcePortalKind(kind, scopeId?)` signature extension
- `app/account/select-workspace/SelectWorkspaceClient.tsx` — render squad cards
- `components/WorkspaceSwitcher.tsx` — squad sub-section in dropdown
- `lib/bookmarks.ts` — migrate `claimAnonymousSaves` to canonical helper

## Reusable patterns to lean on

- **Workspace switcher pattern** (`lib/account-kinds.ts` + `lib/portal-gate.ts`): already correct shape, extend rather than redesign
- **Advisor firm membership** (`supabase/migrations/20260310_advisor_firms_and_invitations.sql` + `20260326_firm_roles_and_seat_requests.sql`): the canonical "org + invitations + roles + seats" template — mirror for broker_team
- **`account_kind_membership` view**: extend with UNION ALL rather than building parallel views
- **`claimAnonymousSaves`** (`lib/bookmarks.ts`): existing pattern for anonymous → authed transition, generalise for all 14 almost-account tables
- **Expert teams schema** (`supabase/migrations/20260723_pmp01_provider_marketplace_foundation.sql`): already correct; squad workspace is purely additive

## Risks

- **R1 (MEDIUM) — `principal_id` migration with live writes.** Every kind table is being touched. Mitigate: dual-write phase (keep `auth_user_id` populated alongside `principal_id` for 60 days); RLS policies reference both during transition; atomic swap migration only after `scripts/check-rls-isolation.mjs` passes against `principal_id`
- **R2 (MEDIUM) — Squad workspace UX confusion.** A user in 5+ squads sees many dropdown entries. Mitigate: collapse under a "Squads (5)" cluster in the switcher that expands on click; default-pinning lets power users surface their primary
- **R3 (MEDIUM) — GDPR cron volume.** Redaction job runs daily; could be slow on first run if 1000s of soft-deleted users. Mitigate: process in batches of 100, write a `redaction_runs` table for progress tracking
- **R4 (LOW) — Codegen drift.** Someone adds a kind by hand bypassing `scripts/add-entity.ts`. Mitigate: `scripts/check-entity-registry.mjs` in CI as required gate
- **R5 (LOW) — Forum moderation backlash.** Implementing mod actions reveals existing toxic content. Mitigate: ship moderation UI to admins (capability-gated) before announcing publicly

## Verification

- **Phase 0**: `__tests__/rls/principals-isolation.test.ts` (every authenticated user sees only their principal); migration smoke test asserts `count(*)` per entity table equals `count(*)` of principals where `kind='human' AND auth_user_id IS NOT NULL`; `scripts/check-entity-registry.mjs` passes in CI
- **Phase 1**: Playwright e2e — multi-kind+multi-squad user signs in, picks squad in chooser, lands on `/teams/<slug>/dashboard`, `iv_active_kind=squad` + `iv_active_team_id=<id>` cookies set, switching to advisor returns to `/advisor-portal` with cookies updated
- **Phase 2**: Integration test for each cron (dry-run mode reports what would change); claim helper covered by `__tests__/lib/claim-by-email.test.ts` against every entry in `CLAIMABLE_TABLES`; forum mod actions covered by `__tests__/api/forum-moderation.test.ts`
- **Phase 3**: Cookie tests (httpOnly set correctly, CSRF token rejected when invalid); switcher test (default + last-active + alpha order)
- **Phase 4**: Per-kind: `npm run add-entity <kind>` produces clean diff; new portal layout passes `enforcePortalKind`; new kind appears in switcher for users that hold it

## Out of scope for this plan (handle later)

Explicitly deferred — handled in a separate later session:

- **Internal team members** (founders, responsible manager, editorial collaborator, external compliance) — no `internal_team_members` table, no human-team principals seeded
- **Agent registry** (19 agents) — `agent_name TEXT` stays as-is, no `agents` table, no per-agent capabilities, no `agent_id` FK migration
- **Admin DB + roles + audit log** — `ADMIN_EMAILS` env var stays as the gate; no `admin_users` / `admin_capabilities` / `admin_audit_log` tables
- **Regulatory representative linkage** (AR / CR to humans) — `authorised_representatives` and `credit_representatives` stay as pending placeholders; not linked to principals
- **Escalation dashboards** (`/ceo`, `/cofounder`) — `ceo_approvals` and `friend_decisions` tables stay as backend queues without UI surfacing
- **Editorial sign-off gates** — `compliance_tasks` generic table stays as-is

Out of scope **deliberately** (not "later" — never):

- Cross-kind messaging / Slack-style chat channels (the workspace switcher is the only Slack analogy we're taking)
- Per-firm custom roles (system-defined roles only — owner, member, finance, ops)
- Unified "user" table merging all kinds (loses RLS clarity, gains nothing)
- Org hierarchy beyond single-level firm (no parent-firms, no franchise structures)
- Forcing accounts on anonymous forum / Q&A askers / comment authors
- Logins for sponsored placements, newsletter sponsors, partner_integrations (stay metadata-only)

## Session budget

| Phase | Sessions | Pre-launch? |
|---|---|---|
| 0 — Principals + codegen | 3 | yes |
| 1 — Squad as workspace | 3 | yes |
| 2 — Correctness wave | 5 | yes |
| 3 — UX polish | 1 | yes (ideally) |
| 4 — Scale-out | 3–4 | no |

**Pre-launch total: 12 sessions** (Phases 0–3). Fits the Oct–Dec 2026 window if started immediately.
