import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is a catastrophe bond (cat bond) and how does it pay?",
    a: "A catastrophe bond is a capital market instrument that transfers insurance risk to investors. The sponsor (insurer or reinsurer) pays a coupon (SOFR + 5–15% depending on risk) to investors. If a defined catastrophe event occurs and losses exceed the trigger threshold, investors lose some or all of their principal — which compensates the sponsor for losses. Cat bonds are typically 3-year structures, fully collateralised in US Treasuries. Since the Swiss Re Cat Bond Index launched in 2002, the asset class has returned approximately 7–9% p.a. with low correlation to equities.",
  },
  {
    q: "What types of ILS instruments exist beyond cat bonds?",
    a: "The ILS universe includes: (1) Catastrophe bonds (fully securitised, liquid secondary market); (2) Collateralised reinsurance (private treaty, no secondary market, higher yield); (3) Industry Loss Warranties (ILWs — triggered by industry-wide losses, not individual insurer losses); (4) Sidecars (quota-share participation in a reinsurer&apos;s book for a single year); (5) Reinsurance-linked notes; (6) Longevity swaps (transferring mortality/longevity risk). Most retail and institutional access is via cat bond mutual funds or ILS specialist fund managers.",
  },
  {
    q: "Are Australian catastrophe events included in cat bond triggers?",
    a: "Yes — Australian perils are covered in multi-peril cat bonds and through dedicated Pacific/Australasian instruments. Covered perils include Australian Tropical Cyclone (Nth Queensland, WA), Eastern Australian Floods (Brisbane, NSW), and Australian Earthquake/Storm. Most Australian peril exposure is bundled within multi-territory bonds alongside US hurricane, European windstorm and Japanese earthquake. Dedicated Australian peril bonds are less common but have been issued by large Australian insurers and ARPC (Australian Reinsurance Pool Corporation).",
  },
  {
    q: "Can Australian retail investors access ILS funds?",
    a: "Most ILS funds are wholesale-only (s708 sophisticated or institutional). Exceptions: some ASX-listed investment companies (e.g. IML, Perpetual) have small indirect ILS exposures. Globally, Pioneer Natural Resources CAT funds and Zurich-listed cat bond ETFs are available to retail investors in their respective jurisdictions but not registered as Australian retail managed investment schemes. The easiest path for Australian retail investors is listed reinsurance equities (Munich Re, Hannover Re, Swiss Re on European exchanges, or ASX-listed IAG and QBE as direct insurers).",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Invest in Insurance-Linked Securities in Australia (${CURRENT_YEAR}) — Cat Bonds & ILS`,
  description:
    "Guide to ILS investing for Australians — catastrophe bonds, collateralised reinsurance, ILS funds, risk-return profiles and Australian peril exposure.",
  alternates: { canonical: `${SITE_URL}/invest/insurance-linked-securities` },
  openGraph: {
    title: `Insurance-Linked Securities for Australian Investors (${CURRENT_YEAR})`,
    description: "Cat bonds, ILS funds and uncorrelated reinsurance risk-return for Australians.",
    url: `${SITE_URL}/invest/insurance-linked-securities`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Insurance-Linked Securities Australia")}&sub=${encodeURIComponent("ILS · Cat Bonds · Non-Correlated Returns · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function InsuranceLinkedSecuritiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Insurance-Linked Securities", url: absoluteUrl("/invest/insurance-linked-securities") },
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
              <span className="text-white font-medium">Insurance-Linked Securities</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-rose-600 text-white px-3 py-1 rounded-full">Low Equity Correlation</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Insurance-Linked Securities for Australian Investors
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              ILS — led by catastrophe bonds — transfer natural disaster risk from insurers to capital markets. The $100B+ global cat bond market pays floating + 5–15% yields with near-zero correlation to equities and credit.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "$100B+", l: "Global cat bond market", sub: "outstanding notional" },
                { v: "7–9%", l: "Historical annual return", sub: "Swiss Re Cat Bond Index" },
                { v: "~0.0", l: "Equity correlation", sub: "vs S&P 500 since 2002" },
                { v: "3 yrs", l: "Typical bond tenor", sub: "with reset option" },
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

        {/* ILS structure explainer */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">How ILS works</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Insurance risk flows from property owners → primary insurers → reinsurers → capital markets. ILS sits at the capital markets end: a Special Purpose Vehicle (SPV) issues bonds to investors, parks proceeds in high-grade collateral, and pays the reinsurance premium to a ceding insurer as a coupon. If a qualifying catastrophe triggers the bond, part or all of the collateral is transferred to the insurer. If no qualifying event occurs, investors receive their principal back at maturity.
            </p>
            <div className="space-y-4">
              {[
                {
                  title: "Cat bonds — the liquid core",
                  badge: "Rated / listed",
                  body: "Cat bonds are rated by S&P, Fitch or AM Best, have a CUSIP/ISIN, and trade in an OTC secondary market facilitated by Swiss Re Capital Markets, GC Securities and others. The $100B outstanding market is dominated by US hurricane, European windstorm and Japanese earthquake perils. Australian perils (tropical cyclone, floods, bushfire) represent ~5–10% of the outstanding market.",
                },
                {
                  title: "Collateralised reinsurance — the higher-yield private market",
                  badge: "Wholesale only",
                  body: "Private collateralised reinsurance contracts are bilateral treaty agreements between a reinsurer and an ILS fund. Yields are typically 2–4% higher than comparably rated cat bonds, but there is no secondary market, lockup periods apply, and settlement of loss events can take 12–36 months (trapped capital risk). This is the dominant structure in specialist ILS funds.",
                },
                {
                  title: "ILS fund managers (wholesale access)",
                  badge: "Wholesale fund",
                  body: "Specialist ILS managers include Nephila (Markel), RenaissanceRe Ventures, Leadenhall Capital, Tangency Capital and Fermat Capital. Most Australian super funds access ILS via multi-strategy alternative funds run by Macquarie, IFM or QIC. Wholesale investors can access dedicated ILS funds with $100K–$500K minimums. Annual redemption windows with 12–18 month notice periods are standard.",
                },
                {
                  title: "Listed reinsurance equities (retail access)",
                  badge: "ASX-listed",
                  body: "IAG (ASX: IAG) and QBE (ASX: QBE) are Australian listed primary insurers with material reinsurance purchases — buying these provides indirect ILS-adjacent exposure. Global reinsurers Munich Re, Hannover Re and Swiss Re trade on Xetra and NYSE. These carry equity volatility on top of underwriting risk, providing a different risk/return profile than pure ILS.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-1 rounded-full">{item.badge}</span>
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
              href="/invest/insurance-linked-securities/listings"
              className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-200 rounded-2xl hover:border-rose-300 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-extrabold text-rose-900 text-lg">Browse ILS listings</p>
                <p className="text-sm text-rose-700 mt-0.5">ILS funds and reinsurance opportunities on invest.com.au</p>
              </div>
              <span className="text-rose-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Browse →</span>
            </Link>
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
              <Link href="/invest/alternatives" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Alternatives guide →</Link>
              <Link href="/advisors/wealth-managers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a wealth manager →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
