import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /aged-care — consumed by the <HubPage> HOC.
 * Factual explainer + aged-care funding diagnostic + adviser referral (aged_care_advisor).
 * Includes reverse-mortgage referral slot (Heartland) + submit-lead routing.
 * complianceKey "aged_care" — no personal advice issued on this hub.
 */
export const agedCareHubConfig: HubConfig = {
  slug: "aged-care",
  title: `Aged Care Funding Guide Australia (${CURRENT_YEAR}) — Home Care, RAD/DAP & Means Testing`,
  metaDescription:
    "Factual guide to aged care in Australia. Understand home care packages, residential care, RADs, DAPs, means testing, reverse mortgages, and how to find a certified aged-care adviser — updated for FY2026.",
  audiences: ["retiree"],
  complianceKey: "aged_care",

  hero: {
    headline: "Aged Care Funding Hub",
    subhead:
      "Australia's aged care system is means-tested and complex. Understanding the difference between home care packages (Levels 1–4), residential care (RAD/DAP), and the income/assets means test is critical before any care decision is made.",
    stats: [
      {
        label: "Basic daily fee (residential care, FY2026)",
        value: "$63.57/day",
        dataAsOf: "2025-07-01",
        stalesAt: "2027-01-01",
        source: "https://www.health.gov.au/topics/aged-care/aged-care-reforms-and-reviews/new-aged-care-act",
      },
      {
        label: "Median RAD (refundable accommodation deposit)",
        value: "$450,000",
        dataAsOf: "2025-01-01",
        stalesAt: "2027-01-01",
        source: "https://www.aihw.gov.au/reports/aged-care/aged-care-in-australia",
      },
      {
        label: "Home care packages (Level 4 subsidy, p.a.)",
        value: "$60,765",
        dataAsOf: "2025-07-01",
        stalesAt: "2027-01-01",
        source: "https://www.health.gov.au/topics/aged-care/providing-aged-care-services/home-care-packages-program",
      },
    ],
    primaryCta: {
      label: "Speak to an Aged-Care Adviser",
      href: "/aged-care/quiz",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Aged-Care Funding Diagnostic",
      href: "/aged-care/quiz",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Home Care Packages",
      icon: "home",
      description:
        "Government-subsidised in-home care for older Australians who want to stay at home longer. Four package levels (1–4) fund personal care, nursing, domestic assistance and more. Packages are means-tested — a basic daily fee and income-tested fee may apply. Waitlists can be 12+ months for higher-level packages.",
      href: "/aged-care/home-care-packages",
      cta: "Home Care Guide",
    },
    {
      title: "Residential Aged Care",
      icon: "building",
      description:
        "24-hour nursing and personal care in an aged care home. Costs comprise a basic daily fee, a means-tested care fee, and an accommodation payment (RAD or DAP). The facility charges a RAD (lump sum) or DAP (daily rent equivalent) — or a combination — for accommodation. The maximum RAD/DAP is set by the provider.",
      href: "/aged-care/residential-care",
      cta: "Residential Care Guide",
    },
    {
      title: "RAD & DAP Explained",
      icon: "dollar-sign",
      description:
        "A Refundable Accommodation Deposit (RAD) is a lump-sum bond paid to a residential facility — refunded in full when you leave. A Daily Accommodation Payment (DAP) is the daily equivalent, calculated using the MPIR (currently 8.38% p.a.). Most families choose a combination: a partial RAD to reduce daily DAP payments.",
      href: "/aged-care/rad-dap",
      cta: "RAD vs DAP Calculator",
    },
    {
      title: "Means Testing",
      icon: "calculator",
      description:
        "The means test determines how much you contribute to your care costs. It assesses income (including deemed super/investments) and assets (including the family home for residential care after 2 years). Assets above the threshold trigger a means-tested care fee of up to $415/day (capped over a lifetime and per year).",
      href: "/aged-care/means-testing",
      cta: "Means Test Guide",
    },
    {
      title: "Reverse Mortgages",
      icon: "trending-down",
      description:
        "A reverse mortgage (home equity release) lets homeowners aged 60+ access equity without selling. Products like Heartland Seniors Finance offer drawdown, lump-sum, or regular-income options. Interest compounds — the loan balance can grow significantly if held long-term. ASIC requires reverse mortgage providers to give a No Negative Equity Guarantee.",
      href: "/aged-care/reverse-mortgage",
      cta: "Reverse Mortgage Guide",
    },
    {
      title: "Certified Aged-Care Advisers",
      icon: "users",
      description:
        "Aged care financial advice is specialist territory. Only advisers with specialist training (AIFC or equivalent) can advise on the interaction of aged care costs, Age Pension entitlements, and estate planning. Our network includes accredited Aged Care Specialists who can model the full financial impact of care decisions.",
      href: "/aged-care/quiz",
      cta: "Find an Adviser",
    },
  ],

  deepDives: [
    {
      title: `Home Care Packages Explained (${CURRENT_YEAR})`,
      excerpt:
        "How the four home care package levels work, what services are funded, the basic daily fee and income-tested fee structure, and how to navigate the ACAT assessment process.",
      href: "/aged-care/home-care-packages",
      readingTimeMinutes: 8,
    },
    {
      title: "RAD vs DAP: Which Accommodation Payment Should You Choose?",
      excerpt:
        "Understanding refundable accommodation deposits vs daily payments, the MPIR calculation, the combination strategy, and how Centrelink assessments interact with RAD proceeds.",
      href: "/aged-care/rad-dap",
      readingTimeMinutes: 7,
    },
    {
      title: "Aged Care Means Testing — What Gets Assessed",
      excerpt:
        "The income assessment (including deemed income on financial assets), the assets assessment (home exemption rules), the means-tested care fee cap, and the lifetime cap on means-tested fees.",
      href: "/aged-care/means-testing",
      readingTimeMinutes: 6,
    },
    {
      title: "Reverse Mortgages in Australia — Risks and Benefits",
      excerpt:
        "How home equity release works, the No Negative Equity Guarantee, compound interest risk, Centrelink asset assessment of loan proceeds, and when a reverse mortgage makes sense vs alternatives.",
      href: "/aged-care/reverse-mortgage",
      readingTimeMinutes: 7,
    },
  ],

  calculators: [
    { slug: "aged-care-cost-estimator", label: "Aged Care Cost Estimator" },
  ],

  quizzes: [
    {
      slug: "aged-care/quiz",
      label: "Aged-Care Funding Diagnostic",
      routesTo: "aged_care",
    },
  ],

  leadMagnets: [
    {
      slug: "aged-care-funding-guide",
      title: "Aged Care Funding Checklist",
      format: "pdf",
      listKey: "aged-care-hub",
    },
  ],

  newsletter: {
    listKey: "aged-care-hub",
    cadence: "monthly",
  },

  leadQueue: { kind: "aged_care", state: "all", certifiedAdvisorOnly: true },

  relatedHubs: ["retirement", "super", "insurance", "estate-planning"],

  articleFilters: {
    category: "aged-care",
    tags: ["aged-care", "home-care-packages", "rad", "dap", "reverse-mortgage", "means-testing"],
  },

  primaryKeywords: [
    "aged care australia",
    "home care packages australia",
    "residential aged care costs",
    "rad dap aged care",
    "aged care means test",
    "reverse mortgage australia",
    "aged care financial advice",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "What is the difference between home care and residential aged care?",
      answer:
        "Home care packages provide government-subsidised services (personal care, nursing, domestic assistance) delivered in your own home. There are four package levels (1–4) with annual subsidies from $10,588 to $60,765. Residential aged care is full-time care in a facility — 24-hour nursing support, meals, and accommodation. Residential care is significantly more expensive and involves an accommodation payment (RAD or DAP) on top of daily care fees.",
    },
    {
      question: "What is a RAD (Refundable Accommodation Deposit)?",
      answer:
        "A RAD is a lump-sum payment to a residential aged care facility for accommodation. It is fully refundable (without interest) when you leave the facility or when the resident dies, less any agreed deductions. The alternative is a Daily Accommodation Payment (DAP), calculated at the current Maximum Permissible Interest Rate (MPIR, currently 8.38% p.a.) applied to the RAD equivalent. Most residents pay a combination: a partial RAD to reduce ongoing DAP costs.",
    },
    {
      question: "How does the aged care means test work?",
      answer:
        "The means test has two parts: an income assessment and an assets assessment. The income assessment includes deemed income on financial assets, investment income, and pensions. The assets assessment includes financial assets, investment properties, and — for residential care — the family home after a 28-day exemption (extended indefinitely if a protected person such as a spouse remains). The means-tested care fee is capped at $35,671 per year and $81,945 over a lifetime (FY2026 figures). A certified aged-care adviser can model your specific assessment.",
    },
    {
      question: "How do I get a home care package?",
      answer:
        "To access a home care package you need an aged care assessment (ACAT). You can self-refer by calling My Aged Care on 1800 200 422. The assessment determines which package level (1–4) you are eligible for. Packages are managed by approved home care providers — you can choose your own provider. Waitlists for Level 3 and 4 packages can exceed 12 months. While waiting, you may be eligible for Commonwealth Home Support Programme (CHSP) services.",
    },
    {
      question: "What is a reverse mortgage and how does it affect Centrelink?",
      answer:
        "A reverse mortgage lets homeowners aged 60+ borrow against their home equity. No repayments are required during the loan — interest compounds and is added to the loan balance. The loan is repaid when the property is sold, the owner moves into care, or upon death. Under the 'No Negative Equity Guarantee', you can never owe more than the property's sale value. Centrelink treats reverse mortgage loan proceeds as an asset once disbursed (if invested or held as cash) but the loan itself is a liability that reduces assessed assets. Talk to a financial adviser before proceeding.",
    },
    {
      question: "Do I need a specialist aged-care financial adviser?",
      answer:
        "Yes — aged care financial advice requires specialist knowledge of the interaction between aged care costs, Age Pension entitlements (the family home exemption changes when entering residential care), estate planning, and tax. The Australian Investment and Financial Literacy Association (AIFC) and the Financial Planning Association run accreditation programs for Aged Care Specialists. An accredited adviser can model whether a RAD or DAP is more cost-effective, how the means test affects your pension, and whether home equity release is appropriate.",
    },
  ],
};
