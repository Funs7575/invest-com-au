import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Global ETFs for Australians (${CURRENT_YEAR}) — IVV, VGS, NDQ, IZZ Compared`,
  description: `Compare the best global ETFs available on the ASX for Australian investors: broad market, US, international developed, emerging markets. MER, AUM, hedged vs unhedged. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Global ETFs for Australians (${CURRENT_YEAR})`,
    description: "US market, developed world, emerging markets and regional ETFs compared for ASX investors.",
    url: `${SITE_URL}/global-investing/etfs`,
  },
  alternates: { canonical: `${SITE_URL}/global-investing/etfs` },
};

const FAQS = [
  {
    q: "What is the difference between IVV and VGS?",
    a: "IVV tracks the S&P 500 (500 US large-cap companies), while VGS tracks the MSCI World ex-Australia Index (1,500+ companies across 23 developed markets including the US). IVV is US-only; VGS is broadly diversified across developed markets. IVV has a lower MER (0.04%) than VGS (0.18%). For investors wanting single-country US exposure, IVV. For developed-world diversification, VGS.",
  },
  {
    q: "Should I choose a hedged or unhedged ETF?",
    a: "Most long-term Australian investors choose unhedged. Currency exposure averages out over long horizons, and hedging costs (typically 0.06–0.15% p.a. additional expense) compound against returns. Unhedged ETFs give you natural AUD/USD diversification — when AUD weakens, your foreign holdings rise in AUD terms. Hedged versions (IHVV, HNDQ, VGAD) suit shorter holding periods or investors who want pure equity exposure without FX overlay.",
  },
  {
    q: "What is the best ETF for S&P 500 exposure on the ASX?",
    a: "IVV (iShares S&P 500 ETF, 0.04% MER) is the benchmark for ASX-listed S&P 500 exposure — largest AUM, lowest cost, excellent liquidity. SPY500 (Betashares S&P 500 Equal Weight, 0.29%) is an alternative for investors concerned about the index's concentration in the Magnificent 7. For hedged S&P 500, IHVV (iShares, 0.10%) is the main option.",
  },
  {
    q: "Are ETF dividends from overseas stocks franked?",
    a: "Generally no — dividends from foreign companies carry no franking credits since they haven't paid Australian corporate tax. Some mixed ASX/international ETFs may have partial franking. Pure foreign ETFs (IVV, VGS, NDQ) pass through dividends with no franking. Foreign-sourced dividends are still subject to Australian income tax, but you may claim a Foreign Income Tax Offset (FITO) for withholding tax paid to the foreign country.",
  },
];

const GLOBAL_ETFS = [
  {
    ticker: "IVV",
    name: "iShares S&P 500 ETF",
    category: "US Market",
    mer: "0.04%",
    aum: "$8.0B",
    coverage: "500 US large-caps",
    hedged: false,
    verdict: "Best-in-class S&P 500 exposure — lowest cost, highest liquidity on ASX",
  },
  {
    ticker: "NDQ",
    name: "Betashares NASDAQ 100 ETF",
    category: "US Tech",
    mer: "0.48%",
    aum: "$5.5B",
    coverage: "100 NASDAQ tech companies",
    hedged: false,
    verdict: "Tech-focused satellite holding; higher volatility and MER than IVV",
  },
  {
    ticker: "VGS",
    name: "Vanguard MSCI Index International Shares ETF",
    category: "Developed World",
    mer: "0.18%",
    aum: "$6.5B",
    coverage: "1,500+ stocks across 23 developed markets",
    hedged: false,
    verdict: "Core developed-world holding; US ~70%, Europe ~20%, Japan/other ~10%",
  },
  {
    ticker: "IWLD",
    name: "iShares Core MSCI World All Cap ETF",
    category: "Developed World",
    mer: "0.09%",
    aum: "$1.5B",
    coverage: "Developed world all-cap (~1,600 stocks)",
    hedged: false,
    verdict: "Lower MER than VGS; includes small caps; smaller AUM and less liquid",
  },
  {
    ticker: "VEU",
    name: "Vanguard All-World ex-US Shares ETF",
    category: "Ex-US Developed + EM",
    mer: "0.21%",
    aum: "$0.9B",
    coverage: "4,000+ stocks outside US",
    hedged: false,
    verdict: "Useful alongside IVV to build a global portfolio without US double-up",
  },
  {
    ticker: "VGE",
    name: "Vanguard FTSE Emerging Markets ETF",
    category: "Emerging Markets",
    mer: "0.48%",
    aum: "$0.6B",
    coverage: "China, India, Brazil, South Korea and 20+ EM countries",
    hedged: false,
    verdict: "Broad EM exposure; higher political and currency risk than developed markets",
  },
  {
    ticker: "IZZ",
    name: "iShares China Large-Cap ETF",
    category: "China",
    mer: "0.74%",
    aum: "$0.4B",
    coverage: "50 largest H-shares listed on Hong Kong Exchange",
    hedged: false,
    verdict: "Concentrated single-country China play; higher regulatory and political risk",
  },
  {
    ticker: "VGAD",
    name: "Vanguard MSCI Index International Shares (Hedged) ETF",
    category: "Developed World (Hedged)",
    mer: "0.21%",
    aum: "$1.8B",
    coverage: "Same as VGS, AUD hedged",
    hedged: true,
    verdict: "VGS with AUD hedge; +0.03% cost; use when wanting pure equity returns",
  },
];

export default function GlobalInvestingEtfsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Global ETFs", url: absoluteUrl("/global-investing/etfs") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white py-12 md:py-16">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/global-investing" className="hover:text-white">Global Investing</Link>
              <span>/</span>
              <span className="text-white">Global ETFs</span>
            </nav>
            <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
              {CURRENT_YEAR} Guide
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Best Global ETFs for Australian Investors
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mb-6">
              Compare the top ASX-listed ETFs for global exposure — US market, developed world, emerging markets and regional funds. MER, AUM, hedged vs unhedged.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/global-investing/etfs/us" className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors">
                US Market ETFs →
              </Link>
              <Link href="/global-investing/etfs/global" className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors">
                Global / Developed World ETFs →
              </Link>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">ASX-listed global ETF comparison</h2>
            <p className="text-sm text-slate-500 mb-6">Sorted by category. MER = Management Expense Ratio (annual fee). AUM = assets under management.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Ticker</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Category</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">MER</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">AUM</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700 hidden md:table-cell">Coverage</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Hedged?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {GLOBAL_ETFS.map((etf) => (
                    <tr key={etf.ticker} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-extrabold text-slate-900">{etf.ticker}</span>
                        <div className="text-xs text-slate-500 mt-0.5">{etf.name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{etf.category}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{etf.mer}</td>
                      <td className="px-4 py-3 text-slate-700">{etf.aum}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell text-xs">{etf.coverage}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${etf.hedged ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                          {etf.hedged ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">{GENERAL_ADVICE_WARNING}</p>
          </div>
        </section>

        {/* Verdict cards */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Which ETF for which investor?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Core US exposure", pick: "IVV", why: "S&P 500 at 0.04% MER — the standard starting point for most Australian portfolios." },
                { label: "Developed-world diversification", pick: "VGS", why: "1,500+ stocks across 23 markets. US ~70%, Europe ~20%, Japan/others ~10%. Better than IVV alone for single-country risk." },
                { label: "Tech-focused satellite", pick: "NDQ", why: "NASDAQ 100 at 0.48%. Higher returns potential, higher volatility. Pair with a diversified core like VGS, not as a replacement." },
                { label: "Low-MER developed world", pick: "IWLD", why: "0.09% vs 0.18% for VGS. Smaller AUM and wider bid-ask spread — fine for buy-and-hold, less ideal for frequent trading." },
                { label: "Emerging markets tilt", pick: "VGE", why: "Add EM exposure alongside VGS. China, India, Brazil, South Korea — higher risk, higher expected long-run return." },
                { label: "AUD-hedged global exposure", pick: "VGAD", why: "Same developed-world basket as VGS, with AUD/USD hedge. Costs slightly more; use when you want pure equity returns without FX noise." },
              ].map((item) => (
                <div key={item.pick} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="text-xs text-slate-500 font-medium mb-1">{item.label}</div>
                  <div className="text-xl font-extrabold text-slate-900 mb-2">{item.pick}</div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.why}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ETF vs pages */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">Head-to-head comparisons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { slug: "ivv-vs-vts", label: "IVV vs VTS", sub: "S&P 500 vs total US market" },
                { slug: "ndq-vs-ivv", label: "NDQ vs IVV", sub: "NASDAQ 100 vs S&P 500" },
                { slug: "vgs-vs-iwld", label: "VGS vs IWLD", sub: "Vanguard vs iShares developed world" },
              ].map((pair) => (
                <Link
                  key={pair.slug}
                  href={`/etfs/vs/${pair.slug}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-extrabold text-slate-900 mb-1">{pair.label}</div>
                  <div className="text-xs text-slate-500">{pair.sub}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faqItem) => (
                <details key={faqItem.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {faqItem.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{faqItem.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related links */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-5xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link href="/global-investing/etfs/us" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                US market ETFs in detail →
              </Link>
              <Link href="/global-investing/etfs/global" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Global / developed world ETFs →
              </Link>
              <Link href="/global-investing/tax/cgt-on-foreign-shares" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                CGT on foreign ETFs →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
