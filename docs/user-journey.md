# User Journey — invest.com.au

Mermaid sequence diagram tracing the two primary user paths (DIY broker selection
and advisor matching) from landing through lead capture to billing and outcome.

Audit ref: `docs/audits/codebase-health-2026-04-24.md` §12  
Queue item: S-01  
Updated: 2026-05-07

---

## Path A — DIY broker quiz

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Quiz as /quiz<br>(QuizPage)
    participant API as Next.js API
    participant DB as Supabase
    participant PH as PostHog
    participant Resend

    User->>Quiz: visit /quiz
    Quiz->>PH: trackEvent("quiz_started", {quiz_type:"diy_broker", source_page})
    Note over Quiz: Multi-step wizard<br>(location → goal → mode →<br>experience → complexity → amount)

    loop Each question answered
        User->>Quiz: answer question
    end

    Quiz->>Quiz: scoreQuizResults() — weight × broker matrix
    Quiz->>PH: trackEvent("quiz_completed", {quiz_type:"diy_broker",<br>time_taken_seconds, top_match_slug, match_count})
    Note over Quiz: Results screen shown<br>inline email capture (no gate)

    User->>Quiz: submit email (optional)
    Quiz->>API: POST /api/quiz/submit<br>{answers, email}
    API->>DB: INSERT quiz_leads (answers, email, top_match)
    API-->>Quiz: {matches: top-3 brokers}

    User->>Quiz: click broker CTA
    Quiz->>PH: trackEvent("advisor_viewed") or<br>trackEvent("advisor_contacted")

    Note over Quiz,Resend: No advisor email on DIY path<br>(broker affiliate link, no lead routing)
```

---

## Path B — Advisor matching quiz

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Quiz as /quiz<br>(QuizPage)
    participant LeadAPI as POST /api/advisor-lead
    participant QuotesAPI as POST /api/quotes
    participant DB as Supabase
    participant PH as PostHog
    participant Resend
    participant Admin as Admin inbox

    User->>Quiz: visit /quiz (mode=advisor)
    Quiz->>PH: trackEvent("quiz_started", {quiz_type:"advisor_match", source_page})
    Note over Quiz: Multi-step wizard<br>(+ advisor_type → budget → complexity)

    Quiz->>PH: trackEvent("quiz_completed", {quiz_type:"advisor_match",<br>selected_advisor_type, budget_range, risk_profile, match_count})

    User->>Quiz: fill contact form (name, email, phone)
    Quiz->>LeadAPI: POST /api/advisor-lead<br>{name, email, phone, advisor_type, quiz_answers, consent}

    LeadAPI->>LeadAPI: rate-limit check (5/min per IP)<br>validate email + AU phone
    LeadAPI->>DB: INSERT leads {name, email, phone,<br>advisor_type, source_page, utm_*}
    LeadAPI->>DB: INSERT quiz_leads (quiz_answers, top_matches)

    par Async (non-blocking)
        LeadAPI->>Resend: POST /emails<br>admin notification → finn@invest.com.au
        LeadAPI->>Resend: PUT /contacts<br>add user to audience list
    end

    LeadAPI->>PH: captureServerEvent(distinct_id, "lead_submitted",<br>{lead_source, advisor_match_count, utm_source})
    LeadAPI-->>Quiz: {ok: true}

    Note over QuotesAPI,Resend: Marketplace path (if advisor_type<br>routes to quote auction)

    Quiz->>QuotesAPI: POST /api/quotes<br>{advisor_type, budget, location, description, email}
    QuotesAPI->>DB: INSERT quotes (auction row, slug, status="open")
    QuotesAPI->>QuotesAPI: notifyMatchingAdvisors()<br>[filter by advisor_types, states, budget_bands<br>via professionals + alert_preferences]
    QuotesAPI->>Resend: POST /emails × N<br>alert email per matching advisor

    Note over User,Resend: Cron follow-ups if no advisor responds
    Note over Quiz: quiz-follow-up cron (Vercel)<br>abandoned-quiz-drip cron (Vercel)<br>investor-drip cron (Vercel)
```

---

## Path C — Advisor billing (credit top-up)

```mermaid
sequenceDiagram
    autonumber
    actor Advisor
    participant Portal as /advisor-portal
    participant PayAPI as POST /api/advisor-auth/payment
    participant Stripe
    participant WebhookAPI as POST /api/stripe/webhook
    participant DB as Supabase
    participant Resend

    Advisor->>Portal: navigate to billing tab
    Portal->>PayAPI: POST /api/advisor-auth/payment<br>{credit_pack: "starter"|"growth"|"scale"}

    PayAPI->>PayAPI: requireAdvisorSession() — verify session cookie
    PayAPI->>DB: SELECT professionals WHERE id = advisor_id
    PayAPI->>Stripe: customers.create() (if no stripe_customer_id)
    PayAPI->>DB: UPDATE professionals SET stripe_customer_id
    PayAPI->>Stripe: checkout.sessions.create({<br>  mode:"payment",<br>  metadata:{kind:"advisor_credit_topup", advisor_id, pack},<br>  success_url, cancel_url<br>})
    PayAPI-->>Portal: {checkoutUrl}

    Advisor->>Stripe: redirected → complete payment

    Stripe->>WebhookAPI: POST /api/stripe/webhook<br>event: checkout.session.completed<br>metadata.kind = "advisor_credit_topup"
    WebhookAPI->>WebhookAPI: verifyWebhookSignature() (STRIPE_WEBHOOK_SECRET)
    WebhookAPI->>DB: SELECT advisor_topups WHERE stripe_session_id<br>(idempotency guard — skip if exists)
    WebhookAPI->>DB: INSERT advisor_topups {advisor_id, pack, credits, amount_cents}
    WebhookAPI->>DB: UPDATE professionals SET credit_balance_cents += pack.credits × 100
    WebhookAPI->>Resend: POST /emails<br>receipt → advisor email
    WebhookAPI-->>Stripe: 200 OK
```

