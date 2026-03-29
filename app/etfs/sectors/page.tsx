import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Sector ETFs Australia (${CURRENT_YEAR}) — Technology, Healthcare, Resources & More`,
  description: `Compare the best sector ETFs in Australia: HACK (cybersecurity), DRUG (healthcare), NDQ (tech), OZR (resources), QFN (financials) and more. Targeted sector exposure analysed by MER, performance, and risk. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Sector ETFs Australia (${CURRENT_YEAR})`,
    description: "Complete guide to Australian sector ETFs. Target technology, healthcare, resources, financials and more with a single ETF.",
    url: `${SITE_URL}/etfs/sectors`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/sectors` },
};

const SECTOR_ETFS = [
  {
    ticker: "NDQ",
    name: "BetaShares NASDAQ 100 ETF",
    provider: "Betashares",
    sector: "Technology / Growth",
    index: "NASDAQ 100 Index",
    mer: "0.48%",
    aum: "$5.8B",
    yield: "~0.5%",
    topHoldings: "Apple, Microsoft, Nvidia, Amazon, Meta",
    icon: "💻",
    pros: [
      "Australia's largest sector ETF — excellent liquidity",
      "Access to the world's leading technology companies",
      "NASDAQ 100 has significantly outperformed S&P 500 over 10 years",
      "Single entry point to US mega-cap tech",
    ],
    cons: [
      "Concentrated in tech — sector risk in downturns",
      "Higher MER than broad market ETFs",
      "Currency risk (unhedged USD exposure)",
      "Not true 'tech-only' — includes Amazon, Tesla in NASDAQ 100",
    ],
    verdict: "The most popular way for Australians to access US technology leaders. Use as a growth satellite to a core VAS + VGS portfolio — not a replacement for broad market exposure.",
  },
  {
    ticker: "HACK",
    name: "BetaShares Global Cybersecurity ETF",
    provider: "Betashares",
    sector: "Cybersecurity",
    index: "Nasdaq CTA Cybersecurity Index",
    mer: "0.67%",
    aum: "$910M",
    yield: "~0.3%",
    topHoldings: "Palo Alto Networks, CrowdStrike, Fortinet, Zscaler, Okta",
    icon: "🔐",
    pros: [
      "Dedicated exposure to the fast-growing cybersecurity sector",
      "Structural tailwind — cybersecurity spending grows regardless of economic cycle",
      "Diversified across 40+ global cybersecurity companies",
      "Sector is relatively non-cyclical — governments and businesses must spend regardless",
    ],
    cons: [
      "High MER for a thematic ETF",
      "Concentrated sector — high single-sector risk",
      "Individual companies can be disrupted by faster rivals",
      "Smaller AUM than NDQ — wider spreads possible",
    ],
    verdict: "A solid thematic ETF for investors who want targeted cybersecurity exposure. The structural case for cybersecurity spending growth is compelling — but keep sector ETFs to 5-10% of your portfolio.",
  },
  {
    ticker: "DRUG",
    name: "BetaShares Global Healthcare ETF (Currency Hedged)",
    provider: "Betashares",
    sector: "Healthcare / Biotech",
    index: "Nasdaq Global ex-Australia Healthcare Hedged AUD Index",
    mer: "0.57%",
    aum: "$280M",
    yield: "~0.8%",
    topHoldings: "UnitedHealth, Eli Lilly, AbbVie, Johnson & Johnson, Novo Nordisk",
    icon: "💊",
    pros: [
      "Defensive sector — healthcare demand is non-cyclical",
      "Exposure to global pharmaceutical and biotech giants",
      "Currency-hedged — removes AUD/USD exchange rate risk",
      "Ageing population demographics support long-term demand",
    ],
    cons: [
      "Drug approval risk — clinical trial failures affect individual companies",
      "High regulatory and political risk (drug pricing policy)",
      "Higher MER for hedged thematic exposure",
      "Hedging costs erode returns when AUD weakens",
    ],
    verdict: "Healthcare is genuinely defensive — a 5-10% allocation makes sense for investors approaching retirement or wanting a defensive tilt. The hedging is a reasonable choice for healthcare given AUD volatility.",
  },
  {
    ticker: "OZR",
    name: "SPDR S&P/ASX 200 Resources ETF",
    provider: "State Street SPDR",
    sector: "Australian Resources",
    index: "S&P/ASX 200 Resources Index",
    mer: "0.34%",
    aum: "$590M",
    yield: "~3.5%",
    topHoldings: "BHP, RIO, Fortescue, South32, Mineral Resources",
    icon: "⛏️",
    pros: [
      "Pure Australian resources exposure — BHP, RIO, and more",
      "Inflation hedge — resources companies benefit from rising commodity prices",
      "Strong dividend yields from major miners",
      "High franking credits from ASX-listed resources companies",
    ],
    cons: [
      "Highly cyclical — commodity price dependent",
      "BHP/RIO dominate — some concentration in 2-3 companies",
      "Commodity markets can be extremely volatile",
      "Overlaps significantly with any ASX 200 ETF holding",
    ],
    verdict: "Useful as a tactical overweight to resources if you have a view on commodity prices, but most ASX 200 ETFs already give you 20%+ in resources. Adds concentration risk if combined with VAS.",
  },
  {
    ticker: "QFN",
    name: "BetaShares Australian Financials Sector ETF",
    provider: "Betashares",
    sector: "Australian Financials",
    index: "Solactive Australia Financials Select Index",
    mer: "0.34%",
    aum: "$155M",
    yield: "~4.8%",
    topHoldings: "CBA, NAB, Westpac, ANZ, Macquarie",
    icon: "🏦",
    pros: [
      "Direct exposure to Australia's four major banks",
      "High dividend yield with strong franking credits",
      "Banks benefit from higher interest rate environments",
      "Well-regulated, systemically important companies",
    ],
    cons: [
      "Concentration risk — four banks dominate",
      "Rate-sensitive — bank margins compress in low-rate environments",
      "Overlaps almost entirely with any ASX 200 ETF",
      "Australian banks have limited international growth",
    ],
    verdict: "The ASX 200 already gives you 30%+ in financials — adding QFN on top creates heavy bank concentration. Only appropriate as a tactical bet on Australian bank outperformance.",
  },
  {
    ticker: "ETHI",
    name: "BetaShares Global Sustainability Leaders ETF",
    provider: "Betashares",
    sector: "ESG / Ethical",
    index: "Nasdaq Future Global Sustainability Leaders Index",
    mer: "0.59%",
    aum: "$2.1B",
    yield: "~0.7%",
    topHoldings: "Apple, Microsoft, Nvidia, ASML, Visa",
    icon: "🌱",
    pros: [
      "Excludes fossil fuels, weapons, tobacco, gambling",
      "Strong 10-year performance — ESG leaders include quality tech companies",
      "One of Australia's largest ESG ETFs with excellent liquidity",
      "Aligns investment with ethical values",
    ],
    cons: [
      "Higher MER than non-ESG alternatives",
      "Still heavily US and tech-weighted",
      "ESG screening excludes some legitimate industries",
      "ESG ratings are not standardised and can be inconsistent",
    ],
    verdict: "Australia's most popular ethical ETF — and it has performed well because ESG-leaders overlap heavily with quality technology companies. A legitimate alternative to VGS for investors with ethical investing priorities.",
  },
];

