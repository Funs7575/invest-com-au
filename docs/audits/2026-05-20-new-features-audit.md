# New-Features Audit — May 2026

**Date:** 2026-05-20
**Scope:** A health audit and complete inventory of the features built this month (the audit-remediation `A–SP` streams and the pre-launch `Wave 1–6` work), plus the surrounding platform they plug into.
**How this was produced:** An exhaustive mechanical sweep of the route tree (~160 API groups), `lib/` modules, 302 migrations, and ~100 cron jobs, cross-checked against the strategy notebook, launch gate, and remediation queue — then verified by **twelve parallel sub-agent audits** (eight feature deep-dives plus four catalog passes over admin / ops / content / comms).
**Audience:** product/founder level. Plain-English, not a code review.

> **A note on the method:** the first pass clustered thematically and *missed an entire feature family* (the workspace/presence/messaging layer). This document is the corrected, exhaustive version. The numbered inventory below is the source of truth for "what exists."

---

## 1. Executive summary

This month produced an enormous amount of genuinely-working software. Two autonomous loops (audit-remediation + pre-launch wave) drove ~50 streams, and the striking finding is **how much is real and wired to live data** — the advisor marketplace, Stripe billing, holdings tracker, calculators, KYC/ABN verification, the lead funnel, a deep compliance/RegTech admin suite, and ~100 properly-authed cron jobs.

The consistent weak spot is **the last mile**, not the engines:

1. **Built but undiscoverable** — Expert Teams, the real-time brief chat, `/briefs`, `/concierge` exist but aren't surfaced (no nav/index, or the component isn't even mounted).
2. **Indexed but empty** — ~10 listing verticals and 8 occupation pages are in the sitemap but lead nowhere.
3. **Tracker drift** — several "done" items (Document Vault, startup portal) live on *unmerged PRs*, not `main`.
4. **A handful of real compliance/security loose ends** that matter for an AFSL holder (detailed in §5).

Overall: **strong foundations, pre-launch polish and a compliance pass outstanding.** Nothing catastrophic; a clear, finite punch list.

---

## 2. Maturity at a glance

🟢 shipped & working · 🟡 beta/partial · 🟠 prototype · 🔴 shell/empty · 📥 built but not on `main`

| Domain | State | Headline |
|---|---|---|
| Advisor marketplace & matching | 🟢 | Most complete system on the platform |
| Lead funnel (quiz / submit-lead / get-matched / concierge) | 🟢/🟡 | End-to-end; concierge guard is warn-only |
| Investment listings | 🟡 | Core 10 verticals solid; ~10 new verticals indexed-but-empty |
| Expert teams / squads | 🟡 | Backend real; **no listing page or nav link** |
| Workspace / presence / messaging | 🟡 | Switcher + notifications shipped; **real-time chat built but orphaned** |
| Investor account suite (holdings/goals/etc.) | 🟢 | Standout user feature; strong RLS + tests |
| Reports & Document Vault | 🔴/📥 | Empty shells; vault UI unmerged |
| Monetization (Pro + billing + credits) | 🟢/🟡 | Solid engine; advisor self-serve flag-gated |
| Partner portals | 🟡 | Advisor shipped; broker stripped; startup mid-build (unmerged) |
| Reviews / reputation / social proof | 🟢 | Broad and real |
| Public content & SEO (hubs, articles, glossary, courses) | 🟢 | Real content + correct formulas |
| Calculators & tools | 🟢 | ~25 calcs, ATO-pinned correctness tests |
| Foreign investment / Country Mode / i18n | 🟢 | Rich; minus a deferred SA-Arabic page |
| Comms & lifecycle (email/SMS/WhatsApp/push/drips) | 🟢/🟡 | Email solid; SMS dormant; consent gaps |
| Admin console (~134 tools) | 🟢 | Deep RegTech suite; a few cosmetic/half-built tools |
| Background ops / automation / infra | ⚙️🟢 | All ~100 crons auth-guarded; internal agent fleet |

---

## 3. Cross-cutting themes

