import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best ASX 200 ETFs Australia (${CURRENT_YEAR}) — VAS vs A200 vs STW vs IOZ`,
  description: `Compare the best ASX 200 index ETFs: VAS, A200, STW, IOZ, and more. MER fees, tracking error, AUM, distribution yield, and franking credits analysed. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best ASX 200 ETFs (${CURRENT_YEAR}) — VAS vs A200 vs STW vs IOZ`,
    description: "Complete comparison of Australian share market ETFs tracking the ASX 200 and broader Australian indices.",
    url: `${SITE_URL}/etfs/asx-200`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/asx-200` },
};

const ASX_200_ETFS = [
  {
    ticker: "VAS",
    name: "Vanguard Australian Shares ETF",
    provider: "Vanguard",
    index: "S&P/ASX 300",
    mer: "0.07%",
    merValue: 0.07,
    aum: "$17.5B",
    yield: "~3.9%",
    franking: "~70%",
    holdings: 305,
    established: 2009,
    pros: ["Largest Australian ETF by AUM", "Excellent liquidity and tight spreads", "Tracks broader ASX 300 (more diversification)", "Strong dividend history with high franking"],
    cons: ["Slightly higher MER than A200", "Includes small-caps that A200 excludes"],
    verdict: "The go-to choice for most Australian investors. Unmatched liquidity, trusted provider, and broad ASX 300 exposure.",
    href: "/etfs/vs/vas-vs-a200",
  },
  {
    ticker: "A200",
    name: "Betashares Australia 200 ETF",
    provider: "Betashares",
    index: "Solactive Australia 200",
    mer: "0.04%",
    merValue: 0.04,
    aum: "$6.2B",
    yield: "~3.8%",
    franking: "~70%",
    holdings: 200,
    established: 2018,
    pros: ["Lowest MER for ASX 200 exposure", "CHESS-sponsored holdings", "Good liquidity and AUM for a younger ETF"],
    cons: ["Tracks Solactive index (not the official S&P/ASX 200)", "Smaller AUM than VAS means slightly wider spreads", "Newer ETF with shorter track record"],
    verdict: "The cheapest way to access the Australian share market. The Solactive index closely mirrors the S&P/ASX 200 in practice.",
    href: "/etfs/vs/a200-vs-stw",
  },
  {
    ticker: "STW",
    name: "SPDR S&P/ASX 200 ETF",
    provider: "State Street SPDR",
    index: "S&P/ASX 200",
    mer: "0.13%",
    merValue: 0.13,
    aum: "$5.0B",
    yield: "~4.0%",
    franking: "~75%",
    holdings: 200,
    established: 2001,
    pros: ["Australia's oldest ETF (est. 2001)", "Tracks official S&P/ASX 200 index", "High franking credit ratio", "Strong institutional investor base"],
    cons: ["Higher MER than VAS and A200", "The cost advantage of VAS/A200 compounds significantly over time"],
    verdict: "Australia's original index ETF, now facing stiff competition on fees. The higher MER vs VAS/A200 is hard to justify for new investors.",
    href: "/etfs/vs/vas-vs-stw",
  },
  {
    ticker: "IOZ",
    name: "iShares Core S&P/ASX 200 ETF",
    provider: "BlackRock iShares",
    index: "S&P/ASX 200",
    mer: "0.09%",
    merValue: 0.09,
    aum: "$4.3B",
    yield: "~3.8%",
    franking: "~72%",
    holdings: 200,
    established: 2010,
    pros: ["Official S&P/ASX 200 index tracking", "Competitive MER vs STW", "Strong BlackRock backing and global ETF expertise"],
    cons: ["More expensive than A200 and VAS", "BlackRock has lower local brand recognition than Vanguard in Australia"],
    verdict: "A solid third option behind VAS and A200. Competitive pricing and a trusted issuer, but slightly more expensive than the cheapest options.",
    href: "/etfs/vs/ioz-vs-vas",
  },
];

