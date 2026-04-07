import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best International ETFs Australia (${CURRENT_YEAR}) — VGS, IWLD, VEU, FEMX Compared`,
  description: `Compare the best international ETFs available in Australia: VGS, IWLD, VEU, FEMX, VDHG and more. Developed markets, emerging markets, and all-world ETFs analysed by MER, coverage, and performance. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best International ETFs Australia (${CURRENT_YEAR})`,
    description: "Complete guide to international ETFs in Australia. Compare global developed markets, emerging markets, and all-world ETFs.",
    url: `${SITE_URL}/etfs/international`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/international` },
};

const INTERNATIONAL_ETFS = [
  {
    ticker: "VGS",
    name: "Vanguard MSCI Index International Shares ETF",
    provider: "Vanguard",
    index: "MSCI World ex-Australia Index",
    mer: "0.18%",
    aum: "$8.2B",
    yield: "~1.6%",
    countries: "23 developed markets",
    holdings: "~1,500 companies",
    currency: "Unhedged (AUD)",
    pros: [
      "Largest international ETF in Australia by AUM",
      "Covers 23 developed markets — US, Europe, Japan, Canada",
      "Excellent liquidity and tight spreads",
      "Low MER for broad developed market exposure",
      "Quarterly distributions with some franking from NZ shares",
    ],
    cons: [
      "No emerging markets exposure (China, India, Brazil)",
      "Heavily US-weighted (~70%) — significant concentration",
      "Currency risk — unhedged AUD/USD and AUD/EUR exposure",
    ],
    verdict: "The default choice for international developed market exposure. Simple, cheap, liquid. Best paired with VAS for a core two-ETF portfolio.",
  },
  {
    ticker: "IWLD",
    name: "iShares Core MSCI World All Cap ETF",
    provider: "BlackRock iShares",
    index: "MSCI World Investable Market Index",
    mer: "0.09%",
    aum: "$3.1B",
    yield: "~1.5%",
    countries: "23 developed markets",
    holdings: "~3,900 companies",
    currency: "Unhedged (AUD)",
    pros: [
      "Cheapest broad international ETF — only 0.09% MER",
      "Broader than VGS — includes small-cap international stocks",
      "~3,900 holdings for deep diversification",
      "BlackRock institutional-grade management",
    ],
    cons: [
      "No emerging markets",
      "Similar US concentration to VGS",
      "Smaller AUM than VGS means slightly wider spreads",
    ],
    verdict: "The cheapest way to access global developed markets. The broader coverage (small caps included) is a meaningful advantage over VGS at a lower cost.",
  },
  {
    ticker: "VEU",
    name: "Vanguard All-World ex-US Shares ETF",
    provider: "Vanguard",
    index: "FTSE All-World ex US Index",
    mer: "0.20%",
    aum: "$1.8B",
    yield: "~2.8%",
    countries: "45+ markets (ex-US)",
    holdings: "~3,800 companies",
    currency: "Unhedged (AUD)",
    pros: [
      "Excludes US — perfect complement to IVV or NDQ for US exposure",
      "Includes both developed AND emerging markets (ex-US)",
      "Higher dividend yield than US-heavy ETFs",
      "Broad geographic diversification across 45+ countries",
    ],
    cons: [
      "Less liquid than VGS on ASX",
      "More complex to combine with US ETFs for total portfolio",
      "Higher MER than IWLD",
    ],
    verdict: "Best used alongside a dedicated US ETF (IVV or NDQ) for investors who want to control their US vs rest-of-world allocation precisely.",
  },
  {
    ticker: "FEMX",
    name: "Fidelity Global Emerging Markets ETF",
    provider: "Fidelity",
    index: "Actively managed (Emerging Markets)",
    mer: "0.50%",
    aum: "$410M",
    yield: "~1.8%",
    countries: "24 emerging markets",
    holdings: "~90 companies",
    currency: "Unhedged (AUD)",
    pros: [
      "Dedicated emerging markets exposure — China, India, Taiwan, Brazil",
      "Active management seeks to avoid state-owned enterprises and governance risks",
      "Concentrated portfolio of quality emerging market companies",
      "Fidelity's deep emerging markets research capability",
    ],
    cons: [
      "Higher MER for active management",
      "Concentrated — only ~90 holdings vs 1,000+ for passive EM funds",
      "Active risk — manager can underperform the benchmark",
      "Emerging markets are inherently more volatile",
    ],
    verdict: "For investors wanting emerging market exposure without taking on all the governance and state-ownership risks of passive EM indices. The active quality filter has merit.",
  },
  {
    ticker: "VGAD",
    name: "Vanguard MSCI Index International Shares (Hedged) ETF",
    provider: "Vanguard",
    index: "MSCI World ex-Australia Index (AUD Hedged)",
    mer: "0.21%",
    aum: "$1.4B",
    yield: "~1.8%",
    countries: "23 developed markets",
    holdings: "~1,500 companies",
    currency: "AUD Hedged",
    pros: [
      "Same index as VGS but currency-hedged",
      "Eliminates AUD/foreign currency exchange rate risk",
      "Returns purely reflect international company performance",
      "Useful for investors expecting AUD to strengthen",
    ],
    cons: [
      "Hedging costs reduce returns when AUD weakens",
      "Slightly higher MER than VGS for the hedge",
      "Hedging adds complexity and counterparty risk",
    ],
    verdict: "Choose VGAD over VGS if you're concerned about AUD strengthening (which would hurt unhedged returns). Most long-term investors are better off unhedged (VGS).",
  },
];

