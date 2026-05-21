import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /retirement — consumed by the <HubPage> HOC.
 * Factual explainer + product comparison (annuities) + adviser referral.
 * complianceKey "general_advice" — no personal advice issued on this hub.
 */
export const retirementHubConfig: HubConfig = {
  slug: "retirement",
  title: `Retirement Planning Australia (${CURRENT_YEAR}) — Account-Based Pensions, Age Pension & Drawdown`,
  metaDescription:
    "Factual guide to retirement planning in Australia. Understand account-based pensions, the Age Pension means test, drawdown strategies, annuities, and longevity risk — updated for FY2026.",
  audiences: ["retiree"],
  complianceKey: "general_advice",

  hero: {
    headline: "Retirement Planning Hub",
    subhead:
      "Australia's retirement system combines superannuation drawdown, the Age Pension means test, and optional annuity products. Understanding how these interact — and their sequencing risk implications — is foundational to any retirement plan.",
    stats: [
      {
        label: "ASFA comfortable retirement (couple, p.a.)",
        value: "$72,148",
        dataAsOf: "2024-06-30",
        stalesAt: "2026-09-30",
        source: "https://www.superannuation.asn.au/resources/retirement-standard/",
      },
      {
        label: "Full Age Pension (couple, per fortnight)",
        value: "$1,725.20",
        dataAsOf: "2025-03-20",
        stalesAt: "2026-09-20",
        source: "https://www.servicesaustralia.gov.au/age-pension",
      },
      {
        label: "Preservation age (born after Jun 1964)",
        value: "60",
        dataAsOf: "2024-07-01",
        stalesAt: "2030-01-01",
        source: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/access-your-super-early/preservation-age",
      },
    ],
    primaryCta: {
      label: "Speak to a Retirement Planner",
      href: "/retirement/quiz",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Retirement Readiness Diagnostic",
      href: "/retirement/quiz",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Account-Based Pensions",
      icon: "trending-up",
      description:
        "An account-based pension (ABP) converts your super accumulation balance into a flexible income stream. No tax on fund earnings in pension phase; minimum drawdown rates apply from age 60. The most common retirement structure.",
      href: "/retirement/account-based-pensions",
      cta: "ABP Explained",
    },
    {
      title: "Age Pension",
      icon: "dollar-sign",
      description:
        "The Age Pension provides a means-tested government income for Australians aged 67+. The income test and assets test both apply — the lower entitlement governs. Couples above $470,000 in assets (ex-home) receive a part pension.",
      href: "/retirement/age-pension",
      cta: "Age Pension Guide",
    },
    {
      title: "Annuities",
      icon: "shield",
      description:
        "A lifetime or term annuity provides guaranteed income regardless of market conditions or how long you live. Products like Challenger LifeTime annuities trade flexibility for certainty. Useful for covering essential living expenses.",
      href: "/retirement/annuities",
      cta: "Compare Annuities",
    },
    {
      title: "Drawdown Strategy",
      icon: "bar-chart",
      description:
        "Sequencing risk — poor early returns magnifying losses — is the core mathematical risk in retirement. Bucket strategies (cash / growth allocation) and dynamic drawdown rules help manage this. A retirement planner can model your specific numbers.",
      href: "/retirement/drawdown",
      cta: "Drawdown Strategies",
    },
    {
      title: "Longevity Risk",
      icon: "calendar",
      description:
        "Australian women aged 65 have a median life expectancy of ~90; men ~87. A 30-year retirement is realistic. Planning only to age 80 creates a significant risk of outliving assets — annuities and deferred lifetime income products address this directly.",
      href: "/retirement/longevity",
      cta: "Longevity Planning",
    },
    {
      title: "Transition to Retirement",
      icon: "refresh-cw",
      description:
        "From preservation age (60), a Transition to Retirement (TTR) income stream lets you draw down super while still working. Combined with salary sacrifice, TTR can significantly reduce tax — but the strategy requires professional modelling.",
      href: "/super",
      cta: "TTR Guide",
    },
  ],

  deepDives: [
    {
      title: `Account-Based Pensions Explained (${CURRENT_YEAR})`,
      excerpt:
        "How an ABP works, minimum drawdown rates by age, the tax-free treatment of earnings in pension phase, and how the transfer balance cap ($1.9M) limits how much can be moved into pension phase.",
      href: "/retirement/account-based-pensions",
      readingTimeMinutes: 8,
    },
    {
      title: "The Age Pension Means Test — Income and Assets",
      excerpt:
        "How the income test and assets test interact, the assets-test thresholds for homeowners vs non-homeowners, deeming rates on financial assets, and Centrelink's assessment of super in accumulation phase.",
      href: "/retirement/age-pension",
      readingTimeMinutes: 7,
    },
    {
      title: "Annuities in Australia — When They Make Sense",
      excerpt:
        "A lifetime annuity guarantees income for life — including if you live to 100. This guide covers products from Challenger and others, how Centrelink treats annuity income, and the sequencing-risk reduction case for annuities.",
      href: "/retirement/annuities",
      readingTimeMinutes: 6,
    },
    {
      title: "Sequencing Risk and Bucket Strategies",
      excerpt:
        "Sequencing risk describes how poor investment returns in the first years of retirement can permanently impair a portfolio, even if long-run average returns are fine. Bucket strategies, annuities, and dynamic drawdown are the main mitigants.",
      href: "/retirement/drawdown",
      readingTimeMinutes: 6,
    },
  ],

  calculators: [
    { slug: "retirement-calculator", label: "Retirement Calculator" },
    { slug: "fire-calculator", label: "FIRE / Early Retirement Calculator" },
  ],

  quizzes: [
    {
      slug: "retirement/quiz",
      label: "Retirement Readiness Diagnostic",
      routesTo: "retirement",
    },
  ],

  leadMagnets: [
    {
      slug: "retirement-planning-guide",
      title: "Retirement Planning Checklist",
      format: "pdf",
      listKey: "retirement-hub",
    },
  ],

  newsletter: {
    listKey: "retirement-hub",
    cadence: "monthly",
  },

  leadQueue: { kind: "retirement", advisorType: "retirement_planner" },

  relatedHubs: ["super", "smsf", "aged-care", "insurance"],

  articleFilters: {
    category: "retirement",
    tags: ["retirement", "age-pension", "account-based-pension", "annuity", "drawdown"],
  },

  primaryKeywords: [
    "retirement planning australia",
    "account-based pension australia",
    "age pension means test",
    "annuities australia",
    "retirement drawdown strategy",
    "how much super do i need to retire",
    "retirement income australia",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "How much super do I need to retire comfortably in Australia?",
      answer:
        "ASFA's retirement standard (June 2024) estimates $595,000 for a comfortable single retirement and $690,000 for a couple, assuming you also qualify for a part Age Pension. A 'comfortable' retirement currently costs $51,278/year for singles and $72,148/year for couples. These figures assume you own your home outright. If you're renting in retirement, the required balance is significantly higher — often $1M+ for singles.",
    },
    {
      question: "What age do I qualify for the Age Pension in Australia?",
      answer:
        "The Age Pension eligibility age is 67 for anyone born on or after 1 January 1957. You must also be an Australian resident and pass both the income test and assets test. Even if your income and assets are above the full-pension threshold, you may receive a part pension. Check your eligibility via Services Australia's online estimator.",
    },
    {
      question: "What is an account-based pension?",
      answer:
        "An account-based pension (ABP) is the most common retirement income product. You roll your super accumulation balance into a pension account, and the fund pays you a regular income. Key features: no tax on investment earnings in pension phase (unlike accumulation phase); flexible drawdown (subject to ATO minimums by age); and the balance remains in your estate unless exhausted. The 2024 Transfer Balance Cap limits how much can be in pension phase to $1.9M per person.",
    },
    {
      question: "What is the minimum drawdown from an account-based pension?",
      answer:
        "The ATO sets minimum annual drawdown percentages based on your age. For FY2026: age 55–64 = 4%; age 65–74 = 5%; age 75–79 = 6%; age 80–84 = 7%; age 85–89 = 9%; age 90–94 = 11%; age 95+ = 14%. You can always draw more — the minimum prevents super from being used purely as an estate planning vehicle in tax-free pension phase.",
    },
    {
      question: "What is the difference between a lifetime annuity and an account-based pension?",
      answer:
        "An account-based pension is market-linked and flexible — the balance can run out if returns are poor or drawdown is too high. A lifetime annuity pays a guaranteed income for life (or a fixed term), regardless of markets or longevity. You cannot access the capital once you buy an annuity. Most retirees use both: an ABP for flexibility and capital access, and an annuity to cover essential living expenses with certainty.",
    },
    {
      question: "How does the Age Pension assets test work?",
      answer:
        "The assets test assesses most of your assets at their current market value, excluding the principal family home. For FY2026 full-pension thresholds: homeowners — $314,000 (single), $470,000 (couple); non-homeowners — $566,000 (single), $722,000 (couple). Assets above these thresholds reduce your pension by $3 per fortnight per $1,000 of excess assets. Your super balance is included in the assets test once you reach Age Pension age.",
    },
  ],
};
