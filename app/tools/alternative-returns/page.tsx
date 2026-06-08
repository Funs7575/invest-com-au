import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import AlternativeReturnsClient from "./AlternativeReturnsClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Alternative Asset Returns Calculator (${CURRENT_YEAR}) — Watches, Cars, Wine, ASX, Property`,
  description:
    "Estimate what an investment in luxury watches, classic cars, fine wine, ASX 200 or Australian residential property would be worth today. Compare alternative-asset index returns side by side, using historical annualised averages.",
  alternates: { canonical: "/tools/alternative-returns" },
  openGraph: {
    title: `Alternative Asset Returns Calculator (${CURRENT_YEAR})`,
    description:
      "Compare luxury watch, classic car, fine wine, ASX 200 and Australian property returns from a chosen purchase year.",
    url: absoluteUrl("/tools/alternative-returns"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Alternative Investment Returns")}&sub=${encodeURIComponent("Private Credit · PE · Infrastructure · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Alternative Asset Returns Calculator — ${SITE_NAME}`,
  description:
    "Free historical-index calculator for luxury watches, classic cars, fine wine, ASX 200 shares and Australian residential property.",
  url: absoluteUrl("/tools/alternative-returns"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Alternative Asset Returns Calculator",
    url: absoluteUrl("/tools/alternative-returns"),
  },
]);

const ALT_RETURNS_FAQS = [
  {
    q: "Are the returns shown real (inflation-adjusted) or nominal?",
    a: "The calculator shows nominal returns — the headline gain before adjusting for inflation. To estimate real purchasing-power growth, subtract the approximate annual inflation rate (roughly 3–4% over the long run in Australia) from the annual return figure. Nominal returns are what most index benchmarks publish, so the calculator uses them for straightforward apples-to-apples comparison.",
  },
  {
    q: "How reliable are alternative asset index returns?",
    a: "Alternative asset indices (watches, cars, wine) are less robust than share or property indices. They are based on auction results and dealer transactions for specific items, which introduces selection bias (only pristine or trophy assets tend to be publicly sold), thin trading (small sample sizes inflate volatility), survivorship bias (destroyed or lost assets drop out of indices), and currency effects (many benchmark indices are USD or GBP). Treat these figures as directional guides, not guaranteed returns.",
  },
  {
    q: "Can I invest directly in a watch or wine index?",
    a: "Not easily. Unlike a share index where you can buy an ETF tracking it exactly, 'investing in watches' means buying physical watches (with storage, insurance, and illiquidity risk) or using specialist platforms that offer fractional or pooled ownership. A handful of investment platforms offer tokenised or securitised exposure to wine, art, or classic cars — but liquidity, fees, and regulation vary widely. For most investors, the comparison here is illustrative rather than actionable.",
  },
  {
    q: "Why do alternative assets often have lower liquidity than shares?",
    a: "Shares in an ASX-listed company can be bought or sold during market hours in seconds at the prevailing market price. Alternative assets like watches, wine, or classic cars require finding a buyer (which may take weeks or months), incurring significant transaction costs (auction fees, insurance, transport, authentication), and accepting price uncertainty. This illiquidity is a real cost — it's why investors who hold illiquid assets expect a premium return over liquid markets.",
  },
];

const altReturnsFaqLd = faqJsonLd(ALT_RETURNS_FAQS);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-72 bg-slate-100 rounded-xl" />
          <div className="h-72 bg-slate-100 rounded-xl" />
          <div className="h-72 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AlternativeReturnsCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {altReturnsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(altReturnsFaqLd) }}
        />
      )}
      <Suspense fallback={<Loading />}>
        <AlternativeReturnsClient />
      </Suspense>
      <div className="container-custom max-w-5xl pb-8 space-y-8">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {ALT_RETURNS_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
