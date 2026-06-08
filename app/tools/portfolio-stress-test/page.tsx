import type { Metadata } from "next";
import Link from "next/link";
import PortfolioStressTest from "@/components/PortfolioStressTest";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { breadcrumbJsonLd, CURRENT_YEAR, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Portfolio Stress Test | Invest.com.au",
  description: "See how your portfolio allocation would have fared during the GFC, COVID crash, dot-com bust and 2022 rate hike cycle.",
  openGraph: { title: "Portfolio Stress Test", description: "Stress-test your portfolio against historical market crises.", images: [{ url: `/api/og?title=${encodeURIComponent("Portfolio Stress Test")}&sub=${encodeURIComponent("Crash Scenarios · Drawdown · Recovery Time · " + CURRENT_YEAR)}`, width: 1200, height: 630 }] },
  alternates: { canonical: `${SITE_URL}/tools/portfolio-stress-test` },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: `${SITE_URL}/tools` },
  { name: "Portfolio Stress Test", url: `${SITE_URL}/tools/portfolio-stress-test` },
]);

const toolLd = calculatorJsonLd({
  name: "Portfolio Stress Test",
  description:
    "See how your portfolio allocation would have fared during the GFC, COVID crash, dot-com bust and 2022 rate hike cycle.",
  path: "/tools/portfolio-stress-test",
});

const STRESS_TEST_FAQS = [
  {
    q: "What historical crises does the Portfolio Stress Test simulate?",
    a: "The Portfolio Stress Test models your estimated portfolio performance during four major historical market crises: (1) The Global Financial Crisis (GFC) 2007–2009, where global equities fell approximately 50% peak to trough and Australian property held up relatively well; (2) The COVID-19 crash of February–March 2020, a sharp 35% drawdown in global equities that recovered within months; (3) The Dot-com bust 2000–2003, where technology-heavy portfolios fell 70–80% while broad market indices fell 40%; and (4) The 2022 rate hike cycle, where both equities and bonds fell simultaneously — a painful period for diversified portfolios holding 60/40 stock/bond allocations.",
  },
  {
    q: "How are the drawdown estimates calculated?",
    a: "Drawdown estimates are calculated using published peak-to-trough performance data for broad asset class indices during each crisis period. Your portfolio allocation is applied to these benchmark drawdowns — for example, if you hold 60% Australian equities and Australian equities fell 55% during the GFC, your equity component's drawdown estimate is 55% × 0.60 = 33% of total portfolio. Asset classes included: Australian equities (ASX 200), International equities (MSCI World), Property (REITs index), Bonds (Bloomberg Australian Bond Index), and Cash (equivalent to the RBA cash rate). This is a simplified model — your actual results would depend on specific holdings, timing, dividends reinvested, and fees.",
  },
  {
    q: "Why does my portfolio show a 2022 loss even though stocks and bonds fell?",
    a: "The 2022 scenario is unusual because Australian and global equity markets fell (ASX 200: -7%, MSCI World: -18%) while bonds — which usually provide a buffer during equity selloffs — also fell as central banks raised interest rates rapidly. A traditional 60/40 diversified portfolio fell approximately 15–18% in 2022 in AUD terms, with no asset class providing reliable shelter except cash. This tool models this correlation breakdown so investors understand that a 'balanced' portfolio is not immune to scenarios where both equities and bonds fall simultaneously.",
  },
  {
    q: "Is the Portfolio Stress Test personal financial advice?",
    a: "No. The Portfolio Stress Test uses historical data and simplified asset-class averages to illustrate potential outcomes — it does not take into account your specific holdings, fees, timing, tax situation, or personal financial objectives. The results are illustrative estimates, not predictions. Past crises are not a reliable guide to the magnitude or timing of future drawdowns. If you are approaching retirement or holding a large portfolio, consider discussing your downside risk tolerance with a licensed financial adviser before making allocation decisions.",
  },
];

const stressTestFaqLd = faqJsonLd(STRESS_TEST_FAQS);

export default function PortfolioStressTestPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, toolLd]} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
        <Link href="/tools" className="hover:text-violet-700">Tools</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-600">Portfolio Stress Test</span>
      </nav>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Portfolio Stress Test</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          How would your portfolio have performed during the worst market crises of the last 40 years?
          Enter your approximate asset allocation and see estimated drawdowns for each historical scenario.
          Uses broad asset-class averages from documented peak-to-trough data.
        </p>
      </div>

      <PortfolioStressTest />

      <CalculatorLeadCapture
        calcSlug="portfolio-stress-test"
        calcTitle="Portfolio Stress Test"
        need="planning"
        contextKeys={["portfolio_review", "diversification"]}
      />

      <p className="text-[11px] text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>

      {stressTestFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(stressTestFaqLd) }}
        />
      )}

      <section className="mt-8 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {STRESS_TEST_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
