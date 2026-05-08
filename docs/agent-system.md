# Agent System Topology

19 agents · 5 escalation tiers · 24 infrastructure tables.

> Source of truth: `COMPANY.md` §"The 19 agents" + §"24 agent infrastructure tables".
> Specs: `.claude/agents/*.md` (precedence: spec > this doc).
> Queue item: S-02.

---

## 5-tier escalation hierarchy

```mermaid
flowchart TD
    T1["⚡ Tier 1 — AUTO\nAgent acts, no notification\nContent publication · security scans · lead routing"]
    T2["⏱ Tier 2 — NOTIFY + PROCEED\n4-hour auto-proceed window unless Fin rejects\nDeployments · broker onboarding"]
    T3["✋ Tier 3 — APPROVAL GATE\nWaits for Fin's explicit OK\nMoney > $500 · legal docs · pricing change > 25%"]
    T4["📱 Tier 4 — URGENT WAKE-UP\nPhone notification regardless of hour\nSecurity breach · prod down · payment failure > $1k"]
    T5["🤝 Tier 5 — FRIEND ROUTE\nCo-Founder handles directly\nEnterprise negotiations · ASIC meetings · industry events"]

    T1 -->|threshold met| T2
    T2 -->|approval required| T3
    T3 -->|urgent| T4
    T3 -->|Co-Founder domain| T5

    style T1 fill:#bbf7d0,stroke:#16a34a
    style T2 fill:#fef9c3,stroke:#ca8a04
    style T3 fill:#fed7aa,stroke:#ea580c
    style T4 fill:#fecaca,stroke:#dc2626
    style T5 fill:#e9d5ff,stroke:#9333ea
```

