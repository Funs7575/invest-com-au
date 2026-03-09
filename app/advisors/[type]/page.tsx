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
  "wealth-managers": "wealth_manager",
  "aged-care-advisors": "aged_care_advisor",
  "crypto-advisors": "crypto_advisor",
  "debt-counsellors": "debt_counsellor",
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
  "wealth-managers": "Browse wealth managers for high-net-worth portfolio management, asset allocation, and comprehensive wealth strategy.",
  "aged-care-advisors": "Find aged care advisors who specialise in residential aged care, home care packages, means testing, and retirement transitions.",
  "crypto-advisors": "Compare crypto and digital asset advisors for portfolio construction, tax planning, and DeFi strategy in Australia.",
  "debt-counsellors": "Find accredited debt counsellors for debt consolidation, hardship applications, budgeting, and financial recovery.",
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
      />
    </>
  );
}
