# ACL / AFSL paperwork tracker

> The launch trigger is ACL approval, not code readiness. This is the
> tracker that prevents the embarrassing scenario of *"the code is ready,
> but the paperwork has been sitting on someone's desk for 3 weeks."*
>
> **Update cadence:** weekly, during the Friday ritual. Ten minutes max.
> If a row hasn't moved in 14 days, surface to the founder for
> escalation.

## Status legend

- 🟢 **In progress** — actively being worked on this week
- 🟡 **Waiting on external** — submitted, waiting on regulator / lawyer / counterparty
- 🔵 **Not started** — known item, hasn't kicked off yet
- ✅ **Done** — completed
- 🔴 **Blocked** — needs founder action to unblock
- ⚫ **N/A** — determined not applicable

## ACL (Australian Credit Licence) — primary launch trigger

| ID | Item | Status | Owner | Last updated | Notes / blocker |
|---|---|---|---|---|---|
| ACL-01 | Decide: ACL holder vs Authorised Credit Representative (ACR) | 🔵 | Founder | _yyyy-mm-dd_ | Holder = full licence (~6mo + $$$). ACR = ride on someone else's licence (~weeks). Cheaper, faster, common path. |
| ACL-02 | If ACR: identify host licensee | 🔵 | Founder | | |
| ACL-03 | If holder: lodge AFS001 form with ASIC | 🔵 | Founder + lawyer | | $5k+ application fee |
| ACL-04 | Responsible Manager (RM) appointment | 🔵 | Founder | | RG 105 qualifications required |
| ACL-05 | RM Statement of Personal Information (SPI) | 🔵 | RM | | Identity + integrity check |
| ACL-06 | RM National Police Check | 🔵 | RM | | ~1-2 weeks |
| ACL-07 | RM Bankruptcy Check | 🔵 | RM | | |
| ACL-08 | Compensation arrangements (PI insurance) | 🔵 | Founder | | Required for ACL — RG 210 |
| ACL-09 | Internal Dispute Resolution (IDR) procedure documented | 🔵 | Founder | | RG 271 — must publish IDR policy |
| ACL-10 | AFCA membership | 🔵 | Founder | | External Dispute Resolution; mandatory; ~$500-2000/yr |
| ACL-11 | Compliance manual / written policies | 🔵 | Founder + lawyer | | Audit-trail of how we comply with the Credit Act |
| ACL-12 | Submit application to ASIC | 🔵 | Founder | | After all above complete |
| ACL-13 | Respond to ASIC RFIs (request for information) | 🔵 | Founder | | ASIC typically asks 1-3 rounds of clarifications |
| ACL-14 | Licence approval | 🔵 | ASIC | | THIS IS LAUNCH DAY |

## AFSL (Australian Financial Services Licence) — for advice + product offering

