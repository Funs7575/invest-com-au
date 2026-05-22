import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /startup/grants (canonical) — /grants 301-redirects here.
 * Consumed by the <HubPage> HOC (W-12). Extracted as part of W-14 migration.
 * See docs/audits/REMEDIATION_QUEUE.md W-14.
 */
export const grantsHubConfig: HubConfig = {
  slug: "grants",
  parentSlug: "startup",
  title: `Australian Business Grants & Non-Dilutive Funding ${CURRENT_YEAR} | Invest.com.au`,
  metaDescription:
    "Access $400M+ in Australian government grants. R&D Tax Incentive, EMDG, Industry Growth Program, NSW MVP Ventures and state programs — without giving up equity.",
  audiences: ["founder"],
  complianceKey: "grants",

  hero: {
    headline: `Australian Business Grants & Non-Dilutive Funding ${CURRENT_YEAR}`,
    subhead:
      "Access $400M+ in available government grants. R&D Tax Incentive, EMDG, Industry Growth Program and state programs — without giving up equity.",
    stats: [
      {
        label: "Cash back · R&D Tax Incentive",
        value: "43.5%",
        subtitle: "Companies < $20M turnover",
        dataAsOf: "2025-07-01",
        stalesAt: "2027-06-30",
        source: "https://business.gov.au/grants-and-programs/research-and-development-tax-incentive",
      },
      {
        label: "EMDG · per year",
        value: "$80K",
        subtitle: "Export marketing reimbursement",
        dataAsOf: "2025-07-01",
        stalesAt: "2027-06-30",
        source: "https://www.austrade.gov.au/en/emdg",
      },
      {
        label: "Industry Growth Program",
        value: "$5M",
        subtitle: "Up to, in matched funding",
        dataAsOf: "2025-07-01",
        stalesAt: "2027-06-30",
        source: "https://business.gov.au/grants-and-programs/industry-growth-program",
      },
      {
        label: "FY2025 R&D deadline",
        value: "30 Apr",
        subtitle: "Register with AusIndustry",
        dataAsOf: "2026-01-01",
        stalesAt: "2027-04-30",
      },
    ],
    primaryCta: {
      label: "Check My Eligibility",
      href: "/grants/eligibility-quiz",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "R&D Tax Incentive",
      href: "/grants/rd-tax-incentive",
      lever: "affiliate_cpa",
    },
  },

  // Grant cards have custom badge/tone not fitting ServiceCard; rendered
  // as bespoke JSX in the page and passed via the serviceGrid slot prop.
  serviceGrid: undefined,

  deepDives: undefined,

  faqs: [
    {
      question: "What is the R&D Tax Incentive and who qualifies?",
      answer:
        "The R&D Tax Incentive is a federal program administered by AusIndustry and ATO offering a 43.5% refundable tax offset for eligible companies with aggregated turnover under $20M, or a 38.5% non-refundable offset for larger companies. Eligible expenditure includes salary costs for R&D activities, contractor fees, and overheads. Companies must register annually with AusIndustry before lodging their tax return. The activity must involve genuine experimental activities with technical uncertainty — mere routine problem-solving doesn't qualify.",
    },
    {
      question: "What is the EMDG grant and how much can I receive?",
      answer:
        "The Export Market Development Grant (EMDG) reimburses up to 50% of eligible overseas marketing expenditure to help Australian SMEs grow their export revenues. Eligible spend includes trade show attendance, overseas representatives, foreign-language marketing materials, and overseas market research. Maximum reimbursement is $80,000 per year. Companies must have ABN-registered Australian-sourced products or services, annual Australian income under $50M, and export income under $500K in the grant year (first application).",
    },
    {
      question: "Can I claim both the R&D Tax Incentive and government grants?",
      answer:
        "It depends on the grant. If a government grant directly funds the same R&D activity, you must reduce your eligible R&D expenditure by the grant amount received — double-dipping is prohibited. Grants that fund activities outside the claimed R&D scope (e.g., EMDG for marketing vs R&D for product development) can generally both be claimed. Always disclose grant funding on your R&D registration — the ATO cross-checks with AusIndustry. A grant specialist can identify which claims interact.",
    },
    {
      question: "What is the Industry Growth Program?",
      answer:
        "The Industry Growth Program is a federal program offering up to $5M in matched funding for early-stage and growth-stage SMEs commercialising new technology in priority sectors (clean energy, resources, food and agriculture, medical science, advanced manufacturing, and defence). Applications are assessed competitively. The program replaced the Accelerating Commercialisation grant in 2023. Projects must have a commercialisation plan and demonstrate market readiness beyond pure research.",
    },
    {
      question: "Are there state government grants available for Australian businesses?",
      answer:
        "Yes. All Australian states and territories offer business grants, loan programs, and co-investment schemes, particularly for export, innovation, digital transformation, and regional investment. Key programs include NSW MVP Ventures, VIC Innovation Quarter (IQ), QLD Export and Investment Queensland, and SA Venture Program. State grants typically have smaller pools ($50K–$1M) and faster turnaround than federal programs. Most programs require matching private investment of 1:1 to 3:1 and exclude companies that have previously claimed the same program.",
    },
  ],

  leadQueue: { kind: "grants", programSlugs: ["rd-tax-incentive", "emdg", "industry-growth-program"] },

  relatedHubs: ["startup", "negative-gearing", "smsf"],

  articleFilters: {
    slugs: [
      "rd-tax-incentive-australia-guide",
      "emdg-grant-australia-guide",
      "industry-growth-program-guide",
      "australian-government-grants-complete-guide",
    ],
  },

  primaryKeywords: [
    "Australian business grants",
    "R&D tax incentive",
    "EMDG",
    "Industry Growth Program",
    "government grants Australia",
    "non-dilutive funding",
  ],
  schemaTypes: ["FinancialService", "WebPage"],
};
