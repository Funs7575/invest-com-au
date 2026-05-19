import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /insurance — consumed by the <HubPage> HOC.
 * Z-25 hub migration: replaces the legacy custom page pattern.
 * ASIC RG 244 compliance: general advice warning rendered by HubPage via
 * complianceKey "general_advice".
 */
export const insuranceHubConfig: HubConfig = {
  slug: "insurance",
  title: `Insurance Australia (${CURRENT_YEAR}) — Life, Income Protection, Health & Home Compared`,
  metaDescription:
    "Compare all types of personal insurance in Australia: life insurance, income protection, trauma, TPD, health insurance, and home & contents. Independent guides, comparisons, and adviser connections.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: "Insurance Hub",
    subhead:
      "The right insurance protects your income, your family, and your assets. The wrong cover — or none at all — can cost far more than any premium. Independent guides to every type of personal insurance in Australia.",
    stats: [
      {
        label: "Australians underinsured for life cover",
        value: "95%",
        dataAsOf: "2023-06-30",
        stalesAt: "2026-06-30",
        source:
          "https://www.ricewarner.com/life-insurance-gap-study/",
      },
      {
        label: "Income protection covers (of income)",
        value: "up to 70%",
        dataAsOf: "2024-01-01",
        stalesAt: "2027-01-01",
        source: "https://www.moneysmart.gov.au/insurance/income-protection-insurance",
      },
      {
        label: "Medicare Levy Surcharge threshold (singles)",
        value: "$93,000",
        dataAsOf: "2024-07-01",
        stalesAt: "2027-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge",
      },
    ],
    primaryCta: {
      label: "Find an Insurance Broker",
      href: "/advisors/insurance-brokers",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Insurance Quiz",
      href: "/insurance/quiz",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Life Insurance",
      icon: "shield",
      description:
        "Pays a lump sum to your beneficiaries if you die or are diagnosed with a terminal illness. Essential for anyone with dependants or a mortgage. Average cover gap exceeds $500,000.",
      href: "/insurance/life",
      cta: "Life Insurance Guide",
    },
    {
      title: "Income Protection",
      icon: "briefcase",
      description:
        "Replaces up to 70% of your income if you're unable to work due to illness or injury. The most valuable cover for working Australians — and the only insurance premium that's tax-deductible.",
      href: "/insurance/income-protection",
      cta: "Income Protection Guide",
    },
    {
      title: "Health Insurance",
      icon: "activity",
      description:
        "Covers private hospital treatment and extras (dental, optical, physio). Reduces the Medicare Levy Surcharge for singles earning above $93,000. Hospital cover from ~$100/month.",
      href: "/insurance/health",
      cta: "Health Insurance Guide",
    },
    {
      title: "Home & Contents",
      icon: "home",
      description:
        "Protects your home building against damage and your belongings against theft, fire, and accidental damage. Essential for homeowners; contents-only for renters. 1 in 8 homes underinsured.",
      href: "/insurance/home-contents",
      cta: "Home & Contents Guide",
    },
    {
      title: "TPD Insurance",
      icon: "alert-circle",
      description:
        "Total and Permanent Disability insurance pays a lump sum if you become permanently unable to work. Often held inside super — but 'own occupation' definitions require outside-super ownership.",
      href: "/insurance/tpd",
      cta: "TPD Guide",
    },
    {
      title: "Trauma Insurance",
      icon: "heart",
      description:
        "Pays a lump sum if you're diagnosed with a specified serious illness (cancer, heart attack, stroke). Provides financial breathing room during recovery — 60+ conditions typically covered.",
      href: "/insurance/trauma",
      cta: "Trauma Insurance Guide",
    },
  ],

  deepDives: [
    {
      title: "How to Compare Insurance Policies — What Really Matters",
      excerpt:
        "The lowest premium doesn't mean the best policy. This guide breaks down the key factors for each insurance type: benefit period, waiting period, definition of disability, and agreed vs indemnity value.",
      href: "/insurance/income-protection",
      readingTimeMinutes: 8,
    },
    {
      title: "Insurance Inside vs Outside Super — The Real Trade-off",
      excerpt:
        "Most Australians hold insurance inside super by default. Here's when that's fine, when it's not, and why most advisers recommend income protection outside super with life and TPD inside.",
      href: "/insurance/life",
      readingTimeMinutes: 6,
    },
    {
      title: "TPD 'Own Occupation' vs 'Any Occupation' Explained",
      excerpt:
        "'Own occupation' pays if you can no longer perform your specific job. 'Any occupation' is far more restrictive. Since 2014 tax changes, own occupation TPD must be held outside super.",
      href: "/insurance/tpd",
      readingTimeMinutes: 5,
    },
    {
      title: `Medicare Levy Surcharge Guide (${CURRENT_YEAR})`,
      excerpt:
        "If you earn above $93,000 as a single (or $186,000 as a family) and have no private hospital cover, you pay an extra 1–1.5% in tax. Here's how to calculate whether hospital cover saves you money.",
      href: "/insurance/health",
      readingTimeMinutes: 4,
    },
  ],

  calculators: [
    { slug: "insurance-needs-calculator", label: "Insurance Needs Calculator" },
  ],

  quizzes: [
    {
      slug: "insurance/quiz",
      label: "What insurance do I need?",
      routesTo: "insurance",
    },
  ],

  leadMagnets: [
    {
      slug: "insurance-cover-checklist",
      title: "Insurance Cover Checklist",
      format: "pdf",
      listKey: "insurance-hub",
    },
  ],

  newsletter: {
    listKey: "insurance-hub",
    cadence: "monthly",
  },

  leadQueue: { kind: "general", topic: "insurance" },

  relatedHubs: ["super", "smsf", "redundancy", "first-home-buyer"],

  articleFilters: {
    category: "insurance",
    tags: [
      "life-insurance",
      "income-protection",
      "health-insurance",
      "tpd",
      "trauma",
    ],
  },

  primaryKeywords: [
    "life insurance australia",
    "income protection insurance",
    "health insurance australia",
    "insurance comparison australia",
    "tpd insurance",
    "trauma insurance",
    "home and contents insurance",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "What insurance do I actually need in Australia?",
      answer:
        "The most universally needed insurance for working Australians is income protection — it replaces up to 70% of your income if you can't work. If you have dependants or a mortgage, life insurance is also essential. TPD is valuable as a lump-sum backup for permanent disability. Health insurance depends on your income (the Medicare Levy Surcharge applies above $93,000 for singles).",
    },
    {
      question: "Should I get insurance through my super fund?",
      answer:
        "Holding life insurance and TPD through super uses pre-tax dollars (super contributions), which reduces the cash-flow cost. However, income protection inside super has stricter disability definitions, coverage can lapse if your super balance runs low, and ownership through super can complicate beneficiary arrangements. Most financial advisers recommend holding at least income protection outside super for employed Australians.",
    },
    {
      question: "Is life insurance tax-deductible?",
      answer:
        "Life insurance premiums held outside super are generally NOT tax-deductible for individuals. Income protection premiums held outside super ARE tax-deductible against your assessable income. Premiums paid from inside your super account are treated differently. TPD premiums inside super are partially deductible to the fund.",
    },
    {
      question: "What is the Medicare Levy Surcharge?",
      answer:
        "The Medicare Levy Surcharge (MLS) is an additional 1–1.5% tax on singles earning above $93,000 and families above $186,000 who don't hold a private hospital cover policy. Buying a basic private hospital policy (from around $100/month) eliminates the MLS — making health insurance a financial decision for higher earners.",
    },
    {
      question: "How much life insurance do I need?",
      answer:
        "A common guideline is 10x your annual salary, but a more precise approach considers your outstanding mortgage balance, years of income replacement needed, future education costs for children, and existing super or TPD cover. An insurance calculator or adviser can produce a personalised figure.",
    },
    {
      question: "What is the difference between TPD 'own occupation' and 'any occupation'?",
      answer:
        "'Own occupation' pays if you can no longer perform your specific job. 'Any occupation' only pays if you can't perform any work suited to your education and experience. 'Own occupation' provides much better protection — for example, a surgeon who loses a hand would receive TPD under own occupation but might be denied under any occupation. Own occupation is generally required to be held outside super (since 2014 tax changes).",
    },
  ],
};
