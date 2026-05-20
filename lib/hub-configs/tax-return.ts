import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

export const taxReturnHubConfig: HubConfig = {
  slug: "tax-return",
  title: `Tax Return Hub Australia (${CURRENT_YEAR}) — Deductions, Lodgement & Accountants`,
  metaDescription:
    "Australia's tax return hub: work-related deductions, investment income, rental property claims, the 67¢/hr WFH rate, and when a tax agent pays for itself. Independent guides updated for FY2025-26.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: "Tax Return Hub",
    subhead:
      "The Australian tax year runs 1 July to 30 June. Individual lodgement is due 31 October; a registered tax agent extends your deadline to 15 May. This hub covers every major deduction category, investment income claims, and when to pay for professional help — with real numbers, not generalities.",
    stats: [
      {
        label: "Average Australian tax refund",
        value: "$2,817",
        dataAsOf: "2023-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/about-ato/research-and-statistics/in-detail/taxation-statistics/taxation-statistics-2022-23/",
      },
      {
        label: "WFH fixed rate (cents per hour)",
        value: "67¢",
        dataAsOf: "2023-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/working-from-home-expenses",
      },
      {
        label: "Individual lodgement deadline",
        value: "31 Oct",
        dataAsOf: "2025-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/lodging-your-tax-return/when-to-lodge",
      },
    ],
    primaryCta: {
      label: "Find a Tax Accountant",
      href: "/advisors/tax-accountants",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Tax Optimiser",
      href: "/tax-optimizer",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Work-Related Deductions",
      icon: "briefcase",
      description:
        "Claim uniforms, tools, professional memberships, self-education (if work-related), and home office costs. Must be directly related to earning your income — not reimbursed by your employer and you need records.",
      href: "/tax",
      cta: "Deductions Guide",
    },
    {
      title: "Working From Home",
      icon: "home",
      description:
        "The ATO's revised fixed rate is 67¢ per work-from-home hour, covering electricity, gas, internet, phone, and stationery. Keep a diary for 4 weeks to justify your full-year claim. Depreciation on equipment claimed separately.",
      href: "/tax",
      cta: "WFH Methods Explained",
    },
    {
      title: "Investment Income",
      icon: "trending-up",
      description:
        "Dividends (including franking credits), interest, managed fund distributions, and CGT events from share or property sales all belong in your return. Brokerage statements and CHESS holdings reports make it manageable.",
      href: "/tax/capital-gains",
      cta: "Investment Tax Guide",
    },
    {
      title: "Rental Property",
      icon: "building-2",
      description:
        "Claim interest on investment loans, rates, agent fees, repairs, and depreciation. Negative gearing losses reduce your taxable income. The ATO's Rental Properties guide is updated each financial year — use the current edition.",
      href: "/negative-gearing",
      cta: "Rental Deductions Guide",
    },
    {
      title: "Cryptocurrency",
      icon: "database",
      description:
        "Every disposal of crypto is a CGT event — selling, trading one coin for another, and using crypto to buy goods. The ATO receives data from Australian exchanges. Proper records from day one make lodgement straightforward.",
      href: "/tax/crypto",
      cta: "Crypto Tax Guide",
    },
    {
      title: "Tax Agents & Lodgement",
      icon: "file-text",
      description:
        "A registered tax agent extends your lodgement deadline from 31 October to 15 May. For investors with multiple income sources, CGT events, or rental properties, their fee is typically tax-deductible and saves more than it costs.",
      href: "/advisor-guides/tax-agent-vs-accountant",
      cta: "Agent vs DIY",
    },
  ],

  deepDives: [
    {
      title: `Work-Related Deductions Checklist — FY${CURRENT_YEAR}`,
      excerpt:
        "From home office to car to uniforms — what the ATO requires for each deduction category, how much you can claim without receipts ($300 threshold), and which deductions are commonly missed.",
      href: "/tax",
      readingTimeMinutes: 8,
    },
    {
      title: "CGT and Your Tax Return: Shares, Property & Crypto",
      excerpt:
        "When to report capital gains, how the 50% discount applies after 12 months, tax-loss harvesting before 30 June, and how to handle CGT events from ETF distributions.",
      href: "/tax/capital-gains",
      readingTimeMinutes: 10,
    },
    {
      title: "Negative Gearing and Your Tax Return",
      excerpt:
        "How rental property losses reduce your taxable income, what the ATO classifies as allowable deductions vs capital costs, and the depreciation schedule rules that change in 2025.",
      href: "/negative-gearing",
      readingTimeMinutes: 7,
    },
    {
      title: "When Does a Tax Agent Pay for Itself?",
      excerpt:
        "Average accountant fee vs average refund uplift — how to calculate whether professional lodgement is worth the cost for your situation, and what to look for in a tax specialist for investors.",
      href: "/advisor-guides/tax-agent-vs-accountant",
      readingTimeMinutes: 5,
    },
  ],

  calculators: [
    { slug: "withholding-tax-calculator", label: "Withholding Tax Calculator" },
  ],

  newsletter: {
    listKey: "tax-return-hub",
    cadence: "monthly",
  },

  leadQueue: { kind: "general", topic: "tax" },

  relatedHubs: ["tax", "negative-gearing", "crypto", "redundancy"],

  articleFilters: {
    category: "tax",
    tags: [
      "tax-return",
      "deductions",
      "work-from-home",
      "negative-gearing",
      "cgt",
      "rental-property",
    ],
  },

  primaryKeywords: [
    "tax return australia",
    "tax deductions australia",
    "work from home tax deduction australia",
    "investment property tax deductions",
    "how to lodge tax return australia",
    "tax agent australia",
    "capital gains tax return",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "When is the tax return lodgement deadline in Australia?",
      answer:
        "For individuals lodging their own tax return via myTax, the deadline is 31 October each year. If you engage a registered tax agent, your deadline automatically extends to 15 May the following year — but you must be registered with the agent before 31 October. Penalties for late lodgement start at $330 per 28-day period (up to $1,650).",
    },
    {
      question: "What work-related deductions can I claim without receipts?",
      answer:
        "The ATO allows claims of up to $300 in work-related expenses without receipts — but you must still be able to show how you calculated the amount, and the expenses must be genuine work costs. Above $300, receipts or bank statements are required. Note: the $300 is a receipt threshold, not a deduction cap — you can claim more with evidence.",
    },
    {
      question: "How do I claim working from home expenses?",
      answer:
        "There are two methods: (1) Fixed rate — 67 cents per work-from-home hour, covering running costs including electricity, internet, and phone. You need a diary or timesheet for at least 4 representative weeks. (2) Actual cost — calculate the real cost of each expense based on your work use percentage. The fixed rate is simpler; actual cost can produce a larger claim for high electricity users. You cannot claim occupancy expenses (rent or mortgage interest) unless your home is a place of business.",
    },
    {
      question: "Do I need to declare dividend income on my tax return?",
      answer:
        "Yes — all Australian dividend income, including franking credits, must be declared. Your broker or the company's share registry will send you a dividend statement. The ATO pre-fills this data from exchange reports, but you should check it's complete before lodging. Franking credits reduce the tax you owe — if your tax rate is lower than 30%, the excess franking credit may be refunded to you.",
    },
    {
      question: "How are capital gains taxed in Australia?",
      answer:
        "Capital gains from selling assets are included in your assessable income and taxed at your marginal rate. If you held the asset for more than 12 months, you receive a 50% CGT discount — only half the gain is taxable. Capital losses can only be used to offset capital gains (not other income). CGT events from shares, property, ETFs, and cryptocurrency all need to be reported in the relevant financial year's return.",
    },
    {
      question: "Is it worth using a tax agent for an investor's return?",
      answer:
        "Generally yes, if you have investment income, rental properties, CGT events, or work-related deductions above $300. The average ATO refund is around $2,800; a tax agent's fee is typically $200–$600 for an individual return. Their fee is tax-deductible (claimable the following year), and they often identify deductions that reduce your tax liability by more than their fee. For simple income-only returns with no investments, myTax is straightforward and free.",
    },
  ],
};
