import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is the difference between an ETF and an index fund?",
    a: "The terms are often used interchangeably, but they describe different things. An ETF (Exchange-Traded Fund) is a structure: a fund that lists its units on a stock exchange and trades like a share throughout the day. An index fund refers to a strategy: a fund that passively tracks a market index rather than being actively managed. Most ASX-listed ETFs are index funds, but not all index funds are ETFs — some are unlisted managed funds priced once per day at NAV. And not all ETFs are index funds — active ETFs (like MSTR or MOAT) also trade on the ASX.",
  },
  {
    q: "How do I buy ETFs on the ASX?",
    a: "You need a brokerage account that provides access to the ASX. Popular low-cost options include CommSec, Pearler, SelfWealth, Stake, and moomoo. Once your account is funded, search for the ETF ticker (e.g., VAS, VGS, IVV) and place a buy order. A market order executes at the best available price; a limit order lets you set a maximum price. For liquid ETFs with tight bid-ask spreads, market orders are typically fine. Settlement occurs T+2 (two business days after the trade).",
  },
  {
    q: "Why do some ETFs trade at a discount or premium to NAV?",
    a: "An ETF's market price can differ slightly from the value of its underlying holdings (NAV) due to supply and demand during trading hours. However, Authorised Participants (large institutional traders) have the ability to create new ETF units by delivering the underlying basket, or redeem existing units for the underlying basket. This arbitrage mechanism keeps ETF prices tightly anchored to NAV for liquid, well-established ETFs. Larger discounts or premiums can occur in ETFs with illiquid underlying assets (e.g., emerging market bonds after hours) or in periods of extreme market stress.",
  },
  {
    q: "What is the minimum amount to invest in an ETF?",
    a: "The minimum investment is the price of one unit. For most popular ASX ETFs, one unit costs between $5 and $200 depending on the ETF and current market price. For example, one unit of VAS is typically around $80-$90, while IVV units trade around $60-$70. Add in brokerage ($0-$9.50 depending on your broker) and you could start investing in a diversified portfolio of hundreds of companies for well under $200. CHESS-sponsored brokerage accounts (CommSec, SelfWealth, Pearler) allow you to hold ETF units directly in your name.",
  },
  {
    q: "Which Australian ETF has the lowest MER?",
    a: "The lowest Management Expense Ratio (MER) for an ASX-listed ETF is currently 0.04% p.a., shared by BetaShares Australia 200 ETF (A200) for Australian equities and iShares Core S&P 500 ETF (IVV) for US large-cap equities. BetaShares Global Shares ETF (BGBL) also charges just 0.08% for broad global developed market exposure. For comparison, the average active managed fund charges 0.7%-1.5% p.a. The fee difference on a $100,000 portfolio over 20 years at 7% p.a. growth is approximately $40,000-$60,000 in total return.",
  },
  {
    q: "How are ETF distributions taxed in Australia?",
    a: "ETF distributions are not a single type of income — they are a bundle of components, each taxed differently. Your annual tax statement (formerly called an AMMA statement) breaks this down into: Australian dividends (including franking credits), foreign income (potentially offset by Foreign Income Tax Offsets, or FITOs), capital gains (taxed at discounted, indexed, or other rates depending on how they were realised inside the fund), and returns of capital (not immediately taxable but reduce your cost base). You must report each component separately in your tax return. Portfolio tracker tools like Sharesight automate this. Inside super, all ETF income is taxed at 15% in accumulation phase and 0% in pension phase.",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `ETF Guide Australia (${CURRENT_YEAR}) — How ETFs Work, Types & How to Choose`,
  description:
    "How ETFs work in Australia — major ASX types (VAS, VGS, IVV, VDHG), MER comparison, hedged vs unhedged, tax treatment, and building your first portfolio.",
  alternates: { canonical: `${SITE_URL}/invest/etfs` },
  openGraph: {
    title: `ETF Guide Australia (${CURRENT_YEAR}) — How ETFs Work, Types & How to Choose`,
    description:
      "How ETFs work, the major types on the ASX, key metrics to compare (MER, tracking error, bid-ask spread), hedged vs unhedged, tax treatment, and portfolio frameworks for Australian investors.",
    url: `${SITE_URL}/invest/etfs`,
    images: [{ url: `/api/og?title=${encodeURIComponent("ETF Investing Australia")}&sub=${encodeURIComponent("ASX ETFs · Compare · MER · Asset Class · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function EtfsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "ETF Guide Australia", url: absoluteUrl("/invest/etfs") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">ETF Guide Australia</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Passive Investing</span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">ASX ETFs</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              ETF Guide Australia: How They Work &amp; How to Choose
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Exchange-Traded Funds are the most popular vehicle for low-cost, diversified investing in Australia. This guide covers how ETFs work mechanically, every major type available on the ASX, what metrics to compare, and how to build a portfolio from scratch.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "0.04%", l: "Cheapest ASX ETF MER", sub: "A200 & IVV — vs 0.7–1.5% for active" },
                { v: "$190B+", l: "ASX ETF market size", sub: "Australian ETF industry AUM (2025)" },
                { v: "300+", l: "ETFs on the ASX", sub: "Equities, bonds, property, multi-asset" },
                { v: "T+2", l: "Settlement", sub: "Two business days after trade" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 1: What is an ETF */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 1</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is an ETF?</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              An Exchange-Traded Fund (ETF) is a fund that holds a basket of securities — shares, bonds, commodities, or other assets — and lists its units on a stock exchange. You buy and sell ETF units through your brokerage account just like buying a single share in a company.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  heading: "ETF vs managed fund",
                  body: "Traditional managed funds are priced once at end of day at Net Asset Value (NAV). ETFs trade continuously throughout ASX trading hours at market prices — giving you real-time liquidity and transparent pricing.",
                  color: "border-blue-200 bg-blue-50",
                },
                {
                  heading: "ETF vs index fund",
                  body: "\"Index fund\" describes the investment strategy (passively tracking a benchmark). \"ETF\" describes the structure (exchange-listed). Most ASX ETFs are index funds, but active ETFs also exist — and not all index funds are ETFs.",
                  color: "border-green-200 bg-green-50",
                },
                {
                  heading: "Active vs passive ETFs",
                  body: "Most ETFs passively replicate an index like the ASX 200 or MSCI World. Active ETFs (a growing category) use portfolio managers or systematic strategies to try to outperform. Active ETFs typically charge higher MERs.",
                  color: "border-amber-200 bg-amber-50",
                },
              ].map((card) => (
                <div key={card.heading} className={`rounded-xl border p-5 ${card.color}`}>
                  <h3 className="font-extrabold text-slate-900 mb-2">{card.heading}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900 mb-3">Key features of ETFs</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { feature: "Low fees", detail: "MERs from 0.04% p.a. — the dominant long-term advantage over active funds" },
                  { feature: "Diversification", detail: "One ETF unit gives exposure to dozens, hundreds, or thousands of securities" },
                  { feature: "Liquidity", detail: "Buy or sell any time during ASX trading hours (10am–4pm AEST)" },
                  { feature: "Tax efficiency", detail: "No embedded CGT from prior investors; distributions are only from current-year activity" },
                  { feature: "Transparency", detail: "Most ETFs publish their full holdings daily on their website" },
                  { feature: "Low minimums", detail: "As low as one unit — often $5 to $200 depending on the ETF" },
                ].map((item) => (
                  <div key={item.feature} className="flex gap-3 items-start">
                    <span className="text-blue-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{item.feature}: </span>
                      <span className="text-sm text-slate-600">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: How ETFs work mechanically */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 2</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">How ETFs work mechanically</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Understanding the plumbing behind ETFs helps you appreciate why they trade so close to their underlying value, and where costs come from.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Authorised Participants (APs) and the creation/redemption mechanism",
                  body: "Large institutional traders called Authorised Participants can create new ETF units by delivering the underlying basket of securities to the ETF issuer, or redeem existing units by handing back units in exchange for the underlying basket. This mechanism means that if the ETF trades at a significant premium to NAV, APs can profitably create new units to sell on market (pushing the price down). If it trades at a discount, APs buy units and redeem them for the underlying assets (pushing the price up). This arbitrage keeps ETF prices tightly anchored to NAV.",
                  icon: "⚙",
                },
                {
                  title: "Bid-ask spread — your hidden trading cost",
                  body: "When you buy an ETF, you pay the ask price. When you sell, you receive the bid price. The gap between the two is the bid-ask spread — a trading cost you incur on every transaction. For highly liquid ETFs like VAS or IVV, the spread is typically 0.01%–0.05% of the unit price. For smaller or less liquid ETFs, spreads can be 0.2% or wider. This cost is separate from the MER and is paid each time you trade.",
                  icon: "↔",
                },
                {
                  title: "Market makers",
                  body: "Market makers are entities contracted to continuously quote both a buy and sell price for an ETF on the exchange. They ensure you can always execute a trade even when no other investor is on the other side. Market makers earn the spread as compensation for providing this liquidity. For smaller ETFs, the market maker may be the only source of liquidity — check whether an ETF has an active market maker before investing.",
                  icon: "⚖",
                },
                {
                  title: "NAV and intraday pricing",
                  body: "The Net Asset Value (NAV) is the per-unit value of the ETF's underlying holdings, calculated by the fund manager once per day after market close. During trading hours, an Indicative NAV (iNAV) is published every 15 seconds or so, giving a real-time estimate. For Australian equity ETFs, the iNAV is very accurate. For international ETFs whose underlying markets are closed during ASX hours, the iNAV uses stale overnight prices — meaning spreads will be wider during periods of overnight market moves.",
                  icon: "📊",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg" aria-hidden="true">{item.icon}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1.5">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Major ETF types on ASX */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 3</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Major ETF types on the ASX</h2>
            <p className="text-sm text-slate-500 mb-6">There are over 300 ETFs on the ASX spanning equities, bonds, property, commodities, and multi-asset strategies. Here are the ten core categories and the most popular examples in each.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Major ETF types on the ASX">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Type</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Examples</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">What it tracks</th>
                    <th scope="col" className="text-right p-4 font-bold text-slate-700">Typical MER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { type: "Australian broad market", examples: "VAS, A200, IOZ", tracks: "ASX 200/300 shares", mer: "0.04–0.07%" },
                    { type: "Global developed markets", examples: "VGS, BGBL", tracks: "World ex-Australia shares", mer: "0.08–0.22%" },
                    { type: "US market", examples: "IVV, VTS, QUS", tracks: "S&P 500 or Russell 3000", mer: "0.03–0.22%" },
                    { type: "Technology / Nasdaq", examples: "NDQ, FANG", tracks: "Nasdaq 100 / tech stocks", mer: "0.22–0.35%" },
                    { type: "Australian bonds", examples: "VAF, IAF", tracks: "Australian govt/corporate bonds", mer: "0.20–0.26%" },
                    { type: "Global bonds", examples: "VBND", tracks: "Developed market bonds", mer: "0.20%" },
                    { type: "Multi-asset", examples: "VDHG, DHHF, VDGR", tracks: "Diversified growth/moderate", mer: "0.19–0.27%" },
                    { type: "Australian REITs", examples: "VAP", tracks: "ASX property trusts", mer: "0.23%" },
                    { type: "Emerging markets", examples: "VGE, IEM", tracks: "Asia / EM equities", mer: "0.48–0.58%" },
                    { type: "Active ETFs", examples: "MSTR, MOAT", tracks: "Factor / quantitative active", mer: "0.30–0.55%+" },
                  ].map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{row.type}</td>
                      <td className="p-4 font-extrabold text-blue-700">{row.examples}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.tracks}</td>
                      <td className="p-4 text-right font-bold text-green-700">{row.mer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">MER figures are indicative as at 2025–26. Verify in the relevant PDS before investing. Not a recommendation.</p>
          </div>
        </section>

        {/* Section 4: Key ETF metrics */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 4</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Key metrics to compare ETFs</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  metric: "MER (Management Expense Ratio)",
                  importance: "Critical",
                  importanceColor: "text-red-600 bg-red-50",
                  detail: "The annual fee deducted from the fund's assets. This is the dominant cost for long-term investors. A 0.5% MER difference on $100K over 20 years at 7% p.a. return is roughly $50,000 in forgone wealth.",
                },
                {
                  metric: "Tracking error",
                  importance: "Important",
                  importanceColor: "text-amber-700 bg-amber-50",
                  detail: "How closely the ETF's returns match the index it tracks, after fees and transaction costs. A low tracking error (< 0.1% annualised) means the ETF faithfully replicates the index. Check the ETF issuer's website for annualised tracking difference data.",
                },
                {
                  metric: "Bid-ask spread",
                  importance: "Important for traders",
                  importanceColor: "text-blue-700 bg-blue-50",
                  detail: "The cost you pay each time you buy or sell. For liquid ETFs (VAS, VGS, IVV), this is typically 0.01%–0.05%. For niche or smaller ETFs, it can be 0.2%–1%. Matters more for frequent traders; less for long-term buy-and-hold investors.",
                },
                {
                  metric: "AUM (Assets Under Management)",
                  importance: "Proxy for liquidity",
                  importanceColor: "text-slate-600 bg-slate-100",
                  detail: "Larger AUM generally means more trading volume, tighter bid-ask spreads, and lower risk of the fund being wound up. As a rule of thumb, prefer ETFs with AUM above $500M for core holdings. Under $50M warrants caution.",
                },
                {
                  metric: "Distribution yield",
                  importance: "Income focus",
                  importanceColor: "text-green-700 bg-green-50",
                  detail: "Income paid to unit holders as a percentage of unit price. Equity ETFs typically yield 2%–5% depending on the market. Distribution yield only captures income; total return also includes price appreciation.",
                },
                {
                  metric: "Distribution frequency",
                  importance: "Cash flow planning",
                  importanceColor: "text-slate-600 bg-slate-100",
                  detail: "How often distributions are paid: monthly (some bond ETFs), quarterly (most equity ETFs), semi-annual, or annual. More frequent distributions improve cash flow for income investors but create more tax events.",
                },
                {
                  metric: "Hedged vs unhedged",
                  importance: "International ETFs only",
                  importanceColor: "text-purple-700 bg-purple-50",
                  detail: "For international ETFs, unhedged versions expose you to currency fluctuations (AUD/USD). Hedged versions remove currency risk but cost more in MER and hedging drag. See Section 5 for a full comparison.",
                },
                {
                  metric: "Physical vs synthetic replication",
                  importance: "Counterparty risk",
                  importanceColor: "text-slate-600 bg-slate-100",
                  detail: "Physical ETFs actually hold the underlying securities. Synthetic ETFs use derivatives (swaps) to replicate the index — introducing counterparty risk. Most major ASX ETFs are physical. Check the PDS if uncertain.",
                },
              ].map((item) => (
                <div key={item.metric} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{item.metric}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.importanceColor}`}>{item.importance}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Hedged vs Unhedged */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 5</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Hedged vs unhedged international ETFs</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              When you invest in an international ETF from Australia, you are also implicitly taking a currency position. If you hold VGS (unhedged) and the AUD falls against the USD and other currencies, your returns in AUD terms get a boost. If the AUD rises, your returns are reduced. A hedged version (like VGAD) removes this currency exposure.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Hedged vs unhedged international ETFs">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Feature</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Unhedged (e.g., VGS)</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Hedged (e.g., VGAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { feature: "Currency exposure", unhedged: "Yes — AUD/USD & AUD/other moves affect returns", hedged: "No — currency risk is removed via forward contracts" },
                    { feature: "MER", unhedged: "Lower (e.g., 0.18% for VGS)", hedged: "Higher (e.g., 0.21% for VGAD) + hedging drag" },
                    { feature: "Better when...", unhedged: "AUD falls vs other currencies — boosts international returns", hedged: "AUD rises — protects international returns from currency loss" },
                    { feature: "Long-term suitability", unhedged: "Recommended for long-term investors (10+ years)", hedged: "Better for shorter timeframes or income-focused investors" },
                    { feature: "Volatility", unhedged: "Higher short-term volatility from currency moves", hedged: "Lower short-term volatility; purer equity return" },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-700 text-xs">{row.feature}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.unhedged}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.hedged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">Long-term recommendation</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Most Australian financial planners recommend <strong>unhedged</strong> international ETFs for long-term equity investors. Over 10+ year horizons, currency fluctuations tend to mean-revert and the AUD historically declines against developed-world currencies. Hedging costs also compound negatively over time. The main exception is investors who need stable income distributions or have a shorter investment horizon.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Tax treatment */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 6</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Tax treatment of ETF distributions (AMMA statements)</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              ETF distributions are not a single income type — they are a composite of several components, each taxed differently under Australian tax law. Your ETF issuer will provide an annual tax statement (the AMMA statement, or Attribution Managed Investment Trust Member Annual Statement) that breaks down each distribution component for the financial year.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm" aria-label="Tax treatment of ETF distribution components">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Distribution component</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Tax treatment</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Example ETF source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { component: "Australian dividends", tax: "Added to assessable income; franking credits offset tax liability", example: "VAS distributing dividends from ASX 200 companies" },
                    { component: "Franking credits", tax: "Tax offset — reduces tax owed; refunded if in excess of liability", example: "Fully franked dividends passed through from Australian shares" },
                    { component: "Foreign income", tax: "Added to assessable income; Foreign Income Tax Offsets (FITOs) may apply", example: "VGS distributing dividends from US, European stocks" },
                    { component: "Capital gains (discounted)", tax: "50% CGT discount if underlying asset held 12+ months by the fund", example: "Fund selling securities held over 12 months" },
                    { component: "Capital gains (other)", tax: "Full inclusion in assessable income (no discount)", example: "Fund selling securities held under 12 months" },
                    { component: "Return of capital", tax: "Not immediately taxable — reduces your cost base instead", example: "Infrastructure ETFs, some bond ETFs" },
                  ].map((row) => (
                    <tr key={row.component} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900 text-xs">{row.component}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.tax}</td>
                      <td className="p-4 text-slate-500 text-xs">{row.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">In your personal tax return</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>You must report each component separately in your tax return. Most broker platforms (Sharesight, Commsec, SelfWealth) can automatically import AMMA data and pre-fill your MyTax return.</p>
                  <p className="mt-2">Keep your AMMA statements for every year you hold ETFs. You will also need your purchase records for CGT calculation when you eventually sell.</p>
                </div>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Inside super (SMSF)</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  {[
                    { phase: "Accumulation phase", rate: "15% on all income; franking credits offset tax" },
                    { phase: "Pension phase", rate: "0% — all ETF income is tax-free; franking credits refunded" },
                    { phase: "CGT discount", rate: "1/3 reduction (effective 10%) on assets held 12+ months in accumulation" },
                  ].map((item) => (
                    <div key={item.phase} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">{item.phase}</span>
                      <span className="text-slate-500 text-right max-w-[55%]">{item.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Choosing your first ETF */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 7</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Choosing your first ETF — a decision framework</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              The right ETF depends on your asset allocation goal, investment horizon, tax situation, and how much complexity you want to manage. Here is a practical framework.
            </p>

            <div className="space-y-3 mb-8">
              {[
                {
                  step: "1",
                  title: "Start with your asset allocation goal",
                  body: "Decide what mix of assets you want: mostly equities for long-term growth? A mix of shares and bonds for lower volatility? Australian vs global vs both? Your allocation should reflect your investment horizon and risk tolerance — not which ETF had the best recent performance.",
                },
                {
                  step: "2",
                  title: "Filter by low MER — it compounds",
                  body: "The difference between a 0.07% MER (VAS) and a 0.70% MER (active fund) on $100,000 over 20 years at 7% p.a. growth is approximately $50,000 in lost wealth. Fees are the most predictable drag on returns. All else equal, choose the cheaper ETF tracking the same index.",
                },
                {
                  step: "3",
                  title: "Check liquidity — daily volume and AUM",
                  body: "An ETF with daily trading volume above $1M/day and AUM above $500M will have tight bid-ask spreads and low transaction costs. Smaller ETFs can have wide spreads (0.5%+), which eat into returns especially for smaller portfolios.",
                },
                {
                  step: "4",
                  title: "Match the index to your goal",
                  body: "Not all 'global equities' ETFs hold the same stocks. VGS tracks MSCI World ex-Australia (approx. 1,500 stocks). IVV tracks the S&P 500 (US only). BGBL uses a different global index with slightly different weights. Read the PDS to understand exactly what an ETF holds before buying.",
                },
                {
                  step: "5",
                  title: "Consider your starting portfolio size",
                  body: "For portfolios under $20,000, a single diversified ETF (VDHG, DHHF) simplifies everything — one holding, one AMMA statement, one rebalancing decision. As your portfolio grows, a two or three-fund approach gives more control over asset allocation and reduces MER.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Common portfolio frameworks</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "One-ETF portfolio",
                  etfs: "DHHF or VDHG",
                  desc: "A single globally-diversified ETF. DHHF holds 100% equities across Australian and global markets. VDHG includes ~10% bonds. Ideal for beginners — simple, cheap, globally diversified.",
                  color: "border-blue-200",
                  badge: "Simplest",
                  badgeColor: "bg-blue-100 text-blue-700",
                },
                {
                  title: "Two-ETF portfolio",
                  etfs: "VAS + VGS",
                  desc: "Australian shares (VAS at 0.07%) plus developed-world international shares (VGS at 0.18%). Typical split: 30% VAS / 70% VGS. More control over home bias than a single-fund solution.",
                  color: "border-green-200",
                  badge: "Popular",
                  badgeColor: "bg-green-100 text-green-700",
                },
                {
                  title: "Three-ETF portfolio",
                  etfs: "VAS + VGS + VAF",
                  desc: "Add Australian bonds (VAF) for reduced volatility and income. Bonds cushion equity drawdowns. Typical split: 30% VAS / 50% VGS / 20% VAF. Requires annual rebalancing.",
                  color: "border-amber-200",
                  badge: "With bonds",
                  badgeColor: "bg-amber-100 text-amber-700",
                },
              ].map((portfolio) => (
                <div key={portfolio.title} className={`rounded-xl border bg-white p-5 ${portfolio.color}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-extrabold text-slate-900">{portfolio.title}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${portfolio.badgeColor}`}>{portfolio.badge}</span>
                  </div>
                  <p className="text-sm font-bold text-blue-700 mb-2">{portfolio.etfs}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{portfolio.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: ETF vs LIC vs managed fund */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Section 8</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">ETF vs LIC vs managed fund</h2>
            <p className="text-sm text-slate-500 mb-6">Three common ways to invest in a diversified portfolio — understanding the structural differences helps you choose the right vehicle.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="ETF vs LIC vs managed fund comparison">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Feature</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">ETF</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">LIC (Listed Investment Company)</th>
                    <th scope="col" className="text-left p-4 font-bold text-slate-700">Managed fund (unlisted)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      feature: "Pricing",
                      etf: "Continuous — real-time market price",
                      lic: "Continuous — real-time market price",
                      mf: "End-of-day NAV once per day",
                    },
                    {
                      feature: "Discount / premium to NAV",
                      etf: "Close to NAV (creation/redemption mechanism)",
                      lic: "Can trade at significant premium or discount to NTA",
                      mf: "Always transact at NAV — no discount/premium",
                    },
                    {
                      feature: "Tax on embedded gains",
                      etf: "No embedded CGT from prior investors",
                      lic: "Company structure — pays corporate tax; dividends may be franked",
                      mf: "Potential embedded CGT from prior investors joining/leaving",
                    },
                    {
                      feature: "Minimum investment",
                      etf: "1 unit (~$5–$200 depending on price)",
                      lic: "1 share (~$1–$5 for most LICs)",
                      mf: "Typically $500–$25,000",
                    },
                    {
                      feature: "Typical fees (MER)",
                      etf: "0.04–0.55% p.a.",
                      lic: "0.15–0.75% p.a. (management fee inside company)",
                      mf: "0.16–1.5% p.a. (wide range, active funds higher)",
                    },
                    {
                      feature: "Holdings transparency",
                      etf: "Daily holdings disclosure (most ETFs)",
                      lic: "Half-yearly or quarterly portfolio updates",
                      mf: "Monthly or quarterly disclosure",
                    },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-700 text-xs">{row.feature}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.etf}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.lic}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.mf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">LIC = Listed Investment Company. Examples include AFIC (AFI), Argo (ARG), Whitefield (WHF). NTA = Net Tangible Assets.</p>
          </div>
        </section>

        {/* Fee cost comparison callout */}
        <section className="py-10 bg-white border-b border-slate-100">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl bg-slate-900 text-white p-6 md:p-8">
              <h3 className="text-lg md:text-xl font-extrabold mb-2">The fee difference compounds dramatically</h3>
              <p className="text-slate-300 text-sm mb-5 leading-relaxed">
                Comparing a low-cost ETF (0.07% MER) against a typical active managed fund (0.75% MER) on a $100,000 starting investment, assuming 7% p.a. gross return over 20 years:
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Low-cost ETF (0.07% MER)", value: "~$369,000", color: "text-green-400" },
                  { label: "Active fund (0.75% MER)", value: "~$318,000", color: "text-amber-400" },
                  { label: "Difference in final value", value: "~$51,000", color: "text-red-400" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className={`text-2xl font-extrabold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">Illustrative only. Assumes identical pre-fee returns, 7% p.a. growth, no additional contributions. Actual results will vary.</p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50 text-sm">
                    {item.q}
                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related guides */}
        <section className="py-10 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Related guides</p>
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">Explore related investment guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Index Funds in Australia", href: "/invest/index-funds", desc: "How passive index investing works, SPIVA data, and the cheapest ASX-listed index ETFs." },
                { title: "Dividend Investing", href: "/invest/dividend-investing", desc: "Franking credits, high-yield ASX stocks, DRPs, and dividend ETF strategies." },
                { title: "Passive vs Active Investing", href: "/invest/passive-vs-active", desc: "Performance data and when active management makes sense in Australian markets." },
                { title: "Dollar-Cost Averaging", href: "/invest/dollar-cost-averaging", desc: "How regular investment intervals reduce the impact of market timing on your returns." },
              ].map((guide) => (
                <Link key={guide.href} href={guide.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{guide.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                  <span className="inline-flex items-center text-blue-600 text-sm font-semibold mt-2">Read guide &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance disclaimer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl bg-white border border-slate-200 p-5">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-5">
              <Link href="/compare/etfs" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Compare ETFs &rarr;</Link>
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Index funds guide &rarr;</Link>
              <Link href="/tax/investment-income" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Investment income tax &rarr;</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
