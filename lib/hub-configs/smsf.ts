import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /smsf — consumed by the <HubPage> HOC.
 * Extracted from app/smsf/page.tsx as part of W-13 (hub foundation stream).
 * See docs/audits/REMEDIATION_QUEUE.md W-13.
 */
export const smsfHubConfig: HubConfig = {
  slug: "smsf",
  title: `SMSF Investment & Services Hub (${CURRENT_YEAR}) — Setup, Audit, Property & Strategy`,
  metaDescription:
    "Australia's SMSF services hub. Find ASIC-approved SMSF auditors, SMSF specialist advisers, property-in-SMSF accountants, and investment strategy help. 600,000+ Australian SMSFs; $900B+ in assets.",
  audiences: ["trustee", "retiree"],
  complianceKey: "smsf",

  hero: {
    headline: "SMSF Investment & Services Hub",
    subhead:
      "600,000+ Australians run their own Self-Managed Super Fund, collectively managing $900B+ in assets. Find ASIC-approved SMSF auditors, AFSL-licensed specialist advisers, and the experts who make property-in-SMSF, LRBA structuring, and pension-phase transitions work.",
    stats: [
      {
        label: "SMSFs in Australia",
        value: "600,000",
        dataAsOf: "2024-06-30",
        stalesAt: "2025-06-30",
        source:
          "https://www.ato.gov.au/about-ato/research-and-statistics/in-detail/super-statistics/smsf/self-managed-super-fund-statistical-report/",
      },
      {
        label: "Assets under management",
        value: "$900B",
        dataAsOf: "2024-06-30",
        stalesAt: "2025-06-30",
        source:
          "https://www.ato.gov.au/about-ato/research-and-statistics/in-detail/super-statistics/smsf/self-managed-super-fund-statistical-report/",
      },
      {
        label: "Australians 55+ with an SMSF",
        value: "1 in 3",
        dataAsOf: "2024-06-30",
        stalesAt: "2025-06-30",
      },
    ],
    primaryCta: {
      label: "Find an SMSF Specialist",
      href: "/quiz?vertical=smsf",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Setup & Administration",
      icon: "building",
      description:
        "SMSF establishment, trust deed, ongoing administration, and annual lodgement. Typical setup $1,000–$3,000; ongoing $1,500–$5,000/year.",
      href: "/advisors/smsf-specialists",
      cta: "Find SMSF Specialists",
    },
    {
      title: "Annual Auditing",
      icon: "shield-check",
      description:
        "Every SMSF must be audited annually by an ASIC-approved auditor with an SMSF Auditor Number (SAN). Simple audits $300–$700; complex $800–$1,500+.",
      href: "/smsf/auditors",
      cta: "Find SMSF Auditors",
    },
    {
      title: "Property in SMSF",
      icon: "home",
      description:
        "LRBA borrowing structures, in-specie transfers, direct property purchase, commercial-property-in-SMSF strategy. LRBA structuring $2,000–$5,000.",
      href: "/advisors/smsf-specialists?focus=property",
      cta: "Find SMSF Property Experts",
    },
    {
      title: "Investment Strategy",
      icon: "trending-up",
      description:
        "Written investment strategy review, asset allocation, concentration management, pension-phase transition, and death benefit nominations.",
      href: "/advisors/smsf-specialists",
      cta: "Find Strategy Advisers",
    },
  ],

  deepDives: [
    {
      title: "How to Set Up an SMSF",
      excerpt:
        "7-step setup, $800–$3,500 cost breakdown, individual vs corporate trustee.",
      href: "/smsf/setup",
    },
    {
      title: "Crypto in Your SMSF",
      excerpt:
        "ATO rules, the 15% (or 0%) tax outcome and how to actually buy without breaching the sole-purpose test.",
      href: "/smsf/crypto",
    },
    {
      title: "SMSF Property Investment",
      excerpt:
        "LRBA borrowing, residential vs commercial, costs and the $300K minimum balance.",
      href: "/smsf/property",
    },
    {
      title: "SMSF Investment Strategy",
      excerpt:
        "The 5 mandatory elements, three model portfolios and Division 296 considerations.",
      href: "/smsf/investment-strategy",
    },
    {
      title: "SMSF Compliance Checklist",
      excerpt:
        "12 setup, ongoing and review obligations — interactive tracker.",
      href: "/smsf/checklist",
    },
    {
      title: "SMSF Cost Calculator",
      excerpt:
        "Project SMSF setup and ongoing costs against a retail super fund — see when SMSF breaks even.",
      href: "/smsf-calculator",
    },
  ],

  faqs: [],

  leadQueue: { kind: "smsf", advisorType: "smsf_specialist" },

  relatedHubs: ["grants", "super", "negative-gearing"],

  articleFilters: {
    category: "smsf",
    tags: ["smsf_accountant", "smsf_auditor", "smsf_specialist"],
  },

  primaryKeywords: [
    "SMSF",
    "self managed super fund",
    "SMSF auditor",
    "SMSF specialist",
    "SMSF setup",
    "property in SMSF",
  ],
  schemaTypes: ["FinancialService", "WebPage"],
};
