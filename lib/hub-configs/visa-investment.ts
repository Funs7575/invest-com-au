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
      lever: "directory",
    },
  },

  serviceGrid: undefined,
  deepDives: undefined,
  faqs: [],

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
