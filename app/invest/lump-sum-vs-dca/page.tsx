import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Does lump sum investing really outperform DCA?",
    a: "Yes, in most historical scenarios. Vanguard research (2012) across US, UK, and Australian markets found that lump sum investing outperformed DCA in approximately two-thirds of rolling 10-year periods. The core reason is simple: markets trend upward over the long run, so the sooner your money is invested, the more time it spends compounding. DCA wins in the remaining one-third of cases — primarily when markets fall significantly shortly after investment. The mathematical advantage of lump sum is real, but so are the psychological challenges of investing a large sum all at once.",
  },
  {
    q: "I just received an inheritance — should I invest it all at once?",
    a: "Mathematically, a lump sum investment usually wins. But inheritance comes with emotional weight that pure math ignores. For most people receiving a first large windfall, a hybrid approach works well: invest 50% immediately and spread the remaining 50% over 3-6 months. This captures most of the lump sum advantage while significantly reducing regret risk if markets pull back shortly after. If you would genuinely panic-sell in a 20% downturn, a staged entry is more likely to produce good long-run outcomes than a lump sum you abandon at the bottom. Consider speaking with a financial adviser for amounts above $100,000.",
  },
  {
    q: "What if I start DCA and markets fall right away?",
    a: "This is actually one of DCA's strongest features. If markets fall 20% over your investment period, your later purchases acquire units at lower prices, reducing your average cost basis. You end up better positioned than a lump sum investor who bought at the higher prices. The challenge is emotional — it requires you to keep investing when prices are falling and news is negative. Investors who maintain their DCA schedule through downturns typically see strong recovery gains as markets rebound.",
  },
  {
    q: "Is DCA the same as salary sacrificing into super?",
    a: "Functionally, yes. Every employer SG (Superannuation Guarantee) contribution is a DCA transaction — a fixed dollar amount invested at regular intervals regardless of market conditions. Voluntary salary sacrifice contributions extend this effect. This is one of the structural advantages of Australia's compulsory super system: it enforces disciplined DCA behaviour across an entire working life, preventing the market-timing mistakes that cost retail investors significant returns over time.",
  },
  {
    q: "How long should my DCA period be?",
    a: "Research suggests diminishing returns beyond 12 months of spreading a lump sum. For most windfalls, a 3-6 month DCA period strikes a good balance: it meaningfully reduces the probability of investing all capital at a short-term peak, while limiting the opportunity cost (cash drag) from money sitting idle. For very large sums or investors with high anxiety about timing, 12 months is reasonable. Beyond 12 months, the opportunity cost of cash drag typically exceeds the statistical benefit of continued averaging.",
  },
  {
    q: "What happens to the cash I'm holding while DCA-ing?",
    a: "Cash held between DCA purchases earns a lower return than equities over the long run — this is the 'cash drag' that makes DCA mathematically inferior to lump sum in most scenarios. To minimise this drag: (1) use a high-interest savings account or a cash management account for uninvested funds; (2) keep the DCA period short (3-6 months, not 2-3 years); (3) consider parking cash in a low-volatility bond ETF between purchases rather than pure cash. Every week money stays in cash rather than invested equities is a week of forgone market return.",
  },
];

const COMPARISON = [
  { dimension: "Expected return (rising markets)", lumpSum: "Higher — full capital invested immediately", dca: "Lower — cash drag reduces total return" },
  { dimension: "Performance in falling markets", lumpSum: "Worse — full capital exposed from day one", dca: "Better — later purchases buy at lower prices" },
  { dimension: "Psychological stress", lumpSum: "Higher — single high-stakes decision", dca: "Lower — spreads risk and responsibility" },
  { dimension: "Time commitment", lumpSum: "Once — done in a single trade", dca: "Ongoing — requires scheduled purchases" },
  { dimension: "Best for", lumpSum: "Windfalls, inheritances, redundancy", dca: "Regular income investors, new investors" },
  { dimension: "Historical outperformance", lumpSum: "~67% of rolling periods", dca: "~33% of rolling periods" },
  { dimension: "Transaction costs", lumpSum: "Lower — one brokerage fee", dca: "Higher — many separate trades" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Lump Sum vs Dollar-Cost Averaging Australia (${CURRENT_YEAR}) — Which Wins?`,
  description: `Should you invest $100,000 today or spread it over 12 months? Vanguard research, cash drag explained, and when DCA beats lump sum for Australian investors. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Lump Sum vs DCA Australia (${CURRENT_YEAR}) — The Evidence`,
    description: "Lump sum outperforms DCA two-thirds of the time — but behavioural factors often make DCA the better practical choice for Australians.",
    url: `${SITE_URL}/invest/lump-sum-vs-dca`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Lump Sum vs DCA Australia")}&sub=${encodeURIComponent("Vanguard Evidence · Cash Drag · When Each Wins · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/lump-sum-vs-dca` },
};

