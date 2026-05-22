import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
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
  },
};

const VALUATION_FAQS = faqJsonLd([
  {
    q: "How is a small business valued in Australia?",
    a: "Small businesses in Australia are most commonly valued using an EBITDA multiple, a revenue multiple, or an asset-based method. Service businesses with recurring revenue trade on EBITDA multiples of 2–4×; retail and trade businesses are typically lower. The asset-based method is used when the business has significant tangible assets or when earnings are minimal. In practice, the market price is whatever a willing buyer pays — the multiple is a starting point for negotiation.",
  },
  {
    q: "What is EBITDA and how is it used to value a business?",
    a: "EBITDA stands for Earnings Before Interest, Tax, Depreciation and Amortisation. It is used as a proxy for operating cash flow — stripping out financing structure, tax and non-cash charges to make businesses comparable. A business with $300,000 EBITDA and a 3× multiple has an indicative value of $900,000. Buyers and their accountants will scrutinise the EBITDA figure heavily, often adding back owner's salary above market and one-off expenses.",
  },
  {
    q: "What is a reasonable multiple to sell a business for in Australia?",
    a: "For small businesses (under $2M EBITDA), 2–4× EBITDA is typical in Australia. Professional services firms with sticky recurring revenue can attract 4–6×. Trades and retail with owner-dependent revenue often sit at 1.5–2.5×. Higher multiples reflect stronger recurring revenue, documented systems, multiple revenue streams and reduced key-person dependency. Larger businesses (over $5M EBITDA) attract higher multiples and private equity interest.",
  },
  {
    q: "How does seller finance work when selling a business?",
    a: "Seller finance (also called vendor finance) is when the seller agrees to accept part of the purchase price over time rather than as a lump sum at settlement. For example, the buyer pays 70% at settlement and 30% over two years. It helps buyers who cannot fully fund the purchase and can increase the pool of buyers. For sellers, it carries credit risk — if the buyer fails, recovery can be difficult. Seller finance is more common in smaller deals where bank finance is harder to obtain.",
  },
  {
    q: "Can I get a business valuation for free?",
    a: "An indicative valuation range can be calculated for free using an EBITDA or revenue multiple calculator. However, a formal business valuation for sale, legal, or dispute purposes requires a qualified business valuer and carries a professional fee. For most small business sales, a broker's indicative valuation (usually free as part of a listing assessment) is sufficient to set an asking price — a formal certified valuation is mainly required for partnership disputes, insurance, or family law proceedings.",
  },
]);

export default function ValuationPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
    { name: "Valuation", url: absoluteUrl("/sell-business/valuation") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(VALUATION_FAQS) }} />
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
      </div>
    </>
  );
}
