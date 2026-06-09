import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import LumpSumCalculatorClient from "./LumpSumCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Lump-Sum Compound Growth Calculator Australia | Invest.com.au",
  description:
    "Project a lump sum's growth over 1–30 years. Three-scenario comparison, monthly contribution and tax-on-returns option. SMSF, marginal, tax-free outcomes.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/calculator` },
  openGraph: {
    title: "Lump-Sum Compound Growth Calculator Australia",
    description: "Project a lump sum's growth with monthly top-ups, return assumptions and tax outcomes.",
    url: `${SITE_URL}/lump-sum-investing/calculator`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Lump Sum vs DCA Calculator")}&sub=${encodeURIComponent("Compare Returns · Time in Market · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const LUMP_SUM_FAQS = [
  {
    q: "Is lump-sum investing better than dollar-cost averaging?",
    a: "Research from Vanguard and others consistently shows that lump-sum investing outperforms dollar-cost averaging (DCA) roughly two-thirds of the time — because markets trend upward over time, so money invested earlier has more time to grow. DCA reduces volatility risk and the emotional difficulty of investing a large amount when markets feel uncertain. If you have a lump sum available now, lump-sum investing has the higher expected return; DCA offers better sleep-at-night comfort.",
  },
  {
    q: "What return rate should I use in the calculator?",
    a: "For long-term projections, common reference points are: ASX 200 historical average ~9–10% nominal per year (including dividends), global shares ~10% nominal, Australian residential property ~7–8% nominal. To be conservative, use 6–7% for diversified share portfolios and 5–6% for blended portfolios. These are nominal (before inflation) — subtract 3–4% to get the real return in today's dollars. Past returns don't guarantee future results.",
  },
  {
    q: "How does compound interest work over time?",
    a: "Compound growth means your returns earn returns. A $100,000 investment at 8% per year earns $8,000 in year 1 — but in year 2 you earn 8% on $108,000 ($8,640). After 10 years, you have approximately $216,000 — more than double, even though you added nothing. After 30 years, the same investment compounds to ~$1,006,000. The effect is exponential: the longer the time horizon, the more dramatic the compounding. This is why starting early matters more than the exact return rate.",
  },
  {
    q: "Is tax applied to investment returns in Australia?",
    a: "Yes. In Australia, investment returns are generally taxable. Dividends and interest are taxed at your marginal income tax rate. Capital gains are also taxable: assets held for less than 12 months are taxed at your full marginal rate; assets held for 12 months or more qualify for the 50% CGT discount, so only half the gain is taxable. Inside super (accumulation phase), returns are taxed at 15% with a one-third discount on capital gains. In SMSF pension phase, earnings are tax-free. The calculator lets you model different tax scenarios to see the after-tax outcome.",
  },
];

const lumpSumFaqLd = faqJsonLd(LUMP_SUM_FAQS);

export default function LumpSumCalculatorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Calculator", url: absoluteUrl("/lump-sum-investing/calculator") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {lumpSumFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(lumpSumFaqLd) }} />
      )}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/lump-sum-investing" className="hover:text-white">Lump-Sum Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Calculator</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Lump-Sum Compound Growth Calculator</h1>
            <p className="text-slate-300">Project the growth of a lump sum over 1–30 years, with monthly top-ups and tax outcomes.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <LumpSumCalculatorClient />
          </div>
        </section>
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {LUMP_SUM_FAQS.map((faq) => (
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