const SECTIONS = [
  {
    heading: "Should you use sector ETFs?",
    body: `Sector ETFs let you express conviction about specific industries or themes — but they require discipline in sizing and selection.

**When sector ETFs make sense:**
- You have a specific view on an industry's long-term growth that differs from the market's view
- You want to complement a broad market ETF with targeted exposure
- You want a defensive tilt (healthcare, utilities) or growth tilt (technology) relative to the broad market
- You're implementing a values-based investment approach (ESG, avoidance of specific sectors)

**When to be cautious:**
Sector ETFs are inherently more volatile than broad market ETFs. A sector can underperform for years even if the fundamental thesis is correct. Technology ETFs that performed spectacularly in 2020-21 fell 30-50% in 2022 as rate expectations changed. Resources ETFs are heavily correlated with commodity cycles that can last years.

**Portfolio sizing guidance:**
Most financial planners suggest capping satellite positions (sector ETFs, individual stocks) at 10-20% of your equity portfolio. Your core broad market ETFs (VAS, VGS or IWLD) should represent 80-90%.

**The overlap problem:**
Many sector ETFs heavily overlap with existing holdings. If you already hold VAS (which is ~30% financials), adding QFN (100% financials) dramatically overweights banks in your total portfolio. Check the underlying holdings of your broad ETFs before adding sector exposure.`,
  },
  {
    heading: "Technology ETFs — the growth story",
    body: `Technology sector ETFs have been the standout performers of the past 15 years. The NASDAQ 100 (tracked by NDQ) has returned approximately 15-18% per year over the past decade — significantly beating the S&P 500 and ASX 200.

**Why tech has outperformed:**
- Software has near-zero marginal cost of production — extraordinary profit margins
- Platform businesses (Apple App Store, Microsoft Azure, Google Search) create durable competitive moats
- Secular growth in digital advertising, cloud computing, and AI investment
- US tech giants have become essential infrastructure for global businesses

**The risks:**
- Tech valuations are highly sensitive to interest rates — higher rates reduce the present value of future earnings, which tech companies typically generate further in the future
- Regulatory risk — antitrust action, data privacy regulation, and AI governance could impair tech giants' business models
- Concentration risk — 5 companies (Apple, Microsoft, Nvidia, Alphabet, Amazon) represent 40%+ of the NASDAQ 100
- Disruption risk — today's tech giants can be disrupted by the next wave of innovation

**The practical approach:**
A 10-15% allocation to NDQ (or ETHI for ethical investors) alongside VGS and VAS is reasonable for investors seeking above-market technology exposure. NDQ already has significant overlap with VGS (which is ~70% US and ~25-30% tech) — manage the total tech weighting carefully.`,
  },
  {
    heading: "Thematic ETFs — structural trends or expensive bets?",
    body: `Beyond traditional sector ETFs, thematic ETFs target specific trends: cybersecurity (HACK), clean energy, robotics and AI, ageing populations, and more. The question is whether thematic ETFs represent genuine structural opportunities or expensive speculation.

**The case for thematic ETFs:**
Certain secular trends do drive above-market returns for extended periods. Cybersecurity is a good example — enterprise and government spending on cybersecurity has grown regardless of economic cycles because the cost of a breach far exceeds the cost of prevention. HACK has delivered reasonable risk-adjusted returns by focusing on a genuine structural need.

**The risks of thematic ETFs:**
- By the time a theme is obvious enough to launch an ETF around it, the opportunity may already be priced in
- Many thematic ETFs launch at the top of hype cycles (blockchain, cannabis, etc.)
- Higher MERs — most thematic ETFs charge 0.50-0.75%
- Narrower investment universes mean individual company risk is higher
- Some themes underperform for years before (if ever) delivering on their promise

**Evaluation checklist for thematic ETFs:**
1. Is this a genuine structural trend, or a current market narrative?
2. Are the companies in this ETF actually pure-plays, or is it a loose thematic grouping?
3. What is the MER vs the return premium you're expecting?
4. Is the AUM large enough for good liquidity? (Aim for $200M+)
5. Does this overlap significantly with your existing broad market ETFs?`,
  },
];

