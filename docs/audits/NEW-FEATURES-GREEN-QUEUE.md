# New-Features "Green the Audit" — remediation queue

Live state for driving `docs/audits/2026-05-20-new-features-audit.md` §5 punch list
to green. Seeded 2026-05-20 from the ordered work plan in
`docs/plans/new-features-green-loop-prompt.md`.

**Status legend:** `todo` · `in-pr` (branch + PR open, awaiting CI/merge) ·
`merged` · `human-gated` (needs a founder action — see notes) · `already-green`
(verified fixed on `main`, audit text was stale).

**Tier** per `docs/audits/MERGE_AUTHORIZATION.md`.

| id | section | item | tier | status | PR | notes |
|----|---------|------|------|--------|----|-------|
| §0-dv  | reconcile | Document Vault PR #1040 | — | **merged** | #1040 | Landed on `main` (commit 7726d96f0) during this loop. |
| §0-sp  | reconcile | Startup portal PR #1048 (6/13 tasks) | C | todo | #1048 | Drive to merge if green, else mark blocked. Touches portal/schema — verify. |
| §0-chat| reconcile | BriefChatPanel mounted nowhere | C | **human-gated** | — | DECISION NEEDED: expose the advisor↔client chat (then needs §2-#7 compliance framing) or delete the dead component. Founder call. |
| 1  | P0 | Carbon/ACCU + aquaculture/livestock listings: gate/noindex | C | **in-pr** | #1062 | noindex + sitemap-trim + shared s708/general-advice notice; TODO resolved. **Re-indexing needs compliance/legal sign-off.** |
| 2  | P0 | DROP orphan `sharesight_connections` (plaintext tokens) | E | **human-gated** | — | Tier E (irreversible DROP). Needs explicit founder consent. Action: confirm 0 rows + no refs, then run `DROP TABLE` migration + remove from `.driftallowlist`. |
| 3  | P0 | Admin MFA fail-closed when `ADMIN_MFA_KEY` unset | C | todo | — | Make MFA a hard gate; today route 503s and login proceeds without MFA. Touches auth — announce intent before merge. |
| 4  | P0 | AFSL-expiry monitor inert without `AFSL_LOOKUP_URL` | C/D | **human-gated** | — | Code: fail-loud + alert if env unset (safe to implement). Env: **founder must confirm `AFSL_LOOKUP_URL` is set in prod** (Tier D). |
| 5  | P1 | Sponsored-content disclosure on advisor pay-to-publish articles (s1041H) | B | todo | — | Reuse `SPONSORED_DISCLOSURE` from `lib/compliance.ts`. |
| 6  | P1 | General-advice disclaimer on community advisor posts (RG 36) | B | todo | — | Mirror the `/questions` pattern; `GENERAL_ADVICE_WARNING`. |
| 7  | P1 | Brief-chat compliance framing (disclaimer + archival/monitoring) | C | blocked-on §0-chat | — | Only if the chat is exposed. |
| 8  | P1 | Supplier ABN on broker-portal invoice PDF (ATO) | B | **in-pr** | #1061 | `COMPANY_LEGAL_NAME`+`COMPANY_ABN` from `lib/compliance.ts`; test extended. |
| 9  | P1 | Restrict `presence_pings` RLS (anon read of online status) | C | todo | — | Migration: drop anon SELECT or expose coarse boolean. RLS + isolation test. |
| 10 | P1 | TMD expiry enforcement/alert (DDO s994A–C) | C | todo | — | Enforce/alert, don't just display dates. |
| 11 | P1 | Approval gate on regulatory-alert & country-rule publish | C | todo | — | AD-20 / AD-117 publish instantly today. |
| 12 | P1 | `run-migration` route needs admin session, not just `CRON_SECRET` | C | todo | — | Add admin-session check. Touches admin/ops route. |
| 13 | P1 | Impersonation visibility ("who is impersonating whom") | B | todo | — | Admin view; API is audit-logged but invisible. |
| 14 | P1 | Wire `portal-gate` isolation for business/firm/startup portals | C | todo | — | Only advisor portal wired today. |
| 15 | P2 | Circuit-breaker on `ab-auto-promote` | B | todo | — | Cap auto-conclusions per run beyond the kill switch. |
| 16 | P2 | Autopilot toggles DB-backed or removed | B | todo | — | AD-99 toggles likely cosmetic. |
| 17 | P2 | Outbound-webhook auto-retry | B | todo | — | OPS-56 is admin-replay-only. |
| 18 | P2 | Alert when `property-suburb-refresh` runs the zero-stub | B | todo | — | OPS-20 silent degrade. |
| 19 | P2 | Zod-validate `submit-lead` | B | **conflict-watch** | — | **Being worked live by another agent** (mtime 20:30 on `submit-lead/route.ts`). Duplicate-guard: defer to their PR. |
| 20 | P2 | Consent fixes (SMS/WhatsApp record, unified unsubscribe, SSR cookie consent) | C | todo | — | Spam/Privacy Act. Multi-part — split. |
| 21 | P2 | Reconcile stale `process-data-exports` "table missing" comment | A | **in-pr** | #1063? | Comment-only; table applied 2026-05-08. |
| §4-occ | completeness | Occupation pages (#83): 8 missing slugs | — | **already-green** | — | Verified: all 26 slugs in sync across config/sitemap/hub. Audit text was stale. (Optional: derive sitemap from `OCCUPATIONS` to prevent future drift.) |
| §4-teams | completeness | `/teams` index + nav link (unlocks #23–31) | A | todo | — | Create `app/teams/page.tsx` (mirror `/advisors`, use `listVerifiedTeams()`); add Header nav link. **Needs UI run-verify before merge.** |
| §4-vert | completeness | Empty listing verticals (#21): noindex or wire submit | A | partial | #1062 | carbon/aquaculture/livestock done; remaining empty verticals (VC, litigation-funding, ILS, royalties…) still indexed-but-empty — noindex or enable submit. |
| §4-content | completeness | Reports / switch-stories / community seed | — | **human-gated** | — | DECISION NEEDED: seed real content or keep `noindex`. Founder call (don't auto-seed public content). |

## Human-gated — exact founder actions

- **§0-chat (BriefChatPanel):** decide expose vs delete. If expose, item 7 (compliance framing) unblocks.
- **Item 2 (DROP table):** Tier E. Reply with explicit consent to drop `sharesight_connections`; I'll write an idempotent forward-only migration + `.driftallowlist` removal.
- **Item 4 (AFSL_LOOKUP_URL):** confirm the env var is set in Vercel prod (Tier D). I can ship the fail-loud/alert code regardless.
- **§4-content:** decide seed vs keep-noindexed for reports, switch-stories, community forum.
