import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "How often should I rebalance my portfolio?",
    a: "Most investors do well with annual rebalancing, which strikes a balance between keeping your allocation on track and minimising transaction costs and potential CGT events. Quarterly rebalancing is suitable for larger portfolios where drift accumulates quickly. A threshold-based approach (rebalance when any asset class drifts more than 5 percentage points from target) is arguably more disciplined than calendar-based, because it only triggers action when drift is material. Combining both — an annual review plus a 5% drift trigger — is the most rigorous approach.",
  },
  {
    q: "Does rebalancing improve returns?",
    a: "Rebalancing is primarily a risk management tool, not a return-enhancement tool. By selling outperformers and buying underperformers, you are systematically buying low and selling high — which can modestly improve risk-adjusted returns over time. However, the main benefit is that your actual risk level stays consistent with your intended risk level. A portfolio that has drifted from 60% to 80% equities is implicitly taking on significantly more risk. In a bear market, that hidden risk crystallises into losses larger than you planned for.",
  },
  {
    q: "Is rebalancing taxable in Australia?",
    a: "Rebalancing outside super can trigger capital gains tax (CGT) when you sell appreciated assets. To minimise this, prioritise buy-only rebalancing — redirect new contributions to underweight assets rather than selling overweight ones. If selling is necessary, hold assets for at least 12 months first to access the 50% CGT discount. You can also use capital losses from other positions to offset gains. Inside super, there are no CGT events on rebalancing — switching investment options within your super fund is tax-free.",
  },
  {
    q: "Can I use super to rebalance my overall wealth?",
    a: "Yes, and it is one of the most tax-efficient rebalancing tools available. If your super is underweight equities relative to your total wealth allocation, you can direct additional voluntary contributions or adjust your super investment option to be more equity-heavy. Conversely, if your super is already equity-heavy, you can hold more defensive assets outside super. Because super rebalancing has no CGT consequences, it effectively lets you adjust your overall asset allocation without tax friction — a significant structural advantage.",
  },
  {
    q: "What is a good threshold to trigger rebalancing?",
    a: "The 5%/25% rule is widely used: rebalance when any asset class drifts either 5 percentage points OR 25% relative to its target, whichever comes first. For a 40% target allocation, the 5pp rule triggers at 35% or 45%. The 25% relative rule triggers at 30% or 50%. For most individual investors, the simpler 5 percentage point rule is sufficient. Smaller thresholds (e.g., 3%) generate too many transactions and CGT events without meaningfully better risk control.",
  },
  {
    q: "How do I rebalance a DHHF or VDHG portfolio?",
    a: "DHHF (BetaShares Diversified All Growth ETF) and VDHG (Vanguard Diversified High Growth ETF) are internally rebalanced diversified ETFs — the fund manager rebalances the underlying holdings on your behalf, within the fund, without triggering CGT for you. If you hold only DHHF or VDHG, your rebalancing work is essentially done. If you hold these alongside other assets (e.g., cash, bonds, property), you rebalance at the portfolio level by adjusting the proportion held in DHHF/VDHG versus those other assets using new contributions wherever possible.",
  },
];

