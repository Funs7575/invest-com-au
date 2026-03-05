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
  {
    slug: "how-to-choose-property-investment-advisor",
    type: "property_advisor",
    title: "How to Choose a Property Investment Advisor in Australia",
    metaDescription: "A practical guide to finding a trustworthy property investment advisor — fees, qualifications, conflicts of interest, and what questions to ask.",
    intro: "Property investment advice in Australia is a minefield. For every qualified, fee-for-service advisor, there are dozens of 'free' advisors who earn commissions from developers — often recommending properties that benefit them more than you. Here's how to find one who genuinely works in your interest.",
    sections: [
      {
        heading: "What Does a Property Investment Advisor Do?",
        body: "A property investment advisor helps you assess whether property fits your overall investment strategy, identify suitable properties, model expected returns, understand tax implications, and structure purchases optimally. Some also help with SMSF property purchases (which have strict rules) and portfolio reviews that weigh property against other asset classes like shares and bonds.",
      },
      {
        heading: "Fee-for-Service vs Commission-Based — This Matters a Lot",
        body: "The single most important distinction in property advice is how the advisor is paid. Fee-for-service advisors charge you directly ($2,000–$5,000 per engagement) and have no financial relationship with developers or agents. Commission-based 'advisors' — often called buyer's agents or property investment companies — earn rebates from developers of $10,000–$50,000 per property sold. This creates an enormous conflict of interest. Always ask: 'Do you receive any payment from property developers, agents, or project marketers?'",
      },
      {
        heading: "What Qualifications Should They Have?",
        body: "If they provide advice on whether to invest in property (as opposed to just finding properties), they should operate under an AFSL. A real estate licence alone is not sufficient for investment advice. Look for qualifications like a Certified Financial Planner (CFP) designation, a degree in financial planning or economics, and membership of a professional body. Be very cautious of advisors whose only qualification is a real estate licence or 'property investment certificate'.",
      },
    ],
    checklist: [
      "Confirm they are fee-for-service with no developer commissions",
      "Check for AFSL authorisation if they provide investment advice",
      "Ask how many properties they have personally invested in",
      "Request a sample investment analysis/feasibility study",
      "Verify they consider your entire portfolio (not just property)",
      "Ask about their experience with your specific strategy (SMSF property, negatively geared, etc.)",
    ],
    redFlags: [
      "'Free' property seminars or advice sessions (funded by developer commissions)",
      "Pressure to buy off-the-plan apartments in specific developments",
      "Guaranteed rental yields or capital growth projections",
      "No AFSL but providing advice on whether to buy investment property",
      "Dismissing shares, ETFs, or other asset classes without analysis",
      "Recommending properties they have a financial interest in",
    ],
    faqs: [
      { q: "How much does a property investment advisor cost?", a: "Fee-for-service advisors charge $2,000–$5,000 per engagement. Be very wary of 'free' advice — it's funded by commissions from developers." },
      { q: "Should I invest in property or shares?", a: "This depends on your goals, risk tolerance, available capital, and tax situation. A good advisor will model both scenarios for your specific circumstances rather than pushing one over the other." },
      { q: "Can I buy property through my SMSF?", a: "Yes, but there are strict rules. The property must meet the 'sole purpose test', can't be lived in by fund members, and borrowing requires a limited recourse borrowing arrangement (LRBA). A specialist SMSF accountant should be involved." },
    ],
  },
  {
    slug: "how-to-choose-mortgage-broker",
    type: "mortgage_broker",
    title: "How to Choose a Mortgage Broker for Investment Loans",
    metaDescription: "How to find the right mortgage broker for investment property loans — what to look for, how they're paid, and questions to ask before you apply.",
    intro: "If you're borrowing for an investment property, your choice of mortgage broker can save — or cost — you tens of thousands of dollars over the life of the loan. Not all brokers have access to the same lenders, and some are better equipped to handle the complexities of investment lending. Here's what to look for.",
    sections: [
      {
        heading: "How Are Mortgage Brokers Paid?",
        body: "Most Australian mortgage brokers earn commission from the lender — typically 0.5–0.7% of the loan amount upfront, plus a smaller trailing commission (0.15–0.2% annually). You don't pay the broker directly in most cases. However, this commission structure means some brokers may prefer recommending lenders with higher commissions. Since the Royal Commission, brokers are legally required to act in your best interest, but it's still worth asking about their panel of lenders and any preferred relationships.",
      },
      {
        heading: "What to Look for in an Investment Loan Broker",
        body: "Investment lending is more complex than home loan lending. Interest rates are typically higher, deposit requirements are larger (usually 20%+), and serviceability calculations are stricter. A good investment loan broker should have experience with investment property lending specifically, access to a wide panel of lenders (30+), understanding of tax deductibility for investment loans, and the ability to structure loans to maximise tax efficiency while maintaining flexibility.",
      },
    ],
    checklist: [
      "Ask how many lenders they have on their panel (30+ is good)",
      "Confirm experience with investment property loans specifically",
      "Ask about their approach to loan structuring for tax efficiency",
      "Check they hold an Australian Credit Licence (ACL)",
      "Ask about turnaround times and their process",
      "Request a comparison of at least 3 lender options",
    ],
    redFlags: [
      "Only recommending one or two lenders repeatedly",
      "No discussion of loan structure or interest-only vs P&I",
      "Pressure to borrow more than you're comfortable with",
      "No Australian Credit Licence",
      "Unable to explain the difference between offset and redraw",
    ],
    faqs: [
      { q: "Do mortgage brokers charge a fee?", a: "Most don't charge the borrower. They earn commission from the lender. Some charge a fee for complex scenarios like SMSF lending or construction finance." },
      { q: "Is a broker better than going to my bank?", a: "Usually yes — brokers compare 20-40+ lenders, often finding better rates or features than a single bank can offer. Your bank only offers their own products." },
      { q: "What deposit do I need for an investment property?", a: "Typically 20% to avoid Lenders Mortgage Insurance (LMI). Some lenders offer 10% deposit investment loans but with higher rates and LMI costs." },
    ],
  },
  {
    slug: "how-to-choose-estate-planner",
    type: "estate_planner",
    title: "How to Choose an Estate Planner in Australia",
    metaDescription: "When you need estate planning, what it costs, what to look for in an estate planner, and the key documents every Australian investor should have.",
    intro: "Estate planning isn't just for the wealthy. If you have a super fund, investment portfolio, property, or dependents, failing to plan means the government decides what happens to your assets. The right estate planner ensures your wealth goes where you want it — and minimises the tax and legal complications for your family.",
    sections: [
      {
        heading: "When Do You Need Estate Planning?",
        body: "You need estate planning if you have assets worth more than $500,000 (including super), dependents or a partner, a blended family, business interests or partnerships, an SMSF, investment properties, or assets in multiple states or countries. Even if your situation is straightforward, a basic will and power of attorney are essential. Without them, your assets are distributed according to intestacy laws — which may not match your wishes.",
      },
      {
        heading: "What Does Estate Planning Include?",
        body: "Comprehensive estate planning typically covers: wills (who gets what), powers of attorney (who makes decisions if you can't), superannuation death benefit nominations (super doesn't automatically follow your will), testamentary trusts (tax-effective structures for beneficiaries), business succession planning, and advance care directives. The specific documents depend on your situation.",
      },
      {
        heading: "Estate Planners vs Lawyers vs Financial Planners",
        body: "Wills and powers of attorney must be prepared by a solicitor. However, the broader estate planning strategy — how to structure assets, minimise tax on death, and coordinate super with your will — is often best handled by a financial planner who specialises in estate planning, working alongside a solicitor. Some firms offer both services. The key is ensuring whoever you use understands the interaction between super law, tax law, and succession law.",
      },
    ],
    checklist: [
      "Check they have a solicitor on staff or a referral arrangement for legal documents",
      "Ask about their experience with superannuation death benefit nominations",
      "Confirm they understand testamentary trust structures",
      "Ask about their approach to blended family situations if relevant",
      "Verify they consider tax implications (not just asset distribution)",
      "Request a clear fee quote before engagement",
    ],
    redFlags: [
      "No solicitor involvement in preparing legal documents",
      "Ignoring superannuation in the estate plan",
      "One-size-fits-all approach without considering your specific situation",
      "Unable to explain the difference between binding and non-binding death benefit nominations",
      "No discussion of potential challenges to the will",
    ],
    faqs: [
      { q: "How much does estate planning cost?", a: "A basic will costs $500–$1,500. Comprehensive planning with testamentary trusts and complex structures is $3,000–$10,000+. The cost depends on complexity." },
      { q: "Does super follow my will?", a: "No — superannuation is not automatically covered by your will. You need a separate binding death benefit nomination (BDBN) for your super fund. This is one of the most common estate planning mistakes." },
      { q: "How often should I update my estate plan?", a: "Review it every 2-3 years or after major life events: marriage, divorce, birth of children, significant asset changes, or changes in super fund." },
    ],
  },
];

export function getAdvisorGuide(slug: string): AdvisorGuide | undefined {
  return ADVISOR_GUIDES.find((g) => g.slug === slug);
}

export function getAllAdvisorGuideSlugs(): string[] {
  return ADVISOR_GUIDES.map((g) => g.slug);
}
