# Green-loop progress log

One line per mergeable chunk. Newest at top. See
`docs/audits/NEW-FEATURES-GREEN-QUEUE.md` for live item state.

## Session 2026-05-20 (autonomous run)

**Merged to `main`:**
- §0 — Document Vault PR #1040 reconciled to `main`; audit+prompt PR #1055 merged.
- flag #8 — broker invoice supplier ABN → #1061 (merged).
- flag #1 (P0) — carbon/aquaculture/livestock noindex + s708 gate → #1062 (merged).
- flags #5,#6 (P1) — sponsored-article + community general-advice disclosures → #1064 (merged).
- flag #21 — process-data-exports stale-comment reconcile + queue/progress seed → #1063 (merged).
- §4 — `/teams` index page + nav link (unlocks Expert Teams) → #1069 (merged).

**Open PRs (founder/Tier-C merge):**
- flag #2 (P0, **Tier E**) — DROP orphan `sharesight_connections` → #1065 (apply to live + regen types, then merge).
- flag #4 (P0) — AFSL-monitor fail-loud when lookup unconfigured → #1076 (+ confirm `AFSL_LOOKUP_URL` in prod).
- flag #9 (P1) — restrict `presence_pings` anon read → #1077 (apply migration to live, then merge).
- flag #10 (P1) — TMD coverage gap proactive alert → #1086.
- flag #14 (P1) — portal-gate isolation on business portal → #1084.
- flags #15,#18 (P2) — ab-auto-promote circuit-breaker + suburb stub alert → #1067.

**Verified already-green (audit text stale):**
- #83 occupation pages — all 26 slugs in sync across config/sitemap/hub.

**Surfaced, not auto-fixed (need a decision / would be risky blind):**
- flag #3 (admin MFA hard-gate) — `proxy.ts` already fails closed on
  `ADMIN_MFA_COOKIE_SECRET` in prod; residual concern is auth-critical and an
  over-eager change risks locking out the founder. Needs founder review +
  `ADMIN_MFA_KEY` set in prod first.
- flag #16 (autopilot toggles) — toggles ARE DB-backed (`site_settings`
  `autopilot_*`); real gap is whether crons consume those keys (most use the
  separate `isFeatureDisabled` kill-switch). Unify-the-kill-switch is an
  architectural decision.
- flag #7 (brief-chat compliance) — N/A: BriefChatPanel kept dormant (founder).
- flag #19 (submit-lead Zod) — duplicate-guard: being worked live by another agent.

**Remaining (Tier C, larger / decision-bound):**
- #11 approval gates on reg-alert/country-rule publish (schema + UI).
- #12 run-migration admin-session (decision: keep 6h cron → keep CRON_SECRET, or move to admin-only on-demand).
- #13 impersonation visibility admin view (UI).
- #17 outbound-webhook auto-retry (schema + cron).
- #20 consent fixes (SMS/WhatsApp record, unified unsubscribe, SSR cookie consent) — multi-part.
- §4 empty listing verticals (VC, litigation-funding, ILS, royalties, …) — noindex or wire submit.
- §4 reports / switch-stories / community — founder decision: seed vs keep noindexed.