const SECTIONS = [
  {
    heading: "Why invest internationally? The case for global diversification",
    body: `The Australian share market represents less than 2% of global equity market capitalisation. Investing only in Australian shares means concentrating 100% of your equity risk in a market dominated by four banks and two mining companies. International diversification is not optional — it's essential.

**What you get with international ETFs:**
- Exposure to the world's leading technology companies (Apple, Microsoft, Nvidia, Alphabet) — all of which list in the US, not Australia
- Access to healthcare innovation leaders (Novo Nordisk, Eli Lilly, UnitedHealth)
- Exposure to Japanese, European, and Korean industrial giants
- Participation in emerging market growth stories (India, Southeast Asia, Brazil)

**The Australia-only portfolio problem:**
An ASX-200 portfolio has approximately 30% in banks and financials, 20% in resources and mining, and relatively little in technology, healthcare, and consumer discretionary. This sector imbalance means Australian-only investors missed the extraordinary tech-driven returns of the 2010s entirely.

**VAS + VGS: the two-ETF core portfolio:**
The most commonly recommended starting portfolio for Australian investors is a combination of VAS (Australian shares) and VGS (international developed markets). A 40% VAS / 60% VGS split gives you broad Australian diversification plus developed market global exposure in a simple, low-cost structure. Both pay quarterly distributions, both are among the largest ETFs on the ASX, and together they cover approximately 1,800 companies across 24 countries.`,
  },
  {
    heading: "Developed markets vs emerging markets — what's the difference?",
    body: `International ETFs broadly split into two categories: developed markets and emerging markets.

**Developed markets (VGS, IWLD):**
- Includes the US, UK, Japan, Germany, France, Canada, Australia (excluded in 'ex-Australia' versions), South Korea, Switzerland
- Stable regulatory environments, strong property rights, liquid markets
- Lower growth potential but lower volatility
- US typically accounts for 60–70% of developed market indices

**Emerging markets (FEMX, Vanguard VGE):**
- Includes China, India, Brazil, Taiwan, South Korea (in some indices), South Africa, Indonesia
- Higher long-term growth potential, but higher volatility and risk
- Political risk, currency risk, and governance concerns are real
- China currently accounts for 25–30% of most passive EM indices — a significant concentration

**Should you add emerging markets?**
For most Australian investors, a 10–15% emerging markets allocation (alongside developed markets) is reasonable. Emerging markets ETFs have underperformed developed markets significantly over the past decade, largely due to China's regulatory crackdowns and tech sector restrictions. However, India's growth trajectory and Southeast Asia's demographics make the case for some EM exposure.

**A practical allocation:**
60% ASX equities (VAS) + 30% International developed (VGS or IWLD) + 10% Emerging markets (FEMX or VGE) covers the major equity markets efficiently in three holdings.`,
  },
  {
    heading: "Currency risk and hedging — should you hedge?",
    body: `When you buy an unhedged international ETF like VGS, your returns are affected by both:
1. The performance of the underlying international shares
2. Changes in the AUD vs the basket of foreign currencies

**When AUD weakens:** Your unhedged international ETF returns increase in AUD terms — the foreign shares are worth more in Australian dollars.

**When AUD strengthens:** Your unhedged international ETF returns decrease — the foreign shares are worth less in Australian dollars.

**Why most long-term investors don't hedge:**
Currency movements are largely unpredictable over any given year. Over decades, the AUD has been relatively stable against major currencies, oscillating within a range. Long-term investors who hedge are effectively making a currency bet rather than avoiding risk.

More importantly, an unhedged international ETF provides a natural hedge against Australian economic weakness — which tends to cause AUD to weaken and unhedged international returns to rise. During the GFC, the AUD fell from 0.98 USD to 0.60 USD, boosting unhedged returns for Australians precisely when the domestic economy was stressed.

**When hedging makes sense:**
If you're investing with a 2–3 year time horizon, or believe AUD is about to strengthen materially, a hedged ETF like VGAD provides certainty of return in AUD terms. For super funds with short-term liability matching requirements, hedged international exposure may be appropriate.`,
  },
];

