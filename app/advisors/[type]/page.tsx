import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional, ProfessionalType } from "@/lib/types";
import type { Metadata } from "next";
import { PROFESSIONAL_TYPE_LABELS, AU_STATES } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const SLUG_TO_TYPE: Record<string, ProfessionalType> = {
  "smsf-accountants": "smsf_accountant",
  "financial-planners": "financial_planner",
  "property-advisors": "property_advisor",
  "tax-agents": "tax_agent",
  "mortgage-brokers": "mortgage_broker",
  "estate-planners": "estate_planner",
  "insurance-brokers": "insurance_broker",
  "buyers-agents": "buyers_agent",
  "real-estate-agents": "real_estate_agent",
  "wealth-managers": "wealth_manager",
  "aged-care-advisors": "aged_care_advisor",
  "crypto-advisors": "crypto_advisor",
  "debt-counsellors": "debt_counsellor",
  "real-estate-agents": "real_estate_agent",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  "smsf-accountants": "Compare verified SMSF accountants across Australia. Specialists in SMSF setup, compliance, audit, and tax planning.",
  "financial-planners": "Find a qualified financial planner for retirement planning, wealth management, super consolidation, and investment strategy.",
  "property-advisors": "Browse property investment advisors who can help with investment property analysis, SMSF property, and portfolio construction.",
  "tax-agents": "Find tax agents specialising in investment tax, CGT optimisation, crypto tax, and complex investment structures.",
  "mortgage-brokers": "Compare mortgage brokers for investment property loans, refinancing, and home loan structuring.",
  "estate-planners": "Find estate planning specialists for wills, trusts, succession planning, and intergenerational wealth transfer.",
  "insurance-brokers": "Compare insurance brokers for life insurance, TPD, income protection, and general insurance across Australia.",
  "buyers-agents": "Find qualified buyers agents to help you find, evaluate, and negotiate investment property purchases.",
  "real-estate-agents": "Compare licensed real estate agents across Australia for selling residential and investment property. Find agents with strong local sales records.",
  "wealth-managers": "Browse wealth managers for high-net-worth portfolio management, asset allocation, and comprehensive wealth strategy.",
  "aged-care-advisors": "Find aged care advisors who specialise in residential aged care, home care packages, means testing, and retirement transitions.",
  "crypto-advisors": "Compare crypto and digital asset advisors for portfolio construction, tax planning, and DeFi strategy in Australia.",
  "debt-counsellors": "Find accredited debt counsellors for debt consolidation, hardship applications, budgeting, and financial recovery.",
  "real-estate-agents": "Find licensed real estate agents for property sales, purchases, leasing, and property management across Australia.",
};

