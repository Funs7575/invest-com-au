import type { ProfessionalType } from "@/lib/types";

export interface AdvisorGuide {
  slug: string;
  type: ProfessionalType;
  title: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; body: string }[];
  checklist: string[];
  redFlags: string[];
  faqs: { q: string; a: string }[];
}

export const ADVISOR_GUIDES: AdvisorGuide[] = [
  {
    slug: "how-to-choose-smsf-accountant",
    type: "smsf_accountant",
    title: "How to Choose an SMSF Accountant in Australia",
    metaDescription: "Everything you need to know about choosing an SMSF accountant — fees, qualifications, what to look for, red flags, and a checklist before you sign up.",
    intro: "Setting up and running an SMSF is a serious financial decision. The right SMSF accountant saves you money, keeps you compliant, and helps your fund grow. The wrong one can result in penalties from the ATO, missed opportunities, and unnecessary fees. Here's how to choose wisely.",
    sections: [
      {
        heading: "What Does an SMSF Accountant Actually Do?",
        body: "An SMSF accountant handles the ongoing compliance and administration of your self-managed super fund. This includes preparing annual financial statements, organising the independent audit, lodging the annual return with the ATO, tracking contributions and pension payments, and advising on investment strategy from a tax perspective. Some also handle the initial fund setup, including the trust deed, corporate trustee, and ABN/TFN registration.",
      },
      {
        heading: "What Qualifications Should They Have?",
        body: "At minimum, your SMSF accountant should be a CPA, CA, or IPA member. Many also hold an SMSF Specialist Advisor (SSA) designation from the SMSF Association. They should be registered as a tax agent with the Tax Practitioners Board (TPB) — you can verify this on the TPB's public register. If they provide investment advice beyond accounting, they need to operate under an AFSL or be an authorised representative of an AFSL holder.",
      },
      {
        heading: "How Much Should You Pay?",
        body: "SMSF administration and compliance typically costs $1,500–$4,000 per year for a straightforward fund. This covers the annual accounts, tax return, and audit. Setup fees range from $1,000–$3,000. Be cautious of firms charging significantly below market — they may be cutting corners on compliance. Equally, fees above $5,000/year should come with clear justification (complex investments, multiple members, or additional advisory services).",
      },
      {
        heading: "Online vs Local Accountant",
        body: "Online SMSF accountants (like SuperConcepts, Grow SMSF, or esuperfund) offer lower fees and streamlined digital processes. Local accountants offer face-to-face meetings and may better understand your personal situation. For straightforward SMSFs investing in listed shares and ETFs, online services are often sufficient. For complex strategies (property, unlisted assets, pension phase planning), a specialist local accountant is usually worth the premium.",
      },
    ],
    checklist: [
      "Verify their CPA/CA/IPA membership",
      "Check their Tax Practitioners Board registration",
      "Ask about their SMSF-specific experience (how many funds they manage)",
      "Get a clear written fee schedule before committing",
      "Confirm they arrange the independent audit (required annually)",
      "Ask how they handle ATO correspondence and compliance queries",
      "Check if they use cloud-based SMSF software (Class, BGL, Simple Fund 360)",
      "Understand what's included vs what costs extra",
    ],
    redFlags: [
      "No TPB registration — legally cannot prepare your SMSF tax return",
      "Providing investment advice without an AFSL",
      "Unclear or bundled fee structures with no itemisation",
      "Slow turnaround on annual accounts (should be done within 3-4 months of year end)",
      "No professional indemnity insurance",
      "Recommending specific investments that benefit them (conflicts of interest)",
    ],
    faqs: [
      { q: "Can I use my regular accountant for my SMSF?", a: "You can if they're TPB-registered, but SMSF compliance is specialised. A dedicated SMSF accountant is less likely to miss compliance requirements." },
      { q: "How often do I need to interact with my SMSF accountant?", a: "Typically at year-end for financial statements and any time you make significant changes (new members, pension drawdowns, property purchases)." },
      { q: "What happens if my SMSF accountant makes an error?", a: "Their professional indemnity insurance should cover legitimate errors. You should verify they hold current PI insurance before engaging them." },
    ],
  },
  {
    slug: "how-to-choose-financial-planner",
    type: "financial_planner",
    title: "How to Choose a Financial Planner in Australia",
    metaDescription: "A practical guide to finding a good financial planner — what to ask, how much to pay, red flags to watch for, and when you actually need one.",
    intro: "A good financial planner can add significant value to your financial future — studies suggest professional advice adds 2-4% per year in net returns through tax optimisation, behavioural coaching, and portfolio construction. But the industry has a trust problem. Here's how to find a planner who genuinely works in your interest.",
    sections: [
      {
        heading: "When Do You Actually Need a Financial Planner?",
        body: "Not everyone needs one. If you're investing small amounts in index ETFs via a low-cost broker, you probably don't. You likely do need one if: you're approaching retirement and need to optimise super and pension drawdowns; you've received a large inheritance or windfall; you're navigating complex tax structures (trusts, companies); you need insurance advice (life, TPD, income protection); or you're investing over $200,000 and want to ensure optimal asset allocation.",
      },
      {
        heading: "Fee-Only vs Commission-Based Planners",
        body: "Always prefer fee-for-service planners. They charge you directly (flat fee or hourly) rather than earning commissions from product providers. Commission-based planners have an inherent conflict — they're incentivised to recommend products that pay them the highest commission, not necessarily the best product for you. Since the Hayne Royal Commission, commissions on investments are banned, but they still exist for insurance products.",
      },
      {
        heading: "What to Expect from the Process",
        body: "A good financial planner will start with a discovery meeting (usually free) to understand your situation. They'll then prepare a Statement of Advice (SOA) — a detailed document outlining their recommendations and how they arrive at them. The SOA typically costs $2,500–$5,500. If you proceed, ongoing advice costs $2,000–$8,000/year depending on complexity. Always ask for the SOA in writing before committing to any implementation.",
      },
    ],
    checklist: [
      "Verify they're on the ASIC Financial Advisers Register",
      "Check their AFSL holder (who they're authorised under)",
      "Ask if they're fee-for-service (no product commissions)",
      "Request a written fee schedule upfront",
      "Check for any disciplinary history on the ASIC register",
      "Ask about their investment philosophy",
      "Confirm they hold relevant qualifications (CFP, degree in financial planning)",
      "Ask for client references",
    ],
    redFlags: [
      "Pressure to sign immediately without time to review the SOA",
      "Recommending only products from one provider (likely receiving commissions)",
      "No written fee disclosure",
      "Not on the ASIC Financial Advisers Register",
      "Guaranteeing investment returns",
      "Suggesting you move all your super to a specific fund without clear justification",
    ],
    faqs: [
      { q: "How much does a financial planner cost?", a: "Initial SOA: $2,500–$5,500. Ongoing advice: $2,000–$8,000/year. Some charge hourly ($250–$450/hr) for one-off consultations." },
      { q: "What's the difference between a financial planner and a financial advisor?", a: "In Australia, both terms are regulated. They must hold or be authorised under an AFSL." },
      { q: "Can I get a one-off plan without ongoing fees?", a: "Yes, many planners offer a one-off SOA without requiring ongoing engagement. This is good value if you just need a plan to follow." },
    ],
  },
  {
    slug: "how-to-choose-tax-agent-investments",
    type: "tax_agent",
    title: "How to Choose a Tax Agent for Investment Tax",
    metaDescription: "How to find a tax agent who specialises in investment income, capital gains, crypto tax, and complex structures. Fees, qualifications, and what to look for.",
    intro: "If your tax return involves capital gains, dividends, crypto, investment properties, or international income, a standard tax agent may not be enough. You need someone who understands investment tax specifically. Here's how to find the right one.",
    sections: [
      {
        heading: "When Do You Need a Specialist?",
        body: "A standard accountant can handle your tax return if you only have a few dividend payments and franking credits. You need a specialist if you have capital gains events (selling shares), crypto transactions, investment property deductions, international income or holdings, complex structures like trusts or companies, or SMSF tax obligations.",
      },
      {
        heading: "What to Look For",
        body: "The tax agent should be registered with the Tax Practitioners Board (TPB). Beyond that, look for experience with investment clients specifically — ask how many investment-heavy returns they prepare annually. Good signs: they proactively ask about tax-loss harvesting, they understand the CGT discount rules inside out, they know the difference between revenue and capital treatment for share traders, and they're comfortable with crypto tax reporting.",
      },
    ],
    checklist: [
      "Verify TPB registration on the public register",
      "Ask about experience with investment returns specifically",
      "Confirm they handle CGT calculations and schedules",
      "Ask about crypto tax capability if relevant",
      "Get a fee estimate before lodging",
      "Check their turnaround time",
    ],
    redFlags: [
      "No TPB registration",
      "Unfamiliar with CGT discount rules or cost base calculations",
      "Can't explain the difference between investor and trader tax treatment",
      "No experience with crypto reporting tools",
    ],
    faqs: [
      { q: "How much does an investment tax return cost?", a: "$300–$800 for a return with shares, dividends, and CGT. $800–$2,000+ with crypto, property, or international income." },
      { q: "Can they help me reduce capital gains tax?", a: "Yes — through CGT discount eligibility, tax-loss harvesting, timing of disposals, and optimal asset structuring." },
    ],
  },
];

export function getAdvisorGuide(slug: string): AdvisorGuide | undefined {
  return ADVISOR_GUIDES.find((g) => g.slug === slug);
}

export function getAllAdvisorGuideSlugs(): string[] {
  return ADVISOR_GUIDES.map((g) => g.slug);
}
