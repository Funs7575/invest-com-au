# Platform Expansion Brief — PX Stream

**Created:** 2026-05-21  
**Status:** In-flight (implementation this session)  
**Branch:** `claude/sweet-gates-izLBx`

Seven features that turn invest.com.au from a comparison directory into a platform advisors run their practice on — and investors check back to weekly.

---

## PX-01 — Slack lead alerts for advisors

**What:** Advisors paste a Slack Incoming Webhook URL in Settings → get an instant Slack message every time a lead is matched to them.

**Why:** Lead speed-to-respond is the #1 conversion driver. Most small advisory firms run on Slack. A real-time Slack ping in their team workspace (not another email to scan) collapses the response window from hours to minutes.

**What's already built:**
- Full outbound webhook infrastructure (`lib/outbound-webhooks/`) with HMAC signing and delivery logs
- Lead notification emails via Resend (`lib/advisor-emails.ts`)
- Advisor portal with Settings tab

**What to build:**
- `slack_webhook_url` column on `professionals` (nullable text)
- `lib/slack-lead-notify.ts` — Slack Block Kit formatter + sender
- `/api/internal/lead-webhooks` — internal Node runtime route (fires outbound webhooks + Slack after lead insert; called fire-and-forget from edge submit-lead)
- `/api/advisor-portal/slack-settings` — PATCH endpoint to save/clear Slack URL
- `SettingsTab.tsx` — "Slack Integration" section: paste URL + test button

**Revenue impact:** Advisor retention (sticky). Higher response rates → better conversion → higher advisor LTV → lower churn on marketplace credits.

---

## PX-02 — CRM/Zapier sync via outbound webhooks

**What:** Add `lead.received` to the allowed events list in the self-serve webhook portal, and fire `sendOutboundWebhook("lead.received", payload)` when a lead is created. Advisors already have access to the webhook portal — they can now pipe leads into HubSpot, Pipedrive, Salesforce, or Zapier.

**Why:** Professional advisors run their pipeline in a CRM. Any platform that doesn't integrate gets used minimally. The webhook infrastructure is already production-ready — this is purely wiring.

**What's already built:**
- `app/advisor-portal/webhooks/` — full self-serve endpoint manager UI
- `lib/outbound-webhooks/` — HMAC-signed delivery, retry, delivery log
- `app/api/advisor-portal/webhooks/route.ts` — ALLOWED_EVENTS list (just needs `lead.received` added)

**What to build:**
- Add `lead.received` and `lead.assigned` to ALLOWED_EVENTS
- `/api/internal/lead-webhooks` (shared with PX-01) fires `sendOutboundWebhook`

**Revenue impact:** Reduces advisor churn by making invest.com.au a first-class integration point in their tech stack. Zapier integration multiplies reach to 5000+ app connectors.

---

## PX-03 — Firm shared lead inbox

**What:** When a firm admin logs into the advisor portal, they see a "Team Leads" toggle in the Leads tab that shows all leads across their firm members — with an assignment dropdown to route leads to specific advisors.

**Why:** Multi-advisor firms are the highest-LTV accounts. Currently every advisor only sees their own leads — the firm admin has no visibility across the team, no way to reassign a lead if an advisor is away, and no unified conversion view. This single feature turns a solo-advisor tool into a practice management platform.

**What's already built:**
- `advisor_firms` table with `is_firm_admin` boolean on `professionals`
- `advisor_firm_invitations` with email-based team join
- `professional_leads` table with `professional_id` FK
- `TeamTab.tsx` with firm member list

**What to build:**
- `/api/advisor-portal/firm-leads` — GET endpoint (firm admin only): returns all `professional_leads` for members of the advisor's firm
- `LeadsTab.tsx` — add "Team" toggle when `advisor.is_firm_admin = true`; assignment dropdown to reassign lead to another team member
- `/api/advisor-portal/firm-leads/assign` — PATCH endpoint to update `professional_id` on a lead

---

## PX-04 — Fee impact visualiser

**What:** An interactive SVG/Canvas component showing the compound dollar impact of fee differences. "$50,000 invested at 0.10% vs 0.30% MER over 20 years" rendered as two diverging curves with the dollar gap labelled.

**Why:** Abstract fee percentages don't create urgency. "$47,000 in extra fees over 20 years" does. This is the highest-trust content signal the platform can add to every fee comparison page — it makes the comparison tangible.

**What's already built:**
- Broker comparison pages with fee data (`app/broker/[slug]/`, `/best/[slug]/`)
- Fee structure data on broker listings

**What to build:**
- `components/FeeImpactVisualiser.tsx` — parametric: initial amount, fee1%, fee2%, years; SVG paths, animated gap label, no external deps
- Import in `/app/broker/[slug]/` sidebar and broker comparison tables

---

## PX-05 — Referral programme

**What:** Investors share a referral link; both referrer and referee get 3 months Pro free when the referee subscribes. Advisors share a referral link; referring advisor gets marketplace credit when the referred advisor activates.

**Why:** Referred users have 30–50% lower churn and higher LTV than acquired users. Existing users sharing links is the lowest-CAC acquisition channel on the platform. The Stripe, Resend, and Pro tier infrastructure is all in place.

**What's already built:**
- Full Stripe subscription flow (`lib/stripe.ts`, `app/api/stripe/`)
- Pro subscription tier with feature gates
- Resend email pipeline

**What to build:**
- Migration: `referral_codes` table (code, owner_user_id, owner_professional_id, uses, max_uses, reward_type)
- `lib/referrals.ts` — generate code, validate code, claim reward
- `/api/referral/claim` — POST to claim a code on signup/subscribe
- `/app/account/referrals/page.tsx` — user referral dashboard (your code + share links + uses count)
- Referral email template (triggered on successful claim)

---

## PX-07 — Annual Financial MOT email

**What:** Once a year on the user's account anniversary, send a personalised email: "You joined invest.com.au a year ago. Here's what's changed in the products you've looked at..." — highlights fee changes in their bookmarked/compared products, points to new top-rated alternatives.

**Why:** Re-engagement at peak relevance. Most users make a financial decision, get what they needed, and drift. An anniversary email with personalised product changes creates a reason to revisit at exactly the right moment (annual review season). High open rates from genuine personalisation.

**What's already built:**
- User bookmarks/watchlist in `investor_profiles` and shortlists
- Rate snapshots and broker fee data
- Resend email pipeline with drip infrastructure
- Cron infrastructure at `/app/api/cron/`

**What to build:**
- `/app/api/cron/annual-mot/route.ts` — daily cron: finds users whose `created_at` anniversary is today; queries their bookmarks/viewed products; sends personalised summary email via Resend

---

## PX-06 — Calendar booking on advisor profile (DONE ✓)

Already implemented: `booking_link` column exists on `professionals`, `BookingWidget` component exists, profile page renders both the external booking link and the native scheduling widget. ProfileTab allows advisors to set their Calendly/Cal.com URL. No work needed.

---

## Queue structure

Stream ID: `PX`  
Branch: `claude/sweet-gates-izLBx`

| Item | Feature | Status |
|------|---------|--------|
| PX-01 | Slack lead alerts | pending |
| PX-02 | Webhook lead events (CRM sync) | pending |
| PX-03 | Firm shared lead inbox | pending |
| PX-04 | Fee impact visualiser | pending |
| PX-05 | Referral programme | pending |
| PX-06 | Booking on advisor profile | done ✓ |
| PX-07 | Annual MOT email | pending |