1. **Two loops, racing.** Velocity is high but it produced duplicate PRs, an orphan table, and status-doc drift. "Done" in the trackers ≠ "on `main`."
2. **Engines over surfaces.** The hard logic (billing idempotency, scam classifier, ranking, RLS) is consistently better than the wiring that exposes it to users.
3. **Tests skew to units/engines.** Calculators, billing, holdings, classifiers are well-tested; API routes, new page wrappers, and end-to-end flows are thin (no E2E for the brief-chat flow; ~14% API-route line coverage historically).
4. **Pre-AFSL gating is mostly disciplined.** AI portfolio analysis is off, public AI Q&A is held behind a signoff gate, non-AUD FX is disabled, apex domain stays on the old host — all deliberate. The gaps in §5 are where that discipline slipped.

---

## 4. Per-cluster bottom lines (the eight deep-dives + workspace)

- **Expert Teams / Squads** — creation, verification, shared inbox, referrals, analytics, emails are real and wired. The whole feature is invisible: no `/teams` index, not in nav. Seed squads are mock content that may break joins in prod.
- **Advisor Marketplace** — production-ready: ranking, wallet/CPC, campaigns, auto-bid, authed crons. The crown jewel.
- **Investment Listings** — solid core (10 verticals, scam classifier, payments, filtering). ~10 new vertical pages are SEO-indexed but sellers can't submit to them; a live Carbon/ACCU page carries an unresolved compliance TODO.
- **Reporting / Export / Portfolio** — holdings + goals are production-quality. Reports is an empty shell; the Document Vault UI isn't on `main` (PR #1040).
- **Monetization** — real Stripe, correct webhook signature + idempotency, ~2,600 lines of billing tests. Broker invoices omit the supplier ABN; advisor self-serve Pro is flag/env-gated.
- **Lead Routing & Matching** — works end-to-end. `submit-lead` isn't Zod-validated; the concierge hallucination guard is warn-only.
- **Partner Portals** — advisor portal shipped & well-tested; broker stripped for launch; firm/business thin; startup mid-build (PR #1048). Workspace-isolation guard only wired for advisors.
- **Growth surfaces** — hubs, ~25 calculators (ATO-pinned tests), ~14 country pages, Country Mode: real and good. 8 occupation pages 404 in the sitemap; directory-unification refactor half-wired.
- **Workspace / Presence / Messaging** — switcher (5 kinds, in global Header) and notification bell are shipped; brief chat uses real Supabase Realtime but the panel is **orphaned (not mounted)**; presence is anon-readable; community forum is built but noindexed pending seed.

---

## 5. Red flags — prioritized

### P0 — compliance/security, address before launch
1. **Carbon/ACCU listings page is live + indexed with an unresolved compliance TODO** (`// ACCUs are financial products`) and **no wholesale gate**; aquaculture & livestock listing pages have **no compliance disclaimer at all**. Potential MIS/AFSL licensing exposure. → gate or `noindex` until reviewed.
2. **Orphan `sharesight_connections` table holds plaintext OAuth tokens** (0 rows, no code refs) — flagged in the decision log, never dropped. → `DROP TABLE`.
3. **Admin MFA can be silently unavailable.** MFA enrollment is gated behind `ADMIN_MFA_KEY`; if unset in prod the route returns 503 and admin login proceeds **without** MFA — no hard gate. (Contradicts the V-NEW-07 "MFA-protected admin" assumption.) → enforce MFA as a hard gate.
4. **AFSL expiry monitor is inert without `AFSL_LOOKUP_URL`.** If the env var is missing, the weekly ASIC check never runs and an advisor can retain "active" status after AFSL cancellation/suspension. → confirm env set + alerting on miss.

### P1 — compliance disclosure & data exposure
5. **Advisor pay-to-publish articles** (`pricing_tier`/`payment_status`) render with **no sponsored-content disclosure** — Corporations Act s1041H.
6. **Community verified-advisor posts carry no general-advice disclaimer** (the `/questions` Q&A surface does — it's an inconsistency). RG 36 risk.
7. **Advisor↔client brief chat has no disclaimer, monitoring, or archival** for compliance review. Currently latent (panel is orphaned) — fix before it's wired up.
8. **Broker-portal PDF invoices omit the supplier ABN** (recipient ABN is shown). ATO tax-invoice requirement.
9. **Presence is world-readable** — `presence_pings` RLS allows `anon` SELECT, exposing every pro's online status + `last_ping_at` to anyone. → restrict, or show only a coarse boolean and confirm advisor opt-in.
10. **TMD manager has no auto-block/alert on expiry** — an expired TMD on an active product is a DDO s994A–C violation; the page shows dates but doesn't enforce.
11. **Regulatory-alert & country-rule editors publish instantly with no approval gate** — a mistake is immediately public.
12. **`run-migration` route is gated only by `CRON_SECRET`, not an admin session** — a leaked secret allows schema inspection.
13. **Impersonation has no UI / no "who is impersonating whom" view** — API-only, audit-logged, but no live visibility on an AFSL platform.
14. **Cross-portal workspace isolation is only wired for the advisor portal** — a multi-kind user can reach business/firm portals without the deliberate switch guard (data exposure contained by per-route session checks).

### P2 — reliability, consent, validation
15. **`ab-auto-promote` has no circuit-breaker** beyond the kill switch — a bad confidence calc could auto-conclude every live test in one nightly run.
16. **Autopilot toggles are likely cosmetic** (hardcoded client-side, not DB-backed) — admins may believe they're controlling automations that they aren't.
17. **Outbound webhooks are admin-replay-only** (no auto-retry) — downed subscriber endpoints silently drop events.
18. **`property-suburb-refresh` silently degrades to a zero-stub** if `SUBURB_DATA_PROVIDER` is mis-set — no alert.
19. **`submit-lead` is not Zod-validated** (deferred to E-04 batch 4).
20. **Consent gaps:** no explicit SMS/WhatsApp consent record; direct drips (investor/hub/post-enquiry/abandoned-*) run on *implied* consent with **no unified unsubscribe**; cookie consent is in `localStorage` (SSR can't read → pixels can briefly fire before the consent check resolves). Spam Act / Privacy Act exposure.
21. **`process-data-exports` carries a stale "table may be missing" comment** — the launch-gate log says the table was applied 2026-05-08. Likely already fine; reconcile the comment. (The genuinely-blocked one is `account_deletion_requests`.)

### Reassuring (verified good)
- All ~100 cron jobs call `requireCronAuth` (an earlier false-positive scan suggested 4 didn't).
- Consumer Pro paywall is server-enforced (not client-bypassable).
- Stripe webhook signature verification + idempotency are correct.
- Holdings/goals use user-scoped clients with RLS + Zod.
- Calculators have ATO-pinned regulator-reference tests.
- A real compliance cron family exists (TMD/DDO audit, GDPR retention purge, founder-anonymity audit, secret rotation).

---

## 6. Quick wins (high value, low effort)
- `DROP` the orphan plaintext-token table (#2).
- Add the supplier ABN to the broker invoice PDF (#8) — ~1 line.
- Gate or `noindex` the carbon/aquaculture/livestock listing pages (#1).
- Add the 8 missing occupation configs or remove them from the sitemap (inventory #83).
- Add a `/teams` index page + a nav link — unlocks an entire built feature (#23–31).
- `noindex` the empty listing verticals or wire their submit path (#21).
- Enforce admin MFA as a hard gate; confirm `AFSL_LOOKUP_URL` is set in prod (#3, #4).

---

## 7. "Done" vs on `main`
Because parallel loops raced all month, reconcile the trackers against `main` before treating the queue as launch-ready ground truth. Verified-not-on-`main` as of this audit:
- **Document Vault** — UI + API on unmerged PR #1040; only the DB table is on `main`.
- **Startup portal** — 6 of 13 tasks on unmerged PR #1048.
- **Brief real-time chat** — the `BriefChatPanel` component is on `main` but **mounted nowhere** (unreachable).

---

## 8. Complete numbered inventory

> Product/platform features are numbered `1..N`. The admin console (`AD-*`) and background ops/infra (`OPS-*`) are large back-office catalogs and get their own labelled sequences. Maturity tags as in the legend above.

### A. Lead-gen, matching & advisor marketplace
1. Advisor-matching quiz (`/quiz`) — weighted scoring, sponsor boost 🟢
2. Find-advisor + `submit-lead` funnel (honeypot, dedup, rate-limit) 🟢 *(payload not Zod-validated)*
3. Get-matched wizard — 13×8 routing matrix → advisors/firms/teams (`gm01–03`) 🟢
4. AI Concierge chatbot — RAG + cost caps + AFSL footers 🟡 *(hallucination guard warn-only)*
5. Public AI Q&A (`/answers`, QQ stream) 🟡 *(held behind compliance signoff QQ-08)*
6. Quick-audit tool 🟢
7. Advisor marketplace — ranking, wallet/CPC, campaigns, auto-bid (`mm01/mm25`) 🟢
8. Reverse marketplace "Post a Request" / briefs (`advisor_auctions`, `mm04`) 🟢
9. Brief inbox — claim / handoff / refer (`mm04/mm09`) 🟢
10. Fixed quotes + quote builder (`mm05`) 🟢
11. Quotes auction (`/quotes`) 🟢
12. Lead scoring (cold/warm/hot) + weights cron 🟡 *(weights logging-only)*
13. Lead dispute auto-resolution 🟢
14. Outcome flywheel + outcome-based pricing (`mm02/mm16`) 🟢
15. Dynamic lead-pricing engine (+1.75× cross-border) 🟢
16. TMD (target-market-determination) library 🟢

### B. Investment listings marketplace
17. Listings — 10 verticals, submit/enquire/shortlist 🟡
18. Listing scam classifier 🟢
19. Paid placement tiers ($99/$249) 🟢
20. Listing claims + owner accounts 🟢
21. ~10 new vertical browse pages (aquaculture, carbon, royalties, ILS, litigation-funding, VC, PE…) 🔴 *(indexed but empty — can't submit)*
22. Wholesale (s708) gating 🟡 *(missing on carbon/aquaculture/livestock)*

### C. Expert teams / squads
23. Squad creation wizard (`/teams/new`) 🟢
24. Public team profile + compare 🟡 *(no `/teams` index, not in nav)*
25. Squad shared inbox 🟢
26. Squad dashboard analytics 🟢
27. Squad availability grid 🟢
28. Squad referrals ledger (`mm09/mm15`) 🟢
29. Squad topic landing pages 🟢
30. Expert articles hub (`/expert`) 🔴 *(coming-soon empty state)*
31. Admin squad verification queue 🟢

### D. Workspace / presence / messaging / community *(this month)*
32. Multi-workspace switcher — 5 kinds, global Header pill 🟢
33. Workspace chooser + "add workspace" upgrade 🟢
34. Presence "online now" heartbeat (`mm38`) 🟡 *(anon-readable — see flag #9)*
35. Notifications center + bell (60s poll, `mm06`) 🟢
36. Dispute message threads (`mm39`) 🟢
37. Community forum — categories/threads/posts/voting/reputation 🟡 *(noindexed pending seed; no advice disclaimer)*
38. Brief real-time chat (Supabase Realtime, `mm32`) 🟠 *(built but orphaned — not mounted)*

### E. Investor account suite *(this month, Wave 2/X5)*
39. Sign-up + account hub + investor profiles 🟢
40. Manual holdings tracker 🟢
41. CSV import — CommSec/Stake/SelfWealth/NABtrade/IBKR 🟢 *(non-AUD FX disabled)*
42. Sharesight OAuth import (`W2.11`) 🟡 *(env-gated)*
43. Portfolio health score + switching coach 🟢
44. Goal tracker (`investor_goals`) 🟢
45. Net-worth page 🟡 *(super/savings placeholders)*
46. Watchlist + email alerts 🟢
47. Bookmarks / saved comparisons / saved searches (`mm08/mm36`) 🟢
48. Property holdings 🟢
49. AI portfolio analysis engine 🟡 *(AFSL-gated off)*
50. Document vault 📥 *(UI on unmerged PR #1040; table-only on `main`)*
51. Personalized recommendations 🟢
52. Annual review / timeline / plans / calendar 🟢
53. Privacy: GDPR data export 🟢 / account deletion 🟡 *(deletion table blocked)*

### F. Monetization
54. Consumer Pro subscription + paywall (`mm24`) 🟢
55. Premium content gating (`requirePro`) 🟢
56. Advisor Pro tiers (4 tiers) 🟡 *(feature-flag + env-var hold)*
57. Advisor credit packs + ledger + auto-recharge (`mm03`) 🟢
58. Firm billing dashboard 🟢
59. GST invoices 🟡 *(lib unused; broker PDF missing supplier ABN — flag #8)*
60. Stripe Connect (`mm34`) 🟢
61. Pro deals / research / affiliate (`mm13`) 🟡
62. Sponsored placements + A/B 🟢
63. Embed comparison widget + `/api/widget` 🟢

### G. Partner portals & onboarding
64. Advisor portal 🟢
65. Advisor apply/signup + KYC + ABN verify 🟢 *(AFSL verify optional — flag #4)*
66. Broker portal 🟡 *(12+ sections hidden for launch)*
67. Firm portal + roles/seat requests 🟡
68. Business portal 🟠
69. Startup portal (SP stream) 📥 *(6 of 13 tasks, unmerged PR #1048)*
70. Advisor firms + invitations + team members 🟢
71. Consultations / bookings / appointments (`mm33`) 🟢
72. Outbound partner webhooks (`mm26`) 🟢

### H. Reviews, reputation & social proof
73. User + professional + fund reviews 🟢
74. Review verification / incentive / sentiment 🟢
75. Switch stories 🔴 *(admin tooling done; 0 live rows, noindexed)*
76. Testimonials + investor referrals (`mm29`) 🟢
77. NPS prompt + churn survey 🟢
78. Social-proof bars / live activity ticker 🟢

### I. Public content & SEO engine
79. Vertical pillar pages (super, crypto, cfd, savings, share-trading…) 🟢
80. Best-of / versus / compare programmatic pages 🟢
81. Life-event hubs (`/just/[event]`, 8) 🟢
82. Inheritance / tax-return / first-home-buyer / grants hubs 🟢
83. Occupation pages (`/investing-for`, 18 live) 🟡 *(8 slugs 404 but in sitemap)*
84. Halal-investing vertical 🟢
85. Articles + author/reviewer bylines + RSS feed 🟢
86. Article comments + reactions (4-type) 🟢
87. Article quality scoring + scorecard + preview tokens 🟢
88. Advisor-authored articles + moderation + pay-gating 🟡 *(no sponsored disclosure — flag #5)*
89. `/questions` Q&A system (static dataset + submit/vote/moderate) 🟢
90. Glossary 🟢
91. Courses — purchase (Stripe), progress, premium gating, admin editor 🟢
92. Learn hub 🟢
93. How-to guides + broker-transfer guides 🟢
94. What's-New / changelog + Press pages 🟢
95. Content engine — topic clusters, auto internal-linking, keyword linking 🟢
96. Hub blueprint system (HubPage HOC) 🟢

### J. Calculators & tools
97. ~25 calculators (CGT, FIRE, mortgage, compound, salary-sacrifice, SMSF, franking…) 🟢 *(ATO-pinned tests)*
98. Calculator lead-capture + share + history/autosave 🟢
99. Portfolio X-ray (public) 🟠 *(manual price entry)*
100. Wealth-stack builder 🟡
101. Fee tools (tracker / impact / simulator / alerts) 🟢
102. Subscription-audit tool (`BB-05`) 🟢
103. LIC screener (`BB-10`) 🟢

### K. Foreign investment / Country Mode / i18n
104. Foreign-investment hub + ~14 country pages 🟢
105. Country Mode (5-level resolution, supply thresholds, geo soft-prompt) 🟢
106. Country rule alerts — DB + admin CRUD + email digest (`W4.21/22`) 🟢
107. Cross-border specialty taxonomy + premium pricing 🟢
108. FIRB estimator, non-resident CGT/dividend, WHT, DASP calcs 🟢
109. i18n locales (ar/ko/zh) + auto-route 🟡 *(SA Arabic deferred)*
110. Country-aware smart-recommendations strip 🟢

### L. Comms, growth & experimentation
111. Email (Resend) — suppression-aware send, webhook verify, bounce sweep 🟢
112. Email template library (welcome, advisor, marketplace, pro, quote, Stripe) 🟢
113. Newsletter + double-opt-in segments (`em02/em03`) 🟢
114. ~30 lifecycle drip/nurture flows (welcome, winback, abandoned-quiz/form/shortlist, tax-nurture, investor, hub-subscriber, post-enquiry, pro/personalized digest) 🟢 *(some flag-gated dormant; consent — flag #20)*
115. SMS dispatcher (Twilio) 🔴 *(env unset → silent no-op)*
116. WhatsApp click-to-chat (HK/IN/CN/SG) 🟡 *(flag-gated; no consent record)*
117. Push notifications + PWA service workers 🟢
118. Rate / fee / price-drop / watchlist / portfolio / saved-search alerts 🟢
119. Exit-intent suite (generic, broker-match, newsletter, hub, pillar) 🟢
120. Lead magnets (config + contextual + squad + hub/hero capture) 🟢
121. Sticky/floating CTAs, social-proof counter, recently-viewed, getting-started checklist 🟢
122. Cookie consent + tracking pixels (FB Pixel + Google Ads, consent-gated) 🟡 *(consent in localStorage — flag #20)*
123. UTM capture + form tracking 🟢
124. A/B testing — variant assignment, z-test winner, `ab-track`, **auto-promote** 🟢 *(no circuit-breaker — flag #15)*
125. Referrals + affiliate (investor referrals, pro-affiliate links/track/payout, click tracker, payout recon) 🟢

### M. Directory UX
126. Directory primitives (12 components: search/sort/tabs/filter/chips/range/compare/empty/postcode…) 🟡 *(partly wired)*
127. Advisor directory + compare matrix 🟢

### AD. Admin console (~134 tools)
**Dashboards:** AD-1 Admin dashboard (KPIs/forecast/activity) 🟢 · AD-2 Launch-readiness tile 🟢 · AD-3 Pre-launch checklist 🟢 · AD-4 BI/exec sparklines (warehouse) 🟢 · AD-5 Loop-status (remediation queue + spend ROI) ⚙️
**Analytics:** AD-6 Analytics multi-tab 🟢 · AD-7 Attribution daily 🟢 · AD-8 Funnel 🟢 · AD-9 Lead bands 🟢 · AD-10 Perf 🟢 · AD-11 Search 🟢 · AD-12 Revenue (CPA) 🟢 · AD-13 Finance ledger / P&L 🟢
**Content:** AD-14 Articles manager 🟢 · AD-15 Article editor 🟢 · AD-16 Scenarios editor 🟢 · AD-17 Courses manager 🟢 · AD-18 Fund reviews 🟢 · AD-19 Quarterly reports publisher 🟢 · AD-20 Regulatory alerts publisher 🟢 *(no approval gate — flag #11)* · AD-21 Switch stories 🟢 · AD-22 Content calendar 🟡 · AD-23 Topic clusters 🟡 · AD-24 Internal linking 🟡 · AD-25 Content performance 🟡 · AD-26 QA queue (AI-draft answers) 🟡 · AD-27 AI assistant (tool-calling) 🟡 · AD-28 AI flags 🟢
**Brokers & affiliates:** AD-29 Brokers manager 🟢 · AD-30 Affiliate links/EPC 🟢 · AD-31 Affiliate dashboard 🟢 · AD-32 Health scores 🟢 · AD-33 Fee queue 🟢 · AD-34 Deal of month 🟢 · AD-35 Broker outreach composer 🟢 *(live send, no approval step)* · AD-36 Broker transfer guides 🟡 · AD-37 Calculator config 🟢 · AD-38 Placement experiments 🟡 · AD-39 Sponsored queue 🟢
**Marketplace:** AD-40 Overview 🟢 · AD-41 Campaigns 🟢 · AD-42 Placements 🟢 · AD-43 Packages 🟡 · AD-44 Ranking weights 🟢 · AD-45 Attribution 🟢 · AD-46 Decision log 🟢 · AD-47 Intelligence/scorecards 🟢 · AD-48 Reconciliation 🟢 · AD-49 Sponsor billing 🟡 *(manual; no Stripe)* · AD-50 Support 🔴 · AD-51 Credit pricing 🟢 · AD-52 Promo codes 🟢
**Advisor/professional:** AD-53 Advisors list 🟢 · AD-54 Moderation 🟢 · AD-55 Performance 🟢 · AD-56 Applications queue 🟢 · AD-57 Verification queue (AFSL/ASIC/ABN) 🟢 · AD-58 KYC 🟢 · AD-59 Expert teams 🟢 · AD-60 Advisor articles 🟡 · AD-61 Monthly reports 🟢 · AD-62 Outcomes tracker 🟢 · AD-63 Pro-affiliate leaderboard 🟢
**Get-matched / briefs:** AD-64 Briefs queue (risk review) 🟢 · AD-65 Funnel analytics 🟢 · AD-66 Questions editor 🟢 · AD-67 Result templates 🟢 · AD-68 Routing rules 🟢 · AD-69 Disputes queue 🟢 · AD-70 Intents dashboard 🟡
**Compliance & regulatory (AFSL-critical):** AD-71 Compliance dashboard (RG 234) 🟡 *(partly advisory copy, not all live assertions)* · AD-72 AFSL register uploader 🟢 · AD-73 AFSL expiry monitor 🟢 *(inert without env — flag #4)* · AD-74 TMDs manager 🟢 *(no expiry enforcement — flag #10)* · AD-75 Licensing tracker 🟢 · AD-76 Complaints register (RG 271) 🟢 · AD-77 Risk flags 🟢 · AD-78 Audit log 🟢 · AD-79 Legal doc register 🟢 · AD-80 AFSL monthly compliance report 🟢 · AD-81 IDR annual report 🟢 · AD-82 Moderation auto-classifier drill-down 🟢 · AD-83 SLA-miss drill-down 🟢
**Automation & ops UI:** AD-84 Automation overview 🟢 · AD-85 Kill switch (per-feature + global) 🟢 · AD-86 Feature flags 🟢 · AD-87 Automation config 🟢 · AD-88 Dry-run preview 🟢 · AD-89 Cron health 🟢 · AD-90 DB health 🟢 · AD-91 Email suppression list 🟢 · AD-92 Dunning drill-down 🟢 · AD-93 Profile-gate drill-down 🟢 · AD-94 Broker data changes 🟢 · AD-95 Quality weights 🟢 · AD-96 Cohort retention 🟢 · AD-97 Attribution model 🟢 · AD-98 Applications automation 🟢 · AD-99 Autopilot 🟡 *(toggles likely cosmetic — flag #16)*
**SEO & site health:** AD-100 SEO health 🟡 · AD-101 Data health 🟢 · AD-102 Code quality 🟢 · AD-103 Health check (live probes) 🟢 · AD-104 Domain status 🟢 · AD-105 A/B tests 🟡
**Users & subscribers:** AD-106 Subscribers 🟢 · AD-107 Pro subscribers 🟢 · AD-108 User reviews 🟢 · AD-109 Review moderation 🟢 · AD-110 Bug reports 🟡 · AD-111 MFA enroll/manage 🟢 *(silently off without env — flag #3)* · AD-112 MFA verify gate 🟢 · AD-113 Impersonation (API only) 🟢 *(no UI/visibility — flag #13)*
**BD & growth:** AD-114 BD pipeline CRM 🟢 · AD-115 Competitors tracker 🟡 · AD-116 Broker-team match campaigns 🟡
**Country/foreign-investment:** AD-117 Country rule alerts editor 🟢 *(no approval gate — flag #11)* · AD-118 Country schemes & grants editor 🟢 · AD-119 FI seed/verify/update/revalidate pipeline ⚙️
**Pro & pricing:** AD-120 Pro deals 🟢 · AD-121 Pricing page 🟡 · AD-122 Pro-subscription grant/revoke 🟢
**Property vertical:** AD-123 Property overview 🟡 · AD-124 Property listings 🟡 · AD-125 Property leads 🟡 · AD-126 Property developers 🟡
**Data & settings:** AD-127 Site settings (ACN/ABN/hero/trust) 🟢 · AD-128 Financial periods 🟢 · AD-129 Commodity hubs 🟡 · AD-130 Export/import (table JSON) ⚙️ · AD-131 Run migration ⚙️ *(CRON_SECRET only — flag #12)* · AD-132 Revalidate (ISR) ⚙️ · AD-133 Admin login (pre-MFA) 🟢 · AD-134 Admin layout / auth guard (ADMIN_EMAILS allowlist) 🟢

### OPS. Background ops, automation & infrastructure (~100 crons + libs)
**Dispatch:** OPS-1 `dispatch/[group]` fan-out router (62 handlers → 39 schedule entries, dodges Vercel 40-cron cap) 🟢
**Lifecycle drips:** OPS-2 user sequences (welcome/investor/hub/exit-intent/tax-nurture/winback) · OPS-3 advisor (onboarding/profile-gate/dormant/post-enquiry/nudge) · OPS-4 abandoned (form/quiz/shortlist) · OPS-5 quiz-follow-up + digests (personalized/pro/weekly newsletter) 🟢
**Billing/dunning:** OPS-6 advisor + subscription dunning 🟢 · OPS-7 credit auto-topup / expiry / low-balance 🟢 · OPS-8 sponsored renewal + placement-apply 🟢
**Marketplace:** OPS-9 outcome flywheel 🟢 · OPS-10 stale-briefs + stats 🟢 · OPS-11 lead SLA enforce/check/confirm + auto-resolve disputes 🟢 · OPS-12 quote expiry/review + verify-review-clients 🟢 · OPS-13 lead-quality weights recalibration 🟡 *(logging-only)*
**Content freshness:** OPS-14 content/fee staleness + dated-stats 🟢 · OPS-15 fee/rate currency 🟢 · OPS-16 affiliate-link scanner 🟢 · OPS-17 auto-publish + versus backfill 🟢 · OPS-18 broker snapshot + review-sentiment + review invites 🟢 · OPS-19 embeddings refresh (pgvector) 🟢 · OPS-20 property-suburb refresh 🟡 *(zero-stub if mis-set — flag #18)*
**Compliance/retention/privacy:** OPS-21 GDPR retention purge 🟢 · OPS-22 process-data-exports 🟢 *(stale comment — flag #21)* · OPS-23 data-export monitor 🟢 · OPS-24 TMD audit (DDO) 🟢 · OPS-25 AFSL-expiry + annual-review reminder 🟢 · OPS-26 complaints SLA 🟢 · OPS-27 quarterly anonymity audit 🟢 · OPS-28 account-deletion reminder 🟢 · OPS-29 data-integrity audit 🟢 · OPS-30 secret-rotation check 🟢
**Health/observability:** OPS-31 heartbeat 🟢 · OPS-32 cron-health + freshness 🟢 · OPS-33 SLO monitor (Slack/PagerDuty) 🟢 · OPS-34 synthetic checks 🟢 · OPS-35 web-vitals rollup 🟢 · OPS-36 hub-silence-check (agent-fleet watchdog) ⚙️ · OPS-37 observability retention 🟢
**Revenue/recon:** OPS-38 revenue recon + month-end close + view refresh 🟢 · OPS-39 attribution + warehouse rollup 🟢 · OPS-40 affiliate payout recon (≥10% variance) 🟢 · OPS-41 monthly advisor/affiliate reports + plan-resume digest 🟢 · OPS-42 referral payouts 🟢 · OPS-43 expire deals 🟢
**Experiments:** OPS-44 A/B auto-promote (z-test) 🟢 *(no circuit-breaker — flag #15)*
**User alerts:** OPS-45 rate/price-drop/watchlist/portfolio/saved-search alert delivery 🟢
**Country:** OPS-46 country-rule-alerts digest 🟢
**Automation rollups:** OPS-47 automation verdict rollup ⚙️ · OPS-48 feature-flag expiry 🟢
**Infra/queue:** OPS-49 job-queue worker (Postgres-backed, backoff, dead-letter) 🟢 · OPS-50 retry-webhooks (inbound) 🟢 · OPS-51 rotate featured advisors 🟢 · OPS-52 bounce sweep + cleanup 🟢
**Inbound webhooks:** OPS-53 Stripe 🟢 · OPS-54 Resend 🟢 · OPS-55 broker-signup 🟢
**Supporting libs:** OPS-56 outbound-webhooks (HMAC; admin-replay-only — flag #17) 🟡 · OPS-57 job-queue lib 🟢 · OPS-58 layered rate limiting (mem + DB) 🟢 · OPS-59 feature-flags (% rollout, allow/deny, segments) 🟢 · OPS-60 AI cost caps + alerts 🟢 · OPS-61 attribution lib 🟢 · OPS-62 SLO evaluator 🟢 · OPS-63 PostHog capture (RSC/browser/edge) 🟢 · OPS-64 cron-run-log + cron-auth + cron-groups 🟢 · OPS-65 internal agent-automation system (autopilot/automation/loop-status + verdict rollup) ⚙️

---

## 9. Counts
- **127** product/platform features · **134** admin tools · **65** background ops/infra systems.
- This month's net-new is concentrated in sections A, C, D, E, F, G, K and the `mm*`/`gm*` migrations.

## 10. Coverage / methodology
Assembled from an exhaustive route + migration + cron sweep, cross-checked against `FIN_NOTEBOOK.md`, `LAUNCH_GATE_9_5.md`, `REMEDIATION_QUEUE.md`, and `pre-launch-wave-status.md`, then verified by twelve parallel sub-agents. Maturity tags reflect what is on the working branch (== `main`) at audit time, except items explicitly marked 📥 (unmerged). The §5 flags are the recommended pre-launch punch list.