---

## Path D — Lead outcome + dispute resolution

```mermaid
sequenceDiagram
    autonumber
    actor Advisor
    participant OutcomeAPI as POST /api/lead-outcome
    participant DisputeAPI as POST /api/advisor-lead-dispute
    participant Resolver as lib/advisor-lead-dispute-resolver
    participant DB as Supabase
    participant PH as PostHog
    participant Resend

    Note over Advisor,DB: Advisor receives lead, contacts user

    Advisor->>OutcomeAPI: POST /api/lead-outcome<br>{lead_id, outcome:"converted"|"lost"|"no_response"}
    OutcomeAPI->>DB: UPDATE leads SET outcome, outcome_at
    OutcomeAPI->>PH: captureServerEvent("lead_outcome",<br>{lead_id, advisor_id, outcome, lead_source})

    Note over Advisor,Resolver: If lead is disputed (bad contact info, duplicate)

    Advisor->>DisputeAPI: POST /api/advisor-lead-dispute<br>{lead_id, reason, evidence}
    DisputeAPI->>DB: INSERT lead_disputes {lead_id, advisor_id, reason}
    DisputeAPI->>Resolver: autoResolveDispute(dispute)
    Resolver->>Resolver: buildClassifierContext() — score signals<br>(email bounce, phone invalid, duplicate fingerprint)

    alt Auto-resolved (high confidence)
        Resolver->>DB: UPDATE leads SET disputed_at, dispute_outcome="refunded"
        Resolver->>DB: UPDATE professionals SET credit_balance_cents += bill_amount
        Resolver->>Resend: POST /emails — refund confirmation → advisor
    else Escalated to admin
        Resolver->>DB: INSERT audit_log {action:"dispute_escalated"}
        Resolver->>Resend: POST /emails — escalation alert → admin
    end
```

---

## PostHog event reference

| Event | Fired by | When |
|-------|----------|------|
| `quiz_started` | Browser (`phTrack`) | First question answered in `/quiz` |
| `quiz_completed` | Browser (`phTrack` + `trackEvent`) | Results screen mounted |
| `advisor_viewed` | Browser (`trackEvent`) | Advisor profile card clicked |
| `advisor_contacted` | Browser (`trackEvent`) | Contact button clicked |
| `lead_submitted` | Server (`captureServerEvent`) | `/api/advisor-lead` success |
| `advisor_response` | Server | Advisor bids on a quote |
| `lead_outcome` | Server | `/api/lead-outcome` success |

---

## Resend email touchpoints

| Trigger | Template | Recipient |
|---------|----------|-----------|
| `POST /api/advisor-lead` success | Admin notification (HTML, inline) | `finn@invest.com.au` |
| `POST /api/advisor-lead` success | Contact sync (audience list) | User |
| Advisor quote alert | Quote notification (lib/quote-emails) | Each matching advisor |
| `checkout.session.completed` — advisor_credit_topup | Credit receipt | Advisor |
| `checkout.session.completed` — course | Course receipt (buildCourseReceiptEmail) | Buyer |
| `checkout.session.completed` — consultation | Consultation confirmation | Buyer |
| Auto-resolved dispute | Refund confirmation | Advisor |
| Escalated dispute | Escalation alert | `finn@invest.com.au` |
| `cron/quiz-follow-up` | Follow-up if no advisor response | User |
| `cron/abandoned-quiz-drip` | Drip sequence (Day 1/3/7) | User |
| `cron/investor-drip` | Investor journey drip | User |

---

## Stripe webhooks consumed

| Event | Handler | Effect |
|-------|---------|--------|
| `checkout.session.completed` — `kind=advisor_credit_topup` | `handleCheckoutSessionCompleted` | Insert `advisor_topups`, add credits, send receipt |
| `checkout.session.completed` — `kind=advisor_featured` | `handleCheckoutSessionCompleted` | Activate 30-day featured status |
| `checkout.session.completed` — `type=course` | `handleCheckoutSessionCompleted` | Insert `course_purchases`, track creator revenue |
| `checkout.session.completed` — `type=consultation` | `handleCheckoutSessionCompleted` | Upsert consultation booking |
| `checkout.session.completed` — `kind=sponsored_placement` | `handleCheckoutSessionCompleted` | Create placement booking |
| `customer.subscription.*` | `handleSubscription*` handlers | Update subscription status in DB |
| `invoice.payment_succeeded` | `handleInvoicePayment` | Record payment, send receipt |
| `wallet_topup` | `/api/marketplace/webhook` | Broker wallet top-up (separate endpoint, prevents double-credit) |

---

## Key data tables

| Table | Written by | Purpose |
|-------|-----------|---------|
| `quiz_leads` | `/api/quiz/submit`, `/api/advisor-lead` | Quiz answers + top broker matches |
| `leads` | `/api/advisor-lead` | Advisor lead contact details + UTM |
| `quotes` | `/api/quotes` | Marketplace auction rows |
| `professionals` | Seed + admin + billing webhook | Advisor profiles + credit balance |
| `advisor_topups` | Stripe webhook | Credit purchase ledger (idempotency key) |
| `lead_disputes` | `/api/advisor-lead-dispute` | Dispute records |
| `audit_log` | Dispute resolver + admin actions | Immutable action log |
| `cron_run_log` | Every cron route | Heartbeat for staleness detection |