const FAQS = [
  {
    question: "What is the best technology ETF in Australia?",
    answer: "NDQ (BetaShares NASDAQ 100) is the most popular tech-focused ETF in Australia with $5.8B AUM and excellent liquidity. It tracks the NASDAQ 100 index — the 100 largest non-financial companies on the NASDAQ, which is heavily technology-weighted. For pure cybersecurity exposure, HACK is the leading option. For ethical/ESG investors wanting tech exposure, ETHI is a strong alternative. All have higher MERs than broad market ETFs (0.48-0.67%), which is the price of sector specialisation.",
  },
  {
    question: "Are sector ETFs risky?",
    answer: "Sector ETFs are inherently more volatile than broad market ETFs because they lack diversification across sectors. A resources ETF (OZR) is heavily correlated with commodity prices; a technology ETF (NDQ) is sensitive to interest rate changes and tech sentiment. This doesn't make them bad investments — it means they should be sized appropriately (5-15% of your portfolio) and used to complement a broad market core, not replace it.",
  },
  {
    question: "What is ETHI and how does it work?",
    answer: "ETHI (BetaShares Global Sustainability Leaders ETF) invests in global companies that are leaders in sustainability and ESG (environmental, social, governance) practices, while excluding companies involved in fossil fuels, weapons, tobacco, gambling, and other controversial activities. In practice, the ETF is heavily weighted toward US technology companies (Apple, Microsoft, Nvidia) which score well on ESG metrics. It has performed comparably to VGS over 5-10 years while excluding industries many investors wish to avoid.",
  },
  {
    question: "Can I use sector ETFs to reduce overlap in my portfolio?",
    answer: "Sometimes, but often sector ETFs increase rather than reduce overlap. For example, if you hold VAS (30% financials) and add QFN (100% financials), you dramatically overweight Australian banks. A more effective use of sector ETFs is to fill genuine gaps — e.g. adding HACK for cybersecurity exposure that VGS provides very little of, or adding OZR to overweight resources if you have conviction on commodity prices. Always check the underlying holdings of your existing ETFs before adding sector exposure.",
  },
  {
    question: "What is the minimum portfolio size for sector ETFs to make sense?",
    answer: "There's no hard minimum, but sector ETFs generally make more sense as portfolio size increases. On a $20,000 portfolio, the added brokerage cost of holding multiple ETFs (including sector positions) may not be worthwhile. On a $200,000+ portfolio, a 10% allocation to a thematic like HACK or DRUG becomes a $20,000 position that's worth managing separately. For smaller portfolios, a single all-in-one ETF (like VDHG) may be a simpler alternative.",
  },
  {
    question: "How do sector ETFs fit in a retirement or SMSF portfolio?",
    answer: "For retirement portfolios, defensive sector ETFs (healthcare/DRUG, infrastructure, utilities) can provide stable income and reduced volatility. Growth sector ETFs (NDQ, HACK) are appropriate in the growth phase but should be reduced as you approach retirement. SMSF investors have full flexibility to hold sector ETFs alongside broad market exposure, property, and other assets. The key is maintaining an overall allocation consistent with your investment strategy — sector ETFs should complement, not dominate, a retirement portfolio.",
  },
];

