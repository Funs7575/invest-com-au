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
  {
    slug: "how-to-choose-insurance-broker",
    type: "insurance_broker",
    title: "How to Choose an Insurance Broker in Australia",
    metaDescription: "How to find a good insurance broker for life insurance, TPD, income protection, and trauma cover. Fees, qualifications, and what to ask.",
    intro: "Insurance is one of those things you hope you never need — but when you do, having the right cover is life-changing. An insurance broker compares policies across multiple insurers to find the best fit for your situation, handles claims, and ensures you're not overpaying. Here's how to choose a good one.",
    sections: [
      {
        heading: "What Does an Insurance Broker Do?",
        body: "An insurance broker assesses your personal and financial situation, recommends appropriate cover levels for life, TPD (total and permanent disability), income protection, and trauma insurance. They compare products across 10-20+ insurers, handle applications and underwriting, and assist with claims. Unlike dealing directly with one insurer, a broker works for you, not the insurance company.",
      },
      {
        heading: "How Are Insurance Brokers Paid?",
        body: "Most insurance brokers earn initial and ongoing commissions from the insurer — typically 60-130% of the first year's premium (initial commission), then 10-20% per year (ongoing). You don't pay the broker directly. Some fee-for-service brokers rebate commissions and charge a flat fee instead ($1,000-$3,000). Post-Life Insurance Framework (LIF) reforms, commission rates are capped, improving consumer outcomes.",
      },
      {
        heading: "Types of Insurance You Might Need",
        body: "Life insurance pays a lump sum to your dependents if you die. TPD insurance pays a lump sum if you become permanently disabled. Income protection replaces up to 75% of your income if you can't work due to illness or injury. Trauma/critical illness insurance pays a lump sum on diagnosis of specified conditions (cancer, heart attack, stroke). Not everyone needs all four — a good broker will assess which you actually need.",
      },
    ],
    checklist: [
      "Check they're an authorised representative under an AFSL",
      "Ask how many insurers they compare (10+ is good)",
      "Request a clear needs analysis before any recommendations",
      "Ask about their claims assistance process",
      "Understand the commission structure and any fee rebates",
      "Check for professional memberships (NIBA, AFA)",
    ],
    redFlags: [
      "Recommending cover levels without understanding your financial situation",
      "Only offering products from one or two insurers",
      "Pressure to sign immediately without time to review",
      "No discussion of exclusions or policy conditions",
      "Guaranteeing approval without proper underwriting assessment",
    ],
    faqs: [
      { q: "How much does insurance broking cost?", a: "Most brokers are paid by insurer commissions, so there's no direct cost to you. Fee-for-service brokers charge $1,000-$3,000 but may find lower premiums by rebating commissions." },
      { q: "Can I hold insurance inside my super?", a: "Yes — life, TPD, and income protection can be held inside superannuation, which is often more tax-effective. Your broker should explain the trade-offs between inside and outside super." },
      { q: "How often should I review my insurance?", a: "Annually, or after major life events (marriage, children, mortgage, salary increase). Under-insurance is extremely common in Australia." },
    ],
  },
  {
    slug: "how-to-choose-buyers-agent",
    type: "buyers_agent",
    title: "How to Choose a Buyers Agent in Australia",
    metaDescription: "A practical guide to finding a good buyers agent — fees, licensing, what to look for, and how to avoid conflicts of interest.",
    intro: "A buyers agent works exclusively for you — the buyer — to find, evaluate, and negotiate property purchases. In a market where selling agents represent the seller's interests, having your own advocate can save you thousands and find properties you'd never see on the open market. Here's how to choose the right one.",
    sections: [
      {
        heading: "What Does a Buyers Agent Do?",
        body: "A buyers agent searches for properties matching your brief (including off-market opportunities), conducts due diligence (comparable sales analysis, building inspections, strata reviews), attends inspections on your behalf, and negotiates or bids at auction. Some specialise in investment property, others in owner-occupier purchases. The best ones save you more than their fee through better negotiation outcomes.",
      },
      {
        heading: "How Much Do Buyers Agents Charge?",
        body: "Fees typically fall into three models: a flat fee ($10,000-$25,000), a percentage of purchase price (1.5-3%), or a retainer plus success fee ($3,000-$5,000 retainer + $5,000-$15,000 on settlement). For investment property, percentage-based fees create a conflict — the agent earns more if you pay more. A flat fee or capped percentage is usually better aligned with your interests.",
      },
      {
        heading: "Licensing and Qualifications",
        body: "All buyers agents in Australia must hold a real estate licence or certificate of registration in the state they operate. They must also be a member of the Property Owners Association or equivalent. REBAA (Real Estate Buyers Agents Association) membership indicates adherence to a code of conduct. For investment advice, check if they operate under an AFSL.",
      },
    ],
    checklist: [
      "Verify they hold a real estate licence in your state",
      "Ask about their fee structure and whether it's capped",
      "Check REBAA membership for code of conduct adherence",
      "Ask for recent purchase examples in your target area and price range",
      "Confirm they have no relationships with selling agents or developers",
      "Ask how they source off-market properties",
    ],
    redFlags: [
      "Receiving kickbacks from selling agents or developers",
      "No real estate licence in the relevant state",
      "Charging a percentage fee with no cap (incentivises you to pay more)",
      "Pushing you toward specific developments or areas without justification",
      "Unable to provide recent comparable purchase results",
    ],
    faqs: [
      { q: "Are buyers agents worth the cost?", a: "For investment property, a good buyers agent often negotiates savings of 5-10% off asking price, which on a $700k property is $35,000-$70,000 — far exceeding their fee." },
      { q: "Can a buyers agent help with SMSF property?", a: "Yes, many specialise in SMSF-compliant property purchases. They understand the sole purpose test and LRBA requirements." },
      { q: "Do I still need a solicitor if I use a buyers agent?", a: "Yes. A buyers agent handles the property search and negotiation, but you still need a conveyancer or solicitor for the legal aspects of the purchase." },
    ],
  },
  {
    slug: "how-to-choose-real-estate-agent",
    type: "real_estate_agent",
    title: "How to Choose a Real Estate Agent in Australia",
    metaDescription: "A practical guide to choosing a real estate agent to sell your property — commissions, marketing, track record, and what to look for.",
    intro: "Choosing the right real estate agent can mean the difference between a quick, profitable sale and months on the market at a discounted price. The best agents combine local knowledge, strong marketing, skilled negotiation, and a proven track record of results in your area. Here's how to find one.",
    sections: [
      {
        heading: "What Does a Real Estate Agent Do?",
        body: "A real estate agent (also called a selling agent or listing agent) manages the sale of your property from start to finish. This includes appraising the property, advising on pricing strategy, preparing and executing a marketing campaign, conducting open homes and private inspections, negotiating with buyers, and managing the process through to settlement. They represent the seller's interests throughout the transaction.",
      },
      {
        heading: "How Much Do Real Estate Agents Charge?",
        body: "Commission rates in Australia typically range from 1.5% to 2.5% of the sale price, with metro areas generally lower (1.5–2%) and regional areas higher (2–3%). Marketing costs are usually charged separately, ranging from $2,000 for basic campaigns to $10,000+ for premium campaigns with professional photography, video, and digital advertising. Some agents offer tiered commission structures — a base rate plus a bonus for exceeding a target price — which can align their incentives with yours.",
      },
      {
        heading: "Licensing and Qualifications",
        body: "All real estate agents in Australia must hold a valid real estate licence issued by the relevant state or territory authority. Agents should be a member of the Real Estate Institute in their state (e.g., REINSW, REIV, REIQ). Membership of the Real Estate Institute of Australia (REIA) indicates adherence to a national code of conduct. Check their licence status on your state's fair trading or consumer affairs website.",
      },
    ],
    checklist: [
      "Verify they hold a current real estate licence in your state",
      "Review their recent sales in your suburb and price range",
      "Ask about their average days on market vs suburb average",
      "Get a detailed marketing plan and cost breakdown in writing",
      "Compare commission rates from at least 3 agents",
      "Ask for references from recent vendors",
    ],
    redFlags: [
      "Suggesting an unrealistically high price to win your listing (known as 'buying the listing')",
      "Vague or no marketing plan — every good agent has a clear strategy",
      "Pressuring you to accept low offers early in the campaign",
      "No recent sales in your suburb or property type",
      "Unwilling to provide a written commission and fee agreement upfront",
    ],
    faqs: [
      { q: "How do I compare real estate agents?", a: "Look at their recent sales in your area, average days on market, sale-to-list price ratio, marketing quality, and vendor reviews. A good agent should be able to show you comparable recent results." },
      { q: "Should I choose auction or private treaty?", a: "This depends on your market. Auctions work well in competitive markets (Sydney, Melbourne inner suburbs) with strong buyer demand. Private treaty suits slower markets or unique properties. Your agent should advise based on current conditions." },
      { q: "Can I negotiate the commission rate?", a: "Yes, commission is always negotiable in Australia. However, the cheapest agent isn't always the best value — an agent who achieves a 5% higher sale price more than covers a slightly higher commission." },
    ],
  },
  {
    slug: "how-to-choose-wealth-manager",
    type: "wealth_manager",
    title: "How to Choose a Wealth Manager in Australia",
    metaDescription: "How to find the right wealth manager for high-net-worth portfolio management — fees, qualifications, investment philosophy, and what to ask.",
    intro: "Wealth management goes beyond basic financial planning. It's a comprehensive service for investors with $500,000+ in assets who need active portfolio management, tax-efficient structuring, estate planning integration, and ongoing strategic advice — all coordinated under one roof. Choosing the wrong wealth manager can cost you hundreds of thousands in underperformance and excessive fees. Here's how to choose wisely.",
    sections: [
      {
        heading: "What Does a Wealth Manager Do?",
        body: "A wealth manager provides integrated services across investment management (actively managing your portfolio), tax planning (minimising tax across all your structures), estate planning coordination, insurance review, philanthropy planning, and intergenerational wealth transfer. The key difference from a financial planner is scale and depth — wealth managers typically handle fewer clients with higher asset levels, providing more personalised attention.",
      },
      {
        heading: "Fee Structures to Understand",
        body: "Most wealth managers charge a percentage of assets under management (AUM) — typically 0.5-1.5% per year. On a $2M portfolio, that's $10,000-$30,000 annually. Some also charge performance fees (10-20% of returns above a benchmark). Others use a flat retainer ($5,000-$20,000/year). AUM fees create alignment — the manager earns more as your wealth grows — but can become excessive on large portfolios. Always negotiate the rate.",
      },
      {
        heading: "Investment Philosophy Matters",
        body: "Ask whether they use active management (stock picking), passive indexing, or a blended approach. Research consistently shows passive strategies outperform most active managers after fees. A good wealth manager will be transparent about their philosophy, expected returns, and how they add value beyond investment selection (tax alpha, behavioural coaching, asset allocation).",
      },
    ],
    checklist: [
      "Verify AFSL and check the ASIC Financial Advisers Register",
      "Ask about total fees including AUM, platform, admin, and performance fees",
      "Understand their investment philosophy and expected return range",
      "Ask for their investment track record (after fees, vs benchmark)",
      "Check qualifications — CFP, CFA, or Masters in Finance are gold standard",
      "Ask how many clients they manage per advisor (under 80 is ideal)",
    ],
    redFlags: [
      "Unable or unwilling to share after-fee performance vs benchmark",
      "AUM fees above 1.5% without clear justification",
      "Recommending in-house products that benefit the firm",
      "No discussion of tax efficiency or estate planning integration",
      "High minimum investment combined with high fees and lock-in periods",
    ],
    faqs: [
      { q: "When do I need a wealth manager vs a financial planner?", a: "Generally when you have $500k+ in investable assets and need active portfolio management, integrated tax strategy, and ongoing advisory — not just a one-off plan." },
      { q: "What return should I expect?", a: "After fees, a well-managed diversified portfolio should aim for CPI + 3-5% over the long term. Be sceptical of anyone promising significantly higher returns." },
      { q: "Can I leave my wealth manager?", a: "Yes. Check for exit fees or lock-in periods before signing. Most modern wealth managers allow you to leave with 30 days notice." },
    ],
  },
  {
    slug: "how-to-choose-aged-care-advisor",
    type: "aged_care_advisor",
    title: "How to Choose an Aged Care Advisor in Australia",
    metaDescription: "How to find an aged care financial advisor — navigating residential care costs, means testing, RADs vs DAPs, and maximising government subsidies.",
    intro: "Aged care decisions are among the most complex and emotional financial decisions a family faces. The system involves means testing, Refundable Accommodation Deposits (RADs) of $300,000-$1,000,000+, ongoing daily fees, and interactions with Centrelink and the aged care assessment process. A specialist advisor can save tens of thousands in costs and ensure you maximise government subsidies. Here's how to find one.",
    sections: [
      {
        heading: "What Does an Aged Care Advisor Do?",
        body: "An aged care financial advisor helps with: understanding the true cost of residential aged care, navigating the Aged Care Means Test (income and assets test), choosing between RAD (lump sum) and DAP (daily payment) for accommodation, structuring assets to maximise government fee reductions, coordinating with Centrelink/DVA, and integrating aged care costs into the broader family financial plan.",
      },
      {
        heading: "When Should You Seek Advice?",
        body: "Ideally before a crisis. Many families only seek advice after an ACAT assessment when the person needs immediate placement. By then, there's less time to optimise finances. If a parent is over 75 or showing signs of needing care, start the conversation early. Pre-planning can save $50,000-$200,000+ through better asset structuring and fee optimisation.",
      },
      {
        heading: "How Much Does Aged Care Advice Cost?",
        body: "Specialist aged care advice typically costs $2,000-$5,000 for a comprehensive plan. Some advisors charge hourly ($250-$450/hr). Given that RADs can exceed $500,000 and daily care fees can be $100-$300/day, the cost of advice is typically recovered many times over through fee optimisation and subsidy maximisation.",
      },
    ],
    checklist: [
      "Check for AFSL authorisation and aged care specialist accreditation",
      "Ask about experience with Centrelink and DVA means testing",
      "Confirm they understand RAD vs DAP trade-offs",
      "Ask how they handle the family home in means test calculations",
      "Check they coordinate with the family's existing financial planner",
      "Ask for case studies showing fee savings achieved for other clients",
    ],
    redFlags: [
      "No experience with the specific aged care means test rules",
      "Recommending asset restructuring without considering Centrelink gifting rules",
      "No AFSL authorisation for providing financial advice",
      "Unable to explain the difference between RAD, DAP, and combination payments",
      "Not considering the impact on Age Pension or DVA entitlements",
    ],
    faqs: [
      { q: "Is aged care financial advice tax deductible?", a: "Financial advice fees are generally not tax deductible for individuals, but the tax savings from proper structuring often far exceed the advisory cost." },
      { q: "Does the family home affect aged care costs?", a: "It depends. If a spouse or dependent continues living there, the home is exempt from the means test. If it's vacated, it may be assessed as an asset (capped at the current threshold)." },
      { q: "Can I get aged care advice through my existing financial planner?", a: "Some financial planners have aged care expertise, but it's a specialist area. Look for advisors with specific aged care accreditation (e.g., Aged Care Steps) for the most current knowledge." },
    ],
  },
  {
    slug: "how-to-choose-crypto-advisor",
    type: "crypto_advisor",
    title: "How to Choose a Crypto Advisor in Australia",
    metaDescription: "How to find a crypto and digital asset advisor — qualifications, tax planning, portfolio construction, and what to ask before engaging.",
    intro: "Cryptocurrency and digital assets are now a legitimate part of many Australian investment portfolios. But the regulatory landscape is complex, tax obligations are significant, and the risk of loss is high. A specialist crypto advisor can help with portfolio construction, risk management, DeFi strategies, and the increasingly complex ATO reporting requirements. Here's how to find a good one.",
    sections: [
      {
        heading: "What Does a Crypto Advisor Do?",
        body: "A crypto advisor helps with: portfolio allocation (how much of your total portfolio should be in crypto), asset selection (Bitcoin, Ethereum, altcoins, DeFi protocols), risk management (position sizing, stop-losses, custody solutions), tax planning (CGT optimisation, cost base tracking, DeFi income classification), and regulatory compliance. The best advisors integrate crypto into your broader financial strategy rather than treating it in isolation.",
      },
      {
        heading: "Regulatory Requirements in Australia",
        body: "Anyone providing personal advice on crypto assets must hold an AFSL or be an authorised representative of an AFSL holder. ASIC has been clear that crypto is a financial product when it involves derivatives, managed investment schemes, or non-cash payment facilities. Be extremely cautious of 'crypto advisors' who don't hold or operate under an AFSL — they may be operating illegally.",
      },
      {
        heading: "Tax Implications You Need to Know",
        body: "The ATO treats cryptocurrency as a CGT asset. Every disposal (sell, swap, spend, gift) is a taxable event. DeFi activities (staking rewards, liquidity mining, airdrops) have complex tax treatments. Cost base tracking across multiple exchanges and wallets is essential. A crypto-savvy tax agent or advisor can save thousands in tax through proper structuring, timing of disposals, and tax-loss harvesting.",
      },
    ],
    checklist: [
      "Verify AFSL authorisation — this is non-negotiable for personal advice",
      "Ask about their personal crypto experience and portfolio management approach",
      "Check they understand DeFi, staking, and cross-chain transactions",
      "Ask how they handle cost base tracking and ATO reporting",
      "Understand their risk management approach (position sizing, custody)",
      "Check they integrate crypto into your broader financial strategy",
    ],
    redFlags: [
      "No AFSL authorisation — illegal to provide personal crypto advice",
      "Guaranteeing returns or promoting specific tokens without analysis",
      "No discussion of risk management or position sizing",
      "Unable to explain the tax treatment of DeFi activities",
      "Recommending self-custody without discussing security practices",
      "Earning commissions or referral fees from crypto exchanges",
    ],
    faqs: [
      { q: "How much does a crypto advisor charge?", a: "Expect $2,000-$5,000 for a comprehensive crypto strategy review. Some charge hourly ($300-$500/hr). Ongoing portfolio management fees are typically 1-2% AUM." },
      { q: "Can I hold crypto in my SMSF?", a: "Yes, but strict rules apply. The crypto must be held in a wallet controlled by the SMSF trustee, and investment decisions must align with the fund's investment strategy. Get specialist SMSF + crypto advice." },
      { q: "How does the ATO know about my crypto?", a: "The ATO has data-matching agreements with Australian exchanges. They receive transaction data directly. International exchanges are also increasingly sharing data under CRS (Common Reporting Standard)." },
    ],
  },
  {
    slug: "how-to-choose-debt-counsellor",
    type: "debt_counsellor",
    title: "How to Choose a Debt Counsellor in Australia",
    metaDescription: "How to find free and low-cost debt counselling — what to expect, your rights, and how to avoid predatory debt management companies.",
    intro: "If you're struggling with debt, you're not alone — and free help is available. Financial counsellors (distinct from 'debt management' companies) provide free, independent advice on managing debt, negotiating with creditors, and understanding your legal options. The key is knowing the difference between legitimate counselling and predatory debt companies that charge fees for services you can get for free.",
    sections: [
      {
        heading: "Free Financial Counselling vs Paid Debt Management",
        body: "Free financial counsellors are qualified professionals funded by government and community organisations. They work in your interest and never charge fees. The National Debt Helpline (1800 007 007) connects you to free counsellors in your state. Paid 'debt management' companies, by contrast, charge significant fees ($2,000-$10,000+) for services you can often get for free. Some take monthly payments from you and delay paying creditors, making your situation worse.",
      },
      {
        heading: "What Can a Financial Counsellor Help With?",
        body: "Financial counsellors can: review your complete financial situation, negotiate hardship arrangements with banks and creditors, explain your options (debt agreements, personal insolvency agreements, bankruptcy), help you access government assistance programs, represent you in disputes with creditors, help with budgeting and money management, and provide referrals to legal services if needed.",
      },
      {
        heading: "Understanding Your Options",
        body: "Depending on your situation, options include: informal hardship arrangements (reduced payments, temporary pauses), debt consolidation loans (combining debts into one lower payment), Part IX Debt Agreements (formal agreement with creditors to pay reduced amount), Personal Insolvency Agreements, or bankruptcy as a last resort. Each has different implications for your credit history and future financial life. A counsellor can explain the trade-offs.",
      },
    ],
    checklist: [
      "Start with the free National Debt Helpline: 1800 007 007",
      "Check the counsellor holds a Diploma of Financial Counselling",
      "Verify they're a member of Financial Counselling Australia (FCA)",
      "Ensure the service is free — legitimate counselling is always free",
      "Ask about their experience with your type of debt (credit cards, personal loans, tax debt)",
      "Check if they can represent you in dealings with creditors",
    ],
    redFlags: [
      "Charging any upfront fees — legitimate financial counselling is free",
      "Asking you to pay them instead of your creditors",
      "Recommending bankruptcy without exploring all other options first",
      "No Diploma of Financial Counselling or FCA membership",
      "Pressure to sign a debt agreement immediately",
      "Promising to 'fix' your credit score for a fee",
    ],
    faqs: [
      { q: "Is debt counselling really free?", a: "Yes. Financial counselling through the National Debt Helpline and community legal centres is 100% free. If someone charges you, they're a commercial debt management company, not a counsellor." },
      { q: "Will seeing a debt counsellor affect my credit score?", a: "No. Seeking counselling has no impact on your credit report. However, some solutions (debt agreements, bankruptcy) will be recorded. Your counsellor will explain the implications before you decide." },
      { q: "Can a counsellor stop creditors from calling me?", a: "They can negotiate hardship arrangements and contact moratoriums on your behalf. If you're experiencing harassment, they can also refer you to the appropriate ombudsman service." },
    ],
  },
];

export function getAdvisorGuide(slug: string): AdvisorGuide | undefined {
  return ADVISOR_GUIDES.find((g) => g.slug === slug);
}

export function getAllAdvisorGuideSlugs(): string[] {
  return ADVISOR_GUIDES.map((g) => g.slug);
}
