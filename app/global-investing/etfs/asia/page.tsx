import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Asia ETFs for Australians (${CURRENT_YEAR}) — Japan, China, India, EM Asia Compared`,
  description: `Compare the best ASX-listed Asia ETFs for Australian investors: IZZ (China), ASIA (tech), NDIA (India), IAA, VGS. MER, withholding tax, currency risk. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Asia ETFs for Australians (${CURRENT_YEAR})`,
    description:
      "Compare ASX-listed Asia ETFs: China, Japan, India, EM Asia. MER, currency risk, withholding tax treatment.",
    url: `${SITE_URL}/global-investing/etfs/asia`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Asia ETFs for Australians")}&sub=${encodeURIComponent(`IZZ · ASIA · NDIA · IAA · ${CURRENT_YEAR}`)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/etfs/asia` },
};

// ─────────────────────────────────────────────────────────────────────────────
// Asia ETF data — ASX-listed products covering Asian equity exposure.
// All MER and AUM figures approximate as at May 2026. Verify with the ETF
// provider (PDS/TMD) before investing.
// ─────────────────────────────────────────────────────────────────────────────
const ASIA_ETFS = [
  {
    ticker: "IZZ",
    name: "iShares MSCI China ETF",
    provider: "BlackRock iShares",
    index: "MSCI China Index",
    mer: "0.60%",
    aum: "$420M",
    holdings: 600,
    currency: "AUD (unhedged — underlying in HKD/USD)",
    hedged: false,
    region: "China",
    topHoldings: ["Tencent", "Alibaba", "Meituan", "JD.com", "PDD Holdings"],
    pros: [
      "Broadest China exposure on ASX — 600+ stocks including HK-listed and ADRs",
      "iShares brand and BlackRock liquidity",
      "Captures China tech giants via HK-listed/ADR holdings",
    ],
    cons: [
      "High MER for the category (0.60%)",
      "VIE-structure exposure — Chinese tech companies listed via offshore shells",
      "Regulatory and geopolitical risk concentrated in one country",
      "No mainland A-share direct exposure — primarily offshore-listed H-shares",
    ],
    verdict:
      "The most accessible broad-China ETF on ASX. IZZ gives you Tencent, Alibaba and the large HK-listed Chinese companies without needing a HK brokerage account. The MER is high relative to US ETFs, and China-specific risk is real — but for Australians wanting a China allocation without the direct-market complexity, IZZ is the benchmark.",
    taxNote: "China does not levy WHT to the ETF on H-share dividends the same way; the fund handles WHT internally. Distributions are assessable income for Australian tax purposes.",
  },
  {
    ticker: "ASIA",
    name: "Betashares Asia Technology Tigers ETF",
    provider: "Betashares",
    index: "Solactive Asia Ex-Japan Technology & Internet Tigers Index",
    mer: "0.67%",
    aum: "$550M",
    holdings: 50,
    currency: "AUD (unhedged)",
    hedged: false,
    region: "Asia ex-Japan (tech focus)",
    topHoldings: ["Samsung Electronics", "Taiwan Semiconductor (TSMC)", "Alibaba", "Tencent", "Meituan"],
    pros: [
      "Concentrated exposure to Asia's largest tech companies (TSMC, Samsung, Tencent, Alibaba)",
      "Includes Taiwan and Korea tech — not just China",
      "One of the most popular thematic Asia ETFs on ASX",
    ],
    cons: [
      "High MER (0.67%) and concentrated (50 stocks)",
      "Heavily technology-sector concentrated — not a diversified Asia exposure",
      "TSMC and Samsung account for significant single-stock weight",
      "Taiwan Strait geopolitical risk via TSMC exposure",
    ],
    verdict:
      "The best single ETF for Australians who want focused exposure to Asia's technology sector — TSMC, Samsung, Tencent, and the large-cap tech ecosystem. Not a diversified Asia play; it is a concentrated tech bet. If you believe in Asian semiconductor and internet dominance over the next decade, ASIA captures that thesis cleanly.",
    taxNote: "Distributions include foreign income; withholding taxes handled at fund level. FITO may apply.",
  },
  {
    ticker: "NDIA",
    name: "Betashares India Quality ETF",
    provider: "Betashares",
    index: "Solactive India Quality Select Index",
    mer: "0.80%",
    aum: "$280M",
    holdings: 30,
    currency: "AUD (unhedged — underlying in INR)",
    hedged: false,
    region: "India",
    topHoldings: ["HDFC Bank", "Infosys", "Reliance Industries", "Hindustan Unilever", "TCS"],
    pros: [
      "Only dedicated India ETF on ASX with quality-factor screen",
      "Avoids the FPI registration complexity of direct India investing",
      "INR/AUD — benefits if Indian rupee strengthens long-term",
    ],
    cons: [
      "Highest MER in this comparison (0.80%)",
      "Concentrated (30 stocks) with quality-tilt that may underperform broad India",
      "INR currency risk — Indian rupee has historically depreciated vs AUD over long periods",
      "No direct A-share or large-cap state-owned enterprise exposure (this is quality-screened)",
    ],
    verdict:
      "The simplest way for Australians to access Indian equity markets without the regulatory complexity of direct FPI investing. The quality screen (return on equity + low leverage + earnings stability) is a defensible tilt for a market as complex as India. The MER is the sticking point — 0.80% is high, and the fund is still building AUM toward the level where liquidity is tight at larger trade sizes.",
    taxNote: "India levies WHT on dividends distributed to foreign entities; the fund handles this. Australian investors receive distributions assessable as foreign income.",
  },
  {
    ticker: "IAA",
    name: "iShares MSCI All Country Asia ex Japan ETF",
    provider: "BlackRock iShares",
    index: "MSCI AC Asia ex Japan Index",
    mer: "0.50%",
    aum: "$310M",
    holdings: 1100,
    currency: "AUD (unhedged)",
    hedged: false,
    region: "Asia ex-Japan (broad)",
    topHoldings: ["Samsung Electronics", "TSMC", "Tencent", "Alibaba", "ICBC"],
    pros: [
      "Broadest Asia coverage (ex-Japan) — 1,100+ stocks across China, Korea, Taiwan, India, HK, SEA",
      "Better diversification than single-country or thematic funds",
      "iShares liquidity and institutional-grade index tracking",
    ],
    cons: [
      "Still high China weight (~30–35% of index) despite broad mandate",
      "MER of 0.50% — more expensive than VGS for developed-market overlay",
      "Less traded than US-focused ASX ETFs — check bid-ask spread before large trades",
    ],
    verdict:
      "The most diversified single-fund Asia exposure on ASX outside of a global ETF. IAA is the closest equivalent to IVV or VGS for Asia — broad, index-tracking, multi-country. The China overweight in the MSCI AC Asia ex Japan index means it isn't purely a geopolitical-risk hedge against China exposure, but it spreads that risk across Korea, Taiwan, India, Hong Kong and Southeast Asia.",
    taxNote: "Multiple-country WHT handled at fund level. Distributions include foreign income components.",
  },
  {
    ticker: "VGS",
    name: "Vanguard MSCI Index International Shares ETF",
    provider: "Vanguard",
    index: "MSCI World ex-Australia Index",
    mer: "0.18%",
    aum: "$7.5B",
    holdings: 1500,
    currency: "AUD (unhedged)",
    hedged: false,
    region: "Global developed (includes Japan, HK, Singapore)",
    topHoldings: ["Apple", "Microsoft", "Nvidia", "Amazon", "Toyota"],
    pros: [
      "Extremely low MER (0.18%) for global developed markets",
      "Includes Japan (~6% weight), and limited HK/SG exposure",
      "Deepest liquidity among all funds listed here",
    ],
    cons: [
      "Dominated by US (~68% weight) — Asia is a minority allocation",
      "No emerging-market coverage — no China A/H shares, Korea, India, Taiwan",
      "Japan at ~6% is meaningful but modest; other Asian developed markets are minor",
    ],
    verdict:
      "VGS is not an Asia ETF, but it is the cheapest way to get meaningful Japan exposure as part of a broader global portfolio. If your goal is moderate Japan/Asia-developed allocation alongside the rest of the developed world at minimal cost, VGS is the natural anchor. Pair it with IAA or IZZ if you specifically want EM Asia or China above the VGS weight.",
    taxNote: "Distributions include foreign income from global sources including Japan dividends (treaty-rate WHT).",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Editorial sections.
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    heading: "Should Australian investors have an Asia allocation?",
    body: `Asia (excluding Australia) represents roughly 25–30% of global equity market capitalisation when combining developed markets (Japan, HK, Singapore, Korea) and emerging markets (China, India, Taiwan). A global index-weighting approach like VGS (which excludes EM) naturally gives you Japan and developed Asia. Adding EM Asia requires a separate allocation.

The investment case for EM Asia revolves around three themes:
- **Growth**: India and Southeast Asia have projected GDP growth rates 3–5× faster than the US and Europe over the next decade. Equity markets do not always track GDP, but longer-run there is a correlation.
- **Technology supply chain**: Taiwan Semiconductor (TSMC) and Samsung manufacture the majority of the world's advanced semiconductors. Their share prices are not available on any US or Australian index that excludes EM.
- **Diversification**: Asian equity cycles are not perfectly correlated with US equity cycles — the S&P 500 and NIFTY 50 have had notably different performance periods, particularly during US tech corrections.

The countercase is equally real: China regulatory risk, Taiwan geopolitics, Indian currency depreciation, and the complexity of EM corporate governance are genuine risks not present in a US equity allocation.`,
  },
  {
    heading: "How does withholding tax work inside Asia ETFs?",
    body: `When an ASX-listed ETF like IZZ or IAA holds Asian shares, dividends from those shares flow into the fund net of any withholding taxes levied by the source country. The ETF then distributes to Australian unitholders.

The fund manager typically reports the gross dividend and the foreign tax withheld in its annual attribution tax statement. Australian unitholders may be able to claim a Foreign Income Tax Offset (FITO) for the foreign tax paid at the fund level, reducing double taxation.

Key differences by country:
- **Hong Kong**: No WHT on dividends. HK-listed H-shares and HK companies pay dividends without withholding.
- **China (mainland)**: 10% WHT on A-share dividends distributed to foreign investors.
- **Japan**: 15.315% WHT (reduced from 20.42% under AU–Japan DTA) — but the ETF's treaty treatment may depend on the fund's domicile.
- **Singapore**: No WHT on dividends.
- **India**: 20% WHT for non-resident investors — a meaningful drag on income from India-heavy ETFs.

The FITO benefit is available on distributions from Australian-domiciled ETFs (like all the ASX-listed products here). The treatment for US-domiciled ETFs that hold Asian shares is different and more complex.`,
  },
];

