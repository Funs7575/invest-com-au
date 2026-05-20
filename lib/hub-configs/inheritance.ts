import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

export const inheritanceHubConfig: HubConfig = {
  slug: "inheritance",
  title: `Inheritance Hub (${CURRENT_YEAR}) — Tax Rules, CGT, Super & Financial Roadmap`,
  metaDescription:
    "Received an inheritance in Australia? There's no inheritance tax — but CGT on inherited assets, super death benefit tax, and the 90-day sequencing trap all apply. Australia's complete inheritance financial guide.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: "Inheritance Hub",
    subhead:
      "Australia has no inheritance tax — but receiving a lump sum still carries CGT obligations, super tax rules for non-dependants, and a sequencing trap that costs families tens of thousands. Here's the financial roadmap for the first 12 months.",
    stats: [
      {
        label: "Inheritance tax in Australia",
        value: "$0",
        dataAsOf: "2025-07-01",
        stalesAt: "2030-01-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/inherited-assets-and-cgt",
      },
      {
        label: "Pre-CGT asset cost base threshold",
        value: "20 Sep 1985",
        dataAsOf: "2025-07-01",
        stalesAt: "2030-01-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/inherited-assets-and-cgt",
      },
      {
        label: "Super death benefit tax (non-dependant)",
        value: "Up to 17%",
        dataAsOf: "2025-07-01",
        stalesAt: "2026-07-01",
        source:
          "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/death-benefits-from-super",
      },
    ],
    primaryCta: {
      label: "Find an Estate Planner",
      href: "/advisors/estate-planners",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Find a Tax Agent",
      href: "/find/tax-accountant",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "No Inheritance Tax",
      icon: "shield",
      description:
        "Australia has no inheritance or estate tax. Assets pass to beneficiaries under a will or intestacy rules. However, income earned on inherited assets from the moment you receive them is fully taxable, and CGT applies on any subsequent sale.",
      href: "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/inherited-assets-and-cgt",
      cta: "ATO Inherited Assets Guide",
    },
    {
      title: "CGT on Inherited Assets",
      icon: "trending-up",
      description:
        "Shares, property and crypto received under a will are tax-free to receive — but CGT applies when you sell. The cost base depends on whether the deceased acquired the asset before or after 20 September 1985. Pre-CGT assets get a cost base of market value at date of death.",
      href: "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/inherited-assets-and-cgt",
      cta: "ATO CGT Rules",
    },
    {
      title: "Inherited Property",
      icon: "home",
      description:
        "A two-year main-residence exemption window applies if the deceased's home was their principal place of residence. Selling within 2 years is generally CGT-free. Post-2-year or investment property sales trigger CGT — get a tax agent to run the numbers before any sale.",
      href: "https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/property-and-capital-gains-tax/inherited-property-and-cgt",
      cta: "ATO Property CGT",
    },
    {
      title: "Super Death Benefits",
      icon: "users",
      description:
        "Super doesn't automatically form part of the estate — it flows via a death benefit nomination. Tax-dependants (spouse, children under 18) receive it tax-free. Non-dependants pay up to 17% tax on the taxable component. Review nominations at every life event.",
      href: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/death-benefits-from-super",
      cta: "ATO Death Benefits",
    },
    {
      title: "90-Day Sequencing Rule",
      icon: "calendar",
      description:
        "Don't invest the inheritance immediately. Park it in a high-interest savings account or term deposit while estate paperwork finalises, you obtain tax advice on cost base, and you review your own super, insurance, and emergency reserves. A rushed investment decision is the most common inheritance mistake.",
      href: "/savings",
      cta: "Compare Savings Accounts",
    },
    {
      title: "Estate Planning",
      icon: "file-text",
      description:
        "Receiving an inheritance is a prompt to review your own estate plan: update your will, review super death benefit nominations, check powers of attorney, and consider whether a testamentary trust benefits your beneficiaries. Estate laws are state-specific in Australia.",
      href: "/advisors/estate-planners",
      cta: "Find an Estate Planner",
    },
  ],

  deepDives: [
    {
      title: "The Three-Bucket Framework for Inherited Assets",
      excerpt:
        "Cash, inherited assets (shares/property/crypto), and inherited super each have separate tax treatment and sequencing rules. Get the framework right before making any investment decision.",
      href: "/lump-sum-investing/inheritance",
      readingTimeMinutes: 6,
    },
    {
      title: "CGT and Inherited Property: The Two-Year Window",
      excerpt:
        "The 2-year main-residence exemption window, pre/post 20 September 1985 cost base rules, and why selling in month 23 vs month 25 can cost tens of thousands — a tax agent is essential before any sale decision.",
      href: "/lump-sum-investing/inheritance",
      readingTimeMinutes: 7,
    },
    {
      title: "Super Death Benefits: Tax-Dependant vs Non-Dependant",
      excerpt:
        "Spouses and children under 18 receive super death benefits tax-free. Adult children and other non-dependants pay up to 17% on the taxable component. How binding nominations work and what happens without one.",
      href: "/super",
      readingTimeMinutes: 8,
    },
    {
      title: "12-Month Inheritance Financial Roadmap",
      excerpt:
        "Month 1: park funds + get tax advice. Month 2–3: estate paperwork + review own super and insurance. Month 4–6: invest surplus aligned to your own plan. Month 7–12: review and normalise.",
      href: "/lump-sum-investing",
      readingTimeMinutes: 5,
    },
  ],

  calculators: [
    { slug: "cgt-calculator", label: "CGT Calculator" },
    { slug: "lump-sum-investing/calculator", label: "Inheritance Growth Calculator" },
  ],

  quizzes: [
    {
      slug: "inheritance/quiz",
      label: "What should I do with my inheritance?",
      routesTo: "general",
    },
  ],

  leadMagnets: [
    {
      slug: "inheritance-financial-checklist",
      title: "Inheritance Financial Action Checklist",
      format: "pdf",
      listKey: "inheritance-hub",
    },
  ],

  newsletter: {
    listKey: "inheritance-hub",
    cadence: "weekly",
  },

  leadQueue: { kind: "general", topic: "estate_planning" },

  relatedHubs: ["redundancy", "super", "tax", "lump-sum-investing", "smsf"],

  articleFilters: {
    category: "inheritance",
    tags: ["estate-planning", "cgt", "super-death-benefit", "wills", "inheritance"],
  },

  primaryKeywords: [
    "inheritance tax australia",
    "cgt on inherited property australia",
    "inherited shares australia tax",
    "super death benefit tax",
    "what to do with inheritance australia",
    "inherited property two year rule",
    "estate planning australia",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "Is there an inheritance tax in Australia?",
      answer:
        "No — Australia abolished inheritance and estate taxes in 1979. There is no tax payable simply on receiving an inheritance. However, income earned on inherited assets from the date you receive them is fully taxable, and Capital Gains Tax (CGT) applies when you subsequently sell inherited assets such as shares, property, or crypto.",
    },
    {
      question: "Do I pay CGT on inherited shares or property in Australia?",
      answer:
        "Receiving inherited shares or property is not a CGT event — you don't pay tax when you inherit them. CGT applies when you sell. The cost base depends on when the deceased originally acquired the asset: if before 20 September 1985 (pre-CGT), your cost base is the market value at the date of death. If after 20 September 1985, your cost base is generally the deceased's original cost base. A tax agent should determine the correct cost base before any sale.",
    },
    {
      question: "What is the two-year rule for inherited property?",
      answer:
        "If you inherit a property that was the deceased's main residence and they acquired it after 20 September 1985, you can generally sell it CGT-free within two years of the date of death. Selling outside the two-year window, or selling a property that was an investment property (not main residence), will trigger CGT. The exact calculation depends on your cost base, the sale price, and whether the 50% CGT discount applies (assets held for more than 12 months). Always obtain tax advice before deciding on timing.",
    },
    {
      question: "Is inherited super taxable?",
      answer:
        "It depends on whether you are a tax-dependant of the deceased. Tax-dependants — including a spouse or de facto partner, children under 18, and financial dependants — receive the super death benefit completely tax-free. Non-dependants (adult children who weren't financially dependent) pay tax of up to 17% (15% + 2% Medicare levy) on the taxable component of the super. The taxable component is the concessional (pre-tax) contributions and earnings; the tax-free component (personal after-tax contributions) passes tax-free to anyone.",
    },
    {
      question: "What should I do first when I receive an inheritance?",
      answer:
        "Don't invest immediately. The 90-day rule: park the cash in a high-interest savings account or offset account while you (1) wait for estate administration to formally complete, (2) get tax advice on the cost base of any inherited assets and the CGT implications of selling, (3) review your own super, insurance, and emergency reserves, and (4) build an investment plan aligned to your own goals — not the deceased's portfolio. The most common inheritance mistake is rushing into investment decisions before the tax position is clear.",
    },
    {
      question: "Does inherited money need to be declared on my tax return?",
      answer:
        "The inheritance itself (the capital amount) is not assessable income and does not go on your tax return. However, any income earned on inherited assets from the date you receive them is taxable — bank interest, dividends from inherited shares, and rent from an inherited property all form part of your assessable income. If you sell an inherited asset at a gain, the CGT gain is assessable in the year of sale. A capital loss on an inherited asset can be used to offset capital gains from other investments.",
    },
  ],
};