const METHODS = [
  {
    method: "Calendar-based",
    how: "Rebalance at set intervals — quarterly or annually — regardless of how much drift has occurred",
    bestFor: "Simple, predictable; suits investors who want a routine review date",
    badge: "Simple",
    color: "border-slate-200 bg-slate-50",
    badgeColor: "bg-slate-200 text-slate-700",
  },
  {
    method: "Threshold-based",
    how: "Rebalance only when any asset class drifts more than 5% from its target allocation",
    bestFor: "More responsive to real market moves; avoids unnecessary transactions in stable markets",
    badge: "Responsive",
    color: "border-amber-200 bg-amber-50",
    badgeColor: "bg-amber-200 text-amber-800",
  },
  {
    method: "Buy-only",
    how: "Never sell; add new contributions exclusively to underweight asset classes",
    bestFor: "Tax-efficient; avoids CGT events entirely; ideal for investors in accumulation phase",
    badge: "Tax-efficient",
    color: "border-emerald-200 bg-emerald-50",
    badgeColor: "bg-emerald-200 text-emerald-800",
  },
  {
    method: "Hybrid",
    how: "Calendar review plus a 5% drift threshold trigger — acts on whichever comes first",
    bestFor: "Most rigorous; catches both slow drift and rapid market dislocations",
    badge: "Most rigorous",
    color: "border-blue-200 bg-blue-50",
    badgeColor: "bg-blue-200 text-blue-800",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Portfolio Rebalancing Australia (${CURRENT_YEAR}) — How and When to Rebalance`,
  description: `Portfolio rebalancing in Australia: how drift happens, the 5%/25% rule, tax-efficient strategies and super rebalancing. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Portfolio Rebalancing Australia (${CURRENT_YEAR})`,
    description: "How drift happens, 4 rebalancing methods, tax-efficient strategies for Australia, and the hidden cost of never rebalancing.",
    url: `${SITE_URL}/invest/rebalancing`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Portfolio Rebalancing Australia")}&sub=${encodeURIComponent("Drift · Threshold Rules · Tax Strategy · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/rebalancing` },
};

