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

  faqs: [],

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
