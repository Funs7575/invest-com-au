import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

export const visaInvestmentHubConfig: HubConfig = {
  slug: "visa-investment",
  title: `Investing in Australia: Visa & Migration Pathways ${CURRENT_YEAR} | Invest.com.au`,
  metaDescription:
    "The SIV closed in 2024. The current pathways for investors and entrepreneurs: National Innovation Visa (858), Employer Sponsored 482/186, state nomination — and what existing SIV holders need to know.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: `Investing in Australia: Visa & Migration Pathways ${CURRENT_YEAR}`,
    subhead:
      "The visa landscape changed structurally in 2024. Here's the current toolkit for investors and entrepreneurs looking to live in Australia.",
    primaryCta: {
      label: "Get matched with a specialist",
      href: "/advisors/migration-agents",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Migration agent directory",
      href: "/advisors/migration-agents",
      lever: "listings",
    },
  },

  serviceGrid: undefined,
  deepDives: undefined,
  faqs: [
    {
      question: "What replaced the Significant Investor Visa (SIV) in Australia?",
      answer: "The Significant Investor Visa (subclass 188C) was closed to new applicants on 1 July 2024. The primary replacement pathways are: (1) National Innovation Visa (subclass 858) — for distinguished talent in business, with no investment threshold but a high bar for demonstrated achievement; (2) Global Talent Independent Program (GTI) — for globally recognised talent in priority sectors; (3) Business Innovation and Investment stream (subclass 188A/B) — requires an Australian state/territory nomination and either a business or investor track. Existing SIV holders can continue on their current visa pathway. The change reflects a shift from passive capital investment toward active business participation.",
    },
    {
      question: "Can I invest in Australian property as part of a visa pathway?",
      answer: "Property investment alone does not typically qualify for a business or investor visa. The Business Innovation and Investment visa (subclass 188) requires investment in complying investments or a business, not purely real estate. Foreign non-residents (including those on temporary visas) require FIRB approval to purchase established residential property and generally cannot buy existing homes. New residential property and commercial property is more accessible. SIV holders who have achieved PR can buy property without FIRB restrictions. Always seek immigration legal advice before structuring investments around a visa pathway.",
    },
    {
      question: "Do I need to live in Australia to invest there?",
      answer: "No. Non-residents and foreign nationals can invest in Australian shares through an overseas brokerage or domestic broker (subject to AML/KYC requirements), managed funds, and — with FIRB approval — real estate. Capital gains from Australian assets (particularly real estate) are subject to Australian CGT regardless of residence, and the 50% CGT discount was removed for non-residents in 2012. Dividends from Australian shares are subject to withholding tax at 30% (or lower treaty rates). For significant asset deployment, engaging a cross-border tax advisor is important.",
    },
    {
      question: "What is the Global Talent Independent (GTI) program?",
      answer: "The Global Talent Independent (GTI) program provides a fast-tracked permanent residency pathway for individuals with distinguished records in priority sectors: AgTech, Space & Advanced Manufacturing, FinTech, Energy & Mining Technology, MedTech, Quantum IT, Cybersecurity, and others. There is no investment threshold — the criterion is demonstrated global recognition and talent in the field. Applications are assessed by a 'distinguished talent panel'. Processing times are typically 2–6 months for endorsed applicants. GTI does not require state/territory nomination, unlike many other skilled visa streams.",
    },
  ],

  leadQueue: { kind: "general", topic: "visa-investment" },

  relatedHubs: ["foreign-investment", "smsf"],

  articleFilters: {
    slugs: [
      "australia-national-innovation-visa-guide",
      "siv-closure-australia-what-investors-need-to-know",
    ],
  },

  primaryKeywords: [
    "australia investor visa",
    "national innovation visa 858",
    "SIV replacement australia",
    "investing in australia visa",
  ],
  schemaTypes: ["WebPage"],
};
