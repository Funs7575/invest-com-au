import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";
import { firstHomeBuyerBrokerDirectoryUrl } from "@/lib/first-home-buyer/broker-handoff";

/**
 * Hub config for /first-home-buyer — consumed by the <HubPage> HOC.
 * Z-23 (co-shipped with BB-08 FHSS calculator).
 */
export const firstHomeBuyerHubConfig: HubConfig = {
  slug: "first-home-buyer",
  title: `First Home Buyer Hub (${CURRENT_YEAR}) — FHSS, Grants, Deposits & Mortgages`,
  metaDescription:
    "Australia's first home buyer guide. Use FHSS to save your deposit inside super at 15% tax, compare state grants (up to $30,000), check stamp duty concessions, and connect with a mortgage broker.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: "First Home Buyer Hub",
    subhead:
      "Save your deposit faster with the First Home Super Saver Scheme (FHSS), access federal and state grants up to $30,000, and compare mortgage options. Australia's housing market is tough — these tools and specialists can help.",
    stats: [
      {
        label: "Median deposit saved via FHSS",
        value: "$42,500",
        dataAsOf: "2024-06-30",
        stalesAt: "2025-06-30",
        source: "https://www.ato.gov.au/about-ato/research-and-statistics/in-detail/super-statistics/",
      },
      {
        label: "Max FHSS release",
        value: "$50,000",
        dataAsOf: "2024-07-01",
        stalesAt: "2027-07-01",
        source: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/first-home-super-saver-scheme",
      },
      {
        label: "First Home Guarantee places",
        value: "35,000",
        dataAsOf: "2024-07-01",
        stalesAt: "2025-06-30",
        source: "https://www.nhfic.gov.au/what-we-do/fhbg",
      },
    ],
    primaryCta: {
      label: "Find a Mortgage Broker",
      href: firstHomeBuyerBrokerDirectoryUrl(),
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "FHSS Calculator",
      href: "/tools/fhss-calculator",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "FHSS Scheme",
      icon: "shield",
      description:
        "Save up to $15,000/year inside super at 15% tax. Withdraw up to $50,000 as your deposit. Concessional contributions give the biggest tax boost for income earners above $45k.",
      href: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/first-home-super-saver-scheme",
      cta: "ATO FHSS Guide",
    },
    {
      title: "First Home Guarantee",
      icon: "home",
      description:
        "Buy with a 5% deposit — no LMI. The government guarantees up to 15% of the purchase price. 35,000 places per year. Income caps apply ($125k single / $200k couple).",
      href: "https://www.nhfic.gov.au/what-we-do/fhbg",
      cta: "Check Eligibility",
    },
    {
      title: "State Grants",
      icon: "gift",
      description:
        "Most states offer grants of $10,000–$30,000 for new builds. NSW, VIC, QLD, WA, SA, TAS, NT and ACT all have separate first home owner grant (FHOG) programs.",
      href: "/tools/state-grants-calculator",
      cta: "Calculate Your State Grant",
    },
    {
      title: "Stamp Duty Concessions",
      icon: "percent",
      description:
        "Several states exempt or discount stamp duty for first home buyers. NSW exemption under $800k; VIC under $600k; QLD under $700k. Can save $15,000–$30,000 upfront.",
      href: "/tools/stamp-duty-calculator",
      cta: "Calculate Stamp Duty",
    },
    {
      title: "Mortgage Brokers",
      icon: "briefcase",
      description:
        "A specialist first home buyer broker compares 30+ lenders including those using LMI waivers, 95% LVR products, and guarantor loans. Free service — paid by the lender.",
      href: firstHomeBuyerBrokerDirectoryUrl(),
      cta: "Find a Broker",
    },
    {
      title: "Deposit Bond",
      icon: "lock",
      description:
        "Waiting for FHSS release takes 20+ business days. A deposit bond (from $100) covers the 10% deposit at exchange while your ATO release processes.",
      href: firstHomeBuyerBrokerDirectoryUrl(),
      cta: "Talk to a Broker",
    },
  ],

  deepDives: [
    {
      title: "FHSS: How to Maximise Your $50,000",
      excerpt:
        "Step-by-step guide to making voluntary contributions, requesting your determination, and coordinating the release with your settlement date.",
      href: "/first-home-buyer/fhss-guide",
      readingTimeMinutes: 8,
    },
    {
      title: "First Home Guarantee: What the Fine Print Says",
      excerpt:
        "Income caps, property price caps by state, eligible lenders, and how the guarantee interacts with FHSS withdrawals.",
      href: "/first-home-buyer/first-home-guarantee",
      readingTimeMinutes: 6,
    },
    {
      title: "How Much Deposit Do You Actually Need?",
      excerpt:
        "20% avoids LMI. 5% + guarantee avoids LMI differently. Splitting your FHSS + savings + grants — worked examples.",
      href: "/first-home-buyer/deposit-guide",
      readingTimeMinutes: 7,
    },
    {
      title: `Stamp Duty by State (${CURRENT_YEAR} Rates)`,
      excerpt:
        "Every state's current first home buyer stamp duty concession, with examples and application timelines.",
      href: "/first-home-buyer/stamp-duty",
      readingTimeMinutes: 5,
    },
  ],

  calculators: [
    { slug: "fhss-calculator", label: "FHSS Deposit Calculator" },
    { slug: "mortgage-calculator", label: "Mortgage Repayment Calculator" },
    { slug: "savings-calculator", label: "Deposit Savings Calculator" },
  ],

  quizzes: [
    {
      slug: "first-home-buyer/quiz",
      label: "Am I ready to buy?",
      routesTo: "general",
    },
  ],

  leadMagnets: [
    { slug: "first-home-buyer-guide", title: "First Home Buyer Action Plan", format: "pdf", listKey: "first-home-buyer-hub" },
  ],

  newsletter: {
    listKey: "first-home-buyer-hub",
    cadence: "weekly",
  },

  leadQueue: { kind: "general", topic: "first-home-buyer" },

  relatedHubs: ["property", "super", "smsf", "insurance"],

  articleFilters: {
    category: "first-home-buyer",
    tags: ["fhss", "first-home-guarantee", "mortgage", "deposit"],
  },

  primaryKeywords: [
    "first home buyer australia",
    "fhss scheme",
    "first home super saver",
    "first home guarantee",
    "first home owner grant",
    "how to buy first home australia",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "What is the First Home Super Saver Scheme (FHSS)?",
      answer:
        "The FHSS scheme lets first home buyers save for a deposit inside their superannuation fund, taking advantage of the lower 15% contributions tax. You can contribute up to $15,000 per year (max $50,000 total across all years) and withdraw those savings — plus associated earnings — as your home deposit.",
    },
    {
      question: "How much can I save via FHSS?",
      answer:
        "You can contribute up to $15,000 per financial year and withdraw a maximum of $50,000 in total. The key benefit is tax: concessional (pre-tax) contributions are taxed at 15% going in, vs your marginal rate of up to 47%. When withdrawn, 85% of concessional amounts are assessed at your marginal rate minus a 30% tax offset. For most Australians on 32.5%+ marginal rates, the net saving is several thousand dollars.",
    },
    {
      question: "What is the First Home Guarantee?",
      answer:
        "The First Home Guarantee (FHBG) is a federal scheme allowing eligible first home buyers to purchase with a 5% deposit, with the government guaranteeing up to 15% of the property price — so you avoid Lender's Mortgage Insurance (LMI). There are 35,000 places per year. Income caps are $125,000 for singles and $200,000 for couples.",
    },
    {
      question: "Can I combine FHSS with the First Home Guarantee?",
      answer:
        "Yes. You can use FHSS savings as part of your 5% deposit and still access the First Home Guarantee to avoid LMI. Your FHSS withdrawal plus other savings need to total at least 5% of the purchase price. Work with a mortgage broker to structure the timing, as FHSS releases take 20+ business days.",
    },
    {
      question: "What first home buyer grants are available in Australia?",
      answer:
        "Each state and territory offers different grants. NSW: $10,000 for new homes under $600k (construction) or $750k (land + house). VIC: $10,000 for new builds outside Melbourne. QLD: $30,000 First Home Owner Grant for new builds. WA: $10,000 for new homes. SA: $15,000 for new homes. TAS: $30,000. NT: $10,000. Check your state revenue office for current eligibility criteria.",
    },
    {
      question: "What stamp duty concessions are available for first home buyers?",
      answer: `Stamp duty concessions vary by state. NSW: full exemption for homes under $800,000; concession up to $1 million. VIC: full exemption under $600,000; scaled concession to $750,000. QLD: full concession under $700,000 for homes or $350,000 for land. Each state has different criteria around whether you must occupy the property and for how long.`,
    },
  ],
};
