import { Suspense } from "react";
import { UPDATED_LABEL } from "@/lib/seo";
import ETFCompareClient from "./ETFCompareClient";
import CompareNav from "../CompareNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";
import { faqJsonLd } from "@/lib/schema-markup";

const ETF_FAQS = [
  {
    q: "What is an ETF and how do I buy one in Australia?",
    a: "An ETF (Exchange Traded Fund) is a basket of securities that trades on the ASX like a single share. Australian ETFs cover domestic shares (ASX 200), global shares, bonds, property, commodities, and thematic sectors. You buy ETFs through any ASX broker — CommSec, SelfWealth, Stake, Pearler, CMC — by placing a market or limit order during ASX trading hours. The minimum investment is typically the price of one unit (often $5–$100 depending on the ETF). You pay brokerage on each transaction, the same as for shares.",
  },
  {
    q: "What are the cheapest Australian ETFs by management fee?",
    a: "The lowest-cost Australian ETFs by management expense ratio (MER): Vanguard Australian Shares ETF (VAS) — 0.07%; BetaShares Australia 200 ETF (A200) — 0.04%; Vanguard MSCI Index International Shares ETF (VGS) — 0.18%; iShares Core S&P 500 ETF (IVV) — 0.03% (but hedging adds cost). ETFs with investment objectives beyond passive index replication — active ETFs, leveraged ETFs, ESG-screened ETFs, or thematics — typically charge 0.30–0.75%+. The management fee is the largest long-term cost driver; even a 0.10% difference compounds significantly over 20+ years.",
  },
  {
    q: "What is the difference between accumulation and distribution ETFs?",
    a: "Distribution ETFs pay income (dividends, interest) to investors as cash on a regular schedule (quarterly or semi-annually). You receive the cash directly and choose what to do with it. Accumulation ETFs (more common in European markets; less so in Australia) automatically reinvest distributions within the fund, compounding growth without triggering a manual reinvestment. Most Australian ETFs are distribution ETFs — you receive the income and are responsible for reinvesting it if desired. Some platforms (like Pearler) offer automatic dividend reinvestment plans (DRPs) that streamline this.",
  },
  {
    q: "How are ETF dividends taxed in Australia?",
    a: "ETF distributions are taxed like any other investment income in the year you receive them. The distribution is broken down into components: Australian income (taxed at marginal rate), foreign income (taxed at marginal rate with possible foreign income tax offset), capital gain components (discounted if the fund held assets for 12+ months), and franking credits (offset against your tax liability). If you hold the ETF outside super, you include the distribution in your tax return using the annual tax statement. Inside super (accumulation phase), the fund pays 15% tax; in pension phase, tax is 0%.",
  },
];

const etfFaqLd = faqJsonLd(ETF_FAQS);

export const metadata = {
  title: "Compare Australian ETFs — Fees, Returns & Holdings (2026)",
  description: `Compare management fees, categories and providers for Australia's most popular ETFs including VAS, VGS, IVV, A200, NDQ and more. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Compare Australian ETFs — Fees, Returns & Holdings (2026)",
    description: "Side-by-side comparison of fees, categories and providers for popular Australian ETFs.",
    images: [{ url: "/api/og?title=Compare+Australian+ETFs&subtitle=Fees,+Returns+%26+Holdings&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare/etfs" },
};

export const revalidate = 3600;

export default function ETFComparePage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
      { "@type": "ListItem", position: 2, name: "Compare Platforms", item: "https://invest.com.au/compare" },
      { "@type": "ListItem", position: 3, name: "Compare ETFs", item: "https://invest.com.au/compare/etfs" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {etfFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(etfFaqLd) }} />
      )}
      <Suspense><CompareNav /></Suspense>
      <div className="container-custom pt-5">
        <DirectoryBanners surface="compare" />
      </div>
      <ETFCompareClient />
      <div className="container-custom max-w-3xl pb-4 pt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
        <div className="space-y-3">
          {ETF_FAQS.map((faq) => (
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
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
