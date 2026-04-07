import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best US Market ETFs for Australians (${CURRENT_YEAR}) — IVV, NDQ, VTS, QUS Compared`,
  description: `Compare the best US share market ETFs for Australian investors: IVV (S&P 500), NDQ (NASDAQ 100), VTS, QUS. MER, currency risk, hedged vs unhedged. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best US Market ETFs for Australians (${CURRENT_YEAR})`,
    description: "S&P 500, NASDAQ 100, and total US market ETFs compared for Australian investors.",
    url: `${SITE_URL}/etfs/us-exposure`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/us-exposure` },
};

const US_ETFS = [
  {
    ticker: "IVV",
    name: "iShares S&P 500 ETF",
    provider: "BlackRock iShares",
    index: "S&P 500",
    mer: "0.04%",
    aum: "$8.0B",
    holdings: 500,
    currency: "AUD (unhedged)",
    hedged: false,
    pros: ["Lowest MER for S&P 500 exposure (0.04%)", "Largest US ETF on ASX by AUM", "Exceptional liquidity", "World's most tracked index"],
    cons: ["Unhedged — AUD/USD movements affect returns", "US-concentrated (no other countries)", "Large-cap bias"],
    verdict: "The benchmark US ETF for Australian investors. If you want S&P 500 exposure cheaply and simply, IVV is the standard choice.",
  },
  {
    ticker: "NDQ",
    name: "Betashares NASDAQ 100 ETF",
    provider: "Betashares",
    index: "NASDAQ 100",
    mer: "0.48%",
    aum: "$5.5B",
    holdings: 100,
    currency: "AUD (unhedged)",
    hedged: false,
    pros: ["Access to top 100 NASDAQ tech companies (Apple, Microsoft, Nvidia, Amazon)", "Strong historical performance", "Popular among growth investors"],
    cons: ["Higher MER than IVV (0.48%)", "Heavily concentrated in technology sector (~60%)", "Higher volatility than S&P 500", "Not diversified across sectors"],
    verdict: "The tech-focused alternative. Higher risk/reward than IVV due to sector concentration. Suitable as a satellite position, not a core holding.",
  },
  {
    ticker: "VTS",
    name: "Vanguard US Total Market ETF",
    provider: "Vanguard",
    index: "CRSP US Total Market",
    mer: "0.03%",
    aum: "$4.2B",
    holdings: 3700,
    currency: "AUD (unhedged)",
    hedged: false,
    pros: ["Cheapest US ETF available (0.03%)", "Broadest US exposure — 3,700+ companies including small and mid caps", "Vanguard brand trust"],
    cons: ["DRP not available (unlike IVV)", "Some structural differences vs IVV due to CRSP vs S&P licensing", "Slightly less liquid than IVV"],
    verdict: "The cheapest and broadest US exposure available in Australia. A strong alternative to IVV for cost-focused investors.",
  },
  {
    ticker: "IHVV",
    name: "iShares S&P 500 (AUD Hedged) ETF",
    provider: "BlackRock iShares",
    index: "S&P 500 (hedged to AUD)",
    mer: "0.10%",
    aum: "$1.2B",
    holdings: 500,
    currency: "AUD (hedged)",
    hedged: true,
    pros: ["Removes AUD/USD currency risk", "Returns reflect pure S&P 500 performance in AUD terms", "Useful when AUD expected to appreciate"],
    cons: ["Higher MER than unhedged IVV (0.10% vs 0.04%)", "Hedging has a cost — generally negative roll yield for USD-denominated assets", "Underperforms unhedged when AUD weakens"],
    verdict: "For investors who want US exposure without currency risk. Generally underperforms unhedged IVV over the long run but reduces volatility from AUD/USD swings.",
  },
];

