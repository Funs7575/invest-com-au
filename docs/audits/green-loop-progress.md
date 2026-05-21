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

**Also merged to `main` since:**
- flag #2 (P0, Tier E) — DROP orphan `sharesight_connections` → #1065 (merged; apply migration to live + regen types).
- flags #15,#18 (P2) — ab-auto-promote circuit-breaker + suburb stub alert → #1067 (merged).

**Open PRs (founder/Tier-C merge):**
- flag #4 (P0) — AFSL-monitor fail-loud when lookup unconfigured → #1076 (+ confirm `AFSL_LOOKUP_URL` in prod).
- flag #9 (P1) — restrict `presence_pings` anon read → #1077 (apply migration to live, then merge).
- flag #10 (P1) — TMD coverage gap proactive alert → #1086.
- flag #11 (P1) — approval gate (draft-on-create) for country-rule alerts → #1119 (regulatory_alerts editor uses a server action — same treatment still TODO).
- flag #12 (P1) — run-migration admin-session + dropped from cron → #1089.
- flag #13 (P1) — impersonation visibility admin view → #1115.
- flag #14 (P1) — portal-gate isolation on business portal → #1084.
- flag #17 (P2) — outbound-webhook auto-retry cron → #1102.
- flag #20 (P2, partial) — SSR-readable consent cookie → #1121 (SMS/WhatsApp consent record + unified unsubscribe still TODO).

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

**Status: all 21 §5 flags addressed — 10 merged, 7 in open PRs, 4 triaged.**

**Remaining work (founder-gated / large-feature residue):**
- #11 — apply the same draft-on-create gate to the `regulatory_alerts` editor (server action, not the API route).
- #20 — explicit SMS/WhatsApp consent record + unified unsubscribe surface (multi-part feature).
- §4 empty listing verticals (VC, litigation-funding, ILS, royalties, …) — noindex or wire submit.
- §4 reports / switch-stories / community — founder decision: seed vs keep noindexed.
- #3 (admin MFA), #16 (autopilot kill-switch unify) — founder review (see "surfaced" above).
