import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Global ETFs for Australian Investors (${CURRENT_YEAR}) — VGS, IVV, NDQ Compared`,
  description: `Compare the best global ETFs on the ASX for Australians: VGS, IVV, NDQ, VGE, BGBL, ETHI and more. MER, hedging, tax, and portfolio guides. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Global ETFs for Australian Investors (${CURRENT_YEAR})`,
    description:
      "VGS vs IVV vs NDQ — complete guide to global ETFs on the ASX: MER comparison, hedged vs unhedged, tax treatment and how to build a simple global portfolio.",
    url: `${SITE_URL}/global-investing/etfs`,
  },
  alternates: { canonical: `${SITE_URL}/global-investing/etfs` },
};

const FAQS = [
  {
    q: "What is the best global ETF in Australia?",
    a: "There is no single best global ETF — it depends on your goals. For broad developed-world exposure, VGS (Vanguard MSCI World ex-Australia, 0.18% MER) is the most popular choice. For pure US exposure at the lowest cost, IVV (iShares S&P 500, 0.04% MER) is hard to beat. For the lowest MER on a broad global basket, BGBL (BetaShares Global Shares, 0.08%) is worth comparing. Most long-term investors hold one of these as their core international holding, then optionally add VGE for emerging markets exposure.",
  },
  {
    q: "Should I buy VGS or IVV as an Australian investor?",
    a: "VGS gives you broader developed-world diversification across 23 countries (US ~70%, Europe ~20%, Japan and others ~10%). IVV is purely US-focused — 500 large American companies. If you already want global diversification, VGS is the better core holding. If you specifically want US equity exposure — perhaps alongside VEU or another ex-US ETF — then IVV at 0.04% MER is the cheapest option. IVV alone is not a globally diversified portfolio; VGS alone still has significant US concentration (~70%) but does spread risk more widely.",
  },
  {
    q: "Do global ETFs pay dividends in Australia?",
    a: "Yes. Global ETFs listed on the ASX distribute income to unit holders, typically quarterly or semi-annually. The distributions include dividends passed through from the underlying foreign companies. Unlike Australian shares, these distributions carry no franking credits because the companies have not paid Australian corporate tax. Distributions from VGS, IVV and similar ETFs are composed primarily of foreign income. You will receive a tax statement from the fund each year showing each income component — you must report gross distribution income and may be able to claim a Foreign Income Tax Offset (FITO) for any foreign withholding tax already paid.",
  },
  {
    q: "How are global ETF distributions taxed?",
    a: "Distributions from global ETFs like VGS and IVV are primarily foreign income in ATO terms. You must include the gross distribution in your assessable income and can claim a Foreign Income Tax Offset (FITO) for withholding tax withheld by the foreign country (commonly 15% for US dividends under the Australia–US tax treaty). The ETF issues an annual AMMA statement breaking down the distribution components. You report each component separately in your tax return. Many investors use Sharesight to automate this, as it imports AMMA data directly and pre-fills MyTax fields.",
  },
  {
    q: "Should I hedge my global ETF?",
    a: "Most long-term Australian investors choose unhedged global ETFs. Over a 10–20 year horizon, currency fluctuations tend to average out, and the AUD has historically drifted lower against developed-world currencies — meaning unhedged investors have received a tailwind. Hedged versions (VGAD, IHVV, HNDQ) cost slightly more in MER and carry an additional hedging drag of roughly 0.03–0.07% per year. Hedged ETFs suit investors with a shorter time horizon, those who need more predictable AUD income, or those wanting pure equity returns without FX overlay. For buy-and-hold investors building wealth over decades, unhedged is the consensus recommendation.",
  },
];

const GLOBAL_ETFS = [
  {
    ticker: "VGS",
    name: "Vanguard MSCI Index International Shares ETF",
    index: "MSCI World ex-Australia",
    mer: "0.18%",
    hedged: false,
    exposure: "Developed markets, 1,500+ stocks",
  },
  {
    ticker: "VGAD",
    name: "Vanguard MSCI Index International Shares (Hedged) ETF",
    index: "MSCI World ex-Australia (AUD-hedged)",
    mer: "0.21%",
    hedged: true,
    exposure: "Same as VGS, AUD-hedged",
  },
  {
    ticker: "IVV",
    name: "iShares Core S&P 500 ETF",
    index: "S&P 500",
    mer: "0.04%",
    hedged: false,
    exposure: "Top 500 US companies",
  },
  {
    ticker: "IHVV",
    name: "iShares S&P 500 (AUD Hedged) ETF",
    index: "S&P 500 (AUD-hedged)",
    mer: "0.10%",
    hedged: true,
    exposure: "S&P 500 AUD-hedged",
  },
  {
    ticker: "NDQ",
    name: "BetaShares Nasdaq 100 ETF",
    index: "Nasdaq 100",
    mer: "0.22%",
    hedged: false,
    exposure: "Top 100 Nasdaq tech stocks",
  },
  {
    ticker: "HNDQ",
    name: "BetaShares Nasdaq 100 (Hedged) ETF",
    index: "Nasdaq 100 (AUD-hedged)",
    mer: "0.22%",
    hedged: true,
    exposure: "Nasdaq 100 AUD-hedged",
  },
  {
    ticker: "VGE",
    name: "Vanguard FTSE Emerging Markets ETF",
    index: "FTSE Emerging Markets",
    mer: "0.48%",
    hedged: false,
    exposure: "China, India, Brazil, EM",
  },
  {
    ticker: "BGBL",
    name: "BetaShares Global Shares ETF",
    index: "Solactive GBS Developed Markets ex-AUS",
    mer: "0.08%",
    hedged: false,
    exposure: "MSCI World equivalent, very low MER",
  },
  {
    ticker: "VESG",
    name: "Vanguard Ethically Conscious International Shares ETF",
    index: "FTSE Developed ex-AUS All Cap Choice",
    mer: "0.18%",
    hedged: false,
    exposure: "ESG-screened global developed",
  },
  {
    ticker: "ETHI",
    name: "BetaShares Global Sustainability Leaders ETF",
    index: "Nasdaq Future Global Sustainability Leaders",
    mer: "0.59%",
    hedged: true,
    exposure: "Climate leaders ESG-screened",
  },
];

// MER compounding table data: $10,000 at 7% gross, net of MER, over 10/20/30 years
// Formula: 10000 * (1 + (0.07 - mer))^years
const MER_ROWS = [
  { label: "IVV (0.04% MER)", merVal: 0.0004, color: "text-green-700" },
  { label: "VGS / BGBL (0.18% MER)", merVal: 0.0018, color: "text-slate-700" },
  { label: "ETHI (0.59% MER)", merVal: 0.0059, color: "text-amber-700" },
];

function fv(principal: number, netRate: number, years: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(principal * Math.pow(1 + netRate, years));
}

export default function GlobalInvestingEtfsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Global ETFs", url: absoluteUrl("/global-investing/etfs") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}

      <div className="bg-white min-h-screen">

        {/* ── Hero ── */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white py-12 md:py-18">
          <div className="container-custom max-w-5xl">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/global-investing" className="hover:text-white">
                Global Investing
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Global ETFs</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
                {UPDATED_LABEL}
              </span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">
                ASX-Listed ETFs
              </span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
                {CURRENT_YEAR} Guide
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Global ETFs for Australian Investors
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              A single ASX trade can give you exposure to thousands of
              international companies across the US, Europe, Japan, and emerging
              markets. This guide compares every major global ETF available to
              Australians, covers hedged vs unhedged, tax treatment, MER impact,
              and how to build a simple two-fund global portfolio.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/global-investing/etfs/us"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors"
              >
                US ETFs in detail &rarr;
              </Link>
              <Link
                href="/global-investing/etfs/global"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Developed-world ETFs &rarr;
              </Link>
              <Link
                href="/global-investing/tax/fito"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Foreign income tax offset &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── Why global ETFs ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 1
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Why Australian investors need global ETFs
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Australia represents roughly 2% of global stock market
              capitalisation. Investing only in ASX shares means missing 98% of
              the world&apos;s listed companies. Worse, the ASX is heavily
              concentrated in banks, miners, and healthcare — sectors that move
              together and leave portfolios exposed to local economic cycles.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  heading: "ASX sector concentration",
                  body: "Financials and materials together make up over 40% of the ASX 200 by weight. Technology — the fastest-growing sector globally over the past two decades — is less than 5% of the Australian market. A global ETF like VGS or IVV provides significant technology, consumer, pharma, and industrial exposure that is structurally absent from a pure ASX portfolio.",
                  color: "border-amber-200 bg-amber-50",
                },
                {
                  heading: "Currency diversification",
                  body: "Holding assets in USD, EUR, JPY, and GBP provides natural protection when the Australian economy slows and the AUD falls — precisely when you most need your portfolio to hold its value. Unhedged global ETFs deliver this benefit automatically; when the AUD weakens your international holdings are worth more in local terms.",
                  color: "border-blue-200 bg-blue-50",
                },
                {
                  heading: "Access to global compounders",
                  body: "The world&apos;s most powerful compounding businesses — in software, semiconductors, pharmaceuticals, and global consumer brands — are overwhelmingly listed in the US, Europe, and Japan, not Australia. Global ETFs provide affordable, liquid access to these companies through a standard ASX brokerage account with no overseas account required.",
                  color: "border-green-200 bg-green-50",
                },
              ].map((card) => (
                <div
                  key={card.heading}
                  className={`rounded-xl border p-5 ${card.color}`}
                >
                  <h3 className="font-extrabold text-slate-900 mb-2">
                    {card.heading}
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-900 text-white p-6">
              <h3 className="text-base font-extrabold mb-2">
                ASX vs global sector breakdown (approximate)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="ASX vs global market sector breakdown by weight">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th scope="col" className="text-left py-2 font-bold text-slate-300">
                        Sector
                      </th>
                      <th scope="col" className="text-right py-2 font-bold text-slate-300">
                        ASX 200
                      </th>
                      <th scope="col" className="text-right py-2 font-bold text-slate-300">
                        MSCI World (VGS)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {[
                      { sector: "Financials", asx: "~30%", msci: "~14%" },
                      { sector: "Materials / Mining", asx: "~24%", msci: "~4%" },
                      {
                        sector: "Information Technology",
                        asx: "~4%",
                        msci: "~24%",
                      },
                      { sector: "Healthcare", asx: "~10%", msci: "~12%" },
                      { sector: "Consumer (Disc. + Staples)", asx: "~8%", msci: "~14%" },
                      { sector: "Industrials", asx: "~8%", msci: "~11%" },
                    ].map((row) => (
                      <tr key={row.sector}>
                        <td className="py-2 text-slate-300">{row.sector}</td>
                        <td className="py-2 text-right text-amber-400 font-bold">
                          {row.asx}
                        </td>
                        <td className="py-2 text-right text-green-400 font-bold">
                          {row.msci}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Approximate weightings — verify in current index fact sheets
                before relying on for investment decisions.
              </p>
            </div>
          </div>
        </section>

        {/* ── ETF comparison table ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 2
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Global ETF comparison table
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              All ETFs below are listed on the ASX and trade like ordinary
              shares. MER = Management Expense Ratio (annual fund fee deducted
              from assets). Data indicative as at {CURRENT_YEAR} — verify in
              the relevant PDS before investing.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Global ETF comparison — ASX-listed ETFs, index, MER and currency hedging">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Ticker
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700 hidden lg:table-cell">
                      Index Tracked
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      MER
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Hedged?
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700 hidden md:table-cell">
                      Key Exposure
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {GLOBAL_ETFS.map((etf) => (
                    <tr key={etf.ticker} className="hover:bg-white">
                      <td className="px-4 py-3">
                        <span className="font-extrabold text-slate-900">
                          {etf.ticker}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {etf.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">
                        {etf.index}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {etf.mer}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            etf.hedged
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {etf.hedged ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">
                        {etf.exposure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {GENERAL_ADVICE_WARNING}
            </p>
          </div>
        </section>

        {/* ── Hedged vs unhedged deep dive ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 3
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Hedged vs unhedged: a deep dive
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Every global ETF forces you to make a currency decision. When you
              buy VGS, you are buying US dollars, euros, yen, and pounds wrapped
              inside an ASX-listed unit. If the AUD falls against those
              currencies, your portfolio is worth more in AUD — a bonus. If the
              AUD rises, you take a currency loss on top of whatever the
              underlying equities do. A hedged ETF like VGAD uses currency
              forward contracts to neutralise this effect, delivering pure equity
              return in AUD terms.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Hedged vs unhedged global ETFs — feature comparison">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">
                      Feature
                    </th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">
                      Unhedged (e.g., VGS, IVV)
                    </th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">
                      Hedged (e.g., VGAD, IHVV)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      feature: "Currency exposure",
                      unhedged: "Yes — AUD/USD and other moves affect AUD returns",
                      hedged: "No — forward contracts neutralise FX moves",
                    },
                    {
                      feature: "MER premium (approx.)",
                      unhedged: "Base rate (e.g. VGS 0.18%, IVV 0.04%)",
                      hedged: "Base + ~0.03–0.07% additional hedging cost",
                    },
                    {
                      feature: "Benefits when...",
                      unhedged: "AUD weakens — foreign returns boosted in AUD",
                      hedged: "AUD strengthens — protects from FX headwind",
                    },
                    {
                      feature: "Recommended horizon",
                      unhedged: "10+ years (currency effects average out)",
                      hedged: "Shorter horizons or income-focused investors",
                    },
                    {
                      feature: "Short-term volatility",
                      unhedged: "Higher — equity + FX moves compound",
                      hedged: "Lower — pure equity return in AUD",
                    },
                    {
                      feature: "Natural diversification",
                      unhedged: "Yes — AUD/USD historically negatively correlated with ASX downturns",
                      hedged: "No — removes the FX buffer benefit",
                    },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-700 text-xs">
                        {row.feature}
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        {row.unhedged}
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        {row.hedged}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  The case for unhedged (most investors)
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The AUD and ASX tend to fall together during global risk-off
                  events — recessions, financial crises, commodity busts. When
                  this happens, unhedged global ETFs rise in AUD terms as the
                  USD strengthens, providing a natural cushion. Over a 20-year
                  period, the AUD has trended lower against the USD and major
                  currencies, giving unhedged investors a structural tailwind.
                  The additional hedging cost of 0.03–0.07% p.a. compounds
                  against you over time.
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  When hedged makes sense
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Hedged ETFs suit investors who need stable AUD distributions
                  for income (the FX noise makes distributions unpredictable in
                  unhedged ETFs), those with a shorter time horizon of 3–7
                  years, or those who already hold significant AUD-denominated
                  assets and want their international allocation to deliver a
                  clean equity return signal. Retirees drawing down on a
                  portfolio sometimes prefer the lower short-term volatility of
                  hedged holdings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── US concentration risk ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 4
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              US concentration risk in global ETFs
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Even broad global ETFs are heavily weighted towards the United
              States. VGS has roughly 70% US exposure; IVV is 100% US; NDQ is
              approximately 95% US and heavily concentrated in a handful of
              large-cap technology companies. Investors who assume they are
              &quot;globally diversified&quot; because they own VGS and IVV may actually
              have 80–90% US exposure once holdings are combined.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  ticker: "VGS",
                  usWeight: "~70%",
                  topHoldings: "Apple, Microsoft, Nvidia, Amazon, Meta",
                  note: "Developed world but US-dominated by market-cap weighting",
                  color: "border-blue-200",
                },
                {
                  ticker: "IVV",
                  usWeight: "100%",
                  topHoldings: "Apple, Microsoft, Nvidia, Amazon, Alphabet",
                  note: "Pure US — meaningful single-country concentration",
                  color: "border-amber-200",
                },
                {
                  ticker: "NDQ",
                  usWeight: "~95%",
                  topHoldings: "Apple, Microsoft, Nvidia, Amazon, Meta, Tesla",
                  note: "US tech-heavy — highest concentration of the three",
                  color: "border-red-200",
                },
              ].map((item) => (
                <div
                  key={item.ticker}
                  className={`rounded-xl border bg-white p-5 ${item.color}`}
                >
                  <div className="text-xl font-extrabold text-slate-900 mb-1">
                    {item.ticker}
                  </div>
                  <div className="text-2xl font-extrabold text-blue-700 mb-1">
                    {item.usWeight} US
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Top holdings: {item.topHoldings}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">
                Building a more geographically balanced portfolio
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Investors who want to reduce US dominance can combine VGS with
                VGE (Vanguard Emerging Markets, 0.48% MER) to add China, India,
                Brazil, South Korea, and other emerging economies. A 70% VGS /
                30% VGE split gives a meaningfully more balanced global
                exposure. Alternatively, holding VGS alongside VEU (Vanguard
                All-World ex-US) reduces US weight further while maintaining
                broad developed-market coverage.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    label: "VGS alone",
                    desc: "~70% US, ~20% Europe, ~10% Japan/other — still US-heavy",
                    tag: "Simple",
                    tagColor: "bg-blue-100 text-blue-700",
                  },
                  {
                    label: "VGS + VGE (70/30)",
                    desc: "Adds China, India, Brazil, S. Korea — broader geographic spread",
                    tag: "Recommended for diversification",
                    tagColor: "bg-green-100 text-green-700",
                  },
                ].map((opt) => (
                  <div
                    key={opt.label}
                    className="rounded-lg bg-slate-50 border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {opt.label}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${opt.tagColor}`}
                      >
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Tax treatment ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 5
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Tax treatment of global ETF distributions
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Distributions from global ETFs are primarily foreign income under
              Australian tax law. Unlike dividends from Australian shares, they
              carry no franking credits. However, foreign companies often
              withhold tax at source — typically 15% for US dividends under the
              Australia&ndash;US tax treaty — and Australian investors can claim a
              Foreign Income Tax Offset (FITO) to avoid double taxation.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Tax treatment of global ETF distribution components">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">
                      Distribution component
                    </th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">
                      Tax treatment
                    </th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700 hidden md:table-cell">
                      Example ETF
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      component: "Foreign income (dividends from overseas companies)",
                      tax: "Include gross amount in assessable income; claim FITO for foreign withholding tax paid",
                      example: "VGS, IVV, NDQ",
                    },
                    {
                      component: "Australian dividends (if any in the fund)",
                      tax: "Include in assessable income; franking credits offset tax payable or are refunded",
                      example: "Mixed ETFs only",
                    },
                    {
                      component: "Capital gains (discounted — fund held asset 12+ months)",
                      tax: "50% CGT discount applies; include 50% of gain in assessable income",
                      example: "Any ETF selling holdings",
                    },
                    {
                      component: "Capital gains (other — held less than 12 months)",
                      tax: "Full amount included in assessable income; no discount",
                      example: "Any ETF selling recent holdings",
                    },
                    {
                      component: "Return of capital",
                      tax: "Not immediately taxable — reduces your cost base, increasing future CGT",
                      example: "Some infrastructure ETFs",
                    },
                  ].map((row) => (
                    <tr key={row.component} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900 text-xs">
                        {row.component}
                      </td>
                      <td className="p-4 text-slate-600 text-xs">{row.tax}</td>
                      <td className="p-4 text-slate-500 text-xs hidden md:table-cell">
                        {row.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  ETF vs buying foreign shares directly
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  If you bought Apple, Microsoft, and Nvidia directly on the US
                  market, you would need to lodge a W-8BEN form with your
                  broker, receive separate 1099-DIV statements, and manually
                  calculate FITOs for each holding at tax time. A global ETF
                  consolidates all of this: one AMMA statement from the fund
                  issuer covers every underlying foreign company, with all
                  income components pre-calculated. This is a significant
                  administrative simplification.
                </p>
                <Link
                  href="/global-investing/tax/w-8ben"
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  W-8BEN guide for Australian investors &rarr;
                </Link>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  Foreign Income Tax Offset (FITO)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  Your AMMA statement will show the amount of foreign tax
                  withheld by overseas governments on dividends the fund
                  received. You include this as assessable income (the gross
                  amount before withholding), then claim an equal FITO, reducing
                  your Australian tax bill dollar-for-dollar. If the foreign tax
                  withheld exceeds your Australian tax liability on that income,
                  the excess is lost — it cannot be refunded or carried forward.
                </p>
                <Link
                  href="/global-investing/tax/fito"
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Full FITO guide &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── MER compounding impact ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 6
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              MER impact on long-term returns
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              The MER difference between 0.04% (IVV) and 0.59% (ETHI) looks
              small in year one. Over decades, the compounding difference is
              substantial. The table below shows the terminal value of $10,000
              invested at a 7% gross annual return — the only difference is the
              MER deducted from returns each year.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-sm" aria-label="MER impact on long-term returns — terminal value of $10,000 at 7% gross return">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">
                      ETF (MER)
                    </th>
                    <th scope="col" className="text-right p-4 font-bold text-slate-700">
                      10 years
                    </th>
                    <th scope="col" className="text-right p-4 font-bold text-slate-700">
                      20 years
                    </th>
                    <th scope="col" className="text-right p-4 font-bold text-slate-700">
                      30 years
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MER_ROWS.map((row) => (
                    <tr key={row.label} className="hover:bg-white">
                      <td className={`p-4 font-bold ${row.color}`}>
                        {row.label}
                      </td>
                      <td className="p-4 text-right text-slate-700 font-bold">
                        {fv(10000, 0.07 - row.merVal, 10)}
                      </td>
                      <td className="p-4 text-right text-slate-700 font-bold">
                        {fv(10000, 0.07 - row.merVal, 20)}
                      </td>
                      <td className="p-4 text-right text-slate-700 font-bold">
                        {fv(10000, 0.07 - row.merVal, 30)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Illustrative only. Assumes 7% p.a. gross return, no additional
              contributions, MER deducted annually. Actual returns will differ.
            </p>
          </div>
        </section>

        {/* ── How to buy global ETFs ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 7
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              How to buy global ETFs in Australia
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Global ETFs listed on the ASX are bought exactly like any
              Australian share. You need an ASX brokerage account, a deposit,
              and the ETF ticker symbol. No overseas account, currency
              conversion, or special access is required.
            </p>

            <div className="space-y-3 mb-8">
              {[
                {
                  step: "1",
                  title: "Open an ASX brokerage account",
                  body: "Popular low-cost brokers for ETF investing include CommSec, SelfWealth, Stake, and Pearler. Pearler is designed specifically for long-term ETF investors and supports automated recurring buys. Most accounts can be opened online in 10–15 minutes with a driver&apos;s licence and tax file number.",
                },
                {
                  step: "2",
                  title: "Search by ticker code",
                  body: "Once your account is funded, search for the ETF by its ASX ticker — for example, VGS, IVV, or NDQ. You will see a live quote showing the current ask price (what you will pay) and bid price (what you will receive if selling).",
                },
                {
                  step: "3",
                  title: "Place a buy order",
                  body: "For liquid, large ETFs like VGS and IVV, a market order is usually fine — the bid-ask spread is typically less than 0.05%. For smaller ETFs, use a limit order set just above the ask price to control the maximum you pay. Orders are matched during ASX trading hours (10am–4pm AEST, Monday to Friday).",
                },
                {
                  step: "4",
                  title: "Settlement (T+2) and CHESS",
                  body: "Trades settle two business days after execution. With CHESS-sponsored brokers (CommSec, SelfWealth, Pearler), your ETF units are registered in your name at the CHESS sub-register and you receive a Holder Identification Number (HIN). Custodial brokers (Stake, some moomoo accounts) hold units in the broker&apos;s name on your behalf — check your broker&apos;s model before investing.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">
                      {s.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">
                Popular ASX brokers for global ETFs
              </h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: "CommSec", note: "Full-service, CHESS, $10/trade" },
                  { name: "SelfWealth", note: "Flat $9.50/trade, CHESS" },
                  { name: "Stake", note: "Commission-free (FX spread on AUD deposits), custodial" },
                  { name: "Pearler", note: "Built for ETF investors, CHESS, auto-invest" },
                ].map((b) => (
                  <div
                    key={b.name}
                    className="rounded-lg bg-white border border-slate-200 p-3"
                  >
                    <div className="font-extrabold text-slate-900 text-sm mb-1">
                      {b.name}
                    </div>
                    <div className="text-xs text-slate-500">{b.note}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Brokerage fees and account features change frequently. Verify
                directly with each broker before opening an account.
              </p>
            </div>
          </div>
        </section>

        {/* ── Building a simple global portfolio ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 8
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Building a simple global portfolio
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Research consistently shows that adding complexity to a portfolio
              — more ETFs, factor tilts, tactical allocation — rarely improves
              outcomes for retail investors and often makes it harder to stay the
              course. Two or three broad ETFs, rebalanced annually, has
              outperformed the average investor portfolio in nearly every study
              of DIY Australian investors.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {[
                {
                  title: "Two-ETF global portfolio",
                  etfs: "VAS + VGS",
                  split: "30% VAS / 70% VGS",
                  desc: "VAS (Vanguard Australian Shares, 0.07% MER) gives home-market exposure with franking credits. VGS covers 23 developed markets including the US, Europe, and Japan. This is the most common portfolio structure recommended by Australian financial educators and low-cost advisers.",
                  color: "border-blue-200",
                  badge: "Most popular",
                  badgeColor: "bg-blue-100 text-blue-700",
                },
                {
                  title: "Three-ETF global portfolio",
                  etfs: "VAS + VGS + VGE",
                  split: "25% VAS / 55% VGS / 20% VGE",
                  desc: "Adding VGE (Vanguard Emerging Markets, 0.48% MER) introduces China, India, Brazil, and South Korea — countries growing faster than developed markets but with higher political and currency risk. The higher MER for VGE reflects the complexity and cost of holding emerging market shares. Rebalance annually.",
                  color: "border-green-200",
                  badge: "With EM exposure",
                  badgeColor: "bg-green-100 text-green-700",
                },
              ].map((portfolio) => (
                <div
                  key={portfolio.title}
                  className={`rounded-xl border bg-white p-5 ${portfolio.color}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-extrabold text-slate-900">
                      {portfolio.title}
                    </h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${portfolio.badgeColor}`}
                    >
                      {portfolio.badge}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-blue-700 mb-1">
                    {portfolio.etfs}
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    Suggested split: {portfolio.split}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {portfolio.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">
                Why simple beats complex
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {
                    point: "Fewer tax events",
                    detail: "Two ETFs means two AMMA statements and simpler CGT records at tax time.",
                  },
                  {
                    point: "Easier to rebalance",
                    detail: "With two or three funds, you can rebalance with a single additional buy — direct new contributions to the lagging fund.",
                  },
                  {
                    point: "Behavioural edge",
                    detail: "Simple portfolios are easier to stay with during market downturns. Complexity creates decision paralysis and market timing temptation.",
                  },
                ].map((item) => (
                  <div key={item.point} className="rounded-lg bg-slate-50 p-4">
                    <div className="font-extrabold text-slate-900 text-sm mb-1">
                      {item.point}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Thematic / sector ETFs ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              Section 9
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Thematic and sector global ETFs
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Beyond broad market ETFs, the ASX lists a growing range of
              thematic ETFs targeting specific industries or investment themes.
              These can be held as satellite positions alongside a core
              diversified holding, but they carry meaningfully higher
              concentration risk and typically higher MERs.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-sm" aria-label="Thematic and sector global ETFs on the ASX">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Ticker
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Theme
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      MER
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700 hidden md:table-cell">
                      Risk note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      ticker: "HACK",
                      theme: "Global cybersecurity companies",
                      mer: "0.67%",
                      risk: "High volatility; cyclical with enterprise tech spending",
                    },
                    {
                      ticker: "FOOD",
                      theme: "Global agriculture and food supply chain",
                      mer: "0.57%",
                      risk: "Commodity-linked; includes fertiliser, machinery, food producers",
                    },
                    {
                      ticker: "SEMI",
                      theme: "Global semiconductor companies",
                      mer: "0.57%",
                      risk: "Highly cyclical; concentration in Taiwan, South Korea, US",
                    },
                  ].map((row) => (
                    <tr key={row.ticker} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-extrabold text-slate-900">
                        {row.ticker}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.theme}</td>
                      <td className="px-4 py-3 font-bold text-amber-700">
                        {row.mer}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                        {row.risk}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Important:</strong> Thematic ETFs concentrate your
                capital in a narrow slice of the global economy. When the theme
                performs well, they outperform. When it falls out of favour —
                and all themes eventually do — they can underperform a broad
                market ETF by a wide margin for years. Position-size thematic
                ETFs as satellites (5–15% of total portfolio) rather than core
                holdings.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQs ── */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              FAQ
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50 text-sm">
                    {item.q}
                    <svg
                      className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── General advice warning ── */}
        <section className="py-10 bg-white border-t border-slate-100">
          <div className="container-custom max-w-5xl">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </div>

            {/* Related links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link
                href="/global-investing/etfs/us"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                US market ETFs in detail &rarr;
              </Link>
              <Link
                href="/global-investing/etfs/global"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                Developed-world ETFs &rarr;
              </Link>
              <Link
                href="/global-investing/tax/cgt-on-foreign-shares"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
              >
                CGT on global ETFs &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
