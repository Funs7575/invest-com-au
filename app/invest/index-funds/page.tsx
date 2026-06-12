import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { createClient } from "@/lib/supabase/server";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";
import {
  SHOW_RATINGS,
  SHOW_EDITORIAL_BADGES,
  SHOW_ADVISOR_RATINGS,
  SHOW_ADVISOR_VERIFIED_BADGE,
  FACTUAL_COMPARISON_DISCLAIMER,
  ADVISOR_DIRECTORY_HEADING,
  ADVISOR_DIRECTORY_SUBTEXT,
} from "@/lib/compliance-config";

export const metadata: Metadata = {
  title: `Index Fund Investing Australia — Complete Guide (${CURRENT_YEAR})`,
  description:
    "Complete guide to index fund investing in Australia — ASX 200, global ETFs, fee comparisons, SPIVA data, and how to start with VAS, VGS and VDHG.",
  alternates: { canonical: absoluteUrl("/invest/index-funds") },
  openGraph: {
    title: `Index Fund Investing Australia — Complete Guide (${CURRENT_YEAR})`,
    description:
      "Complete guide to index fund investing in Australia — ASX 200, global ETFs, fee comparisons, SPIVA data, and how to start with VAS, VGS and VDHG.",
    url: absoluteUrl("/invest/index-funds"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Index Funds Australia")}&sub=${encodeURIComponent("Passive Investing · Vanguard · iShares · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;

const faqItems = [
  {
    q: "What is an index fund?",
    a: "An index fund is a managed fund or ETF designed to track the performance of a market index — such as the ASX 200, MSCI World, or S&P 500 — by holding the same securities in the same proportions. Instead of hiring analysts to pick stocks, the fund simply replicates the index. This passive approach keeps costs very low (0.03–0.20% MER) and delivers returns that closely mirror the market, minus a small tracking difference.",
  },
  {
    q: "What is the difference between an index managed fund and an index ETF?",
    a: "Both track the same index and hold the same underlying securities — the difference is purely structural. An index ETF (like VAS or A200) trades on the ASX like a share; you buy it through any broker at live market prices throughout the trading day. An index managed fund (like Vanguard's Australian Shares Index Fund) is purchased directly from the fund manager at end-of-day NAV price, often with a minimum investment of $500. ETFs typically have slightly lower MERs and better tax efficiency, while unlisted managed funds suit investors using platforms that offer fractional units or regular investment plans.",
  },
  {
    q: "What does the SPIVA data show about active fund managers?",
    a: "S&P's SPIVA (S&P Indices Versus Active) Australia Scorecard consistently shows that over a 10-year period, more than 80% of active Australian equity fund managers underperform the S&P/ASX 200 index after fees. Over 15 years, the figure rises further. The primary driver is cost: a 0.90% MER difference, compounded over a decade, is a substantial drag on performance that most managers cannot overcome consistently.",
  },
  {
    q: "Should I invest in Australian or global index funds?",
    a: "Most financial planning frameworks suggest a combination. The ASX represents roughly 2% of global market capitalisation and is heavily concentrated in banks and resources (financials and materials together make up over 50% of the ASX 200). Holding only Australian shares exposes you to significant concentration risk. Adding a global fund like VGS (MSCI World ex-Australia) diversifies across 1,500+ companies in 23 developed markets. A popular starting point is VAS 30–40% + VGS 60–70%.",
  },
  {
    q: "How are index fund distributions taxed in Australia?",
    a: "Distributions from Australian index ETFs and managed funds are taxed at your marginal rate for income components, with capital gains eligible for the 50% CGT discount if the underlying fund held the assets for 12+ months. Australian equity funds pass through franking credits, which reduce your tax bill. Most large funds use the AMIT (Attribution Managed Investment Trust) regime and issue AMMA tax statements to simplify your tax return. Selling units triggers a CGT event; the 50% discount applies if you have held the units for at least 12 months.",
  },
  {
    q: "What is DRIP or DRP and should I use it?",
    a: "DRP (Dividend Reinvestment Plan) is offered by many ETF providers and automatically reinvests your cash distributions into additional units, typically with no brokerage. Vanguard's DRIP (Distribution Reinvestment Plan) works similarly. Reinvestment accelerates compounding, but note that distributions are still taxable in the year they are paid — you will owe tax even though you received units rather than cash. For most long-term investors in the accumulation phase, automatic reinvestment is the simplest strategy. If you are drawing income in retirement, taking distributions as cash may be preferable.",
  },
];

export default async function IndexFundsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, rating, platform_type, asx_fee, us_fee, min_deposit, affiliate_url, deal, deal_text, icon"
    )
    .eq("status", "active")
    .in("platform_type", ["share_broker", "robo_advisor"])
    .order("rating", { ascending: false })
    .limit(5);

  const { data: advisors } = await supabase
    .from("professionals")
    .select(
      "slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified"
    )
    .eq("status", "active")
    .in("type", ["financial_planner"])
    .order("rating", { ascending: false })
    .limit(3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Index Funds" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Index Fund Investing Australia — Complete Guide (${CURRENT_YEAR})`,
    url: absoluteUrl("/invest/index-funds"),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = faqJsonLd(faqItems);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <ArticleReadingProgress />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Invest
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Index Funds</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              {UPDATED_LABEL}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Passive Investing
            </span>
          </div>

          <h1 className="text-slate-900 text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Index Fund Investing in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Index funds are the simplest, lowest-cost path to long-term wealth. This guide covers
            everything from how passive tracking works, to the best Australian ETFs, global
            diversification, and simple portfolio blueprints you can implement today.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare Brokers →
            </Link>
            <Link
              href="#portfolio-templates"
              className="inline-flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm px-5 py-2.5 rounded-lg border transition-colors"
            >
              See Portfolio Templates
            </Link>
          </div>
        </div>
      </section>

      {/* ── Key stats ───────────────────────────────────────────── */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "80%+", label: "Active AU equity funds underperform index over 10 yrs (SPIVA)" },
              { value: "0.03–0.20%", label: "Typical index ETF MER (p.a.)" },
              { value: "0.70–1.20%", label: "Typical active AU equity fund MER (p.a.)" },
              { value: "~2%", label: "ASX share of world market capitalisation" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center"
              >
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 1: What is an index fund ────────────────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            What Is an Index Fund?
          </h2>

          <div className="prose prose-slate max-w-none mb-8">
            <p>
              An <strong>index fund</strong> tracks a market index — a pre-defined list of
              securities weighted by market capitalisation (or another rule). The fund buys every
              stock in the index in the right proportions, then rebalances automatically when the
              index changes. No analyst is paid to pick winners; no research budget is spent
              forecasting earnings. The result is very low costs and returns that mirror the market.
            </p>
            <p>
              Common Australian benchmarks include the <strong>S&amp;P/ASX 200</strong> (the 200
              largest ASX-listed companies), the <strong>S&amp;P/ASX 300</strong> (the top 300), and
              global indices like the <strong>MSCI World ex-Australia</strong> (developed markets
              excluding Australia) and the <strong>S&amp;P 500</strong> (top 500 US companies).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Index Funds (Passive)</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Strategy", dd: "Replicate a market index mechanically" },
                  { dt: "Fees (MER)", dd: "0.03–0.20% p.a." },
                  { dt: "Goal", dd: "Match market returns, minus fees" },
                  { dt: "Manager involvement", dd: "Minimal — rules-based rebalancing only" },
                  { dt: "Tax efficiency", dd: "High — low turnover, fewer CGT events" },
                  { dt: "Best for", dd: "Long-term, cost-conscious investors" },
                ].map((item) => (
                  <div
                    key={item.dt}
                    className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                  >
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Active Managed Funds</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Strategy", dd: "Stock picking, sector bets, market timing" },
                  { dt: "Fees (MER)", dd: "0.70–1.20% p.a. + performance fees" },
                  { dt: "Goal", dd: "Beat the benchmark index (alpha generation)" },
                  { dt: "Manager involvement", dd: "High — dedicated analysts and PMs" },
                  { dt: "Tax efficiency", dd: "Lower — higher turnover generates CGT" },
                  { dt: "Best for", dd: "Specific tilts, less-efficient market segments" },
                ].map((item) => (
                  <div
                    key={item.dt}
                    className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                  >
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Index funds vs ETFs ──────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Index Managed Funds vs ETF Wrappers
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              The terms &quot;index fund&quot; and &quot;ETF&quot; are often used interchangeably, but they
              describe <strong>different structures</strong> holding the same underlying portfolio. A{" "}
              <strong>Vanguard Australian Shares Index Fund</strong> (unlisted) and{" "}
              <strong>VAS</strong> (the ASX-listed ETF) both track the S&amp;P/ASX 300 with almost
              identical holdings — the difference is purely how you access them.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table className="w-full text-sm border-collapse" aria-label="Index managed funds vs ETF wrappers">
              <thead>
                <tr className="bg-slate-100">
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Feature
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Index Managed Fund
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Index ETF
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: "Where you buy it",
                    fund: "Directly from fund manager (e.g. Vanguard)",
                    etf: "On the ASX via any broker",
                  },
                  {
                    feature: "Pricing",
                    fund: "End-of-day NAV",
                    etf: "Live market price throughout trading day",
                  },
                  {
                    feature: "Minimum investment",
                    fund: "$500 (Vanguard), $1,000–$25,000 (others)",
                    etf: "Price of one unit (~$30–$150 for most large ETFs)",
                  },
                  {
                    feature: "Brokerage",
                    fund: "None (for direct platforms)",
                    etf: "$0–$9.95 per trade (broker-dependent)",
                  },
                  {
                    feature: "MER (typical)",
                    fund: "0.16–0.29% (Vanguard managed)",
                    etf: "0.03–0.20% (VAS 0.07%, A200 0.04%)",
                  },
                  {
                    feature: "Regular savings plans",
                    fund: "Yes — often free, weekly/monthly",
                    etf: "Via broker (Pearler, Stockspot); brokerage may apply",
                  },
                  {
                    feature: "Tax efficiency",
                    fund: "Good",
                    etf: "Slightly better (creation/redemption mechanism)",
                  },
                  {
                    feature: "Examples",
                    fund: "Vanguard Aust. Shares Index Fund, Dimensional",
                    etf: "VAS, A200, VGS, VDHG, IVV",
                  },
                ].map((r, i) => (
                  <tr key={r.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">
                      {r.feature}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 border-b border-slate-100">{r.fund}</td>
                    <td className="py-2.5 px-3 text-slate-600 border-b border-slate-100">{r.etf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Practical takeaway:</strong> For most investors starting out, ETFs via a
              low-cost broker (Pearler, Selfwealth, moomoo, Interactive Brokers) give the lowest
              MER and greatest flexibility. Unlisted managed funds suit investors who want
              automatic regular investments without worrying about bid/ask spreads.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: The case for indexing (SPIVA) ────────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            The Case for Indexing: What the SPIVA Data Shows
          </h2>

          <div className="prose prose-slate max-w-none mb-8">
            <p>
              The most compelling argument for index investing is not theoretical — it is
              empirical. S&amp;P Dow Jones Indices publishes the{" "}
              <strong>SPIVA Australia Scorecard</strong> twice yearly, measuring how many active
              managers beat their stated benchmark after fees. The findings are stark:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                period: "1 Year",
                pct: "~55%",
                label: "of active AU equity managers underperform",
                note: "Shorter periods show more variation",
              },
              {
                period: "5 Years",
                pct: "~74%",
                label: "of active AU equity managers underperform",
                note: "The gap widens as costs compound",
              },
              {
                period: "10 Years",
                pct: "~82%",
                label: "of active AU equity managers underperform",
                note: "Survivorship bias makes the true figure even higher",
              },
            ].map((d) => (
              <div
                key={d.period}
                className="bg-red-50 border border-red-100 rounded-xl p-5 text-center"
              >
                <p className="text-xs font-bold uppercase text-red-400 mb-1">{d.period}</p>
                <p className="text-3xl font-extrabold text-red-600 mb-1">{d.pct}</p>
                <p className="text-xs font-semibold text-slate-700 mb-1">{d.label}</p>
                <p className="text-xs text-slate-500">{d.note}</p>
              </div>
            ))}
          </div>

          <div className="prose prose-slate max-w-none">
            <p>
              <strong>Note on survivorship bias:</strong> The SPIVA scorecard includes only funds
              that still exist at the end of the measurement period. Funds that underperform and
              close are excluded, meaning the true underperformance rate is likely{" "}
              <em>higher</em> than reported.
            </p>
            <p>
              This does not mean active management is worthless. Some managers add genuine value,
              particularly in less-efficient segments such as small caps, emerging markets, and
              private credit. But for broad Australian and global equities, the data strongly
              favours the index.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Cost advantage ────────────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            The Cost Advantage: How Fees Compound Against You
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              The most direct cause of active fund underperformance is fees. A typical active
              Australian equity fund charges <strong>0.70–1.20% MER</strong> versus{" "}
              <strong>0.03–0.20% MER</strong> for index ETFs. On a $100,000 portfolio earning 7%
              gross per year, a 0.90% annual fee difference compounds into a meaningful gap over a
              decade.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">
                $100,000 invested at 7% gross — fee drag illustration
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" aria-label="Fee drag illustration: $100,000 at 7% gross over time">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                      Year
                    </th>
                    <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                      Index fund (0.10% MER)
                    </th>
                    <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                      Active fund (1.00% MER)
                    </th>
                    <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                      Cost of fees
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { yr: "Year 1", idx: "$107,000", act: "$106,000", cost: "$1,000" },
                    { yr: "Year 5", idx: "$140,255", act: "$133,823", cost: "$6,432" },
                    { yr: "Year 10", idx: "$196,715", act: "$179,085", cost: "$17,630" },
                    { yr: "Year 20", idx: "$386,968", act: "$320,714", cost: "$66,254" },
                    { yr: "Year 30", idx: "$761,225", act: "$574,349", cost: "$186,876" },
                  ].map((r, i) => (
                    <tr key={r.yr} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-100">
                        {r.yr}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-green-700 border-b border-slate-100">
                        {r.idx}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 border-b border-slate-100">
                        {r.act}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-red-600 border-b border-slate-100">
                        {r.cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 px-4 py-2">
              Illustrative only. Assumes 7% gross annual return before fees, no additional contributions.
              Actual returns will vary. This is not a forecast or projection.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              At 30 years, the index fund investor ends up with <strong>$186,876 more</strong> —
              simply by paying 0.90% less per year. The active fund manager would need to
              outperform the index by roughly 0.90% annually, every year, just to break even on
              fees. SPIVA data shows fewer than 20% sustain this consistently over a decade.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 5: Key Australian index funds table ──────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Key Australian Index Funds &amp; ETFs
          </h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            The following ETFs are the most widely held index funds available to Australian
            investors. MERs and 5-year returns are approximate and subject to change.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse" aria-label="Key Australian index funds and ETFs">
              <thead>
                <tr className="bg-slate-100">
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Ticker
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Name &amp; Manager
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Index Tracked
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    MER
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    5-yr Return
                  </th>
                  <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">
                    Dist. Yield
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    ticker: "VAS",
                    name: "Vanguard Australian Shares Index ETF",
                    index: "S&P/ASX 300",
                    mer: "0.07%",
                    ret: "~9.2% p.a.",
                    yield: "~3.8%",
                  },
                  {
                    ticker: "A200",
                    name: "Betashares Australia 200 ETF",
                    index: "Solactive Australia 200",
                    mer: "0.04%",
                    ret: "~9.4% p.a.",
                    yield: "~3.7%",
                  },
                  {
                    ticker: "STW",
                    name: "SPDR S&P/ASX 200 Fund",
                    index: "S&P/ASX 200",
                    mer: "0.13%",
                    ret: "~9.1% p.a.",
                    yield: "~4.0%",
                  },
                  {
                    ticker: "VGS",
                    name: "Vanguard MSCI Index International Shares ETF",
                    index: "MSCI World ex-Australia",
                    mer: "0.18%",
                    ret: "~15.5% p.a.",
                    yield: "~1.2%",
                  },
                  {
                    ticker: "VDHG",
                    name: "Vanguard Diversified High Growth Index ETF",
                    index: "Multi-asset (90% equities)",
                    mer: "0.27%",
                    ret: "~11.0% p.a.",
                    yield: "~1.8%",
                  },
                  {
                    ticker: "VBAL",
                    name: "Vanguard Diversified Balanced Index ETF",
                    index: "Multi-asset (50% equities)",
                    mer: "0.27%",
                    ret: "~7.8% p.a.",
                    yield: "~2.4%",
                  },
                  {
                    ticker: "IVV",
                    name: "iShares S&P 500 ETF",
                    index: "S&P 500 (USD)",
                    mer: "0.03%",
                    ret: "~18.5% p.a.",
                    yield: "~1.0%",
                  },
                  {
                    ticker: "NDQ",
                    name: "Betashares Nasdaq 100 ETF",
                    index: "Nasdaq-100",
                    mer: "0.48%",
                    ret: "~22.3% p.a.",
                    yield: "~0.5%",
                  },
                ].map((r, i) => (
                  <tr key={r.ticker} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">
                      {r.ticker}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">
                      {r.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">
                      {r.index}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-green-700 border-b border-slate-100">
                      {r.mer}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">
                      {r.ret}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">
                      {r.yield}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            MERs and returns are approximate as at {CURRENT_YEAR}. 5-year returns are past
            performance and are not a reliable indicator of future returns. Distribution yields
            may vary.
          </p>
        </div>
      </section>

      {/* ── Lead Magnet ─────────────────────────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="fee-audit" />
        </div>
      </section>

      {/* ── Section 6: Global vs domestic ───────────────────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Global vs Domestic: Why You Need Both
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Australia is a wealthy, high-quality sharemarket — but it represents only around{" "}
              <strong>2% of global market capitalisation</strong>. Putting all your index fund
              money into the ASX means ignoring 98% of the world&apos;s listed companies, including
              Apple, Microsoft, Nvidia, TSMC, Novo Nordisk, LVMH, and thousands of others.
            </p>
            <p>
              The ASX 200 is also <strong>highly concentrated</strong>: financials (banks) and
              materials (miners) together account for over 50% of the index. This means an
              all-Australian portfolio is effectively a large bet on interest rate cycles and
              commodity prices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-3">ASX 200 Sector Breakdown</h3>
              <div className="space-y-2">
                {[
                  { sector: "Financials (banks)", pct: "~32%", bar: 32 },
                  { sector: "Materials (miners)", pct: "~22%", bar: 22 },
                  { sector: "Healthcare", pct: "~10%", bar: 10 },
                  { sector: "Real Estate", pct: "~7%", bar: 7 },
                  { sector: "Consumer Discretionary", pct: "~6%", bar: 6 },
                  { sector: "All other sectors", pct: "~23%", bar: 23 },
                ].map((s) => (
                  <div key={s.sector}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span>{s.sector}</span>
                      <span className="font-semibold">{s.pct}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full"
                        style={{ width: `${s.bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">Approximate as at {CURRENT_YEAR}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-3">
                MSCI World ex-Australia Top Sectors
              </h3>
              <div className="space-y-2">
                {[
                  { sector: "Information Technology", pct: "~25%", bar: 25 },
                  { sector: "Financials", pct: "~15%", bar: 15 },
                  { sector: "Healthcare", pct: "~13%", bar: 13 },
                  { sector: "Consumer Discretionary", pct: "~11%", bar: 11 },
                  { sector: "Industrials", pct: "~10%", bar: 10 },
                  { sector: "All other sectors", pct: "~26%", bar: 26 },
                ].map((s) => (
                  <div key={s.sector}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span>{s.sector}</span>
                      <span className="font-semibold">{s.pct}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-400 h-1.5 rounded-full"
                        style={{ width: `${s.bar}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">Approximate as at {CURRENT_YEAR}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">VGS + VAS: The Popular Combination</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Holding <strong>VGS</strong> (global developed markets) alongside{" "}
              <strong>VAS</strong> (Australian shares) gives broad diversification while retaining
              exposure to ASX franking credits. A common starting allocation is VAS 30–40% / VGS
              60–70%. This captures Australia&apos;s high dividend yield and franking credits while
              participating in global technology and healthcare growth. Some investors add{" "}
              <strong>VGAD</strong> (VGS with AUD hedging) for a portion of their global
              allocation to reduce currency risk.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 7: Portfolio templates ──────────────────────── */}
      <section id="portfolio-templates" className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 7</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            3 Simple Portfolio Templates
          </h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            These templates are illustrative starting points — not personalised advice. Every
            investor&apos;s risk tolerance, tax position, time horizon, and goals are different.
          </p>

          <div className="space-y-6">
            {/* Template 1 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-amber-500 px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Template 1
                  </p>
                  <p className="font-extrabold text-slate-900 text-lg">
                    The Lazy Portfolio — 100% VDHG
                  </p>
                </div>
                <span className="text-xs font-bold bg-white text-amber-700 px-2.5 py-1 rounded-full">
                  Simplest
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 bg-amber-100 rounded-lg p-4 text-center">
                    <p className="text-2xl font-extrabold text-amber-700">VDHG</p>
                    <p className="text-xs text-slate-600 mt-1">100%</p>
                    <p className="text-xs text-slate-500">MER: 0.27%</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  A single ETF holding a diversified mix of global and Australian shares (90%),
                  plus bonds (10%). VDHG internally holds ~7 underlying ETFs, rebalancing
                  automatically. This is the most hands-off approach — one buy order, set and
                  forget.
                </p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { dt: "# of trades needed", dd: "1" },
                    { dt: "Rebalancing required", dd: "None (automatic)" },
                    { dt: "Approx. MER", dd: "0.27% p.a." },
                    { dt: "Best for", dd: "Beginning investors, smaller balances" },
                  ].map((item) => (
                    <div key={item.dt} className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">{item.dt}</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{item.dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Template 2 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-800 px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Template 2
                  </p>
                  <p className="font-extrabold text-white text-lg">
                    Two-Fund Portfolio — VAS + VGS
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-400 text-slate-900 px-2.5 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-extrabold text-amber-700">VAS</p>
                    <p className="text-xs text-slate-600 mt-1">40%</p>
                    <p className="text-xs text-slate-500">ASX 300 · MER 0.07%</p>
                  </div>
                  <div className="flex-1 bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-extrabold text-blue-700">VGS</p>
                    <p className="text-xs text-slate-600 mt-1">60%</p>
                    <p className="text-xs text-slate-500">MSCI World ex-AU · MER 0.18%</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  A clean split between Australian shares (for franking credits, domestic exposure)
                  and global developed markets (for technology, healthcare, and broader
                  diversification). Requires occasional rebalancing — perhaps annually.
                </p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { dt: "# of ETFs", dd: "2" },
                    { dt: "Rebalancing", dd: "Annual or when allocation drifts 5%+" },
                    { dt: "Blended MER", dd: "~0.14% p.a." },
                    { dt: "Best for", dd: "Most investors; balances franking + global growth" },
                  ].map((item) => (
                    <div key={item.dt} className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">{item.dt}</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{item.dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Template 3 */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-700 px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Template 3
                  </p>
                  <p className="font-extrabold text-white text-lg">
                    Four-Fund Portfolio — With Hedging &amp; Bonds
                  </p>
                </div>
                <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full">
                  Considered
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { ticker: "VAS", pct: "30%", label: "ASX 300", mer: "0.07%", color: "amber" },
                    { ticker: "VGS", pct: "40%", label: "Global unhedged", mer: "0.18%", color: "blue" },
                    { ticker: "VGAD", pct: "20%", label: "Global AUD-hedged", mer: "0.21%", color: "indigo" },
                    { ticker: "VAF", pct: "10%", label: "AU Fixed Interest", mer: "0.20%", color: "slate" },
                  ].map((h) => (
                    <div
                      key={h.ticker}
                      className="bg-slate-50 rounded-lg p-3 text-center"
                    >
                      <p className="text-lg font-extrabold text-slate-900">{h.ticker}</p>
                      <p className="text-sm font-bold text-amber-600">{h.pct}</p>
                      <p className="text-xs text-slate-500">{h.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">MER {h.mer}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  Adds currency hedging via VGAD (20% of global allocation) to reduce AUD/USD
                  volatility, and Australian bonds via VAF for portfolio stability. The bond
                  allocation acts as ballast during equity drawdowns. Higher complexity but better
                  risk management for investors closer to drawdown.
                </p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { dt: "# of ETFs", dd: "4" },
                    { dt: "Rebalancing", dd: "Quarterly or annually" },
                    { dt: "Blended MER", dd: "~0.16% p.a." },
                    { dt: "Best for", dd: "Investors within 5–10 yrs of retirement" },
                  ].map((item) => (
                    <div key={item.dt} className="bg-slate-50 rounded-lg p-2">
                      <dt className="text-slate-500">{item.dt}</dt>
                      <dd className="font-semibold text-slate-800 mt-0.5">{item.dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Tax ──────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 8</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Tax Treatment of Index Funds in Australia
          </h2>

          <div className="space-y-4">
            {[
              {
                title: "Distributions — taxed at marginal rate",
                body: "Index ETF distributions (dividends, interest, capital gain components) are taxed in the year you receive them, at your marginal income tax rate. Australian equity ETFs (VAS, A200, STW) include franking credits that offset your tax liability. The grossed-up distribution amount is included in your assessable income; the franking credit is then applied as a tax offset.",
              },
              {
                title: "AMMA statements — the tax documentation you need",
                body: "Large ETFs and managed funds operating under the AMIT (Attribution Managed Investment Trust) regime issue an AMMA (Attribution Managed Investment Trust Member) annual tax statement. This breaks down each distribution into its tax components — ordinary income, capital gains (discounted and non-discounted), foreign income, and franking credits. Your accountant or tax agent needs this to complete your return.",
              },
              {
                title: "Capital gains on disposal — 50% discount available",
                body: "Selling ETF units is a CGT event. If you have held the units for at least 12 months, you are entitled to the 50% CGT discount on any capital gain. For example, if you sell units at a $10,000 gain after 2 years of holding, only $5,000 is included in your taxable income. CGT losses from other assets can be used to offset the gain.",
              },
              {
                title: "SMSF — accumulation vs pension phase",
                body: "SMSFs in accumulation phase pay 15% tax on income (including ETF distributions) and 10% on capital gains for assets held 12+ months. In pension phase (supporting an account-based pension), income and capital gains are exempt from tax entirely. Franking credits become full cash refunds from the ATO, boosting the effective after-tax yield of Australian equity ETFs significantly.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 9: Reinvestment ─────────────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 9</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Reinvesting Distributions: DRIP, DRP, or Manual?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                method: "DRP (via ETF provider)",
                pros: [
                  "No brokerage on reinvested units",
                  "Automatic compounding",
                  "Available on most Vanguard ETFs",
                ],
                cons: [
                  "Fractional units not always credited",
                  "Tax still applies in year of distribution",
                  "Must opt-in via your broker/registry",
                ],
              },
              {
                method: "DRIP (via broker platform)",
                pros: [
                  "Available through Pearler, Stockspot",
                  "Often $0 brokerage on reinvestment",
                  "Can reinvest across multiple ETFs",
                ],
                cons: [
                  "Platform-dependent feature",
                  "Cash buffer may be required",
                  "Less available on legacy broker platforms",
                ],
              },
              {
                method: "Manual reinvestment",
                pros: [
                  "Full control over timing and allocation",
                  "Can redirect distributions to rebalance",
                  "Useful for tax-loss harvesting decisions",
                ],
                cons: [
                  "Brokerage cost per buy order",
                  "Requires discipline to reinvest",
                  "Idle cash earns nothing while waiting",
                ],
              },
            ].map((m) => (
              <div key={m.method} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-3">{m.method}</h3>
                <div className="mb-3">
                  <p className="text-xs font-bold text-green-700 uppercase mb-1">Pros</p>
                  <ul className="space-y-1">
                    {m.pros.map((p) => (
                      <li key={p} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase mb-1">Cons</p>
                  <ul className="space-y-1">
                    {m.cons.map((c) => (
                      <li key={c} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">✗</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 10: How to invest ────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Section 10
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            How to Buy Index Funds in Australia
          </h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              You have two main pathways: buying index ETFs directly via a broker, or investing
              through a managed service (robo-advisor) that builds an ETF portfolio for you.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Option A: Direct via broker</h3>
            {[
              {
                name: "Pearler",
                type: "ETF Broker / CHESS-sponsored",
                desc: "Designed for long-term index investors. Supports automatic investment plans (AutoInvest) with scheduled buy orders. CHESS-sponsored holdings.",
                fee: "$9.50 per trade; $0 on regular investment plans (some ETFs)",
                best: "Set-and-forget index investors",
              },
              {
                name: "Selfwealth",
                type: "ASX Broker / CHESS-sponsored",
                desc: "Flat-fee ASX broker. CHESS-sponsored with no percentage-based fees. No auto-invest, but very low cost for lump sums.",
                fee: "$9.50 flat per trade",
                best: "Lump-sum investors, larger balances",
              },
              {
                name: "moomoo",
                type: "ASX + International Broker",
                desc: "Zero brokerage on ASX for the first year (terms apply). Access to US markets for IVV and NDQ at low cost.",
                fee: "$0–$3 per ASX trade (conditions apply)",
                best: "Cost-minimising investors, US ETF buyers",
              },
              {
                name: "Interactive Brokers",
                type: "Multi-asset broker",
                desc: "Lowest per-trade cost for large orders. Access to global markets, fractional shares (US). Not CHESS-sponsored — uses HIN via IBKR.",
                fee: "0.08% (min US$1.70) for ASX; US$1 flat for US",
                best: "Experienced investors, large portfolios",
              },
            ].map((b) => (
              <div key={b.name} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{b.name}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">{b.type}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                    {b.best}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{b.desc}</p>
                <p className="text-xs text-green-700 font-semibold mt-2">Fees: {b.fee}</p>
              </div>
            ))}

            <h3 className="font-bold text-slate-900 text-lg mt-6">
              Option B: Via robo-advisor (managed ETF portfolio)
            </h3>
            {[
              {
                name: "Stockspot",
                type: "Robo-advisor",
                desc: "Australia's largest robo-advisor. Builds a personalised ETF portfolio (Betashares/iShares) based on your risk profile. Automated rebalancing and tax reporting.",
                fee: "0.66% p.a. (under $100K); 0.396% ($500K+)",
                best: "Hands-off investors, time-poor professionals",
              },
              {
                name: "InvestSMART",
                type: "Robo-advisor / capped fee",
                desc: "Managed ETF portfolios with a fee cap of $451/year regardless of balance size — very competitive for larger amounts. AFSL-licensed.",
                fee: "$451/year cap; $0 brokerage",
                best: "Investors with $50K+ seeking capped fees",
              },
            ].map((b) => (
              <div key={b.name} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{b.name}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">{b.type}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                    {b.best}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{b.desc}</p>
                <p className="text-xs text-green-700 font-semibold mt-2">Fees: {b.fee}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compare Brokers ─────────────────────────────────────── */}
      {brokers && brokers.length > 0 && (
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
              Compare Brokers
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              Best Platforms for Index Investing
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Top-rated Australian platforms ranked by fees, features, and user ratings.
            </p>
            <div className="space-y-3">
              {(
                brokers as {
                  id: number;
                  name: string;
                  slug: string;
                  rating: number | null;
                  asx_fee: string | null;
                  min_deposit: string | null;
                  affiliate_url: string | null;
                  deal: boolean | null;
                  deal_text: string | null;
                  icon: string | null;
                }[]
              ).map((broker, i) => (
                <div
                  key={broker.id}
                  className={`flex items-center gap-4 bg-white border rounded-xl p-4 ${
                    i === 0 ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-sm font-bold text-slate-600">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{broker.name}</p>
                      {SHOW_EDITORIAL_BADGES && i === 0 && (
                        <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          TOP RATED
                        </span>
                      )}
                      {broker.deal && (
                        <span className="text-[0.6rem] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          DEAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {SHOW_RATINGS && broker.rating && (
                        <span className="text-xs text-amber-600 font-semibold">
                          ★ {broker.rating.toFixed(1)}
                        </span>
                      )}
                      {broker.asx_fee && (
                        <span className="text-xs text-slate-500">ASX: {broker.asx_fee}</span>
                      )}
                      {broker.min_deposit && (
                        <span className="text-xs text-slate-500">Min: {broker.min_deposit}</span>
                      )}
                    </div>
                    {broker.deal_text && (
                      <p className="text-xs text-green-700 mt-1">{broker.deal_text}</p>
                    )}
                  </div>
                  {broker.affiliate_url ? (
                    <a
                      href={`/go/${broker.slug}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Visit Site →
                    </a>
                  ) : (
                    <Link
                      href={`/broker/${broker.slug}`}
                      className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/compare"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                Compare all brokers →
              </Link>
            </div>
            {!SHOW_EDITORIAL_BADGES && (
              <p className="text-xs text-slate-500 mt-3">{FACTUAL_COMPARISON_DISCLAIMER}</p>
            )}
          </div>
        </section>
      )}

      {/* ── Find an Advisor ─────────────────────────────────────── */}
      {advisors && advisors.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
              Expert Advisors
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              {ADVISOR_DIRECTORY_HEADING}
            </h2>
            <p className="text-sm text-slate-500 mb-6">{ADVISOR_DIRECTORY_SUBTEXT}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                advisors as {
                  slug: string;
                  name: string;
                  firm_name: string | null;
                  type: string;
                  location_display: string | null;
                  rating: number | null;
                  review_count: number | null;
                  photo_url: string | null;
                  verified: boolean | null;
                }[]
              ).map((advisor) => (
                <Link
                  key={advisor.slug}
                  href={`/advisor/${advisor.slug}`}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {advisor.photo_url ? (
                      <Image
                        src={advisor.photo_url}
                        alt={advisor.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-500">
                        {advisor.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {advisor.name}
                      </p>
                      {SHOW_ADVISOR_VERIFIED_BADGE && advisor.verified && (
                        <span className="text-[0.6rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          VERIFIED
                        </span>
                      )}
                    </div>
                    {advisor.firm_name && (
                      <p className="text-xs text-slate-500">{advisor.firm_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {SHOW_ADVISOR_RATINGS && advisor.rating && (
                        <span className="text-xs text-amber-600 font-semibold">
                          ★ {advisor.rating.toFixed(1)}
                        </span>
                      )}
                      {SHOW_ADVISOR_RATINGS &&
                        advisor.review_count &&
                        advisor.review_count > 0 && (
                          <span className="text-xs text-slate-500">
                            ({advisor.review_count} reviews)
                          </span>
                        )}
                      {advisor.location_display && (
                        <span className="text-xs text-slate-500">{advisor.location_display}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/advisors"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                Browse all advisors →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Related guides ──────────────────────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            Related Guides
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Explore Related Investment Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Managed Funds & Index Funds",
                href: "/invest/managed-funds",
                desc: "Compare passive index funds and actively managed strategies in Australia.",
              },
              {
                title: "Dividend Investing",
                href: "/invest/dividend-investing",
                desc: "High-yield ASX stocks, franking credits explained, and dividend ETFs.",
              },
              {
                title: "SMSF Investment Guide",
                href: "/invest/smsf",
                desc: "What SMSFs actually invest in — property, shares, ETFs and more.",
              },
              {
                title: "Bonds & Fixed Income",
                href: "/invest/bonds",
                desc: "Government and corporate bonds for stable income and capital preservation.",
              },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  {guide.title}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">
                  Read guide →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.q} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {faq.q}
                  <svg
                    className="w-4 h-4 text-slate-500 shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Want Help Building an Index Portfolio?
              </h2>
              <p className="text-sm text-slate-500">
                A financial planner can recommend the right fund mix for your goals, tax situation,
                and time horizon — and help you avoid common mistakes like over-weighting domestic
                shares or reacting to short-term volatility.
              </p>
            </div>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Financial Planner →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────── */}
      <section className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-4xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