const TYPE_FAQS: Record<string, { q: string; a: string }[]> = {
  "smsf-accountants": [
    { q: "How much does an SMSF accountant cost?", a: "SMSF accountants typically charge $1,500–$5,000 per year for ongoing compliance, administration, and annual audit. Setup fees range from $1,000–$3,000." },
    { q: "Do I need a separate SMSF auditor?", a: "Yes. Australian law requires your SMSF to be audited annually by an independent ASIC-registered auditor. Your SMSF accountant will usually arrange this." },
    { q: "Can my regular accountant manage my SMSF?", a: "They can, but it's recommended to use a specialist. SMSF compliance is complex and penalties for non-compliance are severe. A specialist reduces your risk." },
  ],
  "financial-planners": [
    { q: "How much does a financial planner charge?", a: "A Statement of Advice (SOA) typically costs $2,500–$5,500. Ongoing advice fees range from $2,000–$8,000 per year depending on complexity." },
    { q: "What's the difference between a financial planner and a financial advisor?", a: "In Australia, both terms are regulated. A 'financial planner' and 'financial adviser' must hold an AFSL or be an authorised representative of an AFSL holder. They're functionally the same." },
    { q: "Do I need a financial planner or can I invest myself?", a: "It depends on your complexity. For straightforward ETF investing, a platform comparison may be enough. For retirement planning, tax structuring, or amounts over $200k, professional advice often pays for itself." },
  ],
  "property-advisors": [
    { q: "What does a property investment advisor do?", a: "They help you assess investment properties, model returns, understand tax implications, and decide whether property fits your overall investment strategy. Some also help with SMSF property purchases." },
    { q: "How are property advisors paid?", a: "Fee-for-service advisors charge $2,000–$5,000 for a property strategy. Be cautious of 'free' advisors who earn commissions from developers — this creates conflicts of interest." },
    { q: "Should I buy property or invest in shares?", a: "This depends on your goals, timeline, and risk tolerance. A property advisor can model both scenarios for your specific situation." },
  ],
  "tax-agents": [
    { q: "When do I need a tax agent for investments?", a: "If you have capital gains events, international income, crypto holdings, investment property, or complex structures like trusts or SMSFs. A standard tax return with only salary and a few dividends is usually manageable yourself." },
    { q: "How much does a tax agent cost for investment tax?", a: "Expect $300–$800 for a return with investment income, CGT events, and deductions. Complex returns with crypto, property, or international holdings can be $800–$2,000+." },
    { q: "Can a tax agent help reduce my capital gains tax?", a: "Yes. They can advise on CGT discount eligibility, tax-loss harvesting, timing of disposals, and structuring to minimise tax. The savings often exceed their fee." },
  ],
  "mortgage-brokers": [
    { q: "Do mortgage brokers charge a fee?", a: "Most Australian mortgage brokers don't charge the borrower directly — they earn commission from lenders. Some charge a fee for complex scenarios." },
    { q: "Is a mortgage broker better than going to my bank?", a: "Brokers compare products from 20-40+ lenders, which often results in better rates or features than your bank's single offering." },
    { q: "Can a mortgage broker help with investment property loans?", a: "Yes, and investment property lending has specific requirements (higher deposits, different interest rates) that brokers specialise in." },
  ],
  "estate-planners": [
    { q: "When do I need estate planning?", a: "If you have assets worth more than $500k, dependents, a blended family, business interests, or an SMSF. Estate planning ensures your wealth is distributed according to your wishes." },
    { q: "What does estate planning include?", a: "Typically: wills, powers of attorney, trust structures, superannuation death benefit nominations, and succession planning for businesses or farms." },
    { q: "How much does estate planning cost?", a: "A basic will costs $500–$1,500. Comprehensive estate planning with trusts and complex structures can be $3,000–$10,000+." },
  ],
  "insurance-brokers": [
    { q: "What does an insurance broker do?", a: "An insurance broker compares policies across multiple insurers to find the best life, TPD, income protection, or trauma cover for your situation. They handle claims and annual reviews." },
    { q: "How much does an insurance broker cost?", a: "Most insurance brokers are paid by commission from insurers — their service is typically free to you. Some fee-for-service brokers charge $500–$2,000 for comprehensive advice." },
    { q: "Should I use a broker or go directly to an insurer?", a: "Brokers compare dozens of insurers and can find better value, particularly for complex needs. Going direct limits you to one insurer's products." },
  ],
  "buyers-agents": [
    { q: "What does a buyers agent do?", a: "A buyers agent searches for, evaluates, and negotiates property purchases on your behalf. They work exclusively for you — not the seller — and have access to off-market properties." },
    { q: "How much does a buyers agent charge?", a: "Typically 1.5–3% of the purchase price, or a fixed fee of $10,000–$25,000. Some charge a retainer plus a success fee." },
    { q: "Is a buyers agent worth it?", a: "For investment property, buyers agents often negotiate savings that exceed their fee. They also save significant time and reduce emotional decision-making." },
  ],
  "real-estate-agents": [
    { q: "How much do real estate agents charge?", a: "Most Australian real estate agents charge a commission of 1.5–2.5% of the sale price, plus marketing costs ($2,000–$10,000+). Rates vary by state and property value." },
    { q: "How do I choose a good real estate agent?", a: "Look at their recent sales in your suburb, average days on market, sale-to-list price ratio, and marketing approach. Ask for references from recent sellers." },
    { q: "Should I use one agent or list with multiple?", a: "An exclusive listing with one agent is standard in Australia and usually gets better results — the agent invests more in marketing and is more motivated to achieve the best price." },
  ],
  "wealth-managers": [
    { q: "What's the difference between a wealth manager and a financial planner?", a: "Wealth managers typically serve high-net-worth clients ($500k+ portfolios) with comprehensive services including investment management, tax strategy, estate planning, and philanthropic giving — all under one roof." },
    { q: "How much do wealth managers charge?", a: "Most charge 0.5–1.5% of assets under management (AUM) per year. On a $1M portfolio, that's $5,000–$15,000 annually. Some also charge performance fees." },
    { q: "When do I need a wealth manager vs a financial planner?", a: "If you have $500k+ in investable assets and want active portfolio management, tax optimisation, and integrated advice across multiple areas, a wealth manager may be more appropriate." },
  ],
  "aged-care-advisors": [
    { q: "What does an aged care advisor do?", a: "They help navigate residential aged care, home care packages, means testing for government subsidies, Refundable Accommodation Deposits (RADs), and the financial implications of aged care decisions." },
    { q: "How much does aged care advice cost?", a: "Aged care financial advice typically costs $2,000–$5,000 for a comprehensive plan covering accommodation, means testing, and asset strategies." },
    { q: "When should I get aged care advice?", a: "Ideally before a crisis — when a parent or loved one starts needing care. Early planning can save tens of thousands in accommodation costs and maximise government subsidies." },
  ],
  "crypto-advisors": [
    { q: "Do I need a crypto advisor?", a: "If you hold significant crypto assets, use DeFi protocols, have complex tax events from trading, or want to integrate crypto into your broader investment strategy, a specialist advisor can help." },
    { q: "What qualifications should a crypto advisor have?", a: "They should hold an AFSL or be an authorised representative, and have specific experience with digital assets. Look for CFP or CFA credentials alongside crypto-specific knowledge." },
    { q: "How can a crypto advisor help with tax?", a: "They can advise on CGT treatment of crypto disposals, DeFi income classification, airdrop and staking tax treatment, and cost base tracking — often saving thousands in tax." },
  ],
  "debt-counsellors": [
    { q: "Is debt counselling free?", a: "Financial counselling through not-for-profit services (like the National Debt Helpline) is free. Private debt management services may charge fees — always ask upfront." },
    { q: "What can a debt counsellor help with?", a: "They help with budgeting, debt consolidation strategies, negotiating hardship arrangements with creditors, understanding your rights, and creating a plan to become debt-free." },
    { q: "Will debt counselling affect my credit score?", a: "Seeing a counsellor does not affect your credit score. However, some debt solutions they recommend (like Part IX agreements or bankruptcy) will appear on your credit report." },
  ],
};