const COMPARISON_SECTIONS = [
  {
    heading: "VAS vs A200 — the key differences",
    body: `The most common question from Australian ETF investors: VAS or A200?

**Index:** VAS tracks the S&P/ASX 300 (top 300 companies), while A200 tracks the Solactive Australia 200 Index (top 200). In practice, the performance difference is minimal — the additional 100 smaller companies in VAS add marginal diversification.

**MER:** A200 at 0.04% is cheaper than VAS at 0.07%. On a $200,000 portfolio, that's a $60/year difference. Over 20 years compounded, this is meaningful but not enormous.

**Provider:** Vanguard has a longer track record in Australia and a larger global presence. Betashares is an Australian-based ETF specialist with strong local expertise.

**The verdict:** Either is an excellent choice. If you're already invested in one, don't switch — transaction costs and potential CGT outweigh the MER savings. For new investors starting fresh, A200 has a slight cost edge.`,
  },
  {
    heading: "How ASX 200 ETFs generate income",
    body: `ASX 200 ETFs distribute income to unitholders from two sources:

**1. Dividends:** The ETF collects all dividends paid by its underlying companies and distributes them to unitholders proportionally. Most ASX 200 ETFs distribute quarterly or semi-annually.

**2. Franking credits:** This is unique to Australian equity ETFs. Australian companies pay 30% (or 25% for smaller companies) corporate tax before paying dividends. The tax paid flows through to investors as franking credits, which can offset your personal income tax.

For a taxpayer in the 32.5% bracket, a fully-franked dividend effectively has its tax liability reduced by the corporate tax already paid. This makes ASX 200 ETFs particularly tax-efficient for Australian investors compared to international ETFs, which don't carry franking.

The estimated franking credit ratio for top ASX 200 ETFs is typically 70–80% — meaning about 70–80% of dividends are fully franked. Banks (CBA, WBC, ANZ, NAB) are among the largest contributors of franking credits in the index.`,
  },
  {
    heading: "Australian concentration risk — what to know",
    body: `The ASX 200 is heavily concentrated in two sectors: financials (banks) and materials (mining companies) together make up roughly 50% of the index.

**Top 5 holdings in most ASX 200 ETFs (approximate weights):**
- BHP Group: ~9–10%
- Commonwealth Bank: ~8–9%
- CSL: ~5–6%
- NAB, WBC, ANZ: ~3–4% each

This means buying an ASX 200 ETF is effectively a large bet on Australian banks and mining companies. If bank dividends are cut or commodity prices fall, your ETF underperforms.

**How to manage concentration risk:**
1. Pair with international ETFs (VGS, IVV) for sector diversification
2. Consider a property ETF (VAP) for real estate exposure not captured in the ASX 200
3. If you're overweight materials through super already, skew international ETF allocation higher`,
  },
];

const FAQS = [
  {
    question: "What is the best ASX 200 ETF in Australia?",
    answer: "VAS (Vanguard Australian Shares ETF) is the most popular due to its large AUM ($17.5B+), excellent liquidity, and trusted Vanguard brand. A200 (Betashares) is the cheapest at 0.04% MER. Both are excellent choices — most long-term investors will do equally well in either. If you're cost-focused and starting fresh, A200 has a slight edge. If liquidity and brand trust are priorities, VAS wins.",
  },
  {
    question: "How often do ASX 200 ETFs pay dividends?",
    answer: "Most ASX 200 ETFs pay distributions quarterly (March, June, September, December) or semi-annually. VAS pays quarterly. A200 pays quarterly. STW pays quarterly. The exact dates vary — check the ETF provider's distribution calendar for ex-dividend and payment dates.",
  },
  {
    question: "Can I use ASX 200 ETFs in my SMSF?",
    answer: "Yes. ASX-listed ETFs are explicitly permitted investments for SMSFs. They're popular SMSF investments due to their simplicity, low cost, liquidity, and the ability to receive CHESS-sponsored holdings. Some brokers offer SMSF-specific accounts with enhanced reporting for audit purposes.",
  },
  {
    question: "What is the minimum investment for an ASX 200 ETF?",
    answer: "The minimum is one unit. At current prices, VAS units are approximately $85–$100, A200 units are approximately $100–$115, and STW units are approximately $65–$75. Most brokers have a minimum trade value of $500, so you'd typically buy 5–6 units minimum in your first trade.",
  },
  {
    question: "Do ASX 200 ETFs have currency risk?",
    answer: "No — ASX 200 ETFs hold Australian shares priced in AUD, so there's no currency risk. Unlike international ETFs (which involve USD/AUD conversion), your investment in VAS or A200 is purely Australian-dollar denominated. International ETFs like IVV or VGS do carry currency risk unless they're currency-hedged versions.",
  },
];

