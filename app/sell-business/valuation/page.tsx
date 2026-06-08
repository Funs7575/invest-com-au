import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ValuationClient from "./ValuationClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Business Valuation Calculator Australia: Estimate Sale Value | Invest.com.au",
  description:
    "Free business valuation calculator using EBITDA, revenue and asset-based methods. Get an indicative range across all three methods in 60 seconds.",
  alternates: { canonical: `${SITE_URL}/sell-business/valuation` },
  openGraph: {
    title: "Business Valuation Calculator Australia",
    description: "EBITDA, revenue and asset-based valuation — across the three methods.",
    url: `${SITE_URL}/sell-business/valuation`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Business Valuation Australia")}&sub=${encodeURIComponent("EBIT Multiple · DCF · Market Comparison · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const VALUATION_FAQS = [
  {
    q: "What is EBITDA and why is it used to value businesses?",
    a: "EBITDA stands for Earnings Before Interest, Tax, Depreciation, and Amortisation. It's used as a proxy for a business's underlying operating cash flow — stripping out financing decisions (interest), tax treatment (which varies by ownership structure), and non-cash accounting charges (depreciation, amortisation). Buyers and brokers apply a multiple to EBITDA to arrive at an enterprise value. Typical multiples for Australian SMEs range from 2–5x; profitable businesses in high-growth industries can fetch 6–8x. The multiple is driven by growth rate, industry, customer concentration, and the management team's independence from the owner.",
  },
  {
    q: "What is a revenue multiple valuation?",
    a: "A revenue multiple applies a ratio to total annual revenue rather than profit. It's used in SaaS, professional services, and early-stage businesses where EBITDA is thin or volatile. For example, a SaaS business growing 30% YoY might trade at 4–6x ARR. Revenue multiples are less commonly used for traditional SMEs (retail, hospitality, trades) where profitability is the primary metric. Revenue multiples tend to be lower than they sound: a 2x revenue multiple on a business with 20% margins is effectively a 10x EBITDA multiple.",
  },
  {
    q: "What is an asset-based valuation?",
    a: "An asset-based valuation sums the fair market value of all business assets (equipment, inventory, property, IP, receivables) minus liabilities. It represents the floor value — what you'd receive if you wound the business down and sold the parts. For asset-heavy businesses (manufacturing, logistics, property-adjacent), asset value can be the primary method. For service businesses where the value lies in relationships and processes, asset value is usually well below the going-concern value. If EBITDA and revenue multiples are higher than the asset value, that premium is the business's goodwill.",
  },
  {
    q: "Why do the three valuation methods give different numbers?",
    a: "Each method captures a different dimension of value. EBITDA multiple reflects earning power and is buyer-preferred for profitable businesses. Revenue multiple reflects growth potential and market share. Asset-based reflects liquidation floor. The market-clearing price is usually negotiated somewhere between the methods, weighted toward whichever metric is strongest for your business type. Brokers typically present all three in an Information Memorandum and argue for the highest supportable number. A buyer's accountant will usually push toward the lowest. The final price depends on competitive tension in the sale process.",
  },
];

const valuationFaqLd = faqJsonLd(VALUATION_FAQS);

export default function ValuationPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
    { name: "Valuation", url: absoluteUrl("/sell-business/valuation") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {valuationFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(valuationFaqLd) }} />
      )}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/sell-business" className="hover:text-white">Sell a Business</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Valuation</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Business Valuation Calculator Australia</h1>
            <p className="text-slate-300">A 60-second indicative range across three methods. The market-clearing valuation is usually the lowest of the three plus negotiation.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <ValuationClient />
          </div>
        </section>
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {VALUATION_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