const SECTIONS = [
  {
    heading: "S&P 500 vs NASDAQ 100 — which is better for Australians?",
    body: `This is one of the most common ETF questions. The short answer: for most investors, IVV (S&P 500) is the better core holding, with NDQ (NASDAQ 100) as an optional satellite.

**S&P 500 (IVV):** 500 largest US companies across all sectors. Technology is the largest sector (~30%) but healthcare, financials, consumer, and industrials are also well-represented. Lower volatility, lower concentration risk, and much cheaper MER (0.04% vs 0.48%).

**NASDAQ 100 (NDQ):** 100 largest non-financial companies listed on NASDAQ. ~60% technology. Includes Apple, Microsoft, Nvidia, Amazon, Meta, Alphabet. Over the past decade, NDQ has significantly outperformed IVV — but with higher volatility and drawdowns.

**The key consideration:** NDQ's outperformance required holding through large drawdowns. In 2022, NDQ fell ~35% peak-to-trough. The higher MER (0.48%) means you're paying more for concentration, not diversification.

**Our view:** Use IVV for core US exposure. Add a smaller NDQ position if you have conviction in continued tech outperformance and can stomach the volatility.`,
  },
  {
    heading: "Currency risk — hedged vs unhedged US ETFs",
    body: `All standard US ETFs (IVV, NDQ, VTS) hold US-dollar denominated assets. When the AUD strengthens against USD, your returns in AUD terms fall — and vice versa.

Over long periods, academic evidence suggests currency exposure averages out and hedging costs reduce net returns. However, in specific periods currency movements can significantly boost or drag performance.

**When unhedged (IVV) benefits you:**
- When AUD weakens vs USD (your USD holdings are worth more in AUD)
- If your liabilities are in AUD and you're a long-term holder
- Lower cost (IVV at 0.04% vs IHVV at 0.10%)

**When hedged (IHVV) benefits you:**
- When AUD strengthens vs USD
- If you want 'pure' S&P 500 equity returns without currency overlay
- Shorter investment horizons where currency risk is meaningful

**Practical approach:** Most long-term Australian investors use unhedged ETFs. The cost savings (0.06% p.a.) compound significantly over 20+ years. Hedging is more relevant for shorter-term positions or tactical allocations.`,
  },
  {
    heading: "How much US exposure should Australians have?",
    body: `Australian investors are famously 'home biased' — the Australian share market represents only about 2% of global market cap, yet many Australians allocate 80%+ to Australian shares.

**Arguments for more international (US) exposure:**
- Diversification across sectors: US markets have far more technology, healthcare, and consumer companies
- Long-term returns: US equity returns have exceeded Australian equity returns over most 20-year periods
- Access to global megacaps: Apple, Microsoft, Nvidia, Amazon are not available on ASX

**Arguments for keeping Australian exposure high:**
- Franking credits: a 3.8% dividend yield with ~70% franking is very tax-efficient for Australian residents
- Currency risk management: Australian-dollar denominated assets match your liabilities
- Familiarity and analyst coverage

**A balanced approach for Australians:**
A common portfolio split for Australian long-term investors is roughly:
- 35–45% Australian shares (VAS/A200)
- 30–40% International developed markets (VGS or IVV + VGS combination)
- 10–20% Bonds/defensive
- 5–10% Other (property ETF, cash)

The exact split depends on your tax situation, age, income, and risk tolerance.`,
  },
];

const FAQS = [
  {
    question: "What is the best US ETF for Australians in 2026?",
    answer: "IVV (iShares S&P 500 ETF) is the most popular choice due to its combination of the lowest MER (0.04%), excellent liquidity, and the world's most recognised benchmark. VTS is slightly cheaper (0.03%) and broader but has a quirky structure. NDQ is the tech-focused alternative — higher potential returns but higher risk and cost (0.48% MER).",
  },
  {
    question: "Is IVV the same as investing in the S&P 500?",
    answer: "Effectively yes. IVV tracks the S&P 500 Index with a tracking error of typically under 0.05%. You're gaining proportional exposure to 500 large-cap US companies — the same companies that make up the 'US stock market' in most media coverage. The main difference from direct S&P 500 exposure is currency: IVV is unhedged, so your returns in AUD are affected by the AUD/USD exchange rate.",
  },
  {
    question: "Should I invest in IVV or NDQ?",
    answer: "For a core holding, IVV. NDQ is higher risk due to tech concentration and higher MER (0.48%). Over the past decade NDQ has outperformed, but it also had a ~35% drawdown in 2022. Most investors are better served with IVV as their main US allocation and optionally adding a smaller NDQ position for a growth tilt.",
  },
  {
    question: "How are US ETF returns taxed in Australia?",
    answer: "US ETFs held by Australian tax residents are subject to Australian CGT on capital gains and income tax on distributions. No franking credits apply (US companies don't pay Australian corporate tax). If the ETF invests directly in US shares, some distributions may include withholding tax at source — the ETF manager handles this and reports it. You may be able to claim a foreign income tax offset (FITO) for foreign tax paid.",
  },
  {
    question: "Can I buy US ETFs directly in Australia (not ASX-listed)?",
    answer: "Yes, but with complications. US-listed ETFs (like SPY or QQQ) may not be purchasable by Australians as retail investors due to ASIC/US regulatory restrictions on marketing foreign products. Some platforms (Interactive Brokers, Saxo) may allow US ETF access for sophisticated investors. The Australian-listed versions (IVV, NDQ) are the straightforward path.",
  },
];