export default function ASX200ETFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "ASX 200 ETFs" },
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
            <span className="text-slate-900 font-medium">ASX 200</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              ASX 200 ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Best ASX 200 ETFs Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Compare VAS, A200, STW, and IOZ — the most popular Australian share market ETFs.
              We analyse MER fees, tracking error, franking credit yields, and which ETF suits which investor.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest MER</p>
              <p className="text-xl font-black text-amber-700">0.04% p.a.</p>
              <p className="text-xs text-slate-600 mt-1">A200 — just $40/year on $100K</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Largest by AUM</p>
              <p className="text-xl font-black text-slate-900">VAS — $17.5B</p>
              <p className="text-xs text-slate-600 mt-1">Most liquid ASX equity ETF</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Approx. Yield</p>
              <p className="text-xl font-black text-slate-900">3.8–4.2%</p>
              <p className="text-xs text-slate-600 mt-1">Gross dividend yield including franking credits</p>
            </div>
          </div>
        </div>
      </section>

      {/* ETF Cards */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading eyebrow="ETF Comparison" title="Top ASX 200 ETFs Compared" sub="All data approximate — always verify current MER and AUM with the ETF provider before investing." />
          <div className="mt-8 space-y-6">
            {ASX_200_ETFS.map((etf, i) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {i === 0 && (
                      <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                        #1 Most Popular
                      </span>
                    )}
                    <span className="text-xl font-black font-mono text-slate-900">{etf.ticker}</span>
                    <span className="text-sm text-slate-500">{etf.name}</span>
                  </div>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">MER: {etf.mer}</span>
                    <span className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded font-semibold border border-green-200">Yield: {etf.yield}</span>
                    <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded font-semibold border border-blue-200">AUM: {etf.aum}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-3 mb-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Provider</span>
                    <span className="font-semibold text-slate-700">{etf.provider}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Index</span>
                    <span className="font-semibold text-slate-700">{etf.index}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Holdings</span>
                    <span className="font-semibold text-slate-700">{etf.holdings} securities</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Franking ~</span>
                    <span className="font-semibold text-slate-700">{etf.franking}</span>
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
          <SectionHeading eyebrow="Deep Dive" title="ASX 200 ETF Analysis" />
          <div className="mt-8 space-y-10">
            {COMPARISON_SECTIONS.map((sec) => (
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
          <SectionHeading eyebrow="FAQ" title="ASX 200 ETF Questions" />
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

      {/* Related */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Related Pages</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/etfs/us-exposure" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">US Market ETFs →</Link>
            <Link href="/etfs/dividends" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">Dividend ETFs →</Link>
            <Link href="/etfs/vs/vas-vs-a200" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">VAS vs A200 →</Link>
            <Link href="/best/etfs" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 hover:text-amber-700 transition-colors">Best ETF Brokers →</Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} ETF data shown is approximate and may not reflect current figures. Always verify MER, AUM, and distribution yield directly with the ETF provider before investing.</p>
        </div>
      </section>
    </div>
  );
}
