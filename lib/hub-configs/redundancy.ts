import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

export const redundancyHubConfig: HubConfig = {
  slug: "redundancy",
  title: `Redundancy Hub (${CURRENT_YEAR}) — ETP Tax, Super Strategy & Financial Rebuild`,
  metaDescription:
    "Made redundant? Understand your genuine redundancy tax-free threshold, ETP tax rates, when to top up super, and how to rebuild your income over 12 months. Australia's redundancy financial guide.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: "Redundancy Hub",
    subhead:
      "Genuine redundancy payments receive a tax-free threshold and a concessional ETP tax rate. The decisions you make in the first 30–90 days determine how much you keep. Here's the roadmap — including when to speak to a tax agent before 30 June.",
    stats: [
      {
        label: "Genuine redundancy tax-free base (FY2025-26)",
        value: "$12,524",
        dataAsOf: "2025-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/redundancy-and-early-retirement",
      },
      {
        label: "Additional per year of service",
        value: "$6,264",
        dataAsOf: "2025-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/redundancy-and-early-retirement",
      },
      {
        label: "ETP life benefit cap",
        value: "$245,000",
        dataAsOf: "2025-07-01",
        stalesAt: "2026-07-01",
        source: "https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/employment-termination-payments",
      },
    ],
    primaryCta: {
      label: "ETP Tax Calculator",
      href: "/tools/etp-calculator",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Find a Tax Accountant",
      href: "/find/tax-accountant",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "ETP Tax Rules",
      icon: "shield",
      description:
        "Your genuine redundancy payment has a tax-free threshold ($12,524 + $6,264/year of service). The rest is a Life Benefit ETP taxed at 32% (under 60) or 17% (60+). ATO caps this at $245,000.",
      href: "https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/employment-termination-payments",
      cta: "ATO ETP Guide",
    },
    {
      title: "Super Carry-Forward",
      icon: "trending-up",
      description:
        "If your Total Super Balance is under $500k you can make up to 5 years of unused concessional contributions in a single year (carry-forward rule). Redundancy is often the only time this makes financial sense.",
      href: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/contribute-to-your-super/bring-forward-and-carry-forward-contributions",
      cta: "ATO Carry-Forward",
    },
    {
      title: "Leave Payouts",
      icon: "calendar",
      description:
        "Unused annual and long service leave are NOT part of the ETP — they're taxed as ordinary income at your marginal rate. They're separate from any genuine redundancy payment and paid by your employer.",
      href: "https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/redundancy-and-early-retirement",
      cta: "ATO Leave Guide",
    },
    {
      title: "Cash Buffer First",
      icon: "home",
      description:
        "3–6 months expenses in an offset account or HISA before any investment decision. Average job search time in Australia is 3.2 months for professionals; plan for 6. Don't invest what you may need.",
      href: "/savings",
      cta: "Compare Savings Accounts",
    },
    {
      title: "Centrelink Waiting Period",
      icon: "users",
      description:
        "JobSeeker has an Income Maintenance Period — any payout over the Centrelink-free area is counted as income, delaying your first payment by weeks. Plan your cash flow before applying.",
      href: "https://www.servicesaustralia.gov.au/income-maintenance-period",
      cta: "Services Australia",
    },
    {
      title: "12-Month Financial Rebuild",
      icon: "bar-chart",
      description:
        "Month 1: cash buffer + tax advice. Month 2–3: update super, review insurances. Month 4–6: invest surplus strategically. Month 7–12: normalise income, review plan. Redundancy is a reset, not a setback.",
      href: "/lump-sum-investing/redundancy",
      cta: "Full Rebuild Guide",
    },
  ],

  deepDives: [
    {
      title: "ETP vs Redundancy Payment: What's the Difference?",
      excerpt:
        "Genuine redundancy, invalidity, early retirement — the ATO treats them differently. Your payslip matters for choosing the right tax treatment.",
      href: "/lump-sum-investing/redundancy",
      readingTimeMinutes: 7,
    },
    {
      title: "Super Carry-Forward: The Redundancy Supercharge",
      excerpt:
        "Up to 5 years of unused concessional cap in one hit — how to calculate your available headroom, which accounts to use, and the 30 June timing trap.",
      href: "/super",
      readingTimeMinutes: 9,
    },
    {
      title: "Tax Minimisation in the Redundancy Year",
      excerpt:
        "Timing the financial year cut-off, maximising deductions, income averaging strategies, and when a tax agent pays for itself many times over.",
      href: "/tax",
      readingTimeMinutes: 8,
    },
  ],

  calculators: [
    { slug: "etp-calculator", label: "ETP Tax Calculator" },
    { slug: "savings-calculator", label: "Savings Buffer Calculator" },
  ],

  quizzes: [
    {
      slug: "redundancy/quiz",
      label: "What should I do with my redundancy payout?",
      routesTo: "general",
    },
  ],

  leadMagnets: [
    {
      slug: "redundancy-financial-checklist",
      title: "Redundancy Financial Action Checklist",
      format: "pdf",
      listKey: "redundancy-hub",
    },
  ],

  newsletter: {
    listKey: "redundancy-hub",
    cadence: "weekly",
  },

  leadQueue: { kind: "general", topic: "redundancy" },

  relatedHubs: ["super", "tax", "lump-sum-investing", "insurance"],

  articleFilters: {
    category: "redundancy",
    tags: ["etp", "termination-payment", "super", "tax"],
  },

  primaryKeywords: [
    "redundancy payment australia",
    "etp tax australia",
    "employment termination payment",
    "genuine redundancy tax free",
    "what to do with redundancy payout",
    "redundancy super contribution",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "Is my redundancy payment tax-free?",
      answer:
        "Part of it may be. Genuine redundancy payments receive a tax-free threshold: $12,524 base + $6,264 per completed year of service (FY2025-26 figures). Any amount above the tax-free threshold is a Life Benefit ETP taxed at 32% if you are under preservation age (60), or 17% if you are at or above 60. These rates apply up to the ETP cap ($245,000). Unused leave payouts (annual leave, long service leave) are separate and taxed at ordinary income tax rates.",
    },
    {
      question: "What is an ETP (Employment Termination Payment)?",
      answer:
        "An ETP is a lump-sum payment made when your employment is terminated — including redundancy, dismissal, resignation, invalidity, or early retirement schemes. The ATO distinguishes between Life Benefit ETPs (paid while alive — which covers redundancy) and Death Benefit ETPs. For genuine redundancy, the ETP tax rules give a lower tax rate on the taxable component compared to ordinary income tax.",
    },
    {
      question: "What should I do first with my redundancy payout?",
      answer:
        "Before any investment decision: (1) Establish a 3–6 month cash buffer in a high-interest savings account or mortgage offset. The average professional job search takes 3–4 months; build for 6 to avoid forced investment decisions. (2) See a tax agent before 30 June — if you receive your payout near year-end, timing decisions around the financial year cut-off can save thousands. (3) Review whether the super carry-forward rule applies to your situation (TSB under $500k + unused concessional cap in prior years).",
    },
    {
      question: "Can I put my redundancy payout into super?",
      answer:
        "Not directly — ETPs cannot be rolled into super (ATO rules since 2012). However, if you receive the payout as cash and your Total Super Balance is under $500,000, you may be able to make a personal concessional contribution using the carry-forward rule — claiming up to 5 years of unused concessional cap ($30,000/year in FY2025-26). This is separate from the ETP itself and must be done before 30 June.",
    },
    {
      question: "How long does it take to find a job after redundancy?",
      answer:
        "Australian Bureau of Statistics data shows the median job-search duration for retrenched workers is around 10–13 weeks, with professional roles often taking longer. Budget for 6 months when planning your cash buffer. If you receive JobSeeker, note there is an Income Maintenance Period where your payout may delay the start of your benefit by several weeks.",
    },
    {
      question: "Is unused leave taxed differently from my redundancy payout?",
      answer:
        "Yes — unused annual leave and long service leave payouts are not part of the ETP or genuine redundancy tax-free calculation. They are treated as ordinary employment income and taxed at your marginal rate (with a withholding component). They appear separately on your payment summary and are not subject to the ETP cap or concessional tax rates.",
    },
  ],
};