export default function SectorETFsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "Sector ETFs" },
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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-200">ETFs</Link>
            <span>/</span>
            <span className="text-slate-300">Sector ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-full text-xs font-semibold text-rose-300 mb-4">
              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
              Sector & Thematic ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Best Sector ETFs Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Compare sector and thematic ETFs in Australia — technology, cybersecurity, healthcare, resources,
              financials, and ESG. Targeted exposure analysed by MER, performance, and how they fit in a broader portfolio.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/etfs" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20">
                ← All ETF Categories
              </Link>
              <Link href="/etfs/us-exposure" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20">
                US Market ETFs →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-rose-200 p-5">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-1">NDQ — Australia&apos;s Largest Sector ETF</p>
              <p className="text-xl font-black text-rose-700">$5.8B AUM</p>
              <p className="text-xs text-slate-600 mt-1">The NASDAQ 100 ETF is the dominant sector play — Apple, Microsoft, Nvidia in one ASX-listed fund.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Typical Sector ETF MER</p>
              <p className="text-xl font-black text-amber-700">0.35–0.70%</p>
              <p className="text-xs text-slate-600 mt-1">Sector ETFs cost 2–5x more than broad market ETFs — worth it only if the targeted exposure delivers a return premium.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Recommended Satellite Allocation</p>
              <p className="text-xl font-black text-slate-900">5–15%</p>
              <p className="text-xs text-slate-600 mt-1">Sector ETFs should complement — not replace — your broad market core (VAS + VGS or IWLD).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ETF Cards */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Sector ETF Comparison"
            title="Australian Sector & Thematic ETFs"
            sub="Independent analysis of the most popular sector and thematic ETFs available on the ASX."
          />
          <div className="mt-8 space-y-6">
            {SECTOR_ETFS.map((etf) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{etf.icon}</span>
                      <span className="font-mono text-lg font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{etf.ticker}</span>
                      <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded font-semibold">{etf.sector}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{etf.name}</p>
                    <p className="text-xs text-slate-500">{etf.provider} · {etf.index}</p>
                    <p className="text-xs text-slate-400 mt-1">Top holdings: {etf.topHoldings}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "MER", value: etf.mer },
                      { label: "AUM", value: etf.aum },
                      { label: "Yield", value: etf.yield },
                    ].map((m) => (
                      <div key={m.label} className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold text-slate-900">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-green-700 mb-1.5">Pros</p>
                    <ul className="space-y-1">
                      {etf.pros.map((p) => (
                        <li key={p} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-700 mb-1.5">Cons</p>
                    <ul className="space-y-1">
                      {etf.cons.map((c) => (
                        <li key={c} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">✗</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-800 mb-1">Our Take</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{etf.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Sector ETF Guide" title="How to Use Sector ETFs Effectively" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-line">{para}</p>
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
          <SectionHeading eyebrow="FAQ" title="Sector ETF Questions Answered" />
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

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Ready to add sector exposure to your portfolio?</h2>
          <p className="text-sm text-slate-300 mb-6">
            Compare brokers that offer ASX-listed sector ETFs with low brokerage.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/etfs" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Best ETF Brokers →
            </Link>
            <Link href="/etfs" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              All ETF Categories →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
