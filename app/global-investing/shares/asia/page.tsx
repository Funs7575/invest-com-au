import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Buy Asian Shares from Australia (${CURRENT_YEAR}) — Japan, China, Hong Kong, Singapore`,
  description: `Compare brokers, FX spreads, withholding tax, and CGT for Australians buying Asian shares. Japan, China (A/H shares), Hong Kong, Singapore, South Korea, India. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `How to Buy Asian Shares from Australia (${CURRENT_YEAR})`,
    description:
      "Compare brokers, FX spreads, withholding tax, and CGT for Australians buying shares in Japan, China, Hong Kong, Singapore, South Korea and India.",
    url: `${SITE_URL}/global-investing/shares/asia`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Buy Asian Shares from Australia")}&sub=${encodeURIComponent(`Japan · China · HK · Singapore · ${CURRENT_YEAR}`)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/shares/asia` },
};

// ─────────────────────────────────────────────────────────────────────────────
// Market overview data. All withholding tax rates are standard treaty
// (or statutory non-treaty) rates applicable to Australian residents as at
// May 2026. Verify current treaty status with ATO or a tax professional.
// ─────────────────────────────────────────────────────────────────────────────
const MARKETS = [
  {
    country: "Japan",
    code: "JP",
    currency: "JPY",
    majorIndex: "Nikkei 225 / TOPIX",
    withholdingTax: "15.315% (treaty)",
    marketHours: "09:00–15:30 JST (Mon–Fri)",
    keyRisk: "JPY/AUD currency volatility; ageing demographics",
    bestViaEtf: "HJPN (hedged), VEA (broad developed)",
    accessNote:
      "Accessible via Interactive Brokers direct; most retail AU brokers route Japan trades through custodial desk access.",
  },
  {
    country: "China (A-shares via Stock Connect)",
    code: "CN-A",
    currency: "CNY (onshore)",
    majorIndex: "CSI 300 / SSE 50",
    withholdingTax: "10% (statutory; no DTA with AU for equity WHT)",
    marketHours: "09:30–15:00 CST (Mon–Fri)",
    keyRisk:
      "Regulatory risk (VIE structures, delisting), capital controls, geopolitical risk",
    bestViaEtf: "CNEW (Betashares China Bear), IZZ (iShares MSCI China)",
    accessNote:
      "Shanghai-Hong Kong and Shenzhen-Hong Kong Stock Connect allows foreigners to buy mainland A-shares via HK brokers. IBKR offers Stock Connect access.",
  },
  {
    country: "Hong Kong (H-shares & HK-listed)",
    code: "HK",
    currency: "HKD (pegged to USD)",
    majorIndex: "Hang Seng Index (HSI)",
    withholdingTax: "0% (HK levies no withholding tax on dividends)",
    marketHours: "09:30–16:00 HKT (Mon–Fri)",
    keyRisk: "Political and governance risk; USD peg risk; China overhang",
    bestViaEtf: "IZZ or MSCI EM broad ETFs with HK exposure",
    accessNote:
      "IBKR offers direct HK market access. Tiger Brokers (AU) also provides HK trading. Lower WHT makes HK attractive for income-focused investors.",
  },
  {
    country: "Singapore",
    code: "SG",
    currency: "SGD",
    majorIndex: "Straits Times Index (STI)",
    withholdingTax: "0% (Singapore levies no WHT on dividends to non-residents)",
    marketHours: "09:00–17:00 SGT (Mon–Fri)",
    keyRisk: "Small market; limited sector diversity beyond financials, REITs, telcos",
    bestViaEtf: "Accessible via MSCI EM or Asia-Pacific broad ETFs",
    accessNote:
      "IBKR provides direct SGX access. The Singapore REITs market is a distinctive draw for yield-oriented investors.",
  },
  {
    country: "South Korea",
    code: "KR",
    currency: "KRW",
    majorIndex: "KOSPI / KOSDAQ",
    withholdingTax: "15% (treaty)",
    marketHours: "09:00–15:30 KST (Mon–Fri)",
    keyRisk: "North Korea geopolitical risk; chaebol governance discount; KRW volatility",
    bestViaEtf: "EWY (iShares MSCI South Korea) — US-listed; IVE/VGS include exposure",
    accessNote:
      "IBKR offers KOSPI/KOSDAQ direct access. Foreigners must register with the Korea Financial Investment Association (KFIA) before trading — IBKR handles this.",
  },
  {
    country: "India",
    code: "IN",
    currency: "INR",
    majorIndex: "NIFTY 50 / BSE Sensex",
    withholdingTax: "20% (statutory for non-residents; complex treaty interactions)",
    marketHours: "09:15–15:30 IST (Mon–Fri)",
    keyRisk:
      "FPI registration complexity; high withholding tax; INR/AUD volatility; regulatory changes",
    bestViaEtf: "NDIA (Betashares India Quality), IZZ broad EM with India",
    accessNote:
      "Direct India share access for foreigners requires FPI (Foreign Portfolio Investor) registration or Sub-Account — complex and typically only viable for institutional or large-balance retail. ETF route is strongly preferred for most Australians.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Broker access table — which AU-facing brokers offer Asian market access.
// ─────────────────────────────────────────────────────────────────────────────
const BROKERS = [
  {
    name: "Interactive Brokers (IBKR)",
    slug: "interactive-brokers",
    japanAccess: true,
    hkAccess: true,
    chinaAccess: "Stock Connect via HK",
    koreaAccess: true,
    singaporeAccess: true,
    indiaAccess: false,
    fxSpread: "~0.002% + fee per FX trade",
    verdict:
      "The only mainstream AU-facing broker with direct market access to Japan, HK, Korea and Singapore at retail scale. Stock Connect access to China A-shares is available via the HK module. India remains unavailable for direct retail. The multi-currency wallet means you can hold JPY, HKD, SGD and KRW between trades without forced AUD conversion.",
  },
  {
    name: "Tiger Brokers (AU)",
    slug: "tiger-brokers",
    japanAccess: false,
    hkAccess: true,
    chinaAccess: "Stock Connect via HK",
    koreaAccess: false,
    singaporeAccess: false,
    indiaAccess: false,
    fxSpread: "0.35–0.50% AUD↔HKD",
    verdict:
      "Strong for HK and China via Stock Connect, but limited beyond that. Tiger's parent is Singapore-based and has deep Asia-Pacific roots — the HK trading infrastructure is genuinely good for retail scale. Not a direct US-markets-only broker that happens to do Asia; it was built for this region.",
  },
  {
    name: "moomoo (AU)",
    slug: "moomoo",
    japanAccess: false,
    hkAccess: true,
    chinaAccess: "Stock Connect via HK",
    koreaAccess: false,
    singaporeAccess: false,
    indiaAccess: false,
    fxSpread: "0.40–0.55% AUD↔HKD",
    verdict:
      "HK and China Stock Connect are core to the moomoo platform — the parent Futu Holdings is a Tencent-backed Hong Kong group. If HK and China A-shares are your primary target, moomoo is a strong alternative to IBKR at a simpler price point, with a better mobile experience than IBKR for most retail users.",
  },
  {
    name: "Saxo Bank",
    slug: "saxo-bank",
    japanAccess: true,
    hkAccess: true,
    chinaAccess: "Stock Connect via HK",
    koreaAccess: true,
    singaporeAccess: true,
    indiaAccess: false,
    fxSpread: "0.35–0.70% AUD↔Asian FX (varies by tier)",
    verdict:
      "Saxo offers the broadest Asian market access outside IBKR. The Classic tier has relatively high brokerage for smaller trades, but the Platinum and VIP tiers are competitive. Particularly useful if you want a single account covering both US and Asian equities without the IBKR learning curve — though Saxo's UI has its own complexity.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// FAQs — Asian shares from Australia.
// ─────────────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: "What is the easiest way for Australians to invest in Asian shares?",
    answer:
      "For most Australian retail investors, the easiest route is ASX-listed or CHESS-settled ETFs that hold Asian equities. These include IZZ (iShares MSCI China), ASIA (Betashares Asia Technology Tigers), NDIA (Betashares India Quality), and broad Asia-Pacific options like VGS (includes developed Asia) or IAA (iShares MSCI All Country Asia ex Japan). The ETF route means you bypass the complexity of foreign-broker account opening, multi-currency FX, withholding-tax compliance in multiple jurisdictions, and the risk of navigating foreign-language exchange platforms. For investors who specifically want to own individual Asian stocks — a particular Japanese automaker, a Hong Kong bank, a Korean semiconductor group — direct market access via Interactive Brokers or Tiger Brokers (for HK/China) is the next step.",
  },
  {
    question: "How does withholding tax work on Asian dividends?",
    answer:
      "Withholding tax on dividends varies significantly across Asian markets, and the rules are not uniform the way the Australia–US DTA (and W-8BEN) create a reasonably clean system. Hong Kong and Singapore levy zero withholding tax on dividends — a genuine advantage for income-focused investors. Japan withholds at 15.315% for Australian residents under the Australia–Japan DTA (compared to 20.42% for non-treaty residents). South Korea withholds at 15% under the Australia–Korea DTA. China withholds at 10% on A-share dividends (China and Australia do not have a DTA covering equity withholding). India's withholding is 20% for non-residents (complex treaty interactions apply). In all cases, Australian residents can generally claim a Foreign Income Tax Offset (FITO) for the withholding paid, up to the cap of Australian tax payable on that same income. The multi-market complexity is one reason the ETF route — where the fund manager handles all cross-border withholding — is popular.",
  },
  {
    question: "What is Stock Connect and how do Australians access it?",
    answer:
      "Shanghai-Hong Kong Stock Connect and Shenzhen-Hong Kong Stock Connect are mechanisms that allow investors with access to the Hong Kong market to buy and sell eligible mainland China A-shares listed on the Shanghai or Shenzhen stock exchanges. From a practical standpoint, if your broker has Hong Kong market access, you can usually place Stock Connect orders through the same account, subject to daily quota limits set by the Chinese authorities. Interactive Brokers, Tiger Brokers (AU) and moomoo (AU) all offer Stock Connect access. Eligible shares are a subset of mainland listings — the 'Northbound Connect' list — and include most large-cap A-shares. Note that Stock Connect comes with additional rules: foreign investors cannot participate in rights issues, same-day round-trip trading restrictions apply in some cases, and there are daily aggregate quota limits at the exchange level (rarely hit at retail scale, but worth knowing).",
  },
  {
    question: "Do I need to register separately to trade Korean or Japanese stocks?",
    answer:
      "Japan: no separate registration is required for foreign investors buying Japanese shares via a licensed broker. Your broker's account is sufficient — IBKR handles the Japan Foreign Financial Institution disclosure requirements on your behalf during account opening. South Korea: foreigners must be registered as a Foreign Portfolio Investor (FPI) with the Korea Financial Investment Association (KFIA) before trading KRX-listed stocks directly. If you trade via a broker like IBKR, they handle the KFIA registration as part of their market-enablement process for your account — it is not something you do independently. The delay for Korea onboarding can be a few business days. China A-shares (via Stock Connect): no separate FPI registration is required for the Stock Connect mechanism specifically — the quota framework handles access. Direct QFII/RQFII registration (the older institutional route) is not required.",
  },
  {
    question: "How are capital gains on Asian shares taxed in Australia?",
    answer:
      "The same Australian CGT framework that applies to US shares applies to Asian shares: the gain is calculated in AUD, using the AUD value of your cost base (the foreign-currency purchase price converted to AUD at the exchange rate on the purchase date, plus brokerage and FX costs) and the AUD value of your proceeds (the foreign-currency sale price converted to AUD at the exchange rate on the sale date, less brokerage). Currency movements are baked into the AUD result. The 50% individual CGT discount applies if you held the shares for more than 12 months. Foreign withholding taxes paid (e.g. Japanese or Korean dividend WHT) can generally be claimed as a Foreign Income Tax Offset (FITO) up to the ATO's cap. For markets where you have multiple foreign currencies in play (JPY cost base, KRW dividend, etc.), the record-keeping load is meaningful — most Australian investors with material Asian share exposure work with an accountant familiar with international tax.",
  },
  {
    question: "What are the main risks of investing directly in Asian shares?",
    answer:
      "Direct Asian share investment introduces several risk layers beyond the usual equity market risk. Currency risk: Asian currencies (JPY, KRW, CNY, INR) can move significantly against AUD, and these currency pairs are often more volatile than AUD/USD. Geopolitical risk: the Asia-Pacific region includes active territorial disputes (Taiwan Strait, South China Sea, Korean Peninsula) — a single geopolitical event can cause rapid valuation moves across the region. Regulatory and governance risk: particularly in China, regulatory changes (like the 2021 tech crackdown) can move stock prices by 50% or more without warning. VIE structures (used by most Chinese tech companies listed offshore) mean foreign investors hold a contractual entitlement, not direct equity ownership, which creates legal risk if the structure is challenged. Liquidity risk: some smaller Asian markets have lower liquidity for foreign-accessible shares, leading to wider bid-ask spreads and potentially difficult exit in stress conditions. Tax compliance complexity: multiple-jurisdiction dividend withholding and AUD-CGT across several foreign currency cost bases requires robust record-keeping.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Key callout stats.
// ─────────────────────────────────────────────────────────────────────────────
const CALLOUTS = [
  {
    label: "HK dividend WHT",
    value: "0%",
    sub: "Hong Kong levies no WHT on dividends",
  },
  {
    label: "Japan WHT (AU treaty)",
    value: "15.3%",
    sub: "vs 20.4% without DTA",
  },
  {
    label: "Markets covered by IBKR",
    value: "5+",
    sub: "Japan, HK, Korea, SG + Stock Connect",
  },
  {
    label: "Asia share of MSCI World",
    value: "~25%",
    sub: "excl. US; Japan ~6%, EM Asia ~13%",
  },
];

export default function BuyAsiaSharesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Shares", url: `${SITE_URL}/global-investing/shares` },
    { name: "Asian Shares" },
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
            <Link href="/global-investing/shares" className="hover:text-slate-900">Shares</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Asian Shares</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Cornerstone Guide · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              How to buy Asian shares{" "}
              <span className="text-amber-600">from Australia</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              A complete guide for Australian residents investing in Japan, China, Hong Kong, Singapore,
              South Korea and India in {CURRENT_YEAR}. Broker access, FX costs, withholding tax rates,
              Stock Connect, and how Australian CGT applies.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="#markets"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors"
              >
                Market overview &rarr;
              </Link>
              <Link
                href="#brokers"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Broker access &rarr;
              </Link>
              <Link
                href="#faq"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                FAQ &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-4 gap-4">
            {CALLOUTS.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-amber-200 p-5">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">{c.label}</p>
                <p className="text-xl font-black text-amber-700">{c.value}</p>
                <p className="text-xs text-slate-600 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Asia ─────────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Why consider Asian equities"
            title="Asia is roughly 25% of world market cap outside the US"
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Most Australian portfolio construction conversations about &quot;international exposure&quot; default to the
              US — the S&amp;P 500, the NASDAQ, and the handful of ASX-listed ETFs that track them. The US is
              genuinely dominant (around 63% of the MSCI World Index), but Asia represents a meaningful slice
              of the remainder that is often underweighted.
            </p>
            <p>
              Japan alone is the second or third largest developed equity market by capitalisation — Toyota,
              Sony, Nintendo, Mitsubishi UFJ, Softbank. South Korea holds Samsung Electronics and TSMC&apos;s
              main competitors in the global semiconductor supply chain. China A-shares give exposure to sectors
              that do not exist in the same form anywhere else: giant state-owned banks, EV manufacturers,
              renewable energy companies operating at a scale unmatched globally.
            </p>
            <p>
              Whether that exposure belongs in a portfolio — and at what weight — depends on individual
              risk tolerance, time horizon, and conviction about Asian economic trajectories. This page
              explains the mechanics: how access works, what it costs, and how the Australian tax system
              treats the results.
            </p>
          </div>
        </div>
      </section>

      {/* ── Market overview ──────────────────────────────────────────── */}
      <section id="markets" className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Market overview"
            title="Major Asian markets for Australian investors"
            sub="WHT rates are indicative for Australian-tax-resident individuals under current treaties (May 2026). Verify with ATO or a tax professional."
          />
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            {MARKETS.map((m) => (
              <div key={m.code} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">{m.country}</h3>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{m.code}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Currency</span>
                    <span className="font-semibold text-slate-700">{m.currency}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Index</span>
                    <span className="font-semibold text-slate-700">{m.majorIndex}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Dividend WHT</span>
                    <span className="font-semibold text-slate-700">{m.withholdingTax}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Hours (local)</span>
                    <span className="font-semibold text-slate-700">{m.marketHours}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 italic mb-2">ETF alternative: {m.bestViaEtf}</p>
                <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                  <span className="font-bold text-amber-800">Access: </span>{m.accessNote}
                </div>
                <div className="text-xs text-slate-600 bg-red-50 border border-red-100 rounded-lg p-2">
                  <span className="font-bold text-red-700">Key risk: </span>{m.keyRisk}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ETF vs Direct ────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Two routes"
            title="AU-listed Asia ETFs vs direct Asian shares"
            sub="For most Australian retail investors, ETFs are the simpler path."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              ASX-listed ETFs with Asian exposure are a straightforward entry point. Products like
              IZZ (iShares MSCI China), ASIA (Betashares Asia Technology Tigers), NDIA (Betashares India
              Quality), IAA (iShares MSCI All Country Asia ex Japan), and the developed-market component of
              VGS all settle through CHESS, distribute in AUD, and handle the withholding-tax complexity at
              the fund level.
            </p>
            <p>
              Direct Asian shares are appropriate for investors who want exposure to specific companies that
              no Australian-listed ETF captures cleanly, or who are running a concentrated portfolio with
              high-conviction positions. The trade-offs are real: foreign-broker account opening, multi-currency
              FX management, per-market withholding tax compliance, and AUD-denominated CGT tracking across
              several currency pairs.
            </p>
            <p>
              A common structure: use AU-listed ETFs for broad Asian exposure (China, India, Japan), and
              direct shares via IBKR for specific HK-listed names or Japan direct where the ETF equivalent
              doesn&apos;t track tightly enough. See{" "}
              <Link
                href="/global-investing/etfs/asia"
                className="text-amber-700 hover:text-amber-800 font-semibold underline"
              >
                our Asia ETF comparison
              </Link>{" "}
              for AU-listed options.
            </p>
          </div>
        </div>
      </section>

      {/* ── Broker table ─────────────────────────────────────────────── */}
      <section id="brokers" className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Broker comparison"
            title="Brokers with Asian market access for Australians"
            sub="FX spreads are typical retail rates as of mid-2026. Verify current fees on each broker's site."
          />
          <div className="overflow-x-auto -mx-4 sm:mx-0 mt-6">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200 sticky left-0 bg-slate-100 z-10">Broker</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">Japan</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">HK</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">China A (Stock Connect)</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">Korea</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">Singapore</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">India</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-700 border-b border-slate-200">FX spread</th>
                </tr>
              </thead>
              <tbody>
                {BROKERS.map((b, i) => (
                  <tr key={b.slug} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td
                      className="px-3 py-3 font-bold text-slate-900 border-b border-slate-100 sticky left-0 z-10 whitespace-nowrap align-top"
                      style={{ backgroundColor: i % 2 === 0 ? "white" : "rgb(248,250,252)" }}
                    >
                      <Link href={`/broker/${b.slug}`} className="hover:text-amber-700">{b.name}</Link>
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100 align-top">
                      {b.japanAccess ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-red-400">No</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100 align-top">
                      {b.hkAccess ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-red-400">No</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.chinaAccess}</td>
                    <td className="px-3 py-3 border-b border-slate-100 align-top">
                      {b.koreaAccess ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-red-400">No</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100 align-top">
                      {b.singaporeAccess ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-red-400">No</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100 align-top">
                      {b.indiaAccess ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-red-400">No</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-700 border-b border-slate-100 align-top">{b.fxSpread}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Per-broker verdict</p>
            {BROKERS.map((b) => (
              <div key={b.slug} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">{b.name}</h3>
                  <Link href={`/broker/${b.slug}`} className="text-xs font-bold text-amber-700 hover:text-amber-800">
                    Full review &rarr;
                  </Link>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{b.verdict}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FX & Currency ────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="FX costs"
            title="Currency costs across Asian markets"
            sub="Asian FX pairs often carry wider spreads than AUD/USD."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              While AUD/USD is a deep, liquid pair that most retail brokers handle competitively,
              cross-rates like AUD/JPY, AUD/HKD, AUD/KRW and AUD/CNY are less liquid and typically
              incur wider spreads — both from the underlying interbank market and from retail broker
              margins on top.
            </p>
            <p>
              IBKR&apos;s FX engine handles Asian currencies at institutional rates with a small fixed fee,
              making it the clear cost leader for JPY, HKD and KRW conversions. Other brokers either don&apos;t
              support direct Asian FX conversion (and require USD as an intermediate leg) or apply
              0.40–0.70% spread on the cross-rate.
            </p>
            <p>
              The practical consequence: converting AUD &rarr; JPY &rarr; Japanese shares &rarr; JPY &rarr; AUD via a
              non-IBKR broker can layer 1–2% in FX cost on each leg of a round-trip position. For long-term
              holders who rarely convert back, this is mainly a one-way cost at entry. For more active traders,
              the FX drag compounds meaningfully.
            </p>
            <p>
              For dedicated currency conversion (e.g. a large AUD &rarr; JPY conversion ahead of a Japanese
              property purchase or large equity portfolio build), specialist FX providers typically beat
              retail brokers. See our{" "}
              <Link href="/global-investing/currency/best-fx-providers" className="text-amber-700 hover:text-amber-800 font-semibold underline">
                FX provider guide
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Buying Asian shares from Australia — common questions" />
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
      <section className="py-8 bg-white border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Related guides</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/global-investing" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing hub &rarr;</Link>
            <Link href="/global-investing/etfs/asia" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Asia ETFs (AU-listed) &rarr;</Link>
            <Link href="/global-investing/shares/us" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">US shares guide &rarr;</Link>
            <Link href="/global-investing/tax" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing tax hub &rarr;</Link>
            <Link href="/global-investing/tax/cgt-on-foreign-shares" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">CGT on foreign shares &rarr;</Link>
            <Link href="/foreign-investment/japan" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Investing in Japan (inbound guide) &rarr;</Link>
            <Link href="/foreign-investment/china" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Investing in China (inbound guide) &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
