# Advisor Ecosystem / Social Layer — build plan

**Status:** in progress · **Branch:** `claude/confident-feynman-qdq82c` · **Started:** 2026-06-10

Elevates the advisor ecosystem (profiles, feed, expert teams, inter-advisor workflows,
leaderboard) to a coherent social layer. Grounded in a full audit of what already exists —
this plan deliberately diverges from the first-draft scope where the codebase already had
the feature or where a leaner design wins.

## Audit findings that reshaped scope

| First-draft idea | Reality found | Decision |
|---|---|---|
| Build public feed UI | `/feed` + `FeedPageClient` + `/advisor/[slug]/insights[/id]` all live | Elevate: pagination, advice warning, permalinks |
| 500-char composer + pre-publish hold on first 3 posts | Composer at 2000 chars matches DB CHECK; posts route *deliberately* chose "no hidden-hold queue for professional accounts" (classifyText hard-gates RG 170) | Keep 2000; respect the no-hold decision; add **post-publish admin notification on an advisor's first post** instead |
| New `collective_specialties` column | `expert_teams.specialty_tags` already exists | Reuse; surface in manager UI |
| Team `contact_email` | Would bypass the monetised brief flow + lead tracking | **Dropped** — brief CTA stays the contact path |
| New ledger kind + CHECK surgery | `referral_payout` kind + `recordReferralPayout` precedent exist | Reuse `referral_payout` with distinct `reference_type` |
| `reputation_events` table | Leaderboard cron can aggregate from source tables (`forum_posts`, `advisor_post_reactions`, `brief_outcomes`) directly | **Dropped** — no write-amplification table for v1 |
| Team inbox in `BriefsInboxClient` | Members-only squad inbox already exists at `/teams/[slug]/inbox` | Put the comments thread there |

## Workstreams

- [x] **W0 — Migration** `20260610120000_advisor_ecosystem_social_layer.sql`: `team_brief_comments`, `article_co_authors`, `advisor_lead_referrals`, `expert_teams.team_story`, 3 leaderboard columns. RLS on all new tables.
- [x] **W1 — "Who I work best with"** — public profile section from `professionals.ideal_client` + `advisor_ideal_clients.criteria`, factual framing (no suitability claims).
- [x] **W2 — Feed elevation** — general-advice banner on `/feed`, load-more pagination, post permalinks, first-post admin review notification.
- [x] **W3 — Team page elevation** — "Our story" section (`team_story`), combined member case studies, ratings in member stack, manager UI edits story + specialty tags.
- [x] **W4 — Squad brief comments** — private advisor↔advisor thread per brief inside the squad inbox (never consumer-visible; separate table from `brief_messages` so internal notes cannot leak).
- [x] **W5 — Article co-authors** — invite/accept flow, dual byline + Person JSON-LD on `/expert/[slug]`.
- [x] **W6 — Advisor lead referrals** — structured client referral A→B from LeadsTab; receiver gets the lead free; referrer earns a **flat platform credit** on conversion, gated by feature flag `advisor_lead_referral_bonus` (default **off** pending founder sign-off). Lean-lane compliant: no % of advice fee, no consumer money.
- [x] **W7 — Leaderboard community signals** — cron adds forum answers / post engagement / brief completions; page gets dynamic month metadata (fixes hardcoded "May 2026") + score breakdown.

## Constraints honoured

- One migration file, idempotent, RLS-enabled, rollback note in header. **`supabase db push` stays human-triggered** — all new-schema reads fail soft and new APIs return 503 until the founder applies the migration.
- Referral bonus: flat credits via existing `referral_payout` kind; feature-flagged off (REGULATORY-AVOID-LIST "always wire a feature flag onto any payment surface").
- Compliance copy via `lib/compliance.ts` only; logging via `lib/logger.ts`; Zod via `withValidatedBody`; rate limits via `lib/rate-limit.ts`.
