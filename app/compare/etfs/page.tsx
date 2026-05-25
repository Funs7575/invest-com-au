import { Suspense } from "react";
import { UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ETFCompareClient from "./ETFCompareClient";
import CompareNav from "../CompareNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";

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

const etfCompareFaqLd = faqJsonLd([
  {
    q: "What is an ETF and how does it work?",
    a: "An ETF (Exchange-Traded Fund) is a pooled investment that trades on a stock exchange. Most Australian ETFs track an index (e.g. ASX 200 via VAS or A200) and hold the index's constituent shares. The ETF price moves throughout the trading day. You buy and sell ETF units through your broker just like shares. Management fees (MER) are deducted from the fund's assets, not your brokerage account, so the ETF's price slowly lags the index by approximately the MER.",
  },
  {
    q: "What is the difference between VAS and A200?",
    a: "VAS (Vanguard Australian Shares ETF) tracks the ASX 300 (300 companies) and charges 0.07% MER. A200 (BetaShares Australia 200 ETF) tracks the 200 largest ASX companies and charges 0.04% MER — Australia's lowest broad-market fee. VAS provides slightly more diversification (300 vs 200 stocks). The performance difference is minimal; most financial advisers consider both excellent core holdings. A200's lower fee gives it a small mathematical advantage over long holding periods.",
  },
  {
    q: "What is a total returns ETF vs a distribution ETF?",
    a: "Most Australian ETFs distribute income (dividends, interest, capital gains) to unit holders. The distribution reduces the ETF's price by the distribution amount (similar to a stock going ex-dividend). Some international ETFs are accumulation funds — they automatically reinvest income without distributing it. In Australia, income accumulation structures are rare because the ATO requires investment income to be distributed for tax purposes. Most investors use DRP (Distribution Reinvestment Plans) or reinvest manually.",
  },
  {
    q: "How do I compare ETF management fees (MER)?",
    a: "Compare ETFs by their MER (Management Expense Ratio), also called Total Expense Ratio (TER) or Ongoing Charge Figure (OCF). The MER is the total annual percentage cost, expressed as a fraction of net assets. For Australian broad-market ETFs, MERs range from 0.04% (A200) to 0.67% (some sector ETFs). For global equity ETFs, VGS charges 0.18% while IVV (iShares S&P 500) charges 0.04%. Lower is better for passive funds tracking the same index — the cheapest fund tracking the same index wins by definition.",
  },
  {
    q: "Are Australian ETFs tax-efficient?",
    a: "Australian ETFs distribute income and capital gains each quarter or semi-annually. Unlike US ETFs (which rarely distribute capital gains), Australian ETFs may trigger capital gains events even for long-term buy-and-hold investors — particularly when the index rebalances and the ETF sells holdings. For tax efficiency, many Australian investors prefer low-turnover broad-market ETFs (VAS, A200, VGS) over sector or actively-managed funds with higher turnover. ETFs held inside super are taxed at the fund's 15% rate, which is far more efficient.",
  },
]);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(etfCompareFaqLd) }}
      />
      <Suspense><CompareNav /></Suspense>
      <div className="container-custom pt-5">
        <DirectoryBanners surface="compare" />
      </div>
      <ETFCompareClient />
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
