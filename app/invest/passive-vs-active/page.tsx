import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Do active funds beat the index in Australia?",
    a: "Rarely, and less often than most investors expect. SPIVA Australia scorecards show that approximately 75–85% of actively managed Australian equity funds underperform their benchmark index after fees over 10- and 15-year periods. Short-term results are noisier — around 55% underperform over 1 year, rising to 70% over 5 years, and 80%+ over 10–15 years. The consistency of this data across time periods and geographies is striking. Some active managers do outperform, but identifying them in advance — before the performance — is extremely difficult, and historical outperformance is a weak predictor of future results.",
  },
  {
    q: "What is the cheapest way to invest passively in Australia?",
    a: "The cheapest passive exposure to Australian shares is VAS (Vanguard Australian Shares ETF, 0.07% MER) or A200 (BetaShares Australia 200 ETF, 0.07% MER). For global developed markets, VGS (Vanguard MSCI Index International Shares ETF, 0.18% MER) or BGBL (BetaShares Global Shares ETF, 0.08% MER) are among the lowest-cost options. To buy a single diversified global portfolio in one ETF, VDHG (0.27% MER) or DHHF (0.19% MER) bundle equities and bonds. All are available on the ASX through any standard broker. Pearler and CommSec Pocket both offer zero brokerage on selected ETFs for smaller amounts.",
  },
  {
    q: "Can I mix passive and active investing?",
    a: "Yes — combining both is called a core-and-satellite approach and is widely used by financial planners. The passive core (typically 70–80% of the portfolio) handles broad diversification at minimal cost, providing reliable exposure to market returns. The active satellite (20–30%) can take tilts you have conviction about: a small-cap active manager, an emerging markets specialist, thematic ETFs, or individual stock positions. This structure limits the damage if your active bets underperform while preserving some potential for alpha. The key discipline is keeping the satellite genuinely satellite — not letting active positions creep to 60–70% of the portfolio.",
  },
  {
    q: "Is passive investing riskier than active?",
    a: "No — in most respects, passive investing carries less risk for long-term investors. A passive broad-market ETF (e.g., VGS covering 1,500+ global stocks) is highly diversified with no single-company or manager concentration risk. Active funds introduce additional risk sources: manager departure risk, strategy drift, over-concentration in the manager's conviction positions, and the risk of a run of underperformance that triggers redemptions and forced selling. Passive ETFs do carry market risk — their value falls when markets fall — but they cannot go to zero due to a bad stock pick or a fraud at an underlying company, as a concentrated active fund could.",
  },
  {
    q: "What about smart-beta or factor ETFs?",
    a: "Smart-beta (also called factor or rules-based) ETFs sit between pure passive and active. They track an index, but the index is constructed using rules that tilt toward factors like value, momentum, quality, or low volatility — rather than pure market-cap weighting. Costs are higher than plain-vanilla passive (typically 0.25–0.45% MER) but lower than active managed funds. The academic evidence for factor premiums (particularly value and small-cap) is solid over long horizons, but factor returns are cyclical — a value ETF underperformed for most of the 2010s before recovering. Smart-beta is best understood as a structured, disciplined form of tilting, not a guaranteed alpha source.",
  },
];

const COMPARISON = [
  { aspect: "Goal", passive: "Match index return (minus a small fee)", active: "Beat index return after higher fees" },
  { aspect: "Typical MER (AU equity)", passive: "0.07%–0.20%", active: "0.70%–1.50%" },
  { aspect: "Performance fee", passive: "None", active: "0%–20% of outperformance (common)" },
  { aspect: "Annual turnover", passive: "Low — follows index rebalances only", active: "High — frequent discretionary trades" },
  { aspect: "Tax efficiency", passive: "High — fewer CGT distributions", active: "Lower — trading triggers CGT events" },
  { aspect: "Transparency", passive: "Full — holdings published daily", active: "Limited — often quarterly disclosure only" },
  { aspect: "Long-run benchmark beat rate (AU)", passive: "~80–85% of active funds fail to beat", active: "~15–20% outperform benchmark long-term" },
  { aspect: "Manager risk", passive: "None — rules-based", active: "Star manager departure can alter strategy" },
  { aspect: "Best suited for", passive: "Core portfolio, efficient large-cap markets", active: "Niche, illiquid, or less efficient markets" },
];

