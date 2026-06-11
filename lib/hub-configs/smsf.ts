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
      href: "/get-matched?vertical=smsf",
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
    {
      title: "SMSF Borrowing (LRBA) — Complete Guide",
      excerpt:
        "How limited recourse borrowing works inside super, bare trust structure, ATO safe-harbour conditions, and the active LRBA lenders in Australia.",
      href: "/smsf/borrowing",
    },
    {
      title: "Winding Up an SMSF",
      excerpt:
        "7-step wind-up process, tax on asset sales and in-specie transfers, final ATO return obligations, and how to roll benefits to an APRA fund.",
      href: "/smsf/wind-up",
    },
  ],

  faqs: [
    {
      question: "Can I use my SMSF to buy property?",
      answer: "Yes — an SMSF can buy residential or commercial property. Residential property must satisfy the 'sole purpose test' (held for retirement benefit only) and cannot be used by members or relatives. Commercial property can be leased back to a related business at market rent, which is a common strategy for business owners. SMSF property purchases can use a Limited Recourse Borrowing Arrangement (LRBA) to borrow up to ~80% LVR, but the loan must be from a third-party lender or an arm's-length related-party loan at commercial rates. SMSF property is CHESS-free — the title is held by a bare trust during the loan period.",
    },
    {
      question: "What is the annual SMSF contribution limit?",
      answer: "For 2024–25: concessional (pre-tax) contributions cap is $30,000 per person. This includes employer SG (11.5%), salary sacrifice, and personal deductible contributions. Non-concessional (after-tax) contributions cap is $120,000 per person, with a bring-forward rule allowing up to $360,000 over 3 years if your Total Super Balance (TSB) is under $1.68M. Unused concessional cap amounts from the previous 5 years can be carried forward if your TSB was under $500,000. Exceeding the caps triggers additional tax charges.",
    },
    {
      question: "What are the running costs of an SMSF?",
      answer: "SMSF running costs typically include: annual audit ($500–$1,200 for independent audit); accounting and tax return ($1,500–$3,500 depending on complexity); ASIC registration and SMSF supervisory levy (~$388/yr); investment platform or brokerage fees; and any financial advice fees. Total annual administration costs for a simple SMSF range from $2,000–$5,000 per year. SMSFs only become cost-competitive with retail/industry super funds when the balance exceeds approximately $200,000–$300,000, because the fixed costs represent a smaller percentage of assets.",
    },
    {
      question: "What is pension phase in an SMSF and how does it reduce tax?",
      answer: "When an SMSF member meets a condition of release (typically retirement after age 60, or age 65 regardless), they can start an account-based pension. In pension phase, investment income and capital gains on assets supporting the pension are tax-free (0%), down from 15% in accumulation phase. If the fund has both accumulating and pension members, income must be apportioned. Transfer balance cap (TBC) limits total amounts that can be moved to pension phase — $1.9M for 2024–25 — any excess must stay in accumulation.",
    },
  ],

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
