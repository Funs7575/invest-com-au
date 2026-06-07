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
      question: "What is the R&D Tax Incentive and who can claim it?",
      answer: `The R&D Tax Incentive (RDTI) is the Australian Government's largest business grant program — a tax offset for eligible research and development activities. Companies with turnover under $20M can claim a 43.5% refundable tax offset (cash back even in a loss year). Companies with $20M+ turnover claim a 38.5% non-refundable offset. Eligible activities must involve genuine technical risk, be aimed at generating new knowledge, and be conducted in Australia. You must register with AusIndustry by 30 April following the financial year. Common claimants: software companies, manufacturers, biotech, agri-tech. The minimum claim is generally worth pursuing above ~$50,000 in eligible R&D expenditure.`,
    },
    {
      question: "Can I claim both the R&D Tax Incentive and the EMDG?",
      answer: "Yes — the RDTI and EMDG are complementary programs. A company can claim both in the same financial year provided it meets the eligibility criteria for each independently. The RDTI is for domestic R&D expenditure; the EMDG (Export Market Development Grant) is for overseas marketing costs. EMDG reimbursements are treated as assessable income and cannot themselves be claimed as R&D expenditure. There is no stacking prohibition, but ensure you clearly separate the cost categories in your records.",
    },
    {
      question: "How do I apply for the Industry Growth Program?",
      answer: "The Industry Growth Program (IGP) provides matched funding of up to $5M per project for small-to-medium manufacturers and service businesses in priority areas (advanced manufacturing, energy, food, etc.). Applications are competitive — you submit a project application through business.gov.au. The program assesses projects on market viability, capability, economic impact, and contribution to Australian priorities. Engage a grants advisor early: the IGP is complex, competitive, and requires a detailed project plan, financial projections, and evidence of industry partnerships. Budget 6–12 weeks for preparation.",
    },
    {
      question: "Do I need a grants consultant to apply for Australian government grants?",
      answer: "Not for simpler programs (EMDG, small state grants) — but for R&D Tax Incentive and Industry Growth Program, a specialist consultant significantly improves outcomes. RDTI requires a detailed technical description mapping activities to the eligibility criteria, which tax accountants without R&D specialisation often miss. Consultants typically charge 10–15% of the claim on a success-fee basis, or fixed fees for smaller claims. Choose consultants who are registered tax agents (for RDTI) and have sector-specific experience. Beware of firms promising to maximise claims by bundling ineligible activities — RDTI audits by AusIndustry are increasing.",
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