export default function LumpSumVsDcaPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Lump Sum vs DCA", url: absoluteUrl("/invest/lump-sum-vs-dca") },
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
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Lump Sum vs DCA</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Lump Sum vs Dollar-Cost Averaging ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              You have $100,000 to invest. Do you put it all in today, or spread it over 12 months? The math favours lump sum investing — but the right answer depends on your psychology as much as the data.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Lump sum outperforms DCA historically", value: "~67%" },
                { label: "DCA outperforms (falling markets)", value: "~33%" },
                { label: "Global equity real return (long-run p.a.)", value: "7-10%" },
                { label: "Recommended DCA window for windfalls", value: "3-6 mo" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The core question */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The core question</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Imagine you have $100,000 to invest — from a redundancy payment, an inheritance, or the proceeds of a property sale. Two strategies:
                </p>
                <div className="space-y-3 mb-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="font-extrabold text-slate-900 text-sm mb-1">Lump sum investing</p>
                    <p className="text-sm text-slate-700">Invest the full $100,000 today. All capital is immediately exposed to market returns — and market risk.</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-extrabold text-amber-900 text-sm mb-1">Dollar-cost averaging (DCA)</p>
                    <p className="text-sm text-slate-700">Invest $8,333 per month for 12 months. Your average purchase price spans 12 different market levels, reducing entry-point risk.</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Vanguard research (2012) examined this question across US, UK, and Australian markets over rolling 10-year periods. The conclusion: <strong>lump sum investing outperformed DCA in approximately two-thirds of scenarios</strong>. But the one-third where DCA wins matters — especially to investors who would panic-sell after investing everything at a market peak.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">A concrete example: 8% annual growth</h3>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="font-bold text-emerald-900 mb-1">Lump sum: $100K invested today</p>
                    <p className="text-slate-700">Full $100,000 earns 8% for 12 months</p>
                    <p className="font-extrabold text-emerald-800 mt-1">Return: ~$8,000</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white p-3">
                    <p className="font-bold text-amber-900 mb-1">DCA: $8,333/month for 12 months</p>
                    <p className="text-slate-700">Average exposure ~$50K over the year; ~4% effective annual gain</p>
                    <p className="font-extrabold text-amber-800 mt-1">Return: ~$4,000 (approx.)</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Illustrative only. Assumes flat 8% p.a. upward trend; actual markets are volatile. Does not account for brokerage, tax, or inflation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why lump sum usually wins */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Why lump sum wins mathematically</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The mathematical case for lump sum investing rests on one fundamental fact: markets trend upward over long periods. Every day your money is not invested is a day of forgone potential return.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  title: "Markets trend upward",
                  desc: "Global equities have returned approximately 7-10% per annum real over the long run. In any given year, markets rise roughly 70-75% of the time. Waiting to invest is a bet against this long-run trend.",
                  badge: "Core principle",
                  color: "border-emerald-200 bg-emerald-50",
                  badgeColor: "bg-emerald-200 text-emerald-800",
                },
                {
                  title: "Cash drag is real",
                  desc: "While DCA-ing, uninvested cash earns savings account rates (typically 1-5% p.a.) rather than equity returns. Every month of delayed investment is a month of lower-returning cash holding. This gap compounds over the investment period.",
                  badge: "Opportunity cost",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
                {
                  title: "Time in market beats timing",
                  desc: "The Dalbar QAIB study consistently shows retail investors underperform the market by 1-3% annually due to behavioural timing mistakes. Being fully invested eliminates the temptation to time future re-entry points.",
                  badge: "Behavioural edge",
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
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>The Vanguard finding:</strong> Across US, UK, and Australian markets from 1926-2011, lump sum investing outperformed a 12-month DCA in 67% of rolling periods. The average outperformance margin was approximately 2.3% per year — meaningful over any multi-decade horizon.
              </p>
            </div>
          </div>
        </section>

        {/* When DCA wins */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">When DCA performs better</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              DCA outperforms lump sum in approximately one-third of historical scenarios — and those scenarios are not random. They share common characteristics.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3">Market conditions where DCA wins</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold shrink-0">&#9660;</span>
                    <span><strong>Falling markets:</strong> If the market drops 20% in the 6 months after your investment, DCA acquires units at progressively lower prices. Your average cost basis is lower than a lump sum investor who bought at the higher pre-fall price.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-orange-500 font-bold shrink-0">&#9650;</span>
                    <span><strong>High-volatility periods:</strong> In choppy markets that end flat, DCA&apos;s natural buy-low effect can generate a better average cost than the starting price, beating lump sum.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-slate-400 font-bold shrink-0">&#9654;</span>
                    <span><strong>Market peaks:</strong> If you happen to invest at a cyclical peak (e.g., early 2000, late 2007), DCA dramatically outperforms lump sum in the subsequent correction period.</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3">Investor situations where DCA makes practical sense</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="text-amber-500 font-bold shrink-0">&#9733;</span>
                    <span><strong>Low risk tolerance:</strong> If you would sell everything in a 15-20% drawdown, a DCA entry reduces the psychological shock of immediate unrealised losses. Staying invested through volatility matters more than the entry method.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-amber-500 font-bold shrink-0">&#9733;</span>
                    <span><strong>First-time investors:</strong> Building the habit of investing regularly, understanding how markets move, and gaining confidence through small regular purchases — the educational value of DCA is real for new investors.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-amber-500 font-bold shrink-0">&#9733;</span>
                    <span><strong>Regular salary earners:</strong> Investing a portion of each paycheck is DCA by definition — and the optimal approach for regular income investors who never have a large idle lump sum.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Head-to-head comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Dimension</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-emerald-700">Lump Sum</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-amber-700">DCA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON.map((r) => (
                    <tr key={r.dimension}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.dimension}</td>
                      <td className="px-4 py-3 text-slate-700">{r.lumpSum}</td>
                      <td className="px-4 py-3 text-slate-700">{r.dca}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* The hybrid approach */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-4">The hybrid approach: best of both worlds</h2>
            <p className="text-sm text-amber-900 mb-6 max-w-2xl">
              For large windfalls, many financial advisers recommend a middle path that captures most of the mathematical advantage of lump sum investing while dramatically reducing regret risk.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <p className="text-3xl font-extrabold text-amber-600 mb-1">50%</p>
                <p className="font-bold text-slate-900 mb-2">Invest immediately</p>
                <p className="text-sm text-slate-700 leading-relaxed">Half the windfall goes into the market today. You are immediately participating in any upward movement and establishing your position.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <p className="text-3xl font-extrabold text-amber-600 mb-1">50%</p>
                <p className="font-bold text-slate-900 mb-2">DCA over 3-6 months</p>
                <p className="text-sm text-slate-700 leading-relaxed">The remaining half is invested in equal monthly tranches. This portion buys at different price points, reducing the impact of an unfortunate timing on the full amount.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-3xl font-extrabold text-slate-700 mb-1">Result</p>
                <p className="font-bold text-slate-900 mb-2">Reduced regret, limited drag</p>
                <p className="text-sm text-slate-700 leading-relaxed">Simulations show this approach recovers roughly 75-80% of the lump sum mathematical advantage, while substantially reducing the worst-case scenario (investing everything at a near-term peak).</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-100 p-4">
              <p className="text-sm text-amber-900">
                <strong>When this makes particular sense:</strong> Redundancy payouts, inheritances, and property sale proceeds often arrive with emotional context that makes staged investing psychologically appropriate — even when the math slightly favours full lump sum. A strategy you can execute with confidence is better than the mathematically optimal strategy you abandon in the first drawdown.
              </p>
            </div>
          </div>
        </section>

        {/* Australian context */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Australian context</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Superannuation: de facto DCA</h3>
                <p className="text-sm text-slate-700 leading-relaxed">You cannot choose when your employer&apos;s SG contributions arrive — they come with every payroll cycle. This makes Australian workers automatic DCA investors inside super. For the superannuation portion of your wealth, the DCA vs lump sum debate is largely academic: the structure decides for you. Focus instead on the right asset allocation and keeping fees low.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">First-time investors outside super</h3>
                <p className="text-sm text-slate-700 leading-relaxed">If you are investing for the first time — putting $10,000-$30,000 into a diversified ETF like DHHF or VDHG — DCA over 6-12 months while you build investment literacy is sensible. The opportunity cost versus lump sum is modest at this scale, and the habit formation and confidence gained from watching your first few purchases are valuable. Once you understand how your portfolio behaves in volatility, lump sum becomes more psychologically accessible.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Redundancy and inheritance</h3>
                <p className="text-sm text-slate-700 leading-relaxed">These windfalls often arrive with significant emotional weight — loss of a job, death of a family member. This is not the psychological state for making irreversible lump sum investment decisions. A 3-6 month DCA period, keeping cash in a HISA, is appropriate here regardless of what the math says. When the emotional context has settled, a larger lump sum deployment may make more sense.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Property sale proceeds</h3>
                <p className="text-sm text-slate-700 leading-relaxed">Large sums ($500K+) from property sales represent a significant portfolio event. The stakes are high enough that professional advice on optimal entry timing, tax structure, and asset allocation is worth pursuing before deciding between lump sum and DCA approaches. Consider speaking with a licensed financial adviser — the cost of advice is trivial relative to the dollar amounts involved.</p>
              </div>
            </div>
          </div>
        </section>

        {/* The emotional reality */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The emotional reality: behaviour beats math</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Nobel laureate research and decades of Dalbar QAIB (Quantitative Analysis of Investor Behaviour) studies reveal a consistent finding: retail investors buy high and sell low, underperforming the very funds they hold by 1-3% annually. This gap arises from behavioural biases — panic selling in downturns, chasing recent performance, and abandoning good strategies after short-term losses.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  The best investment strategy is not the one with the highest expected mathematical return — it is the one you can actually execute and maintain through 30+ years of market volatility, recessions, and alarming financial news.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If DCA helps you stay invested through a 2008-style drawdown instead of panic-selling, the behavioural benefit likely outweighs the ~2% mathematical advantage of lump sum. <strong>Time in the market beats timing the market</strong> — but only if you stay in the market.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">The honest framework</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "If you are disciplined and have a long horizon", rec: "Lean lump sum", color: "text-emerald-700" },
                    { label: "If this is your first large investment", rec: "Lean DCA (6-12 months)", color: "text-amber-700" },
                    { label: "If you have high anxiety about timing", rec: "Hybrid: 50% now, 50% over 3-6 months", color: "text-amber-700" },
                    { label: "If you would sell in a 20% drawdown", rec: "DCA — and review risk tolerance", color: "text-red-700" },
                    { label: "If this is a regular salary investment", rec: "DCA is natural and optimal", color: "text-emerald-700" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
                      <span className="text-slate-600">{item.label}</span>
                      <span className={`font-bold shrink-0 ${item.color}`}>{item.rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platforms for DCA */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Best Australian platforms for DCA</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                {
                  title: "Pearler",
                  desc: "Built for DCA — automatic scheduled purchases, zero lifestyle features. $0 brokerage on selected ETFs with AutoInvest. The natural choice for regular DCA investors.",
                  badge: "DCA-native",
                  color: "border-amber-200 bg-amber-50",
                },
                {
                  title: "Spaceship",
                  desc: "$0 fees on balances under $5,000. Simple app designed for young investors starting small. Limited ETF selection but very low friction for getting started.",
                  badge: "Low cost entry",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "CommSec Pocket",
                  desc: "$2 per trade under $1,000; $10 up to $10,000. 7 ETF options. Bank-backed, familiar brand. Ideal for beginners wanting simplicity. Manual investment (no automation).",
                  badge: "Beginner-friendly",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "Full-service brokers",
                  desc: "For larger DCA amounts ($2,000+/month), traditional ETF brokers (SelfWealth, Interactive Brokers) give full ETF access at competitive brokerage.",
                  badge: "Larger amounts",
                  color: "border-slate-200 bg-slate-50",
                },
              ].map((p) => (
                <div key={p.title} className={`rounded-xl border p-5 ${p.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-extrabold text-slate-900">{p.title}</h3>
                    <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{p.badge}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Brokerage rule of thumb for DCA:</strong> Keep brokerage below 0.5% of each purchase. A $5 Pearler fee on a $1,000 monthly purchase is exactly 0.5%. At $10 brokerage (CommSec standard), you need $2,000 per purchase to hit the 0.5% threshold. Smaller regular amounts need a zero or near-zero brokerage platform.
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
              <Link href="/invest/dollar-cost-averaging" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Dollar-cost averaging guide &#8594;
              </Link>
              <Link href="/brokers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare brokers &#8594;
              </Link>
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Index funds guide &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