const COST_TABLE = [
  { vehicle: "VAS (passive AU ETF)", mer: "0.07%", perfFee: "None", totalDrag20yr: "~$1,400", finalValue: "~$652,000" },
  { vehicle: "VGS (passive global ETF)", mer: "0.18%", perfFee: "None", totalDrag20yr: "~$3,500", finalValue: "~$650,000" },
  { vehicle: "Active managed fund (low cost)", mer: "0.70%", perfFee: "None", totalDrag20yr: "~$13,000", finalValue: "~$640,000" },
  { vehicle: "Active managed fund (typical)", mer: "1.10%", perfFee: "Up to 20%", totalDrag20yr: "~$35,000+", finalValue: "~$617,000" },
  { vehicle: "Active managed fund (high cost)", mer: "1.50%", perfFee: "15–20%", totalDrag20yr: "~$55,000+", finalValue: "~$597,000" },
];

const DECISION_TABLE = [
  {
    question: "Do you believe markets are broadly efficient at large-cap level?",
    passive: "Yes — information is rapidly priced in",
    active: "No — you think managers can find mispricing",
  },
  {
    question: "How much time can you spend on portfolio research?",
    passive: "Little — set and forget is ideal",
    active: "Significant — fund selection requires ongoing review",
  },
  {
    question: "Are you highly sensitive to costs?",
    passive: "Yes — every 0.1% in fees matters long-term",
    active: "Willing to pay for potential outperformance",
  },
  {
    question: "What market are you investing in?",
    passive: "Large-cap ASX or global developed markets",
    active: "Small caps, emerging markets, private credit",
  },
  {
    question: "What is your investment horizon?",
    passive: "10+ years — fee drag compounds heavily",
    active: "Shorter, or you want absolute return protection",
  },
  {
    question: "Can you identify a genuinely skilled manager in advance?",
    passive: "Unlikely — evidence suggests very few persist",
    active: "You have specific due diligence to support this",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Passive vs Active Investing Australia (${CURRENT_YEAR}) — Which Wins?`,
  description: `Should you invest passively (index ETFs) or with active fund managers? SPIVA data, fee comparison, and when active management can add value in Australia. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Passive vs Active Investing Australia (${CURRENT_YEAR})`,
    description: "SPIVA evidence, the true cost of active management, and a core-satellite framework for Australian investors.",
    url: `${SITE_URL}/invest/passive-vs-active`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Passive vs Active Investing")}&sub=${encodeURIComponent("SPIVA Evidence · Fee Comparison · Australia · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/passive-vs-active` },
};