const TYPE_EDITORIAL: Record<string, { howToChoose: string[]; costGuide: string; industryInsight: string }> = {
  "smsf-accountants": {
    howToChoose: [
      "Verify they're a registered SMSF auditor or work with one — your fund needs an independent audit annually",
      "Ask about their experience with your investment types (property in SMSF, crypto, international shares)",
      "Check they use cloud-based SMSF software (Class Super, BGL) for real-time reporting",
      "Confirm their fee includes all compliance work: annual return, audit coordination, and ATO lodgement",
    ],
    costGuide: "SMSF accountants typically charge $1,500–$5,000/year for ongoing compliance and administration. Setup fees range from $1,000–$3,000. Funds under $200k may find an SMSF isn't cost-effective due to fixed fees.",
    industryInsight: "The ATO has been increasing scrutiny on SMSF compliance since 2024, with a focus on in-house asset rules and related party transactions. A specialist accountant significantly reduces your risk of penalties.",
  },
  "financial-planners": {
    howToChoose: [
      "Check they're listed on the ASIC Financial Advisers Register and hold a current authorisation",
      "Ask whether they're fee-for-service or commission-based — fee-only planners have fewer conflicts of interest",
      "Look for relevant credentials: CFP (Certified Financial Planner) is the gold standard in Australia",
      "Request a sample Statement of Advice (SOA) to understand their advice quality and style",
    ],
    costGuide: "A Statement of Advice (SOA) typically costs $2,500–$5,500. Ongoing advice retainers range from $2,000–$8,000/year. Some planners offer initial consultations for free or $200–$500.",
    industryInsight: "Following the Hayne Royal Commission, Australian financial planning has shifted heavily toward fee-for-service models. The number of licensed advisers dropped 40% since 2019, making qualified planners more in-demand than ever.",
  },
  "property-advisors": {
    howToChoose: [
      "Ensure they're independent and don't earn commissions from property developers or agents",
      "Ask about their modelling approach — good advisors run cash flow projections over 10+ years",
      "Check if they can advise on SMSF property purchases if relevant to your situation",
      "Look for advisors who consider your entire financial picture, not just property in isolation",
    ],
    costGuide: "Fee-for-service property advisors charge $2,000–$5,000 for a comprehensive property strategy. Be cautious of 'free' advice from advisors who earn developer commissions — this creates significant conflicts of interest.",
    industryInsight: "With Australian property prices at record highs in most capitals, independent property advice has become critical. Quality advisors help you avoid overpaying and ensure property fits your overall investment strategy.",
  },
  "tax-agents": {
    howToChoose: [
      "Verify they're registered with the Tax Practitioners Board (TPB) — this is a legal requirement",
      "Ask about their experience with investment-specific tax: CGT, crypto, international income, trusts",
      "Check if they use cloud accounting software that integrates with your broker's tax reports",
      "Confirm they can handle your specific needs: are they just lodging returns, or providing strategic tax advice?",
    ],
    costGuide: "Investment tax returns typically cost $300–$800. Complex returns with crypto, property, and international holdings can be $800–$2,000+. Strategic tax planning advice is usually $1,000–$3,000 for a comprehensive review.",
    industryInsight: "The ATO has significantly increased its data matching for share trading, crypto, and property transactions. Having a specialist tax agent ensures you claim all legitimate deductions while staying compliant.",
  },
  "mortgage-brokers": {
    howToChoose: [
      "Ask how many lenders they compare — good brokers access 20-40+ lenders on their panel",
      "Check if they specialise in investment property lending, which has different requirements from owner-occupier loans",
      "Ask about their trail commission disclosure — transparency about how they're paid builds trust",
      "Look for brokers who explain the 'why' behind their recommendations, not just the rate",
    ],
    costGuide: "Most mortgage brokers don't charge borrowers directly — they earn commissions from lenders (typically 0.5–0.7% upfront + 0.15% trail). Some charge $1,000–$3,000 for complex scenarios like commercial lending.",
    industryInsight: "Mortgage brokers now write over 70% of all Australian home loans. The best-interest duty introduced in 2021 requires brokers to demonstrate why their recommendation suits your circumstances.",
  },
  "estate-planners": {
    howToChoose: [
      "Ensure they specialise in estate planning, not just general law — estate law is complex and state-specific",
      "Ask about their experience with superannuation death benefit nominations and binding nominations",
      "Check if they coordinate with your financial planner and accountant for a comprehensive approach",
      "Look for practitioners who review and update plans regularly, not just set-and-forget",
    ],
    costGuide: "A basic will costs $500–$1,500. Comprehensive estate planning with testamentary trusts, powers of attorney, and succession planning can be $3,000–$10,000+. Annual reviews are typically $500–$1,000.",
    industryInsight: "With $3.5 trillion expected to transfer between generations in Australia over the next 20 years, estate planning has become essential. Poorly structured estates can lose 30%+ to tax and disputes.",
  },
  "insurance-brokers": {
    howToChoose: [
      "Check they compare policies across multiple insurers — not just one or two preferred partners",
      "Ask about their claims experience: a good broker advocates for you during the claims process",
      "Ensure they conduct a thorough needs analysis before recommending cover levels",
      "Look for brokers who provide annual reviews to ensure your cover keeps pace with your life changes",
    ],
    costGuide: "Most insurance brokers earn commissions from insurers (typically 20-30% of first-year premium). Fee-for-service brokers charge $500–$2,000 for comprehensive advice. Some offer hybrid models.",
    industryInsight: "Australia is significantly underinsured — the average life insurance gap is over $500,000 per household. Quality insurance advice can mean the difference between financial security and hardship if the unexpected happens.",
  },
  "buyers-agents": {
    howToChoose: [
      "Verify they hold a real estate licence in the state where you're purchasing — this is a legal requirement",
      "Ask about their fee structure: fixed fee, percentage of purchase price, or retainer plus success fee",
      "Check their track record: ask for recent comparable purchases and savings negotiated",
      "Ensure they have access to off-market properties and developer relationships in your target area",
    ],
    costGuide: "Buyers agents typically charge 1.5–3% of the purchase price, or a fixed fee of $10,000–$25,000. Some charge a retainer ($2,000–$5,000) plus a success fee. For a $800k property, expect $12,000–$24,000.",
    industryInsight: "Buyers agents have grown rapidly in Australia, now representing over 10% of all residential property transactions in major cities. They're particularly valuable in competitive markets where off-market access gives a significant advantage.",
  },
  "real-estate-agents": {
    howToChoose: [
      "Check their recent sales in your suburb — not just total sales, but average days on market and sale-to-list ratio",
      "Ask about their marketing plan: professional photography, floorplans, digital advertising, and open home strategy",
      "Compare commission rates and what's included — some agents bundle marketing into their commission, others charge separately",
      "Ask for references from recent vendors who sold similar properties in your area",
    ],
    costGuide: "Commission rates range from 1.5–2.5% of the sale price (lower in metro areas, higher in regional). Marketing costs are typically $2,000–$10,000+ depending on the campaign. Some agents offer tiered commission structures to incentivise a higher sale price.",
    industryInsight: "The Australian real estate agent market is highly competitive, with over 50,000 licensed agents nationally. The best agents sell properties faster and for higher prices — top-performing agents typically achieve 5–10% more than average agents in the same area.",
  },
  "wealth-managers": {
    howToChoose: [
      "Verify they hold an AFSL and have experience managing portfolios of your size and complexity",
      "Understand their fee structure: AUM-based (0.5–1.5%), fixed fee, or hybrid — and what's included",
      "Ask about their investment philosophy and how they construct portfolios",
      "Check if they provide integrated services (tax, estate, insurance) or coordinate with your other advisors",
    ],
    costGuide: "Wealth managers typically charge 0.5–1.5% of assets under management annually. On a $1M portfolio, that's $5,000–$15,000/year. Some also charge performance fees or minimum engagement fees of $5,000–$10,000.",
    industryInsight: "The Australian wealth management industry manages over $4 trillion in assets. The trend is toward comprehensive, goals-based advice rather than just investment management — the best wealth managers integrate tax, estate, and insurance planning.",
  },
  "aged-care-advisors": {
    howToChoose: [
      "Look for advisors with specific aged care accreditation or significant experience in the sector",
      "Ask about their knowledge of means testing, RADs (Refundable Accommodation Deposits), and DAPs",
      "Check if they can coordinate with Centrelink and My Aged Care on your behalf",
      "Ensure they consider the financial impact on the broader family, not just the person entering care",
    ],
    costGuide: "Aged care financial advice typically costs $2,000–$5,000 for a comprehensive plan. This covers accommodation analysis, means testing optimisation, and asset restructuring. Early planning can save $50,000+ in accommodation costs.",
    industryInsight: "With Australia's ageing population, aged care planning has become one of the fastest-growing advice areas. The 2024 aged care reforms have made specialist advice more important than ever for navigating the new funding models.",
  },
  "crypto-advisors": {
    howToChoose: [
      "Verify they hold an AFSL or are an authorised representative — crypto advice without a licence is illegal in Australia",
      "Ask about their personal crypto experience and knowledge of DeFi, staking, and different blockchain ecosystems",
      "Check they understand Australian crypto tax rules: CGT events, cost base tracking, and DeFi income classification",
      "Look for advisors who integrate crypto into your overall portfolio strategy, not just crypto-only advice",
    ],
    costGuide: "Crypto advisory fees range from $2,000–$5,000 for initial portfolio strategy. Ongoing management or advice retainers cost $1,500–$4,000/year. Tax preparation for complex crypto portfolios is typically $800–$2,000+.",
    industryInsight: "Australia is one of the leading crypto-adopting nations, with over 25% of adults holding digital assets. As regulations tighten, having a licensed crypto advisor ensures your portfolio complies with evolving ASIC and ATO requirements.",
  },
  "debt-counsellors": {
    howToChoose: [
      "Start with free services: the National Debt Helpline (1800 007 007) provides free, independent financial counselling",
      "If using a private service, verify they're accredited with the Financial Counselling Association of Australia",
      "Be wary of debt management companies that charge large upfront fees — reputable counsellors are affordable or free",
      "Ask about their experience with your specific type of debt: credit cards, personal loans, investment losses, or ATO debts",
    ],
    costGuide: "Financial counselling through not-for-profit services is free. Private debt management services range from $500–$3,000 depending on complexity. Avoid services charging percentage-based fees on your total debt — this is a red flag.",
    industryInsight: "Australian household debt-to-income ratio is among the highest globally at over 180%. Rising interest rates have increased demand for debt counselling services, with the National Debt Helpline reporting record call volumes.",
  },
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_TYPE).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type: typeSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  if (!professionalType) return {};

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const title = `Best ${label}s in Australia (${CURRENT_YEAR}) — Find & Compare`;
  const description = TYPE_DESCRIPTIONS[typeSlug] || `Find verified ${label.toLowerCase()}s across Australia. Free consultation requests.`;

  return {
    title,
    description,
    openGraph: { title: `${label}s — Invest.com.au`, description },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/advisors/${typeSlug}` },
  };
}

export default async function AdvisorTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type: typeSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  if (!professionalType) notFound();

  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("type", professionalType)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const faqs = TYPE_FAQS[typeSlug] || [];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: `${label}s` },
  ]);

  const faqLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <AdvisorsClient
        professionals={(professionals as Professional[]) || []}
        initialType={professionalType}
        pageTitle={`${label}s in Australia`}
        pageDescription={TYPE_DESCRIPTIONS[typeSlug]}
        faqs={faqs}
        editorial={TYPE_EDITORIAL[typeSlug]}
      />
    </>
  );
}
