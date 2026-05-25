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
      answer:
        "The SIV (subclass 188A) was closed on 1 July 2024. The primary pathway for high-net-worth individuals now is the National Innovation Visa (subclass 858), which targets innovators, investors, and exceptional talent. Unlike the SIV, the NIV does not require a minimum investment amount — it focuses on track record, innovation potential, and economic contribution. Some existing SIV holders can still progress to the permanent subclass 888 visa if they met the investment conditions before closure.",
    },
    {
      question: "What is the National Innovation Visa (NIV) in Australia?",
      answer:
        "The National Innovation Visa (subclass 858) is a permanent visa for individuals with exceptional achievement in business, research, the arts, sports, or as investors. For investors, the NIV assesses track record of successful investment activity, net business and personal assets, and ability to contribute to Australia's economy and innovation ecosystem. There is no fixed minimum investment — applicants must demonstrate a compelling case. The NIV replaced the Distinguished Talent visa in 2024.",
    },
    {
      question: "Can I invest in Australian shares on a temporary visa?",
      answer:
        "Yes. Most temporary visa holders can invest in Australian shares, ETFs, and managed funds without restriction. Buying property is more restricted — temporary residents need FIRB approval to buy one established dwelling as a principal place of residence, and from 1 April 2025 to 31 March 2027, temporary residents are banned from purchasing established dwellings. New dwellings and off-the-plan purchases may still be available with FIRB approval.",
    },
    {
      question: "Do I pay Australian tax on investments made on a temporary visa?",
      answer:
        "Once you meet the Australian tax residency tests (including the 183-day rule), you are taxed as a resident on worldwide income — even on a temporary visa. If you don't meet residency tests, you're taxed as a non-resident at 32.5% from the first dollar with no tax-free threshold. Non-residents pay withholding tax on Australian dividends (30%, or a reduced rate if a DTA applies). Seek tax advice before assuming your visa class determines your tax status.",
    },
    {
      question: "What is a migration agent and when do I need one?",
      answer:
        "A registered migration agent (RMA) is a professional licensed by the Office of the Migration Agents Registration Authority (OMARA) to provide visa advice and assistance. You need one for complex applications including investor visas, employer-sponsored visas, and character/health waiver cases. RMAs charge $2,000–$10,000+ depending on visa complexity. Using an unregistered migration agent is illegal. Verify your agent's registration at the OMARA register before engaging.",
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
  schemaTypes: ["FAQPage", "WebPage"],
};