**Bandwidth modifiers:** Master Overseer (#00) reads Fin's + Co-Founder's Google Calendars.
During low-bandwidth windows (Vipassana retreats, treks) tier-2 escalations are downgraded.
Tier-4 always breaks through.

---

## Agent network

```mermaid
graph TD
    OV["#00 Master Overseer\nhourly + event-driven\nmonitors all 19"]

    subgraph Leadership["Leadership layer"]
        CEO["#01 CEO Agent\ndaily 06:00 AEST\nstrategic brief"]
        CTO["#02 CTO Agent\nevery 4h + event\nspec→architect→implement"]
    end

    subgraph Revenue["Revenue layer"]
        REV["#07 Revenue Agent\ncontinuous\nlead routing · Stripe monitoring"]
        REVOPT["#15 Revenue Opt.\nSun 20:00\n6 parallel analyses / week"]
        SMB["#05 SMB Sales\ncontinuous\n600 prospects/month"]
        BD["#06 BD / Enterprise\ncontinuous\n$50k–$5M deals"]
    end

    subgraph Content["Content layer"]
        CMO["#03 CMO / Content\ndaily 07:00\n20 Tier-2 articles/week"]
        EDI["#04 Editorial\ndaily 10:00 AEST\nTier-1 pillar coordination"]
        GROWTH["#14 Growth / Partner\ndaily 05:30 + Wed 09:00\ncompetitor intel + partnerships"]
        AISEO["#17 AI Search Opt.\nweekly Mon 22:00\n500+ LLM probe queries/week"]
    end

    subgraph Ops["Operations layer"]
        EMAIL["#11 Email / Lifecycle\nevent-driven\nResend · customer lifecycle"]
        OPS["#12 Ops / Admin\ndaily 04:00 + weekly + quarterly\nbroker/advisor onboarding"]
        ANA["#10 Analytics\ndaily 02:00\nplatform_snapshots SSOT"]
        CI["#09 CI / Improvement\nSun 06:00\n3–5 hypotheses/week · 14-day measurement"]
    end

    subgraph Compliance["Compliance + future layer"]
        SEC["#08 Security\ndaily 03:00\nASIC compliance · dep vuln scans"]
        LIC["#13 Licensing\ndaily 04:30 + weekly + event\nACL/AFSL · ASIC · Dad CPD"]
        MIGS["#16 Domain Migration\nOct–Dec 2026 only\n.vercel.app → invest.com.au"]
        PROD["#18 Product Layer\npost-AFSL only\nco-branded products"]
    end

    OV -->|monitors| Leadership & Revenue & Content & Ops & Compliance
```

---

## Agent → DB table linkages

### Agent-only tables (19, all `service_role`-only RLS)

| Group | Tables | Primary agents |
|---|---|---|
| Core runtime | `agent_tasks`, `agent_memory`, `agent_logs` | all agents via #00 Overseer |
| Observability | `platform_snapshots` | #10 Analytics |
| Sales & growth | `prospects`, `revenue_opportunities`, `partner_integrations` | #05 SMB Sales, #06 BD, #14 Growth |
| Compliance & licensing | `compliance_tasks`, `authorised_representatives`, `credit_representatives` | #08 Security, #13 Licensing |
| Approvals & bandwidth | `ceo_approvals`, `friend_decisions`, `founder_bandwidth` | #00 Overseer (writes), #01 CEO (reads) |
| Editorial | `editorial_articles`, `advisor_content_subscriptions` | #03 CMO, #04 Editorial |
| Search & migration | `llm_citations`, `migration_plan` | #17 AI Search, #16 Domain Migration |
| Products & API | `cobranded_products`, `api_customers` | #18 Product Layer (post-AFSL) |

### Shared platform tables (5, agents co-use with app)

| Platform table | Agent using it | Purpose |
|---|---|---|
| `ab_tests` | #09 CI / Improvement | A/B test lifecycle management |
| `forum_threads` | #03 CMO / Content, #04 Editorial | Article discussion seeding |
| `bd_pipeline` | #06 BD / Enterprise | Enterprise deal tracking |
| `competitor_watch` | #14 Growth / Partnership | Competitive intelligence |
| `dynamic_pricing_rules` | #15 Revenue Optimisation | Price elasticity experiments |

---

## Escalation routing by agent

| Agent | Primary trigger | Normal tier | Escalates to |
|---|---|---|---|
| #00 Master Overseer | hourly + event | — | T4 (anomaly detected) |
| #01 CEO Agent | daily 06:00 | T1 (brief) | T3 (strategic decisions) |
| #02 CTO Agent | every 4h + event | T1/T2 (deploys) | T3 (schema changes, pricing) |
| #03 CMO / Content | daily 07:00 | T1 (publish) | T2 (new content type) |
| #04 Editorial | daily 10:00 | T2 (Tier-1 article brief) | T3 (legal-sensitive content) |
| #05 SMB Sales | continuous | T1 (outreach) | T3 (contract > $500) |
| #06 BD / Enterprise | continuous | T2 (pipeline updates) | T5 (enterprise negotiations) |
| #07 Revenue Agent | continuous | T1 (lead routing) | T4 (Stripe anomaly > $1k) |
| #08 Security | daily 03:00 | T1 (scan + patch) | T4 (breach detected) |
| #09 CI / Improvement | Sun 06:00 | T2 (hypothesis brief) | T3 (breaking change) |
| #10 Analytics | daily 02:00 | T1 (snapshot write) | T2 (anomaly report) |
| #11 Email / Lifecycle | event-driven | T1 (automated email) | T2 (new campaign type) |
| #12 Ops / Admin | daily 04:00 | T1 (onboarding) | T2 (billing issue) |
| #13 Licensing | daily 04:30 | T1 (monitoring) | T4 (ASIC action) |
| #14 Growth / Partner | daily 05:30 | T1/T2 (intel + pipeline) | T5 (partner deal) |
| #15 Revenue Opt. | Sun 20:00 | T2 (opportunity brief) | T3 (pricing change > 25%) |
| #16 Domain Migration | Oct–Dec 2026 | T2 (migration steps) | T4 (authority drop detected) |
| #17 AI Search Opt. | weekly Mon 22:00 | T1 (probe + report) | T2 (citation strategy change) |
| #18 Product Layer | post-AFSL | T3 (product decisions) | joint Fin+Co-Founder approval |

---

## Forbidden actions (all agents)

- Direct DB writes outside CTO Agent path
- Force-push to `main`
- Stripe refunds without approval
- Email impersonation of real people (except authorised authors)
- Content publication without compliance check
- Schema changes without approval
- Security feature disablement
- Licensing work suspension
- Co-branded product changes without joint Fin + Co-Founder approval
- ASIC communication without Master Agent review
