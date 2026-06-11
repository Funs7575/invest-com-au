import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /super — consumed by the <HubPage> HOC.
 * Z-26 hub migration: replaces the legacy VerticalPillarPage pattern.
 */
export const superHubConfig: HubConfig = {
  slug: "super",
  title: `Super Fund Hub (${CURRENT_YEAR}) — Compare Funds, Fees & Contribution Strategies`,
  metaDescription:
    "Australia's superannuation hub. Compare super fund fees and returns, learn salary sacrifice and carry-forward strategies, optimise insurance in super, and prepare for transition to retirement. Independent guides updated monthly.",
  audiences: ["retiree"],
  complianceKey: "super",

  hero: {
    headline: "Superannuation Hub",
    subhead:
      "Super is Australia's most tax-effective savings vehicle — 15% contributions tax vs. up to 47% marginal rate. Whether you're maximising contributions, comparing funds, or approaching preservation age, the decisions you make now compound for decades.",
    stats: [
      {
        label: "Total super assets",
        value: "$3.9 trillion",
        dataAsOf: "2024-06-30",
        stalesAt: "2025-06-30",
        source:
          "https://www.apra.gov.au/quarterly-superannuation-statistics",
      },
      {
        label: "Employer guarantee rate (FY2026)",
        value: "11.5%",
        dataAsOf: "2025-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/superannuation-guarantee",
      },
      {
        label: "Australians with superannuation",
        value: "17 million+",
        dataAsOf: "2024-06-30",
        stalesAt: "2025-06-30",
        source: "https://www.apra.gov.au/quarterly-superannuation-statistics",
      },
    ],
    primaryCta: {
      label: "Compare Super Funds",
      href: "/compare/super",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Find a Super Specialist",
      href: "/advisors/financial-planners",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Fund Performance Explorer",
      icon: "trending-up",
      description:
        "Every APRA-regulated fund's reported 5 and 10-year returns, operating expenses, assets and member numbers — straight from the regulator's fund-level statistics, sortable any way you like.",
      href: "/super/funds",
      cta: "Explore the Data",
    },
    {
      title: "Compare Super Funds",
      icon: "bar-chart",
      description:
        "Compare fees, investment options, insurance, and long-term performance across Australia's top retail and industry super funds. A 0.5% fee difference costs tens of thousands over 30 years.",
      href: "/compare/super",
      cta: "Compare Now",
    },
    {
      title: "SMSF",
      icon: "building",
      description:
        "600,000+ Australians run Self-Managed Super Funds controlling $900B+ in assets. SMSFs work best above $250,000 in combined balances. Find ASIC-approved auditors and SMSF specialists.",
      href: "/smsf",
      cta: "SMSF Hub",
    },
    {
      title: "Salary Sacrifice",
      icon: "trending-up",
      description:
        "Salary sacrifice turns pre-tax income into super contributions taxed at 15% — not your 32.5–47% marginal rate. The concessional cap is $30,000/year (including the employer SG).",
      href: "/super/contributions",
      cta: "Contribution Strategies",
    },
    {
      title: "Insurance in Super",
      icon: "shield",
      description:
        "Most super funds include default life, TPD, and income protection insurance. Premiums erode your balance — review whether the default cover is right for your situation.",
      href: "/compare/super",
      cta: "Compare Cover",
    },
    {
      title: "Super Consolidation",
      icon: "refresh-cw",
      description:
        "Australians have $17.8B in lost and unclaimed super. Consolidating into one fund saves duplicate fees and makes your balance easier to grow. Start with MyGov to find lost accounts.",
      href: "/super/consolidation",
      cta: "Find Lost Super",
    },
    {
      title: "Transition to Retirement",
      icon: "calendar",
      description:
        "From preservation age (currently 60), you can start drawing a TTR pension while still working. Salary sacrifice + TTR income stream is one of the most powerful legal tax strategies available.",
      href: "/advisors/financial-planners",
      cta: "Speak to an Adviser",
    },
  ],

  deepDives: [
    {
      title: `How to Compare Super Funds (${CURRENT_YEAR})`,
      excerpt:
        "Not all super funds are equal. This guide breaks down how to compare investment returns, administration fees, insurance premiums, and exit fees — including how to read a product disclosure statement.",
      href: "/super/compare-guide",
      readingTimeMinutes: 7,
    },
    {
      title: "Salary Sacrifice: The Complete Strategy Guide",
      excerpt:
        "How salary sacrifice works, the $30,000 concessional cap, carry-forward rules for unused contributions, and worked examples across different income brackets.",
      href: "/super/contributions",
      readingTimeMinutes: 8,
    },
    {
      title: "Transition to Retirement (TTR) Explained",
      excerpt:
        "TTR lets you draw an income stream from your super from age 60 while still working. When it makes sense, how to structure it, and what traps to avoid — especially the tax treatment of TTR pensions.",
      href: "/super/transition-to-retirement",
      readingTimeMinutes: 6,
    },
    {
      title: "Finding and Consolidating Lost Super",
      excerpt:
        "How to use the ATO's online services to find super held with multiple funds, assess whether consolidating makes sense, and execute the rollover without triggering an insurance gap.",
      href: "/super/consolidation",
      readingTimeMinutes: 5,
    },
    {
      title: "Insurance Inside Super — What You're Actually Covered For",
      excerpt:
        "Life, TPD and income protection cover inside super: group rates, the any-occupation TPD trap, MySuper inactivity rules, and the insurance gap risk when consolidating funds.",
      href: "/super/insurance",
      readingTimeMinutes: 6,
    },
  ],

  calculators: [
    { slug: "super-contributions-calculator", label: "Super Contributions Calculator" },
    { slug: "fee-impact", label: "Fee Impact Calculator" },
    { slug: "fire-calculator", label: "FIRE / Retirement Calculator" },
  ],

  quizzes: [
    {
      slug: "super/quiz",
      label: "Which super fund is right for me?",
      routesTo: "general",
    },
  ],

  leadMagnets: [
    {
      slug: "super-strategy-guide",
      title: "Super Strategy Guide",
      format: "pdf",
      listKey: "super-hub",
    },
  ],

  newsletter: {
    listKey: "super-hub",
    cadence: "weekly",
  },

  leadQueue: { kind: "general", topic: "super" },

  relatedHubs: ["smsf", "first-home-buyer", "insurance", "redundancy"],

  articleFilters: {
    category: "super",
    tags: ["superannuation", "smsf", "retirement", "salary-sacrifice", "concessional"],
  },

  primaryKeywords: [
    "best super fund australia",
    "compare super funds",
    "superannuation australia",
    "salary sacrifice super",
    "super fund fees",
    "transition to retirement",
    "super contributions",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "How much super should I have for my age?",
      answer:
        "ASFA's retirement standard suggests $595,000 for a comfortable single retirement (2024). As a rough guide: at 30 your balance should roughly equal your annual salary; at 40, 2× salary; at 50, 3.5× salary; at 60, 5× salary. These benchmarks vary by income and lifestyle expectations.",
    },
    {
      question: "What is the superannuation guarantee rate in 2026?",
      answer:
        "The employer superannuation guarantee (SG) rate is 11.5% of ordinary time earnings for FY2025-26, rising to 12% from 1 July 2026. Your employer must pay this into your chosen super fund at least quarterly.",
    },
    {
      question: "Can I access my super early?",
      answer:
        "Generally no — super is preserved until you reach preservation age (60 for anyone born after June 1964). Limited early release conditions exist: severe financial hardship, compassionate grounds, terminal illness, permanent incapacity, or leaving Australia permanently (DASP). The ATO administers these applications. Beware of illegal early release schemes — they are heavily penalised.",
    },
    {
      question: "Should I salary sacrifice to super?",
      answer:
        "Salary sacrifice makes sense when your marginal tax rate exceeds 15% (i.e., taxable income above $18,200). The higher your income, the greater the benefit. The concessional contributions cap is $30,000/year including your employer SG. If your balance is under $500,000 and you've had unused cap room in the last 5 years, carry-forward rules may let you contribute more than $30,000 in a single year.",
    },
    {
      question: "What happens to my super if I die?",
      answer:
        "Your super doesn't automatically form part of your estate — it passes according to your death benefit nomination. A binding nomination directs the trustee to pay your super to a nominated dependant or estate. If you have no valid nomination, the trustee decides. Review your nomination whenever you have a major life change (marriage, divorce, children).",
    },
  ],
};
