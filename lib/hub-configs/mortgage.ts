import { CURRENT_YEAR } from "@/lib/seo";
import type { HubConfig } from "@/lib/verticals";

/**
 * Hub config for /mortgage — consumed by the <HubPage> HOC.
 *
 * REFERRAL-ONLY by design. invest.com.au does NOT hold an Australian Credit
 * Licence, so this hub must never provide credit assistance: no loan/lender
 * comparison tables, no rate benchmarks, no "best loan for you", and no
 * serviceability assessment. It offers factual education (definitions, process)
 * and refers users to LICENSED mortgage brokers via the existing broker
 * directory. complianceKey "general_advice" renders the disclaimer via HubPage.
 */
export const mortgageHubConfig: HubConfig = {
  slug: "mortgage",
  title: `Home Loans & Mortgages Australia (${CURRENT_YEAR}) — Broker Guide & Referral`,
  metaDescription:
    "Factual guide to home loans and mortgages in Australia — how brokers work, LVR & LMI, deposits, refinancing, and investment loans explained. Connect with a licensed mortgage broker. General information only, not credit assistance.",
  audiences: ["founder"],
  complianceKey: "general_advice",

  hero: {
    headline: "Home Loans & Mortgages",
    subhead:
      "Understand how home loans work in Australia, then connect with a licensed mortgage broker who compares lenders on your behalf. We provide general information only — not credit assistance or loan recommendations.",
    stats: [
      {
        label: "Deposit to avoid LMI",
        value: "20%",
        dataAsOf: "2024-07-01",
        stalesAt: "2027-07-01",
        source: "https://moneysmart.gov.au/home-loans/lenders-mortgage-insurance",
      },
      {
        label: "First Home Guarantee min deposit",
        value: "5%",
        dataAsOf: "2024-07-01",
        stalesAt: "2027-07-01",
        source:
          "https://www.housingaustralia.gov.au/support-buy-home/first-home-guarantee",
      },
      {
        label: "Lenders a broker can compare",
        value: "30+",
        dataAsOf: "2024-01-01",
        stalesAt: "2027-01-01",
        source: "https://www.mfaa.com.au/",
      },
    ],
    primaryCta: {
      label: "Find a Mortgage Broker",
      href: "/advisors/mortgage-brokers",
      lever: "lead_routing",
    },
    secondaryCta: {
      label: "Repayment Calculator",
      href: "/mortgage-calculator",
      lever: "lead_routing",
    },
  },

  serviceGrid: [
    {
      title: "Talk to a Mortgage Broker",
      icon: "users",
      description:
        "A licensed broker compares loans across many lenders, recommends suitable options, and manages the application. Since 2021, brokers owe you a Best Interests Duty — they must put your interests first.",
      href: "/advisors/mortgage-brokers",
      cta: "Find a Broker",
    },
    {
      title: "First Home Buyers",
      icon: "home",
      description:
        "Deposits, the First Home Super Saver scheme, state grants, and the First Home Guarantee (5% deposit, no LMI) explained — plus a referral to a first-home-buyer specialist broker.",
      href: "/first-home-buyer",
      cta: "First Home Buyer Hub",
    },
    {
      title: "Refinancing",
      icon: "refresh-cw",
      description:
        "Refinancing means moving your loan to a new lender or product. There are switching costs (discharge, application, valuation) to weigh — a broker can assess whether it stacks up for your situation.",
      href: "/advisors/mortgage-brokers?specialty=Refinancing",
      cta: "Refinancing Brokers",
    },
    {
      title: "Investment Property Loans",
      icon: "trending-up",
      description:
        "Investment loans differ from owner-occupier loans — interest-only options are more common and interest may be tax-deductible. General information only; speak to a broker and your accountant.",
      href: "/advisors/mortgage-brokers?specialty=Investment%20Property",
      cta: "Investment Loan Brokers",
    },
    {
      title: "Construction Loans",
      icon: "tool",
      description:
        "Building finance is drawn down progressively as construction reaches each stage, so you only pay interest on funds released. The structure is more complex than a standard loan.",
      href: "/advisors/mortgage-brokers?specialty=Construction%20Loans",
      cta: "Construction Loan Brokers",
    },
    {
      title: "Repayment Calculator",
      icon: "calculator",
      description:
        "Estimate principal-and-interest repayments for a given loan amount, rate, and term. Illustrative modelling only — not a quote, and not a recommendation of any loan.",
      href: "/mortgage-calculator",
      cta: "Open Calculator",
    },
  ],

  calculators: [
    { slug: "mortgage-calculator", label: "Mortgage Repayment Calculator" },
  ],

  leadQueue: { kind: "general", topic: "mortgage" },

  relatedHubs: ["first-home-buyer", "super", "insurance"],

  articleFilters: {
    category: "mortgage",
    tags: ["home-loans", "refinancing", "mortgage-broker", "first-home-buyer"],
  },

  primaryKeywords: [
    "mortgage broker australia",
    "home loan australia",
    "refinancing home loan",
    "investment property loan",
    "how much deposit home loan",
    "lvr lmi explained",
  ],

  schemaTypes: ["FAQPage", "WebPage", "FinancialService"],

  faqs: [
    {
      question: "What does a mortgage broker do?",
      answer:
        "A mortgage broker is licensed under an Australian Credit Licence (ACL) to compare home loans across multiple lenders, recommend options suited to your circumstances, and manage the application end-to-end. Since 1 January 2021 brokers owe consumers a Best Interests Duty. invest.com.au is not a credit licensee and does not provide credit assistance — we connect you with licensed brokers who do.",
    },
    {
      question: "What are LVR and LMI?",
      answer:
        "Loan-to-Value Ratio (LVR) is the size of your loan as a percentage of the property's value — a $640,000 loan on an $800,000 property is an 80% LVR. Lenders Mortgage Insurance (LMI) is a one-off premium most lenders charge when your LVR is above 80% (i.e. less than a 20% deposit); it protects the lender, not you. A broker can explain how LVR affects your options.",
    },
    {
      question: "How much deposit do I need to buy a home?",
      answer:
        "Lenders typically look for a 20% deposit to avoid LMI, but many borrowers buy with as little as 5% and pay LMI. Eligible first home buyers can use the First Home Guarantee to buy with a 5% deposit without paying LMI. What you actually qualify for depends on your income, expenses, and credit history — a licensed broker can confirm this.",
    },
    {
      question: "What is the difference between fixed and variable interest rates?",
      answer:
        "A fixed rate stays the same for an agreed period (commonly 1–5 years), giving certainty but less flexibility (limits on extra repayments, break costs). A variable rate moves with the market and usually allows offset accounts, redraw, and unlimited extra repayments. Which suits you depends on your circumstances — a licensed broker or financial adviser can help you weigh the trade-offs. This is general information, not a recommendation.",
    },
    {
      question: "What is an offset account?",
      answer:
        "An offset account is a transaction account linked to your home loan. The balance is 'offset' against your loan principal when interest is calculated, so $20,000 in an offset on a $500,000 loan means you're charged interest on $480,000. It can reduce interest while keeping your money accessible. Whether one is worthwhile depends on the loan's fees and your balances.",
    },
    {
      question: "Should I use a broker or go directly to a bank?",
      answer:
        "A broker compares loans from many lenders on a panel; going direct limits you to a single lender's products. Both are valid paths. Either way, the credit provider — the broker or the bank — is the licensed party that assesses whether a loan is suitable for you. invest.com.au only provides factual information and referrals; we don't assess loans or arrange credit.",
    },
  ],
};