export default function RebalancingPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Portfolio Rebalancing", url: absoluteUrl("/invest/rebalancing") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Portfolio Rebalancing</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Portfolio Rebalancing in Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              After years of bull markets, your &ldquo;60% shares&rdquo; portfolio could quietly be sitting at 80% shares — carrying far more risk than you intended. Rebalancing restores the allocation you chose. Here&apos;s how to do it tax-efficiently.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Typical equity drift after 2020-2024 bull run", value: "10–15pp" },
                { label: "CGT discount for assets held 12+ months", value: "50%" },
                { label: "Popular drift threshold to trigger rebalancing", value: "5pp rule" },
                { label: "Tax on rebalancing inside super", value: "Nil" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is rebalancing */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is portfolio rebalancing?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Portfolio rebalancing means restoring your portfolio back to its <strong>target asset allocation</strong> after market movements have caused it to drift away. Every time the share market rises, your equity weighting increases automatically — without you buying anything extra. Every time bonds outperform, your defensive weighting grows.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Over time, this drift means your actual risk level quietly diverges from the risk level you originally chose. Rebalancing corrects this by selling the assets that have grown above their target weight and buying those that have fallen below.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The goal is not to chase returns — it is to ensure the volatility and drawdown risk you experience in the next bear market matches what you planned for, not what a bull market silently created.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Example: 70/30 portfolio after a bull run</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Target allocation</p>
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-full bg-amber-400" style={{ width: "70%" }} />
                      <span className="font-bold text-slate-900">70% shares</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-3 rounded-full bg-slate-300" style={{ width: "30%" }} />
                      <span className="font-bold text-slate-700">30% bonds</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">After bull run (drifted)</p>
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-full bg-red-400" style={{ width: "80%" }} />
                      <span className="font-bold text-red-700">80% shares &#8593; +10pp</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-3 rounded-full bg-slate-300" style={{ width: "20%" }} />
                      <span className="font-bold text-slate-500">20% bonds &#8595; &minus;10pp</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-600"><strong>Rebalance action:</strong> Sell shares, buy bonds until back to 70/30. Risk is restored to intended level.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why drift matters */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Why drift matters — the hidden risk of bull markets</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The 2020&ndash;2024 period delivered exceptional equity returns. For investors who did not rebalance, their portfolios quietly became far more equity-heavy than originally designed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  title: "Unintended risk increase",
                  desc: "A 70% equity portfolio that drifts to 85% carries ~21% more equity risk. In a 30% market crash, you lose 25.5% vs 21% — a meaningful difference that was never part of your plan.",
                  color: "border-red-200 bg-red-50",
                  titleColor: "text-red-900",
                },
                {
                  title: "Implicit market timing",
                  desc: "Not rebalancing after a bull run means you are implicitly betting the bull run continues. You are increasing your equity exposure at the point when valuations are highest.",
                  color: "border-amber-200 bg-amber-50",
                  titleColor: "text-amber-900",
                },
                {
                  title: "Behavioural compounding",
                  desc: "Drift compounds over multiple bull markets. An investor who never rebalanced a 60/40 portfolio through 2015-2024 could easily be sitting at 80/20 or higher by end 2024.",
                  color: "border-slate-200 bg-white",
                  titleColor: "text-slate-900",
                },
              ].map((c) => (
                <div key={c.title} className={`rounded-xl border p-5 ${c.color}`}>
                  <h3 className={`font-extrabold mb-2 ${c.titleColor}`}>{c.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Key insight:</strong> After the 2020&ndash;2024 bull markets, a portfolio originally set to 70% shares could easily be sitting at 85%+ shares. This is not a portfolio you consciously chose — it is the result of inaction. Rebalancing is the discipline that keeps your actual risk aligned with your intended risk.
              </p>
            </div>
          </div>
        </section>

        {/* Rebalancing methods */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">4 rebalancing methods compared</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              There is no single correct approach. The best method depends on your portfolio size, tax situation, and how much ongoing attention you want to give it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {METHODS.map((m) => (
                <div key={m.method} className={`rounded-xl border p-5 ${m.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-extrabold text-slate-900">{m.method}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-2"><strong>How it works:</strong> {m.how}</p>
                  <p className="text-sm text-slate-600 leading-relaxed"><strong>Best for:</strong> {m.bestFor}</p>
                </div>
              ))}
            </div>

            {/* Methods summary table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm" aria-label="Rebalancing methods compared">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Method</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">How it works</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-amber-700">Best for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { method: "Calendar-based", how: "Rebalance at set intervals (quarterly/annually)", bestFor: "Simple, predictable" },
                    { method: "Threshold-based", how: "Rebalance when any asset class drifts >5% from target", bestFor: "More responsive to market moves" },
                    { method: "Buy-only", how: "Add new contributions to underweight assets only", bestFor: "Tax-efficient; avoids selling" },
                    { method: "Hybrid", how: "Threshold trigger + calendar review", bestFor: "Most rigorous" },
                  ].map((r) => (
                    <tr key={r.method}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.method}</td>
                      <td className="px-4 py-3 text-slate-700">{r.how}</td>
                      <td className="px-4 py-3 text-slate-700">{r.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Tax-efficient rebalancing */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Tax-efficient rebalancing strategies for Australia</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Every asset sale outside super is a potential CGT event. These strategies let you maintain your target allocation while minimising the tax cost.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Buy-only rebalancing with new contributions",
                  desc: "Direct new cash contributions exclusively to underweight asset classes. No selling means no CGT. This works best during the accumulation phase when regular contributions are large relative to portfolio size.",
                  badge: "No CGT",
                  color: "border-emerald-200 bg-emerald-50",
                  badgeColor: "bg-emerald-200 text-emerald-800",
                },
                {
                  title: "Rebalance inside super",
                  desc: "Switching investment options within your super fund generates no CGT event for you. Super rebalancing is completely tax-free, making it the most efficient lever for adjusting your overall asset allocation.",
                  badge: "Tax-free",
                  color: "border-emerald-200 bg-emerald-50",
                  badgeColor: "bg-emerald-200 text-emerald-800",
                },
                {
                  title: "Hold 12+ months before selling",
                  desc: "Assets held for more than 12 months before sale qualify for the 50% CGT discount. If rebalancing requires selling, ensure the asset to be sold has been held for at least 12 months to halve the effective tax rate.",
                  badge: "50% CGT discount",
                  color: "border-amber-200 bg-amber-50",
                  badgeColor: "bg-amber-200 text-amber-800",
                },
                {
                  title: "Use dividends and distributions",
                  desc: "Instead of reinvesting dividends automatically, redirect them to underweight asset classes. This natural rebalancing uses cash flow that has already been earned — no selling required.",
                  badge: "No selling required",
                  color: "border-amber-200 bg-amber-50",
                  badgeColor: "bg-amber-200 text-amber-800",
                },
                {
                  title: "Tax-loss harvesting at EOFY",
                  desc: "At end of financial year, review for positions sitting at a loss. Realising those losses creates capital losses that offset gains from rebalancing sales. The loss must be genuine — beware wash-sale rules.",
                  badge: "Offset gains",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
                {
                  title: "Super contributions as rebalancing",
                  desc: "Additional voluntary super contributions are taxed at 15% rather than your marginal rate. If your super is underweight equities relative to your total wealth, increase super contributions to a growth option — you are rebalancing while also reducing tax.",
                  badge: "15% tax rate",
                  color: "border-slate-200 bg-white",
                  badgeColor: "bg-slate-200 text-slate-700",
                },
              ].map((s) => (
                <div key={s.title} className={`rounded-xl border p-5 ${s.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{s.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${s.badgeColor}`}>{s.badge}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to calculate drift */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to calculate when you&apos;re out of balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Calculating drift is straightforward: divide each asset class&apos;s current value by the total portfolio value, then compare to your target weight. The difference is the drift.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Once you know the drift, the rebalancing action is: sell the overweight asset and buy the underweight asset — or, if possible, redirect new contributions to the underweight asset until the gap closes.
                </p>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Practical tip:</strong> A simple spreadsheet with three columns — target %, current value, current % — is all you need. Recalculate quarterly or whenever you make a contribution.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Worked example: $100,000 portfolio</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" aria-label="Rebalancing worked example: $100,000 portfolio">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th scope="col" className="pb-2 text-left font-bold text-slate-700">Asset class</th>
                        <th scope="col" className="pb-2 text-right font-bold text-slate-700">Target</th>
                        <th scope="col" className="pb-2 text-right font-bold text-slate-700">Current</th>
                        <th scope="col" className="pb-2 text-right font-bold text-slate-700">Drift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2 text-slate-700">AU shares</td>
                        <td className="py-2 text-right text-slate-700">60% ($60K)</td>
                        <td className="py-2 text-right font-bold text-red-700">72% ($72K)</td>
                        <td className="py-2 text-right font-bold text-red-600">+12pp</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-700">Intl shares</td>
                        <td className="py-2 text-right text-slate-700">30% ($30K)</td>
                        <td className="py-2 text-right font-bold text-amber-700">25% ($25K)</td>
                        <td className="py-2 text-right font-bold text-amber-600">&minus;5pp</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-700">Bonds</td>
                        <td className="py-2 text-right text-slate-700">10% ($10K)</td>
                        <td className="py-2 text-right font-bold text-amber-700">3% ($3K)</td>
                        <td className="py-2 text-right font-bold text-amber-600">&minus;7pp</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1">
                  <p><strong>Rebalancing action:</strong></p>
                  <p>&#8594; Sell $12K AU shares (overweight)</p>
                  <p>&#8594; Buy $5K international shares (underweight)</p>
                  <p>&#8594; Buy $7K bonds (underweight)</p>
                  <p className="text-slate-500 mt-2">Or: redirect next contributions to intl shares and bonds until gap closes — no selling required.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5%/25% rule */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-4">The 5%/25% rule — a popular threshold guideline</h2>
            <p className="text-sm text-amber-900 mb-6 max-w-2xl">
              Rather than rebalancing on a fixed calendar, many investors use a drift threshold to decide when action is actually needed. The 5%/25% rule provides two tests — use whichever triggers first.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">5 percentage point rule (absolute)</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Rebalance when any asset class drifts more than 5 percentage points from its target.
                </p>
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                  <p><strong>40% target</strong> &#8594; rebalance below 35% or above 45%</p>
                  <p><strong>60% target</strong> &#8594; rebalance below 55% or above 65%</p>
                  <p><strong>20% target</strong> &#8594; rebalance below 15% or above 25%</p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">25% relative rule</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Rebalance when any asset class drifts more than 25% relative to its target weight.
                </p>
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                  <p><strong>40% target</strong> &#8594; rebalance below 30% or above 50% (25% of 40 = 10pp)</p>
                  <p><strong>20% target</strong> &#8594; rebalance below 15% or above 25% (25% of 20 = 5pp)</p>
                  <p><strong>10% target</strong> &#8594; rebalance below 7.5% or above 12.5%</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-100 p-4">
              <p className="text-sm text-amber-900">
                <strong>How to apply it:</strong> Check your portfolio quarterly. If neither test triggers, do nothing. If either test triggers for any asset class, rebalance all asset classes back to target at the same time. This minimises transaction costs by batching adjustments.
              </p>
            </div>
          </div>
        </section>

        {/* Super vs outside super */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Rebalancing inside super vs outside super</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-extrabold text-emerald-900">Inside super</h3>
                  <span className="text-xs font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Recommended first</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li><strong>No CGT events</strong> — switching between investment options within super is tax-free</li>
                  <li><strong>No brokerage</strong> — fund switches have no transaction cost in most retail/industry funds</li>
                  <li><strong>Simplest mechanism</strong> — log in, adjust investment option percentages, done</li>
                  <li><strong>Use super rebalancing first</strong> before selling anything outside super</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-extrabold text-slate-900">Outside super</h3>
                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Use buy-only where possible</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li><strong>Selling triggers CGT</strong> — any gain on the sold asset is assessable income</li>
                  <li><strong>50% CGT discount</strong> applies if held 12+ months — hold before selling</li>
                  <li><strong>Buy-only rebalancing</strong> avoids CGT entirely during accumulation</li>
                  <li><strong>Dividends and DRP</strong> — redirect to underweight assets as natural rebalancing</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Practical order of operations:</strong> (1) Rebalance inside super first — completely tax-free. (2) Redirect new contributions and dividends to underweight assets outside super. (3) Only sell outside super as a last resort, and only assets held 12+ months.
              </p>
            </div>
          </div>
        </section>

        {/* Cost of not rebalancing */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">The cost of not rebalancing — a worked example</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Drift looks harmless in a bull market. The cost only becomes visible in the next significant downturn.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-4">Investor A: Rebalanced annually</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Starting balance (2015)</span><span className="font-bold">$200,000</span></div>
                  <div className="flex justify-between"><span>Target allocation</span><span className="font-bold">60% ASX / 40% bonds</span></div>
                  <div className="flex justify-between"><span>Maintained allocation by 2024</span><span className="font-bold text-emerald-700">~60% ASX</span></div>
                  <div className="flex justify-between"><span>Portfolio value (end 2024)</span><span className="font-bold">~$480,000</span></div>
                  <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2">
                    <span>Loss in 30% market crash</span>
                    <span className="font-extrabold text-emerald-800">$86,400 (60% equity portion)</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-4">Investor B: Never rebalanced</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Starting balance (2015)</span><span className="font-bold">$200,000</span></div>
                  <div className="flex justify-between"><span>Target allocation (original)</span><span className="font-bold">60% ASX / 40% bonds</span></div>
                  <div className="flex justify-between"><span>Actual allocation by 2024</span><span className="font-bold text-red-700">~75% ASX (drifted)</span></div>
                  <div className="flex justify-between"><span>Portfolio value (end 2024)</span><span className="font-bold">~$510,000</span></div>
                  <div className="flex justify-between border-t border-red-200 pt-2 mt-2">
                    <span>Loss in 30% market crash</span>
                    <span className="font-extrabold text-red-800">$114,750 (75% equity portion)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-900">
                <strong>Extra loss from drift:</strong> Approximately $28,000 more in losses for Investor B in the same crash — not from poor investment choices, but purely from the equity allocation drifting 15 percentage points above target. Investor B also had a slightly larger portfolio going into the crash, but the excess equity weighting more than erased that advantage.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">&#9660;</span>
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
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/dollar-cost-averaging" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Dollar-cost averaging &#8594;
              </Link>
              <Link href="/invest/passive-vs-active" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Passive vs active &#8594;
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