export default function USExposureETFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "US Market ETFs" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-900">ETFs</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">US Market</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              US Exposure ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Best US Market ETFs for{" "}
              <span className="text-amber-600">Australians ({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Compare IVV, NDQ, VTS, and IHVV — the best ways for Australians to invest in US shares.
              S&P 500, NASDAQ 100, total US market, and hedged options analysed.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest S&P 500 MER</p>
              <p className="text-xl font-black text-amber-700">0.04% p.a.</p>
              <p className="text-xs text-slate-600 mt-1">IVV — $40/year on $100K</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">IVV AUM on ASX</p>
              <p className="text-xl font-black text-slate-900">$8.0B+</p>
              <p className="text-xs text-slate-600 mt-1">Most popular international ETF in Australia</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">US share of global market</p>
              <p className="text-xl font-black text-slate-900">~63%</p>
              <p className="text-xs text-slate-600 mt-1">US companies make up nearly two-thirds of the MSCI World Index</p>
            </div>
          </div>
        </div>
      </section>

      {/* ETF Cards */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading eyebrow="ETF Comparison" title="US Market ETFs for Australians" sub="Approximate data — verify current figures with ETF providers before investing." />
          <div className="mt-8 space-y-6">
            {US_ETFS.map((etf, i) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  {i === 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200 shrink-0">
                      #1 Most Popular
                    </span>
                  )}
                  {etf.hedged && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200 shrink-0">
                      AUD Hedged
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-slate-900">{etf.ticker}</span>
                    <span className="text-sm text-slate-500">{etf.name}</span>
                  </div>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">MER: {etf.mer}</span>
                    <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded font-semibold border border-blue-200">AUM: {etf.aum}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Index</span>
                    <span className="font-semibold text-slate-700">{etf.index}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Holdings</span>
                    <span className="font-semibold text-slate-700">{etf.holdings.toLocaleString()} securities</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Currency</span>
                    <span className="font-semibold text-slate-700">{etf.currency}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-green-700 mb-1">Pros</p>
                    <ul className="space-y-0.5">
                      {etf.pros.map((p) => (
                        <li key={p} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-green-500 shrink-0 mt-0.5">✓</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-600 mb-1">Cons</p>
                    <ul className="space-y-0.5">
                      {etf.cons.map((c) => (
                        <li key={c} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-red-400 shrink-0 mt-0.5">✗</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-amber-500 shrink-0">⭐</span>
                  <p className="text-xs text-amber-900 font-medium">{etf.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Analysis" title="US ETF Deep Dive" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="US ETF Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3">
            <Link href="/etfs/asx-200" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">ASX 200 ETFs →</Link>
            <Link href="/etfs/dividends" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Dividend ETFs →</Link>
            <Link href="/etfs/vs/ivv-vs-vts" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">IVV vs VTS →</Link>
            <Link href="/etfs/vs/ndq-vs-ivv" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">NDQ vs IVV →</Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} ETF data is approximate. Verify current MER, AUM, and distributions with ETF providers.</p>
        </div>
      </section>
    </div>
  );
}