const FAQS = [
  {
    question: "What is the best Asia ETF for Australian investors?",
    answer:
      "The answer depends on what you mean by 'Asia'. For broad EM Asia (China, Korea, Taiwan, India) IAA gives the widest coverage at 0.50% MER. For tech-sector exposure specifically, ASIA (Betashares Asia Technology Tigers) is the most targeted at 0.67%. For China specifically, IZZ is the benchmark. For India specifically, NDIA is the only dedicated option. If you want Japan included, VGS captures Japan as part of a global developed-market allocation at 0.18%. Most Australian investors use a combination: VGS for the developed-market core (including Japan), and either IAA or a single-country fund for specific EM Asia conviction.",
  },
  {
    question: "Is it safer to hold Asian shares via an ETF than directly?",
    answer:
      "From a custody and operational risk perspective, holding Asian shares via an ASX-listed ETF is simpler: CHESS settlement, AUD distributions, no foreign-broker account. From a market risk perspective, the underlying exposure is identical — whether you hold IZZ or directly own Tencent and Alibaba in a HK brokerage account, the share price risk and currency risk are the same. The differences are: 1) Tax complexity — ETF distributions come with a tax statement; direct shares require multi-currency, multi-jurisdiction CGT tracking. 2) Corporate governance rights — ETF holders have no voting rights or access to individual shareholder benefits. 3) Concentration control — direct shares let you exclude specific companies you have concerns about. For most retail investors, the ETF route is both simpler and lower-operational-risk.",
  },
  {
    question: "Does IZZ include Chinese mainland A-shares?",
    answer:
      "IZZ tracks the MSCI China Index, which historically focused on offshore-listed H-shares and ADRs (Chinese companies listed in HK or the US). MSCI has progressively increased the weight of A-shares in its China index via Stock Connect as China opened its markets. As of 2026, the MSCI China index includes a partial weighting of eligible A-shares, but A-shares remain under-represented relative to their domestic market cap weight — they are still at a partial inclusion factor in MSCI's methodology. If you want direct A-share exposure above MSCI's partial inclusion, you'd need either a dedicated A-share ETF (not currently listed on ASX in a major form) or direct Stock Connect access via IBKR, Tiger or moomoo.",
  },
  {
    question: "How are Asia ETF capital gains taxed in Australia?",
    answer:
      "Australian CGT applies to gains on the disposal of ASX-listed ETFs in the same way as to direct shares: the gain is calculated in AUD (purchase price in AUD vs sale proceeds in AUD), and the 50% individual CGT discount applies if you held the ETF units for more than 12 months. Because ASX-listed ETFs are priced in AUD (unlike direct foreign shares held in foreign currency), there is no additional foreign currency CGT event on the ETF unit itself — you simply record the AUD cost base and AUD sale proceeds. The underlying currency exposure moves the unit price in AUD terms but does not create a separate CGT event. This is one of the practical simplifications of using AU-listed ETFs for Asian exposure.",
  },
  {
    question: "What is the FITO and can it be claimed on Asia ETF distributions?",
    answer:
      "The Foreign Income Tax Offset (FITO) allows Australian residents to reduce their Australian income tax by the amount of foreign tax paid on foreign income, up to the Australian tax payable on that same income. When an ASX-listed ETF receives dividends from Asian companies and those dividends have had foreign WHT withheld (e.g. Japan at 15.315%, India at 20%), the ETF's annual attribution statement will typically show the gross foreign income and the foreign tax credits available to unitholders. You enter this on your Australian tax return to claim the FITO. The credit is limited to the lesser of the foreign tax paid and the Australian tax on the same income — so if Australia's marginal rate is lower than the foreign WHT rate (e.g. India's 20%), you don't get the full 20% back. Keep the ETF's annual attribution statement as your source document.",
  },
];