| ID | Item | Status | Owner | Last updated | Notes / blocker |
|---|---|---|---|---|---|
| AFSL-01 | Decide: AFSL holder vs Corporate Authorised Representative (CAR) | 🔵 | Founder | | CAR ride on existing licence (likely path given dad's existing licence?) |
| AFSL-02 | If CAR: confirm host licensee + scope of authority | 🔵 | Founder | | |
| AFSL-03 | Authorisation scope: general advice, personal advice, dealing, custody, etc. | 🔵 | Founder + lawyer | | Most platforms only need *general advice* for retail investor education |
| AFSL-04 | RG 146 training for any personal-advice provider | 🔵 | Advisor pool | | Required for personal-advice authorisations |
| AFSL-05 | Compensation arrangements (PI cover for AFSL) | 🔵 | Founder | | Often combined with ACL PI |
| AFSL-06 | DDO (Design and Distribution Obligations) — TMDs for any retail products | 🔵 | Founder + lawyer | | RG 274; required for any product distributor |
| AFSL-07 | Hawking restrictions compliance review | 🔵 | Founder | | Anti-hawking provisions — outbound contact rules |
| AFSL-08 | Marketing / advertising compliance review | 🔵 | Founder + lawyer | | RG 234; must not mislead |
| AFSL-09 | If applying: AFS form lodged with ASIC | 🔵 | Founder | | $$$ fee + same RM/PI/IDR/AFCA requirements as ACL |

## Privacy / data protection (parallel track to ACL/AFSL)

| ID | Item | Status | Owner | Last updated | Notes / blocker |
|---|---|---|---|---|---|
| PRIV-01 | Privacy policy reviewed by lawyer | 🔵 | Founder + lawyer | | AU Privacy Act + APP compliance |
| PRIV-02 | Data Breach Response Plan documented | 🔵 | Founder | | NDB scheme — 30-day notification |
| PRIV-03 | OAIC notifications drafted (template) | 🔵 | Founder | | Pre-drafted for incident response |
| PRIV-04 | Cookie consent surface live | 🔵 | Engineering | | Cookie law-of-the-jungle; not strictly required in AU but nice-to-have for EU traffic |
| PRIV-05 | GDPR endpoints verified (`/api/account/export-data`, `/delete`, `/privacy/correct`) | 🟡 | Engineering | 2026-04-26 | All routes exist; need to verify with a real test on staging |
| PRIV-06 | Data Processing Agreements with sub-processors (Vercel, Supabase, Anthropic, Stripe, Resend) | 🔵 | Founder | | Each provider has a template DPA |
| PRIV-07 | Retention policy applied to user-data tables | 🟡 | Engineering | 2026-04-27 | K-14 seeded `retention_rules` for 7 PII tables |

## Other regulatory

| ID | Item | Status | Owner | Last updated | Notes / blocker |
|---|---|---|---|---|---|
| AML-01 | AML/CTF program (if dealing in financial products) | 🔵 | Founder + lawyer | | AUSTRAC; depends on AFSL scope |
| TAX-01 | Tax registration: ABN, GST | 🔵 | Founder | | Probably already done |
| CORP-01 | Company structure review (Pty Ltd, trust, etc.) | 🔵 | Founder + accountant | | Tax + liability optimisation |
| TM-01 | Trademark application for "invest.com.au" / brand name | 🔵 | Founder | | IP Australia; ~$330 + ~7 months |

## Friday ritual integration

When you run the Friday ritual (`docs/runbooks/friday-ritual.md`), add a
new step 0 before the merge sweep:

```
Step 0 — ACL paperwork sweep (5 min)

1. Open this file (docs/launch/acl-paperwork-tracker.md).
2. For each row with status 🟢 or 🟡, update the "Last updated" column
   with today's date.
3. For each row with status 🔵, ask: should this kick off this week?
   If yes, change to 🟢 and add a one-line note.
4. For any row with last_updated > 14 days ago and status not in
   (✅, ⚫, 🔴), flip to 🔴 and surface to the founder's "escalate"
   list for the week.
5. If anything changed, commit the update directly to main with a
   subject like `docs(acl): weekly status sweep — yyyy-mm-dd`.
```

## Escalation triggers

Surface to founder immediately (not next Friday) if:
- 🔴 has been red for >7 days
- ASIC RFI received (ACL-13) — read it the day it arrives
- AFCA membership lapses (ACL-10)
- A regulator-asked deadline is <14 days away

## Why this lives in the repo

Most paperwork trackers live in Notion / a spreadsheet / someone's head. Putting it in the repo:
- Keeps it version-controlled (you can answer "what was the status on 2026-06-01?")
- Lets the audit-loop read it (it can flag stale rows automatically)
- Means it survives founder change-of-tooling (Notion subscription lapse)
- Makes it part of the "how this project ships" record for any future investor / acquirer DD

If the founder strongly prefers Notion or a spreadsheet, fine — but
maintain a snapshot in this file at minimum. The paperwork is the
launch trigger; treating it like an afterthought is the most common way
fintech launches slip.

## Related

- `docs/runbooks/friday-ritual.md` — the weekly discipline that updates this
- `docs/audits/2026-04-26-comprehensive-audit.md` §"4-month plan" — the
  code-side trajectory; ACL approval is what triggers the launch off
  that trajectory
- `docs/glossary.md` — AFSL / ACL / AFCA / RM definitions