const FAQS = [
  {
    question: "What is the best international ETF for Australian investors?",
    answer: "For most Australians, IWLD (iShares Core MSCI World All Cap) offers the best combination of low cost (0.09% MER), broad diversification (3,900+ companies), and liquidity. VGS (Vanguard MSCI World) is the most popular choice by AUM and is equally excellent — slightly fewer holdings but backed by Vanguard's trusted brand. Either works well as the international pillar of a core portfolio.",
  },
  {
    question: "Should I use VGS or IWLD?",
    answer: "IWLD is cheaper (0.09% vs 0.18% MER) and broader (includes international small caps). VGS is larger by AUM ($8.2B vs $3.1B) with potentially tighter bid-ask spreads. For large portfolios, the cost difference compounds meaningfully — IWLD saves $900/year per $1M invested vs VGS. For most investors, the practical difference is small. Choose based on your platform's brokerage and which ETF has tighter spreads when you're trading.",
  },
  {
    question: "Do international ETFs pay dividends?",
    answer: "Yes, but the distributions differ from Australian equity ETFs. International ETFs pay distributions from dividends received from foreign companies, but these are unfranked (no franking credits, as the underlying companies don't pay Australian corporate tax). Distribution yields are typically 1.5–3% for international equity ETFs — lower than Australian equity ETFs which benefit from franking credits.",
  },
  {
    question: "Are international ETFs affected by foreign withholding tax?",
    answer: "Yes. Many countries withhold tax on dividends before they're paid to foreign investors (e.g. the US withholds 30%, reduced to 15% under the Australia-US tax treaty). Australian-domiciled ETFs like VGS have this tax withheld at the fund level before distributions are paid. You don't receive a separate withholding tax credit — it's already built into the lower distribution yield of international ETFs.",
  },
  {
    question: "What is the best way to get emerging markets exposure?",
    answer: "FEMX (Fidelity) takes an active approach filtering for quality, which has merit in markets with governance risks. Vanguard Emerging Markets (VGE) provides cheaper passive exposure to a broader set of emerging markets companies including large China positions. For most investors, a 10-15% EM allocation using either approach is reasonable. Avoid making emerging markets a large part of your portfolio given the higher volatility and political risk.",
  },
  {
    question: "How do international ETFs fit into an Australian portfolio?",
    answer: "The most common approach is a core two-ETF portfolio: VAS (Australian shares, 30-40%) + VGS or IWLD (international developed markets, 60-70%). This gives you ~300 Australian companies and ~1,500 international companies in two holdings. More sophisticated portfolios add emerging markets (VGE or FEMX), international small caps, or sector-specific international exposure. Keep it simple — the two-ETF core is hard to beat for most investors.",
  },
];

export default function InternationalETFsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "International ETFs" },
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
            <span className="text-slate-900 font-medium">International ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Global Diversification · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Best International ETFs Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Compare the best international ETFs available in Australia — developed markets, emerging markets,
              and all-world funds. VGS, IWLD, VEU, FEMX and more, analysed by MER, coverage, currency exposure, and performance.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/etfs/asx-200" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                Pair with ASX 200 ETFs →
              </Link>
              <Link href="/etfs" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                ← All ETF Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-purple-200 p-5">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Australia = Global Market</p>
              <p className="text-xl font-black text-purple-700">&lt;2%</p>
              <p className="text-xs text-slate-600 mt-1">Australia represents under 2% of global equity market cap. International ETFs give you access to the other 98%.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest International ETF</p>
              <p className="text-xl font-black text-amber-700">0.09% (IWLD)</p>
              <p className="text-xs text-slate-600 mt-1">iShares Core MSCI World All Cap ETF — 3,900+ global companies for just $90/year per $100K invested.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">VGS AUM</p>
              <p className="text-xl font-black text-slate-900">$8.2B</p>
              <p className="text-xs text-slate-600 mt-1">The most popular international ETF in Australia by assets under management, reflecting deep investor trust.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ETF Cards */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="International ETF Comparison"
            title="Global ETFs Available in Australia"
            sub="Developed markets, emerging markets, and currency-hedged options — independently analysed."
          />
          <div className="mt-8 space-y-6">
            {INTERNATIONAL_ETFS.map((etf) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-lg font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{etf.ticker}</span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-semibold">{etf.currency}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{etf.name}</p>
                    <p className="text-xs text-slate-500">{etf.provider} · {etf.index}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: "MER", value: etf.mer },
                      { label: "AUM", value: etf.aum },
                      { label: "Yield", value: etf.yield },
                      { label: "Countries", value: etf.countries.split(" ")[0] + " " + etf.countries.split(" ")[1] },
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
          <SectionHeading eyebrow="International Investing Guide" title="Global Diversification for Australian Investors" />
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
          <SectionHeading eyebrow="FAQ" title="International ETF Questions Answered" />
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
          <h2 className="text-xl font-extrabold mb-3">Ready to invest globally?</h2>
          <p className="text-sm text-slate-300 mb-6">
            Compare brokers that offer ASX-listed international ETFs with low brokerage and no platform fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/etfs" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Best ETF Brokers →
            </Link>
            <Link href="/etfs/vs/vgs-vs-iwld" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              VGS vs IWLD →
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