export default function AsiaETFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "AU-listed ETFs", url: `${SITE_URL}/global-investing/etfs` },
    { name: "Asia" },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <Link href="/global-investing/etfs" className="hover:text-slate-900">AU-listed ETFs</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Asia</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Asia Exposure ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Best Asia ETFs for{" "}
              <span className="text-amber-600">Australians ({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Compare ASX-listed ETFs covering China, Japan, India, and broad EM Asia — IZZ, ASIA, NDIA,
              IAA, and VGS. MER, currency risk, withholding tax, and suitability for Australian investors.
            </p>
          </div>
        </div>
      </section>

      {/* ── Callouts ─────────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest Asia-incl. MER</p>
              <p className="text-xl font-black text-amber-700">0.18% p.a.</p>
              <p className="text-xs text-slate-600 mt-1">VGS — includes Japan (~6% weight)</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">ASIA ETF AUM</p>
              <p className="text-xl font-black text-slate-900">$550M+</p>
              <p className="text-xs text-slate-600 mt-1">Most-held dedicated Asia tech ETF on ASX</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Asia share of MSCI ACWI</p>
              <p className="text-xl font-black text-slate-900">~25%</p>
              <p className="text-xs text-slate-600 mt-1">excl. US; Japan ~6%, EM Asia ~12%</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ETF Cards ────────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="ETF Comparison"
            title="Asia ETFs for Australian investors"
            sub="Data approximate as at May 2026 — verify MER, AUM, and current index composition with the ETF provider PDS before investing."
          />
          <div className="mt-8 space-y-6">
            {ASIA_ETFS.map((etf, i) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  {i === 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200 shrink-0">
                      #1 Broad China
                    </span>
                  )}
                  {i === 1 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200 shrink-0">
                      Tech Focus
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-slate-900">{etf.ticker}</span>
                    <span className="text-sm text-slate-500">{etf.name}</span>
                  </div>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">MER: {etf.mer}</span>
                    <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded font-semibold border border-blue-200">AUM: {etf.aum}</span>
                    <span className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded font-semibold border border-green-200">{etf.region}</span>
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

                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-1">Top holdings</p>
                  <div className="flex flex-wrap gap-1.5">
                    {etf.topHoldings.map((h) => (
                      <span key={h} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{h}</span>
                    ))}
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

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                  <p className="text-xs text-amber-900 font-medium">{etf.verdict}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Tax note: </span>{etf.taxNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial ────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Analysis" title="Asia ETF deep dive" />
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

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Asia ETF questions" />
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

      {/* ── Cross-links ──────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3">
            <Link href="/global-investing/shares/asia" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Buy Asian shares directly &rarr;</Link>
            <Link href="/global-investing/etfs/us" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">US Market ETFs &rarr;</Link>
            <Link href="/global-investing/tax" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing tax hub &rarr;</Link>
            <Link href="/etfs" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">All ETFs &rarr;</Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} ETF data is approximate. Verify current MER, AUM, and distributions with ETF providers before investing.</p>
        </div>
      </section>
    </div>
  );
}
