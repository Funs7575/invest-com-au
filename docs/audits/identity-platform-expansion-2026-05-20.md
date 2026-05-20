# Identity Platform Expansion — Surgical Plan (2026-05-20)

**Branch:** `claude/audit-account-architecture-7186H` (PR #964)
**Builds on:** the principals foundation, 8 account kinds, squads-as-workspaces, two-axis pricing, broker teams, GDPR soft-delete, forum moderation, and the `claimByEmail` lead-linking shipped earlier on this branch.

This plan turns the 15 high-impact ideas into surgical, dependency-ordered work. Every item is additive (new tables / new lib / new routes) — no rewrites of shipped behaviour. Each carries schema sketch, integration points, risk, and effort. Sequenced so foundations land before the things that depend on them.

## Sequencing overview

```
Wave 1 — Identity completion (foundational, unblocks 11/14/15 dependents)
  #11 Unified audit trail (audit_events + lib/audit)
  #14 Capability-based admin/support roles (admin RBAC + audit)
  #15 Agent + internal-team identity (agents + internal_team_members principals)

Wave 2 — Revenue quick-wins (small builds on existing infra)
  #1  Sponsor → partner self-upgrade
  #3  Demand-aware third pricing axis
  #4  Squad marketplace tiers

Wave 3 — Insight flywheels (views + lib, compounding value)
  #2  Lead-claim → conversion analytics
  #7  Multi-hat retention insight
  #8  Workspace-switch telemetry
  #9  Forum reputation → advisor credibility

Wave 4 — New revenue lines + trust (bigger, demand-driven)
  #5  Wholesale s708 listings marketplace
  #6  Embed metered B2B SaaS
  #13 Firm-wide seat subscription billing
  #12 Codegen-driven partner verticals
  #10 Public data-rights self-service center
```

---

## Wave 1 — Identity completion

### #11 Unified audit trail
**Why:** every actor is now a `principal`. AFSL needs one answer to "who did what, when." Today audit is scattered (forum_moderation_actions, account_kind_switch_log, ad-hoc logs).
**Schema:** `audit_events` (id, actor_principal_id, actor_kind, action, resource_type, resource_id, before jsonb, after jsonb, ip, ts) + monthly partition or a `created_at` index; RLS service-role write, admin read.
**Lib:** `lib/audit.ts` — `recordAudit({actor, action, resource, before, after})`; a thin `auditedUpdate` wrapper.
**Integration:** call from forum-moderation, admin RBAC writes, account deletion, kind switches. Keep the per-domain tables; `audit_events` is the unified read surface (a view UNION-ing them is the cheaper v1).
**Risk:** write volume — index by (actor_principal_id, ts) + (resource_type, resource_id, ts); archive >90d. **Effort:** ~2 sessions.

### #14 Capability-based admin / support roles
**Why:** admin is an env-var allowlist with no audit and no granularity. Blocks safe team growth + outsourced support.
**Schema:** `admin_roles` (owner|editor|support|readonly|compliance|engineering), `admin_capabilities` (role × capability), `admin_users` (principal_id, role_id, active, deactivated_at). Capabilities: can_edit_advisors, can_view_pii, can_change_pricing, can_moderate, can_manage_billing, can_run_crons.
**Lib:** `lib/admin-rbac.ts` — `requireAdminCapability(cap)`, `getActiveAdmins(role?)`. Dual-source: env `ADMIN_EMAILS` as bootstrap + `admin_users` rows; remove env path after backfill.
**Integration:** replace `getAdminEmails()` reads; every privileged `/api/admin/*` mutation logs to `audit_events` (#11).
**Risk:** touches every admin route — feature-flag (`admin_rbac_v2`), dual-check 1 week, then cut over. **Effort:** ~2 sessions. **Depends on:** #11.

### #15 Agent + internal-team identity
**Why:** 19 agents write to prod with `agent_name` free text (a typo silently mislabels logs); founders/RM/editorial-collaborator aren't modelled. Natural completion of the principals model.
**Schema:** extend `principals.kind` CHECK to add `agent`, `internal`. `agents` (principal_id, number UNIQUE, slug, spec_file, default_tier, cadence, activates_post_afsl, deactivated_at) + `agent_capabilities`. `internal_team_members` (principal_id, role, capabilities[], active). Backfill agents from `.claude/agents/NN-*.md`.
**Migration discipline (R1 HIGH):** agents write `agent_logs` every minute. Add `agent_id` nullable + a trigger populating it from `agent_name` on INSERT; run 7d; make NOT NULL; drop trigger + `agent_name`. Master Overseer healthcheck on null `agent_id`.
**Risk:** highest on the branch — live writes. Strictly dual-write, never big-bang. **Effort:** ~3-4 sessions. **Depends on:** #11, #14.

---

## Wave 2 — Revenue quick-wins

### #1 Sponsor → partner self-upgrade
**Why:** partner_org principals already survive an in-place upgrade; turn one-off sponsors into recurring marketplace partners.
**Lib/route:** `lib/partner-orgs.ts` gains `upgradePartnerToBrokerPartner(principalId, authUserId)` — flips kind to `human`, sets auth_user_id, creates a `broker_accounts` row linked to the same principal. `/api/partner/claim?token=` accept flow + post-signin email-match hook.
**Risk:** low — additive. **Effort:** ~1 session.

### #3 Demand-aware third pricing axis
**Why:** `composeLeadPrice` is two-axis; scarce categories should price up.
**Schema:** `lead_demand_signals` (category, window, supply_count, demand_count, multiplier, computed_at) refreshed by a cron from recent lead/accept volume.
**Lib:** `composeLeadPrice` gains optional `demandMultiplier`; `resolveDemandMultiplier(category)`.
**Risk:** low; cap the multiplier range (e.g. 0.8–1.5) to avoid runaway pricing. **Effort:** ~1 session. **Depends on:** existing `lib/lead-pricing.ts`.

### #4 Squad marketplace tiers
**Why:** squads are workspaces with brief routing; add a paid-placement layer.
**Schema:** `squad_subscriptions` (team_id, tier slug, status, current_period_end, stripe_*), `squad_placement_boost` (team_id, boost_weight, active). Tier slugs: free|featured|top.
**Lib:** ranker reads boost_weight in the brief-routing sort; `lib/squad-billing.ts`.
**Risk:** medium — touches brief routing sort; gate behind a flag. **Effort:** ~2-3 sessions.

### #16 Team management depth (admin + searchable invites)
**Why:** team admins today can only invite by raw email (broker teams) or have minimal controls (advisor firms / squads). Real team admins want to *search* the advisor directory and invite a known professional by profile, manage member roles, and see/curate their roster. This is the cross-cutting "team admin console" that all three org types (advisor_firms, expert_teams, broker_partner_orgs) share.
**Schema (additive):**
- `team_admin_invites` is generalised: a polymorphic `org_kind` (firm|squad|broker_org) + `org_id` so one invite engine serves all three (or keep the existing per-type invite tables and add a shared `lib/team-invites.ts` adapter — preferred, lower-risk).
- `professionals` already searchable; add a `team_member_search` index helper (no schema if the columns exist).
**Lib:** `lib/team-management.ts` —
  - `searchInvitableAdvisors({ query, specialty, state, excludeOrgId })` → directory search scoped to active professionals not already on the org
  - `inviteAdvisorByProfile({ orgKind, orgId, professionalId, role })` → resolves the advisor's email, mints the right invite token, sends invite
  - `setMemberRole`, `removeMember`, `reactivateMember`, `listRoster({ orgId })`
  - capability-gated via the org's existing role model (owner/manage_team)
**Routes/UI:**
  - `/api/team/search-advisors` (GET, capability-gated)
  - `/api/team/invite-by-profile` (POST)
  - Team-admin console surfaces: extend `/broker-portal/team` + add a squad team-admin tab at `/teams/[slug]/settings/members` (squad), reuse on the firm side.
**Risk:** medium — directory search must not leak non-public advisor fields; scope to public directory columns + RLS. Invite-by-profile must verify the advisor consents (invite, not auto-add). **Effort:** ~2-3 sessions. **Depends on:** broker teams (shipped) + expert_team_members + advisor_firms.

---

## Wave 3 — Insight flywheels

### #2 Lead-claim → conversion analytics
**View:** `lead_conversion_stats` joining `quiz_leads`/`professional_leads` provenance → `principals` (claimed) → activity. **Lib:** `getLeadSourceConversion(window)`. Feeds #3 demand pricing + CPL decisions. **Effort:** ~1-2 sessions. **Depends on:** `claimByEmail`.

### #7 Multi-hat retention insight
**Lib:** `lib/identity-graph.ts` — `getMultiKindCohorts()` (users by # of kinds), `suggestSecondWorkspace(principalId)`. Surfaces "advisors who also track a portfolio churn less" + cross-sell nudges. **Effort:** ~1 session.

### #8 Workspace-switch telemetry
**View/lib:** `workspace_usage_stats` over `account_kind_switch_log` — active/abandoned/churned-between kinds. Admin dashboard tile. **Effort:** ~1 session. **Depends on:** `account_kind_switch_log`.

### #9 Forum reputation → advisor credibility
**Lib:** ranker input — advisors who are active helpful forum contributors (reputation threshold + recent activity) get a bounded marketplace boost. `forum_user_profiles` ↔ `professionals` via principal. **Risk:** keep the boost small + capped so it can't be gamed. **Effort:** ~1-2 sessions.

---

## Wave 4 — New revenue lines + trust

### #5 Wholesale s708 listings marketplace
**Schema:** `wholesale_listings` (operator principal, title, asset_class, min_investment, s708_gated, status), `wholesale_listing_leads` (sophisticated-investor-verified only). Gate reads MM-V06 wholesale cert. **Effort:** ~3-4 sessions. **Depends on:** wholesale_operator kind (shipped).

### #6 Embed metered B2B SaaS
**Schema:** `embed_usage_events` (customer, endpoint, ts), quota-enforcement middleware on `/api/widget`, Stripe metered billing. Self-serve signup at `/embed-portal/signup`. **Effort:** ~3-4 sessions. **Depends on:** embed_customer kind + api-key (shipped).

### #13 Firm-wide seat subscription billing
**Schema:** `firm_subscriptions` (firm_id, seats, tier, stripe_*, current_period_end). Per-seat billing on the firm_pricing_tiers + membership pattern. **Effort:** ~2 sessions. **Depends on:** firm_pricing_tiers (shipped) + broker teams (shipped).

### #12 Codegen-driven partner verticals
**Action:** as BD lands deals, `npm run add-entity accountant_partner` etc. No standing build — it's the scaffolder (shipped) applied on demand. **Effort:** ~0.5 session each, on trigger.

### #10 Public data-rights self-service center
**Route:** `/account/privacy/data-rights` — export, delete (grace-aware), restore. Reads the GDPR soft-delete + redaction infra. Trust signal + APP/GDPR tick + support deflection. **Effort:** ~1 session. **Depends on:** GDPR soft-delete (shipped).

---

## Cross-cutting principles
- **Additive only.** New tables/lib/routes; never rewrite shipped behaviour. Backfills idempotent with NOT-EXISTS guards.
- **Every privileged mutation audits** (#11 is the spine).
- **Feature-flag behavioural changes** (admin RBAC, squad ranker boost, agent identity).
- **Registry gate stays green** — any new kind goes through `npm run add-entity` + the consistency gate.
- **No live-env assumptions** — schema validated by the static gates; build/test validation owed once CI unblocks (#1053) or via the local-env session.

## Execution status
Tracked by commits on this branch tagged `feat(<area>): … — Idea #N`. This doc is updated as waves land.