export default function PassiveVsActivePage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Passive vs Active Investing", url: absoluteUrl("/invest/passive-vs-active") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Passive vs Active</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Passive vs Active Investing Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Most active Australian equity funds underperform a simple index ETF after fees — consistently, over every long time horizon. But active management is not dead: there are genuine pockets where it earns its keep. Here is what the evidence shows.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Active AU equity funds underperform (15-yr)", value: "~85%" },
                { label: "Typical active fund MER", value: "1.1%" },
                { label: "VAS (passive ASX ETF) MER", value: "0.07%" },
                { label: "Fee gap over 20 yrs on $100K", value: "~$55K+" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Definitions */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The core debate</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">Passive</span>
                  <h3 className="text-xl font-extrabold text-amber-900">Index investing</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  A passive fund tracks a market index — the ASX 200, S&amp;P 500, or MSCI World — by buying every constituent in proportion to its weight. The goal is to <strong>match</strong> the index return, minus a small management fee. There is no stock selection and no manager judgment.
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">&#8226;</span> ETFs and unlisted index funds are the primary vehicles</li>
                  <li className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">&#8226;</span> Rebalances mechanically when the index changes — no discretion</li>
                  <li className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">&#8226;</span> Very low cost: 0.07%–0.20% MER for mainstream AU options</li>
                  <li className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">&#8226;</span> High tax efficiency due to low portfolio turnover</li>
                  <li className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">&#8226;</span> Full transparency: holdings published daily</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Active</span>
                  <h3 className="text-xl font-extrabold text-slate-900">Active management</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  An active fund employs portfolio managers who research companies, make buy/sell decisions, and aim to <strong>beat</strong> their benchmark index through superior stock selection or market timing. The extra cost is justified only if the outperformance exceeds fees.
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="text-slate-500 font-bold shrink-0">&#8226;</span> Managed funds, listed investment companies (LICs), hedge funds</li>
                  <li className="flex gap-2"><span className="text-slate-500 font-bold shrink-0">&#8226;</span> Human judgment drives portfolio construction and trading</li>
                  <li className="flex gap-2"><span className="text-slate-500 font-bold shrink-0">&#8226;</span> Higher cost: 0.70%–1.50% MER plus potential performance fees</li>
                  <li className="flex gap-2"><span className="text-slate-500 font-bold shrink-0">&#8226;</span> High turnover generates more CGT distribution events</li>
                  <li className="flex gap-2"><span className="text-slate-500 font-bold shrink-0">&#8226;</span> Limited disclosure: holdings often quarterly only</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cost comparison table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Cost comparison: what fees do to $100,000 over 20 years</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Assuming 8% gross annual return across all options. Performance fees are estimated averages for funds that charge them. Figures are illustrative — actual outcomes depend on specific funds, market returns, and tax.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Investment vehicle</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">MER (p.a.)</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Performance fee</th>
                    <th className="px-4 py-3 text-left font-extrabold text-red-700">Total fee drag (20 yr)</th>
                    <th className="px-4 py-3 text-left font-extrabold text-emerald-700">Approx. final value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COST_TABLE.map((r, i) => (
                    <tr key={r.vehicle} className={i === 0 ? "bg-amber-50" : ""}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.vehicle}</td>
                      <td className="px-4 py-3 text-slate-700">{r.mer}</td>
                      <td className="px-4 py-3 text-slate-700">{r.perfFee}</td>
                      <td className="px-4 py-3 font-bold text-red-700">{r.totalDrag20yr}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{r.finalValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>The compounding effect:</strong> A 1.0% fee difference does not just cost 1.0% of your returns each year — it removes 1.0% from the balance on which future growth is calculated. Over 20 years at 8% gross, a fund charging 1.50% MER vs 0.07% MER on $100,000 produces approximately $55,000 less wealth from fees alone — before accounting for the likelihood that the active fund also underperforms gross of fees.
              </p>
            </div>
          </div>
        </section>

        {/* SPIVA evidence */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">The SPIVA Australia evidence</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              SPIVA (S&amp;P Indices vs Active) is the gold standard for measuring active fund performance. Published semi-annually by S&amp;P Dow Jones Indices, it compares active fund returns against their relevant benchmark after fees. The results for Australian equity funds are consistent across every measurement period.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { period: "1 year", rate: "~55%", note: "Short-term results are noisier — roughly a coin flip" },
                { period: "5 years", rate: "~70%", note: "Fee drag compounds: advantage of passive grows" },
                { period: "10 years", rate: "~80%", note: "Long-run evidence is decisive for large-cap AU equity" },
                { period: "15 years", rate: "~85%", note: "Survivorship bias removed — includes closed funds" },
              ].map((r) => (
                <div key={r.period} className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{r.period} underperformance</p>
                  <p className="text-4xl font-extrabold text-red-600 mb-1">{r.rate}</p>
                  <p className="text-sm font-bold text-slate-700 mb-2">of active AU equity funds</p>
                  <p className="text-xs text-slate-500 leading-snug">{r.note}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">What SPIVA adjusts for</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <p className="font-bold mb-1">Survivorship bias correction</p>
                  <p className="leading-relaxed">SPIVA includes all funds that existed at the start of the measurement period, including those that closed or merged during it. This prevents the data from only counting survivors — funds that happened to perform well enough to stay open.</p>
                </div>
                <div>
                  <p className="font-bold mb-1">Net of fees</p>
                  <p className="leading-relaxed">All SPIVA comparisons measure returns after management fees and costs — the return an investor actually receives. Some fund marketing quotes gross returns; SPIVA cuts through this by using net performance only.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why active struggles */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Why active management struggles to beat the index</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The underperformance of active funds is not a fluke. There are structural reasons why beating a benchmark consistently is extraordinarily difficult.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                {
                  title: "Fee drag compounds",
                  desc: "The most reliable edge passive has is mechanical: a 1.0% annual fee does not just reduce returns by 1.0% — it removes 1.0% from the base on which future growth compounds. A manager must outperform gross by more than their fee just to break even. After a 20-year horizon, the arithmetic is unforgiving.",
                  badge: "Structural",
                  color: "border-red-200 bg-red-50",
                  badgeColor: "bg-red-200 text-red-800",
                },
                {
                  title: "Benchmark hugging",
                  desc: "Many 'active' funds hold 80–90% of the index simply to limit career risk — underperforming by too much gets a manager fired. The result is a 'closet index fund' that charges active fees for largely passive exposure, guaranteeing net underperformance equal to the fee gap.",
                  badge: "Career risk",
                  color: "border-orange-200 bg-orange-50",
                  badgeColor: "bg-orange-200 text-orange-800",
                },
                {
                  title: "Tax inefficiency",
                  desc: "High-turnover active funds frequently realise capital gains, distributing tax obligations to investors annually. ETF structures and passive funds with low turnover generate far fewer CGT events, giving investors more control over when gains are realised. In taxable accounts, this tax drag compounds the fee disadvantage.",
                  badge: "Tax drag",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
                {
                  title: "Manager and strategy risk",
                  desc: "Many active funds are built around a single 'star' portfolio manager. When that manager leaves — to a competitor, retirement, or to launch their own fund — the strategy that produced historical returns may not transfer to their successor. Investors who selected the fund for that manager's track record are now holding a different product.",
                  badge: "Key-person risk",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
                {
                  title: "Survivorship bias",
                  desc: "Fund records are contaminated by survivorship bias: closed and merged funds are removed from databases, leaving only those that performed well enough to survive. When you look at a fund manager's historical performance, you are not seeing the complete picture — you have already selected from survivors. The SPIVA methodology corrects for this.",
                  badge: "Data distortion",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
                {
                  title: "Markets are hard to beat",
                  desc: "Large-cap equity markets — ASX 200, S&amp;P 500, MSCI World — are among the most analysed, most liquid, and most informationally efficient markets in the world. Thousands of professional analysts cover every major stock. Genuine pricing errors are rare and short-lived. The available alpha, after accounting for costs, is thin.",
                  badge: "Market efficiency",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
              ].map((c) => (
                <div key={c.title} className={`rounded-xl border p-5 ${c.color}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badgeColor}`}>{c.badge}</span>
                  <h3 className="font-extrabold text-slate-900 mt-3 mb-2">{c.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Where active can add value */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Where active management can genuinely add value</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The evidence against active management is strongest in large-cap developed markets. In less efficient, less liquid, or harder-to-index markets, active managers have a better structural opportunity to find mispriced assets.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3">Markets where active has a better chance</h3>
                <div className="space-y-3">
                  {[
                    {
                      title: "Small-cap Australian equities",
                      desc: "The ASX small-cap universe (outside the top 100–200 stocks) has fewer analysts covering each stock, less institutional ownership, and slower information diffusion. A specialist small-cap manager with deep company relationships can find genuinely under-researched situations. SPIVA data shows small-cap active underperformance rates are lower than large-cap — though still above 60% over 10 years.",
                    },
                    {
                      title: "Emerging markets",
                      desc: "Markets in Southeast Asia, Latin America, and parts of Africa have patchier information quality, weaker accounting standards, and genuine political/governance risks that require on-the-ground analysis. Index tracking is also harder — some index constituents are illiquid or carry restrictions on foreign ownership.",
                    },
                    {
                      title: "Fixed income and private credit",
                      desc: "Bond markets are less transparent than equity markets. Private credit (direct lending to companies not publicly listed) cannot be indexed at all — it requires individual loan structuring, due diligence, and risk assessment. Active management is the only option, and manager selection matters enormously.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-bold text-slate-900 text-sm mb-1">{item.title}</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3">Strategy types where active is appropriate</h3>
                <div className="space-y-3">
                  {[
                    {
                      title: "Absolute return / market-neutral",
                      desc: "These strategies aim for positive returns regardless of market direction — not to beat a benchmark. Long/short equity, merger arbitrage, and market-neutral funds have a different goal from a benchmark-hugging equity fund. Active management is integral to the strategy, not competing with passive.",
                    },
                    {
                      title: "Alternatives: infrastructure, real assets",
                      desc: "Infrastructure assets (toll roads, airports, utilities), private equity, and real assets are inherently active — you are acquiring, managing, and eventually selling individual assets. Index construction in these asset classes is a simplification of a fundamentally active market.",
                    },
                    {
                      title: "Specialist sector expertise",
                      desc: "Biotech (clinical trial analysis), early-stage resources (geological expertise), and technology venture (product evaluation) are sectors where deep domain expertise genuinely differentiates returns. A specialist manager who understands a clinical trial pipeline in detail has a structural edge over a passive index buyer.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-bold text-slate-900 text-sm mb-1">{item.title}</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Passive ETF options */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Building a passive portfolio: Australian ETF options</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              These examples are for educational purposes only and do not constitute a recommendation to buy or sell any security. MERs are indicative and subject to change — confirm current figures before investing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                {
                  ticker: "VAS",
                  name: "Vanguard Australian Shares ETF",
                  index: "S&P/ASX 300",
                  mer: "0.07%",
                  desc: "Tracks the 300 largest Australian listed companies by market cap. The lowest-cost broad Australian equity ETF. Provides exposure to the full ASX large and mid-cap universe including banks, miners, and consumer companies.",
                  role: "AU equity core",
                  color: "border-amber-200 bg-amber-50",
                },
                {
                  ticker: "VGS",
                  name: "Vanguard MSCI Index International Shares ETF",
                  index: "MSCI World ex-Australia",
                  mer: "0.18%",
                  desc: "Tracks 1,500+ large and mid-cap companies across 23 developed markets. Heavily weighted to US equities (approx. 70%) including large tech. The most widely held global passive ETF on the ASX by volume.",
                  role: "Global developed equity",
                  color: "border-slate-200 bg-white",
                },
                {
                  ticker: "VGE",
                  name: "Vanguard FTSE Emerging Markets Shares ETF",
                  index: "FTSE Emerging Markets",
                  mer: "0.48%",
                  desc: "Covers 3,000+ companies across emerging market economies including China, India, Brazil, and Taiwan. Higher MER than developed market options reflects the additional complexity of operating in these markets. Often used as the satellite component of a passive portfolio.",
                  role: "Emerging markets",
                  color: "border-slate-200 bg-white",
                },
                {
                  ticker: "VBND",
                  name: "Vanguard Global Aggregate Bond Index ETF (AUD Hedged)",
                  index: "Bloomberg Global Aggregate Float Adjusted Composite Index",
                  mer: "0.20%",
                  desc: "Provides exposure to investment-grade government and corporate bonds globally, hedged back to AUD. Used as the defensive component of a diversified passive portfolio. Bonds reduce portfolio volatility and partially offset equity drawdowns.",
                  role: "Fixed income / defensive",
                  color: "border-slate-200 bg-white",
                },
              ].map((etf) => (
                <div key={etf.ticker} className={`rounded-xl border p-5 ${etf.color}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded font-mono">{etf.ticker}</span>
                      <p className="font-extrabold text-slate-900 mt-1">{etf.name}</p>
                    </div>
                    <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full shrink-0">{etf.role}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500 mb-2">
                    <span><strong>Index:</strong> {etf.index}</span>
                    <span><strong>MER:</strong> {etf.mer} p.a.</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{etf.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>A simple diversified passive portfolio:</strong> Many investors use a combination of VAS (Australian equity) + VGS (global developed) + VBND or VAF (bonds) with allocations proportional to their risk tolerance and time horizon. A 70/20/10 split (VAS/VGS/bonds) or an 80/20 equity/bond split are common starting frameworks. A licensed financial adviser can help you determine the appropriate allocation for your individual circumstances.
              </p>
            </div>
          </div>
        </section>

        {/* Core-satellite */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-4">The core-satellite approach: 80% passive, 20% active</h2>
            <p className="text-sm text-amber-900 mb-6 max-w-2xl">
              The core-satellite framework is the practical synthesis of the passive vs active debate. Rather than choosing one side, it uses each strategy where it performs best.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-extrabold text-amber-600">80%</span>
                  <div>
                    <p className="font-extrabold text-slate-900">Passive core</p>
                    <p className="text-xs text-slate-500">Broad, low-cost, diversified</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  The core handles the bulk of long-term compounding. Broad passive ETFs — ASX 200/300 (VAS or A200), global developed markets (VGS or BGBL), fixed income (VAF or VBND) — provide genuine diversification at minimal cost. The low fee and high tax efficiency of the core mean compounding works unimpeded for decades.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The core removes the need to be right about any individual stock, sector, or fund manager. It captures global economic growth across thousands of companies.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-extrabold text-slate-600">20%</span>
                  <div>
                    <p className="font-extrabold text-slate-900">Active satellite</p>
                    <p className="text-xs text-slate-500">Higher conviction, targeted tilts</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  The satellite takes positions where you have genuine conviction or where active is structurally more appropriate: a specialist small-cap manager, an emerging markets active fund, thematic or sector ETFs, individual stock positions, or a private credit allocation.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Keeping the satellite genuinely limited (20–30%) means a run of active underperformance does not derail the portfolio — the passive core absorbs it. The satellite adds potential alpha without dominating portfolio outcomes.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-100 p-4">
              <p className="text-sm text-amber-900">
                <strong>Discipline required:</strong> The most common failure of core-satellite is letting the satellite creep. Active tilts that perform well attract more capital; positions in good years get added to. Before long the satellite is 50% of the portfolio, and you are paying active fees on most of your wealth. Set a percentage target for each component and rebalance back to it annually.
              </p>
            </div>
          </div>
        </section>

        {/* Tax efficiency */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Tax efficiency: a hidden passive advantage</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The fee comparison is the headline, but tax efficiency adds another layer of passive advantage that rarely appears in simple fee comparisons.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Passive: low turnover, few CGT events</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  A passive ETF only sells holdings when the underlying index changes its constituents — once or twice a year for small adjustments. This means very few capital gain realisations. For investors in taxable accounts, gains remain unrealised and untaxed until the investor chooses to sell their own ETF units. You control the timing.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Active: annual CGT distributions</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Active managed funds trade frequently. When a fund sells a holding at a profit, that capital gain is distributed to unit holders at year end — even if you did not sell any units yourself. You receive a tax bill you did not ask for, on a gain you cannot time. High-turnover active funds can distribute substantial annual capital gains, effectively forcing realisation of embedded gains.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-2">Direct indexing: the premium tax solution</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  For high-net-worth investors (typically $500K+ in a single asset class), direct indexing involves buying each index constituent individually rather than through an ETF. This enables tax-loss harvesting at the individual stock level — selling losers to realise losses that offset gains elsewhere — while maintaining overall market exposure. It is the most tax-efficient form of passive investing and is emerging in Australia through specialist managed accounts and separately managed accounts (SMAs).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Head-to-head comparison table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Head-to-head comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Aspect</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-700">Passive</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON.map((r) => (
                    <tr key={r.aspect}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.aspect}</td>
                      <td className="px-4 py-3 text-slate-700">{r.passive}</td>
                      <td className="px-4 py-3 text-slate-700">{r.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Decision framework */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Decision framework: which suits your situation?</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Six diagnostic questions that clarify whether passive or active investing is the better fit for your specific circumstances and investment goals.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Question</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-700">Points toward passive</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Points toward active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DECISION_TABLE.map((r) => (
                    <tr key={r.question}>
                      <td className="px-4 py-3 font-bold text-slate-900 max-w-xs">{r.question}</td>
                      <td className="px-4 py-3 text-slate-700">{r.passive}</td>
                      <td className="px-4 py-3 text-slate-700">{r.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>The default position:</strong> For most Australian investors — particularly those investing in ASX 200 or global developed market equities over a 10+ year horizon — the evidence strongly favours starting with a passive core. Active management as a satellite makes sense when you have done the manager due diligence and are investing in a market where active genuinely has an edge.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Index funds guide &#8594;
              </Link>
              <Link href="/etfs" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                ETF hub &#8594;
              </Link>
              <Link href="/invest/lump-sum-vs-dca" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Lump sum vs DCA &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
