import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `First Home Buyer Deposit Guide — How Much & Fastest Strategies (${CURRENT_YEAR}) | invest.com.au`,
  description: `How much deposit you need for a first home in Australia: 5% vs 10% vs 20%, LMI costs, FHSS, parental guarantee, and the fastest saving strategies for each major city. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Deposit Guide (${CURRENT_YEAR}) — How Much & How to Save`,
    description: "How much deposit for a first home in Australia: 5% vs 20%, LMI costs, FHSS, parental guarantee, fastest saving strategies.",
    url: `${SITE_URL}/first-home-buyer/deposit-guide`,
    images: [{ url: `/api/og?title=${encodeURIComponent("First Home Deposit Guide")}&sub=${encodeURIComponent("5% vs 20% · LMI · FHSS · Saving Strategies · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/deposit-guide` },
};

const DEPOSIT_SCENARIOS = [
  {
    deposit: "5% deposit (with FHBG)",
    amount: "$35,000 on $700k property",
    lmi: "None (government guarantee covers it)",
    pros: "Get into market sooner; save LMI cost of $15,000+",
    cons: "Higher LVR → may limit lender choice; still need genuine savings (not gifted); more mortgage to service",
  },
  {
    deposit: "5–10% (no guarantee)",
    amount: "$35k–$70k on $700k property",
    lmi: "$10,000–$20,000 (added to loan or paid upfront)",
    pros: "Enters market earlier than 20% savers",
    cons: "LMI adds to loan cost; some lenders require 10% genuine savings for 95% LVR",
  },
  {
    deposit: "20% deposit",
    amount: "$140,000 on $700k property",
    lmi: "None — standard LVR",
    pros: "No LMI; widest lender choice; lower ongoing repayments",
    cons: "Takes longer to save; opportunity cost if property prices rise while saving",
  },
  {
    deposit: "Parental / family guarantee",
    amount: "Use parents&apos; equity to supplement or replace deposit",
    lmi: "None (guarantor eliminates LMI requirement)",
    pros: "Fastest path into market with low savings; no LMI cost",
    cons: "Parents&apos; property is at risk if you default; complex legal arrangement; requires specialist legal advice",
  },
];

const SAVING_STRATEGIES = [
  { strategy: "FHSS salary sacrifice", detail: "Contribute $15,000/year to super as salary sacrifice; withdraw up to $50,000 with tax advantage. For 37% marginal rate earners: saves ~$3,300/year vs cash savings." },
  { strategy: "High-interest savings account", detail: "Lock savings in a HISA targeting 4–5% p.a. Compare accounts at /compare. Bonus interest rates often require minimum monthly deposits or no withdrawals." },
  { strategy: "Term deposits for 6–24 month horizons", detail: "Lock-in rates above the RBA cash rate for predictable returns. Best for savers with a firm timeline 12–24 months away." },
  { strategy: "Reduce rent by 20–30%", detail: "The largest lever: moving to a cheaper suburb, share house, or temporarily back to family can add $1,000–$2,000/month to savings. The maths on moving location often beats investment returns." },
  { strategy: "First Home Buyer concessions", detail: "Many states offer stamp duty concessions or exemptions for first home buyers — up to $65,000 in NSW. Factor this into your required savings target, not just the deposit." },
];

const FAQS = [
  {
    q: "What counts as genuine savings?",
    a: "Most lenders require that some portion of your deposit comes from &apos;genuine savings&apos; — typically held in your own account for 3–6 months. What counts: regular salary deposits, FHSS withdrawals, term deposit balances, and savings accounts held in your name for 3+ months. What may NOT count (varies by lender): gifts from parents, inheritance received within the last 6 months, first home buyer grants (these are often counted toward deposit but not always toward genuine savings), proceeds from the sale of assets held less than 3 months. At 90%+ LVR, most lenders require 5% genuine savings. At 80% LVR, genuine savings requirements are more flexible.",
  },
  {
    q: "How do I calculate the total cost of buying including stamp duty and other costs?",
    a: "Total first home buying costs: (1) Deposit (5–20% of property price); (2) Stamp duty (varies by state; first home buyer concessions reduce or eliminate this for lower-priced properties); (3) Conveyancing/legal fees: $800–$2,500; (4) Building and pest inspection: $300–$800; (5) Lenders Mortgage Insurance (if applicable): $5,000–$25,000; (6) Loan application and establishment fees: $0–$1,000; (7) Moving costs: $500–$2,000; (8) Building insurance (required at settlement): $800–$2,500/year. Budget approximately 3–5% of property price above your deposit for these costs.",
  },
  {
    q: "Can my parents gift me money for a deposit?",
    a: "Yes — parents can gift money for a deposit. Most lenders accept gifted deposits from direct family members (parents, grandparents, siblings), though some require a &apos;gift letter&apos; confirming the funds are not a loan. Gifted money typically doesn&apos;t count as &apos;genuine savings&apos; for lenders requiring a 3-month savings history — you may need to have the funds in your account for 3 months before some lenders accept them. For family guarantee arrangements (parents using their own equity), the legal structure is more complex — get legal advice before proceeding.",
  },
  {
    q: "How long will it take to save a 20% deposit in major Australian cities?",
    a: "Approximate time to save a 20% deposit (assuming median house prices and 20% savings rate on median income): Sydney median house (~$1.4M) at 20% = $280,000 deposit — approximately 10–12 years. Melbourne median (~$900k) at 20% = $180,000 — approximately 7–8 years. Brisbane/Perth ($700–$850k) — approximately 5–7 years. For units: 2–4 years faster. Most first home buyers in Sydney and Melbourne use lower deposits (5–10% via FHBG) rather than saving to 20% — the maths of saving vs the property market appreciation often favours getting in earlier with a lower deposit and FHSS.",
  },
];

export default function DepositGuidePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "Deposit Guide" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/first-home-buyer" className="hover:text-slate-900">First Home Buyer</Link><span>/</span>
            <span className="text-slate-900 font-medium">Deposit Guide</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            First home deposit guide: how much you need &amp; how to save faster
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            You need 5–20% deposit to buy your first home — plus 3–5% for stamp duty and costs.
            The First Home Guarantee lets you enter with 5% and no LMI. The FHSS saves tax on your
            deposit savings. Here&apos;s the full picture on deposit size, LMI, and saving strategies.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Deposit scenarios */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Deposit size options compared</h2>
          <div className="space-y-4">
            {DEPOSIT_SCENARIOS.map((d, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{d.deposit}</p>
                  <p className="text-xs text-slate-400">{d.amount}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-3 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">LMI cost</p>
                    <p className="text-sm text-slate-700">{d.lmi}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Pros</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{d.pros}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Cons</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{d.cons}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Saving strategies */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Fastest deposit saving strategies</h2>
          <div className="space-y-3">
            {SAVING_STRATEGIES.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="font-bold text-slate-900 mb-1">{s.strategy}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/first-home-buyer/fhss-guide", label: "FHSS guide" },
              { href: "/first-home-buyer/first-home-guarantee", label: "First Home Guarantee" },
              { href: "/first-home-buyer/stamp-duty", label: "Stamp duty guide" },
              { href: "/savings", label: "Compare savings accounts" },
              { href: "/first-home-buyer", label: "First home buyer hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Property prices, lender requirements, and scheme eligibility rules change frequently. This page is general information only; it is not financial or credit advice. Consult a licensed mortgage broker for personalised deposit and home loan advice.
          </p>
        </div>
      </section>
    </div>
  );
}
