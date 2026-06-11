import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Dollar-Cost Averaging (DCA) in Australia ${CURRENT_YEAR}: How It Works | Invest.com.au`,
  description:
    "Dollar-cost averaging for Australian investors — how DCA works, DCA vs lump sum, best assets, tax implications, common mistakes, and a step-by-step guide.",
  alternates: { canonical: `${SITE_URL}/invest/dollar-cost-averaging` },
  openGraph: {
    title: `Dollar-Cost Averaging (DCA) in Australia ${CURRENT_YEAR}`,
    description:
      "Invest a fixed amount at regular intervals regardless of price. Here is how DCA works, when it beats a lump sum, and how to set it up in Australia.",
    url: `${SITE_URL}/invest/dollar-cost-averaging`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Dollar-Cost Averaging Australia")}&sub=${encodeURIComponent("DCA Strategy · ETFs · Automation · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const faqItems = [
  {
    q: "Is DCA better than lump sum investing?",
    a: "Historical data suggests lump sum investing outperforms DCA roughly 67% of the time in rising markets because it maximises time in market. However, DCA wins when the market falls shortly after a large initial investment, and it is almost always better for investors who receive regular income rather than a one-off windfall. For most Australians investing from a salary, DCA is simply the practical default — not a trade-off.",
  },
  {
    q: "How much should I invest with DCA?",
    a: "There is no universal figure, but a useful threshold is $500 per purchase to keep brokerage below 0.5% of the transaction (most platforms charge $5-$10 per trade). Investing $200/month at $10 brokerage means 5% of every purchase goes to fees, which seriously erodes returns over time. Start with an amount you can commit to through a market downturn without stopping.",
  },
  {
    q: "Can I DCA into ETFs in Australia?",
    a: "Yes. Several Australian platforms support automatic recurring investment into ASX-listed ETFs. Pearler is specifically built for scheduled ETF purchases. Stake and SelfWealth allow manual recurring buys. CommSec allows limit orders on a schedule. Vanguard's Personal Investor platform lets you set up regular investments directly into Vanguard funds. ETFs like VAS (Australian shares) and VGS (global shares) are the most common DCA targets.",
  },
  {
    q: "Does DCA reduce my average cost?",
    a: "DCA smooths your average entry price by purchasing at different price points over time — sometimes higher, sometimes lower. In a market that trends upward over the long run, your average cost will typically be lower than the final price but higher than the initial price. The primary benefit is not necessarily a lower average cost than a lump sum would have achieved, but reduced variance: you avoid the worst-case scenario of investing everything right before a significant fall.",
  },
  {
    q: "What if I can't afford to keep investing?",
    a: "Pausing is far better than stopping permanently. If your financial situation changes, reduce the amount rather than cancelling altogether. Stopping when markets fall is the most common and most damaging DCA mistake — it converts a paper loss into a real one and means you miss the recovery purchases at lower prices. If you have an emergency fund of 3-6 months of expenses in a high-interest savings account, short-term income disruptions should not force you to exit your investment schedule.",
  },
];

const faq = faqJsonLd(faqItems);

export default function DollarCostAveragingPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Dollar-Cost Averaging" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}

      <div className="bg-white min-h-screen">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white transition-colors">Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Dollar-Cost Averaging</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
                {UPDATED_LABEL}
              </span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-300 px-3 py-1 rounded-full">
                Strategy Guide
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Dollar-Cost Averaging (DCA) in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-6">
              Dollar-cost averaging means investing a fixed dollar amount at regular intervals regardless of what the market is doing. You buy more units when prices fall and fewer when prices rise, smoothing your average entry cost over time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                Compare Brokers &rarr;
              </Link>
              <Link
                href="/invest/lump-sum-investing"
                className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                Lump Sum Guide
              </Link>
            </div>
          </div>
        </section>

        {/* ── Key stats ────────────────────────────────────────────────────── */}
        <section className="py-8 bg-slate-50 border-b border-slate-200">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: "Fixed $", label: "Amount invested each period — not fixed units" },
                { value: "67%", label: "Historical rate at which lump sum beats DCA in rising markets" },
                { value: "$500+", label: "Recommended minimum per purchase to keep brokerage below 0.5%" },
                { value: "Quarterly", label: "Suggested review frequency — check the plan, not daily prices" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 1: How DCA works ─────────────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How Dollar-Cost Averaging Works</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Instead of investing a lump sum all at once, you split it into smaller, equal-dollar purchases on a fixed schedule. The price of the asset fluctuates, so each purchase buys a different number of units — more when cheap, fewer when expensive. Over time this produces an average cost that is neither the highest nor the lowest price you paid.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mb-3">Worked Example: $500/month into VAS over 12 months</h3>
            <p className="text-sm text-slate-500 mb-4">VAS is the Vanguard Australian Shares ETF. Prices below are illustrative only.</p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm border-collapse" aria-label="DCA worked example: $500/month into VAS over 12 months">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Month</th>
                    <th scope="col" className="text-right py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Price/unit</th>
                    <th scope="col" className="text-right py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Amount invested</th>
                    <th scope="col" className="text-right py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Units bought</th>
                    <th scope="col" className="text-right py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Cumulative units</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { month: "Jan", price: "$85.00", amount: "$500", units: "5.88", cumulative: "5.88" },
                    { month: "Feb", price: "$92.00", amount: "$500", units: "5.43", cumulative: "11.31" },
                    { month: "Mar", price: "$88.00", amount: "$500", units: "5.68", cumulative: "16.99" },
                    { month: "Apr", price: "$78.00", amount: "$500", units: "6.41", cumulative: "23.40" },
                    { month: "May", price: "$74.00", amount: "$500", units: "6.76", cumulative: "30.16" },
                    { month: "Jun", price: "$80.00", amount: "$500", units: "6.25", cumulative: "36.41" },
                    { month: "Jul", price: "$83.00", amount: "$500", units: "6.02", cumulative: "42.43" },
                    { month: "Aug", price: "$90.00", amount: "$500", units: "5.56", cumulative: "47.99" },
                    { month: "Sep", price: "$95.00", amount: "$500", units: "5.26", cumulative: "53.25" },
                    { month: "Oct", price: "$98.00", amount: "$500", units: "5.10", cumulative: "58.35" },
                    { month: "Nov", price: "$105.00", amount: "$500", units: "4.76", cumulative: "63.11" },
                    { month: "Dec", price: "$110.00", amount: "$500", units: "4.55", cumulative: "67.66" },
                  ].map((row, i) => (
                    <tr key={row.month} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 border-b border-slate-100">{row.price}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-semibold border-b border-slate-100">{row.amount}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 border-b border-slate-100">{row.units}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 border-b border-slate-100">{row.cumulative}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50">
                    <td colSpan={2} className="py-3 px-3 font-bold text-slate-900 text-sm">Total invested: $6,000</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">$6,000</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">67.66</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700 text-sm">67.66 units</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">Average cost calculation</h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                Total invested: <strong>$6,000</strong> across <strong>67.66 units</strong> = average cost of <strong>$88.69 per unit</strong>.
                The final price was $110.00 and the starting price was $85.00. A lump sum investor who bought in January at $85 would have a lower cost base, but one who invested at the April/May low of $74-$78 would have had to time the market perfectly. DCA produced a middle-ground cost without requiring any timing skill.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2: DCA vs Lump Sum ───────────────────────────────────── */}
        <section className="py-14 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">DCA vs Lump Sum: Three Scenarios</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Research (including Vanguard&apos;s 2012 study) consistently shows lump sum outperforms DCA in roughly <strong>67% of historical periods</strong> across US, UK, and Australian markets. The reason is simple: in markets that trend upward most of the time, more time in market beats any entry timing strategy. But DCA still has a legitimate place.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm border-collapse" aria-label="DCA vs lump sum: three scenarios">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="text-left py-3 px-4 font-semibold">Scenario</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold">What happens</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold">Lump sum result</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold">DCA result</th>
                    <th scope="col" className="text-left py-3 px-4 font-semibold">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      scenario: "Market rises immediately",
                      what: "Market climbs steadily from month 1",
                      lump: "All capital earns the full gain",
                      dca: "Later purchases buy in at higher prices, missing early gains",
                      winner: "Lump sum",
                      winnerClass: "text-green-700 font-bold",
                    },
                    {
                      scenario: "Flat market",
                      what: "Market drifts sideways for 12 months",
                      lump: "Capital earns roughly 0% on price movement",
                      dca: "Same outcome on price; DCA pays more in brokerage",
                      winner: "Roughly equal",
                      winnerClass: "text-slate-600 font-semibold",
                    },
                    {
                      scenario: "Market dips then recovers",
                      what: "Market falls 20% then rebounds to finish higher",
                      lump: "Full capital exposed to the drawdown from day 1",
                      dca: "Later purchases buy more units during the dip, lower average cost",
                      winner: "DCA",
                      winnerClass: "text-amber-600 font-bold",
                    },
                  ].map((row, i) => (
                    <tr key={row.scenario} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-3 px-4 font-semibold text-slate-900 border-b border-slate-100 align-top">{row.scenario}</td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100 align-top">{row.what}</td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100 align-top">{row.lump}</td>
                      <td className="py-3 px-4 text-slate-600 border-b border-slate-100 align-top">{row.dca}</td>
                      <td className={`py-3 px-4 border-b border-slate-100 align-top ${row.winnerClass}`}>{row.winner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Key insight:</strong> The 67% lump-sum win rate assumes you already have the lump sum available. For the majority of Australians investing from a monthly salary, there is no lump sum to deploy — DCA is the only practical option. Even investors who receive a windfall (redundancy, inheritance) may prefer the psychological comfort of DCA, accepting a likely small return trade-off for reduced regret risk if markets fall immediately after investing.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 3: Benefits ──────────────────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Benefits of Dollar-Cost Averaging</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  title: "Removes timing risk",
                  body: "No single purchase represents your entire position. Even if you invest on the worst possible day of the year, it is only one purchase among many. The risk of catastrophically bad timing is diversified across time.",
                },
                {
                  title: "Automates investing behaviour",
                  body: "A scheduled direct debit removes the temptation to delay, wait for a dip, or skip a month. Automating the decision is often the single most valuable thing an investor can do — removing themselves from the equation.",
                },
                {
                  title: "Suits regular income earners",
                  body: "Most Australians earn a salary or wages on a fortnightly or monthly cycle. DCA aligns investing with the natural rhythm of income — invest each pay cycle before lifestyle spending absorbs it.",
                },
                {
                  title: "Reduces emotional decision-making",
                  body: "During market falls, the temptation to sell or pause investing is powerful. A pre-committed DCA schedule reframes a market dip as an opportunity to buy more units at a lower price, which is exactly right behaviourally.",
                },
              ].map((card) => (
                <div key={card.title} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Practical setup ───────────────────────────────────── */}
        <section className="py-14 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Practical Setup in Australia</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Several Australian brokerage platforms support recurring investment, though the level of automation varies.
            </p>

            <div className="space-y-3 mb-8">
              {[
                {
                  platform: "Pearler",
                  detail: "Built specifically for long-term, automated ETF investing. Supports scheduled purchases (weekly, fortnightly, monthly) into ASX-listed ETFs with low flat-fee brokerage. Most DCA-native platform available to Australian retail investors.",
                  href: "/broker/pearler",
                },
                {
                  platform: "Stake",
                  detail: "Supports recurring orders for both ASX and US shares. Lower brokerage than traditional platforms. Auto-invest feature lets you set amount and frequency for a chosen ETF or stock.",
                  href: "/broker/stake",
                },
                {
                  platform: "SelfWealth",
                  detail: "Flat-fee brokerage ($9.50 per trade) with a community portfolio feature. No native auto-invest, but a calendar reminder and manual execution each month is a workable alternative for disciplined investors.",
                  href: "/broker/selfwealth",
                },
                {
                  platform: "CommSec",
                  detail: "Commonwealth Bank's brokerage arm. Allows scheduled limit orders. Higher brokerage ($10-$20+) makes it less suitable for sub-$1,000 DCA purchases, but useful for existing CBA customers who want simplicity.",
                  href: "/broker/commsec",
                },
              ].map((p) => (
                <div key={p.platform} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">{p.platform}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{p.detail}</p>
                    </div>
                    <Link
                      href={p.href}
                      className="shrink-0 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      Review &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-2">DCA is not the same as DRIP</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                A Dividend Reinvestment Plan (DRIP) automatically reinvests dividend income back into the same shares. While DRIPs do produce a form of regular automated buying, the amount and timing are determined by dividend payments — not by your investment schedule. DCA via scheduled purchases and DRIPs can complement each other but they serve different purposes. You can read more in the{" "}
                <Link href="/invest/dividend-investing" className="text-amber-600 hover:underline font-semibold">
                  dividend investing guide
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 5: Asset classes ─────────────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Which Asset Classes Suit DCA?</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <h3 className="font-bold text-green-800 mb-3">Well suited to DCA</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  {[
                    {
                      asset: "Broad ETFs (VAS, VGS, NDQ)",
                      why: "High price volatility relative to long-term upward trend is exactly where DCA smoothing is most valuable. Low brokerage relative to purchase amount when investing $500+.",
                    },
                    {
                      asset: "Individual ASX shares",
                      why: "Works well for blue-chip companies with long track records. Greater single-stock risk than ETFs, but DCA still reduces timing risk on entry.",
                    },
                    {
                      asset: "Cryptocurrency",
                      why: "Extreme volatility makes market timing almost impossible. DCA is the dominant strategy used by long-term crypto holders. Higher risk asset overall — only appropriate for investors who have thoroughly assessed their risk tolerance.",
                    },
                  ].map((item) => (
                    <li key={item.asset}>
                      <strong className="text-green-700">{item.asset}</strong>
                      <p className="text-slate-600 mt-0.5">{item.why}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-700 mb-3">Less suited to DCA</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  {[
                    {
                      asset: "Term deposits",
                      why: "Fixed-rate products with a predetermined return. There is no market price to average — you simply lock in the current rate for the term. The benefit of DCA (buying more units when cheap) does not apply.",
                    },
                    {
                      asset: "Cash and savings accounts",
                      why: "No price fluctuation means no averaging benefit. Regular deposits into savings are excellent financial habits but they are not DCA in the investment sense.",
                    },
                    {
                      asset: "Property (direct)",
                      why: "Transaction costs (stamp duty, agent fees) and asset indivisibility make incremental purchasing impractical. REITs and property ETFs can be DCA'd instead.",
                    },
                  ].map((item) => (
                    <li key={item.asset}>
                      <strong className="text-slate-600">{item.asset}</strong>
                      <p className="text-slate-500 mt-0.5">{item.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 6: Tax ───────────────────────────────────────────────── */}
        <section className="py-14 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Tax Considerations for DCA in Australia</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Australian tax law treats each DCA purchase as a separate CGT event with its own cost base and acquisition date. This has meaningful consequences for record-keeping and eventual sale.
            </p>

            <div className="space-y-4">
              {[
                {
                  heading: "Each purchase is a separate CGT parcel",
                  body: "When you invest $500/month over 24 months, you create 24 separate tax parcels. When you later sell, the ATO requires you to match each sale to a parcel and calculate the gain or loss on that specific parcel. You can choose which parcels to sell first (e.g., selecting parcels held over 12 months to access the 50% CGT discount).",
                },
                {
                  heading: "The 12-month CGT discount applies parcel by parcel",
                  body: "Each parcel becomes eligible for the 50% CGT discount (for individuals and trusts) after it has been held for at least 12 months from the purchase date — not from when you started DCA-ing. This means a parcel bought in month 1 qualifies in month 13, but the parcel bought in month 12 does not qualify until month 24.",
                },
                {
                  heading: "Record-keeping is essential",
                  body: "Keep a record of every purchase: date, number of units, price per unit, total cost, and brokerage paid. Most brokers provide transaction histories, but you should maintain your own records as tax liability calculations span years. Tax software like Sharesight can automate parcel tracking for ASX investments.",
                },
                {
                  heading: "Brokerage is deductible against assessable income",
                  body: "Where the investment is held to produce assessable income (dividends, distributions), brokerage on purchases is added to the cost base of the parcel (reducing the eventual capital gain). Brokerage on sales reduces the proceeds. Neither is deductible in the year paid — both affect your eventual CGT calculation.",
                },
              ].map((item) => (
                <div key={item.heading} className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-bold text-slate-900 mb-2">{item.heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Tax rules are complex and depend on individual circumstances. The above is general information only — speak with a registered tax agent about your specific situation.
            </p>
          </div>
        </section>

        {/* ── Section 7: Common mistakes ───────────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 7</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Common DCA Mistakes</h2>

            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-red-800 mb-4">Mistakes that defeat the purpose</h3>
              <ul className="space-y-4 text-sm">
                {[
                  {
                    mistake: "Stopping when the market falls",
                    detail: "This is the single most damaging mistake. DCA's power is that it buys more units at lower prices. Pausing during a downturn means you miss the cheapest purchases of the cycle. Fear-driven pausing converts a temporary paper loss into a permanent strategy failure.",
                  },
                  {
                    mistake: "Brokerage erosion on small amounts",
                    detail: "If your brokerage is $10 and you invest $200, you pay 5% in fees before earning a cent. A $10 fee on a $1,000 purchase is 1%; on a $500 purchase it is 2%. Target sub-0.5% brokerage as a rule of thumb: use a flat-fee platform and ensure each purchase is at least $500-$1,000.",
                  },
                  {
                    mistake: "Varying amounts based on market mood",
                    detail: "Investing more when you feel confident and less when you feel anxious recreates timing risk. The discipline of DCA comes from a fixed amount on a fixed schedule. If you want to invest more, increase the regular amount and leave it there.",
                  },
                  {
                    mistake: "Switching assets mid-plan",
                    detail: "Changing from VAS to VGS to NDQ based on recent performance is return-chasing, not DCA. Choose your target allocation before you start and stick to it. Review the asset choice annually, not monthly.",
                  },
                  {
                    mistake: "Ignoring the portfolio review",
                    detail: "DCA does not mean set-and-forget forever. Review your target allocation quarterly. If one asset class has run hard and now represents 70% of a portfolio you intended to be 50/50, rebalance. But review the plan, not the daily price.",
                  },
                ].map((item) => (
                  <li key={item.mistake} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-red-800">{item.mistake}:</strong>{" "}
                      <span className="text-slate-600">{item.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Section 8: Step-by-step guide ───────────────────────────────── */}
        <section className="py-14 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 8</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Step-by-Step: Starting a DCA Plan in Australia</h2>

            <ol className="space-y-4">
              {[
                {
                  n: 1,
                  title: "Set your amount",
                  body: "Calculate what you can invest consistently each month without touching it for at least 5 years. If the amount would cause financial stress during a market downturn, it is too large. A smaller, sustainable amount is far more valuable than a larger amount you will abandon.",
                },
                {
                  n: 2,
                  title: "Choose your asset",
                  body: "Broad market ETFs (VAS for Australian shares, VGS for global shares) are the most common DCA targets for Australian retail investors. They are liquid, diversified, and available on all major platforms. If you want to include international or thematic exposure, decide the allocation before you start.",
                },
                {
                  n: 3,
                  title: "Set the frequency",
                  body: "Monthly aligns well with most salary cycles. Fortnightly can reduce the average purchase price slightly in volatile markets but doubles brokerage costs. Weekly is only cost-effective on platforms with genuinely low per-trade fees. Monthly is the right default for most people.",
                },
                {
                  n: 4,
                  title: "Automate the transfer",
                  body: "Set up a direct debit from your transaction account to your brokerage on the day after salary arrives. On platforms with auto-invest (Pearler, Stake), link this to an automatic trade so the money is invested immediately without a manual step.",
                },
                {
                  n: 5,
                  title: "Review quarterly, not daily",
                  body: "Check that the schedule ran, that your asset allocation still reflects your intention, and that your financial situation has not changed materially. Do not adjust the strategy based on recent market performance. If markets have fallen 20%, that is a sign the plan is working as intended, not a reason to stop.",
                },
              ].map((step) => (
                <li key={step.n} className="flex gap-5 bg-white border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center text-lg shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Section 9: FAQ ───────────────────────────────────────────────── */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details key={item.q} className="group bg-white border border-slate-200 rounded-xl">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                    {item.q}
                    <svg
                      className="w-4 h-4 text-slate-500 shrink-0 group-open:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compliance warning ───────────────────────────────────────────── */}
        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>

        {/* ── Related guides CTA ───────────────────────────────────────────── */}
        <section className="py-14 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Continue Learning</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Lump Sum Investing",
                  href: "/lump-sum-investing",
                  desc: "Received a windfall? Here is the right sequence for handling a lump sum in Australia — super, tax timing, and investment options.",
                },
                {
                  title: "Dividend Investing",
                  href: "/invest/dividend-investing",
                  desc: "High-yield ASX stocks, franking credits, DRIPs, and how dividend ETFs complement a DCA plan.",
                },
                {
                  title: "Compare ETF Brokers",
                  href: "/compare",
                  desc: "Find the lowest brokerage platform for recurring ETF purchases to keep DCA costs below 0.5% per trade.",
                },
                {
                  title: "Portfolio Calculator",
                  href: "/portfolio-calculator",
                  desc: "Project how a regular investment amount grows over time at different return assumptions.",
                },
              ].map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-sm transition-all"
                >
                  <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{guide.desc}</p>
                  <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-3">
                    Read guide &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
