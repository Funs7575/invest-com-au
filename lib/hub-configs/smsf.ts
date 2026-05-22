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

  faqs: [
    {
      question: "What is an SMSF and is it worth setting one up?",
      answer: "A self-managed super fund (SMSF) is a private superannuation fund you run yourself, regulated by the ATO rather than APRA. It can be worthwhile if you have at least $200,000–$250,000 in super (the point where annual administration costs — typically $2,000–$5,000 — become a small percentage of your balance), want control over investment choices, or want to buy direct property or invest in assets not available in retail funds. Below that threshold, fees typically erode returns compared to a retail or industry fund.",
    },
    {
      question: "How much does an SMSF cost per year in Australia?",
      answer: "Ongoing SMSF costs typically total $2,000–$7,000 per year, including: ATO annual supervisory levy ($259 per year), independent audit ($300–$600), annual accounting and tax return ($1,500–$4,000), and administration/software ($500–$2,000). Investment costs (brokerage, property management) are additional. Low-cost SMSF administrators can bring the base cost below $2,000 for simple, mostly-ETF funds; complex funds with property or multiple assets sit at the higher end.",
    },
    {
      question: "How many members can an SMSF have in Australia?",
      answer: "Since 1 July 2021, an SMSF can have up to six members. All members must be either individual trustees (each member is a trustee) or directors of a corporate trustee company. Couples commonly set up a two-member SMSF; families can now include adult children. A single-member SMSF is permitted but requires either a corporate trustee or a second individual trustee who is a family member or employer.",
    },
    {
      question: "What can an SMSF invest in?",
      answer: "SMSFs can invest in Australian and international shares, ETFs, managed funds, direct property (residential and commercial), bonds, term deposits, gold and other commodities, private equity and unlisted securities. All investments must satisfy the sole purpose test (providing retirement benefits), the investment strategy, and diversification requirements. An SMSF cannot acquire assets from related parties except for business real property and listed securities at market value. Personal use assets like artwork, holiday homes, and collectibles are subject to strict storage and use rules.",
    },
    {
      question: "Can I use my SMSF to buy a property?",
      answer: "Yes — an SMSF can buy residential or commercial investment property, provided it passes the sole purpose test (purely for retirement), is not purchased from a related party (for residential), and is not personally used by any member or related party. If the SMSF needs to borrow, it must use a Limited Recourse Borrowing Arrangement (LRBA). Commercial property can be leased back to a member's business at market rent — a popular strategy for business owners building equity within their super.",
    },
    {
      question: "What are the annual compliance obligations for an SMSF?",
      answer: "Each year, an SMSF must: lodge an SMSF annual return with the ATO (reporting income, contributions, assets, and member balances); have financial statements and member accounts audited by a registered SMSF auditor; ensure all trustees complete the ATO's SMSF trustee declaration; keep minutes of trustee decisions; and maintain and review the investment strategy. Failure to comply can result in the fund being declared non-complying — a penalty tax of 45% on the fund's entire taxable assets.",
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
  schemaTypes: ["FAQPage", "FinancialService", "WebPage"],
};
