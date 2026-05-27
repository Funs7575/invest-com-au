import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "How is litigation funding regulated in Australia?",
    a: "After ASIC's attempts to require litigation funders to hold an Australian Financial Services Licence (AFSL) were overturned in LCM Funding Pty Ltd v Stanislawa Fasold [2023], most class action funding arrangements are not classified as managed investment schemes requiring AFSL licensing. However, professional litigation funders that pool retail capital into a fund structure may be caught as registered MIS. The ALRC recommended in 2018 that funders be licensed — this has not been legislated. Investors should confirm the regulatory classification of any specific vehicle before investing.",
  },
  {
    q: "What returns do litigation funders target?",
    a: "Returns are highly variable and contingent. Listed funders (Omni Bridgeway, LCM) target IRRs of 20–35% at the case level, though book-level performance after losses and costs is typically 12–20% IRR in strong years. Funders charge a commission on recoveries (typically 25–40% of the gross recovery) plus cost reimbursement. Settlement timing is unpredictable — average case duration in class actions is 3–5 years. Capital is 'locked in' until resolution; there is no coupon or periodic payment. Direct co-investment deals may return 2–3× invested capital on a 4–6 year case, or zero on a loss.",
  },
  {
    q: "Can retail investors access litigation funding?",
    a: "ASX-listed funders — Omni Bridgeway (OBL) and LCM Litigation Funding (LCF) — provide liquid equity exposure to diversified portfolios of funded cases. Retail investors can buy these shares like any other ASX stock. Direct case-by-case co-investment funds are wholesale-only (s708 thresholds apply). ASIC's 2020 MIS class orders required retail class action notices, which indirectly constrain how funders market to retail investors — but listed equity is unrestricted.",
  },
  {
    q: "What are the main risks of investing in litigation funding?",
    a: "Case-outcome risk (binary — you win or lose the claim), adverse costs orders (most funders provide ATE insurance cover), settlement discount risk (cases settle for less than expected recovery), capital lock-up (3–7 years with no liquidity on direct deals), regulatory risk (legislative reform could change the economic terms or enforceability of funding agreements), and concentration risk on specific practice areas (securities class actions, cartel damages, employment). Diversification across 15+ cases is standard practice for institutional funders.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Litigation Funding in Australia (${CURRENT_YEAR}) — Class Actions & Co-Investment`,
  description:
    "Guide to litigation funding investment in Australia. Omni Bridgeway, LCM, class action funding structures, target returns, risk factors and retail vs wholesale access.",
  alternates: { canonical: `${SITE_URL}/invest/litigation-funding` },
  openGraph: {
    title: `Litigation Funding Investment in Australia (${CURRENT_YEAR})`,
    description: "Class action co-investment, ASX-listed funders, and risk-return framework.",
    url: `${SITE_URL}/invest/litigation-funding`,
  },
};

export default function LitigationFundingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Litigation Funding", url: absoluteUrl("/invest/litigation-funding") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Litigation Funding</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Uncorrelated Returns</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Litigation Funding Investment in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Litigation funding backs legal claims in exchange for a share of recoveries — an asset class uncorrelated to equity markets. Australia hosts two ASX-listed funders and a deep OTC market for wholesale co-investors.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "20–35%", l: "Case-level IRR target", sub: "for major funders" },
                { v: "25–40%", l: "Commission on recovery", sub: "funder's typical share" },
                { v: "3–5 yrs", l: "Average case duration", sub: "class actions (AU)" },
                { v: "ASX", l: "OBL + LCF listed", sub: "retail-accessible equity" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Structure */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to access litigation funding as an investor</h2>
            <div className="space-y-4">
              {[
                {
                  title: "ASX-listed funders: Omni Bridgeway (OBL) & LCM (LCF)",
                  badge: "ASX-listed",
                  body: "Omni Bridgeway (formerly IMF Bentham) and LCM Litigation Funding are the two ASX-listed Australian litigation funders. They provide diversified exposure to portfolios of funded claims — securities class actions, cartel damages, international arbitration and insolvency recovery. NTA-based valuations are updated quarterly. These are liquid, regulated listed vehicles open to retail investors.",
                },
                {
                  title: "Direct case co-investment (wholesale)",
                  badge: "Wholesale",
                  body: "Some funders and law firms offer wholesale investors the opportunity to co-fund specific cases alongside the lead funder. Typical minimums: $500K–$5M. Returns depend on individual case outcomes. ATE (After The Event) insurance is typically required and paid from the funding envelope. Co-investors rank behind the funder&apos;s commission but ahead of residual plaintiff distribution in most structures.",
                },
                {
                  title: "Litigation funding private credit funds",
                  badge: "Wholesale fund",
                  body: "Structured as registered MIS, these funds pool wholesale capital across a diversified portfolio of 10–30 funded matters. Quarterly NAV calculations, annual liquidity windows. Fees: management fee (1–2%) plus carried interest (15–20% of net gains above an 8% hurdle). Australian examples include vehicles run by Vannin Capital, Bentham IMF legacy fund structures and independent syndicates.",
                },
                {
                  title: "Insolvency and liquidation recovery funding",
                  badge: "Specialist",
                  body: "Liquidators fund actions against former directors, related parties or counterparties using litigation funding, with the funder paid from recovered assets. Investors can access this via insolvency-focused distressed debt funds or via direct co-investment arrangements with insolvency practitioners. PPSA priority registration matters significantly for recovery ranking.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Listings CTA */}
        <section className="py-8 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <Link
              href="/invest/litigation-funding/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/40 border border-blue-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-blue-900 text-lg">Browse litigation funding listings</p>
                <p className="text-sm text-blue-700 mt-0.5">Active case funding and co-investment opportunities on invest.com.au</p>
              </div>
              <span className="text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
            </Link>
          </div>
        </section>

        {/* Risk callout */}
        <section className="py-10 bg-red-50 border-y border-red-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-lg font-extrabold text-red-900 mb-2">Key risk factors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { t: "Binary outcome risk", b: "You win or lose. A loss returns zero on your case investment after ATE insurance (which covers adverse costs, not capital)." },
                { t: "Capital lock-up", b: "3–7 years with no liquidity on direct deals. ASX-listed shares provide exit but at market price, which may be at a discount to NTA." },
                { t: "Settlement discount risk", b: "Defendants may pressure plaintiffs to settle early at below-expected recoveries, reducing funder returns materially." },
                { t: "Regulatory change", b: "Class action reform legislation could limit funding agreements, impose caps on funder commissions, or require licensing — all affecting returns." },
              ].map((r) => (
                <div key={r.t} className="rounded-lg bg-white border border-red-200 p-4">
                  <p className="font-bold text-red-900 text-sm mb-1">{r.t}</p>
                  <p className="text-xs text-red-800 leading-relaxed">{r.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All investment categories →</Link>
              <Link href="/invest/private-credit" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Private credit guide →</Link>
              <Link href="/advisors/wealth-managers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a wealth manager →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
