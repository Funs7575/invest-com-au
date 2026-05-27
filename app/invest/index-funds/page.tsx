import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is the difference between an index fund and an ETF?",
    a: "An index fund and an ETF (Exchange Traded Fund) are both products that track an index, but they differ in how you buy them. An ETF trades on a stock exchange throughout the day like a share — you buy and sell at market price using a brokerage account. A traditional index managed fund (like a Vanguard index fund or Colonial First State index option) is bought directly from the fund manager at the daily NAV, often with no brokerage. In practice, most Australians access index investing through ASX-listed ETFs because they offer greater transparency, lower minimums, and easy access through existing broking accounts.",
  },
  {
    q: "What is the cheapest index fund in Australia?",
    a: "The cheapest way to get broad Australian equity market exposure is via Vanguard Australian Shares ETF (VAS) or BetaShares Australia 200 ETF (A200) at 0.04%–0.07% MER p.a. For global equities, Vanguard MSCI International Shares ETF (VGS) charges 0.18% MER, and iShares Core S&P 500 ETF (IVV) charges 0.04%. Traditional index managed funds (e.g., Vanguard Diversified Index funds, InfraVia, Betashares index funds) have slightly higher MERs (0.16%–0.29%) but require no brokerage and are accessible on platforms like Vanguard Personal Investor, SelfWealth, and Pearler.",
  },
  {
    q: "Does indexing really outperform active management?",
    a: "On average, yes — particularly over long time horizons and in efficient markets like large-cap Australian and US equities. SPIVA Australia scorecard data (S&P Dow Jones) consistently shows that 70%–85% of Australian active equity fund managers underperform their benchmark index net of fees over 10-year periods. The performance drag of fees (0.7%–1.5% for active vs 0.04%–0.3% for index) is the primary explanatory factor. Active management has a better track record in less efficient asset classes — small-cap, emerging markets, and credit — where information advantages are more persistent.",
  },
  {
    q: "How do index funds generate returns?",
    a: "Index funds generate returns in two ways: capital appreciation (the underlying companies grow in value over time), and income (dividends paid by the companies in the index are received by the fund and distributed to unit holders, net of fund expenses). You also benefit from dividend reinvestment if your ETF participates in DRP or if you reinvest distributions. The total return is the sum of price appreciation plus distributions. Most index returns cited historically include dividend reinvestment (total return basis), not just price appreciation.",
  },
  {
    q: "What happens to my index fund investment if the fund manager closes?",
    a: "If a fund manager closes or winds up an ETF, you would typically be given advance notice. You can sell your ETF units on the exchange before the wind-up date, or the fund will pay out the NAV of your holding in cash when it closes. Your shares in the underlying companies are held by a separate custodian (in the name of the ETF), not by the fund manager directly. The collapse of a fund manager like BlackRock, Vanguard, or BetaShares would be extraordinarily rare and subject to strict regulatory requirements, but the underlying assets would be managed by a replacement trustee or liquidated at fair value.",
  },
  {
    q: "Can I invest in index funds inside my super or SMSF?",
    a: "Yes. Most industry super funds offer passive index investment options that track the ASX 200 or MSCI World at very low internal fees (often 0.05%–0.15% p.a. before admin fees). Inside an SMSF, you can buy ASX-listed index ETFs (VAS, VGS, IVV, A200) directly through your SMSF brokerage account. The tax treatment inside the SMSF follows the standard SMSF rules: 15% tax on income and capital gains in accumulation phase, 0% in pension phase.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Index Funds Australia (${CURRENT_YEAR}) — Best ETFs, Costs & How to Start`,
  description:
    "Guide to index funds and ETFs in Australia. Difference between index funds and ETFs, cheapest ASX-listed options (VAS, A200, VGS, IVV), performance vs active management, and how to invest in minutes.",
  alternates: { canonical: `${SITE_URL}/invest/index-funds` },
  openGraph: {
    title: `Index Funds Australia (${CURRENT_YEAR})`,
    description: "Cheapest index ETFs in Australia, ETF vs managed fund differences, SPIVA performance data, and how to get started.",
    url: `${SITE_URL}/invest/index-funds`,
  },
};

export default function IndexFundsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Index Funds", url: absoluteUrl("/invest/index-funds") },
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
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Index Funds</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">Passive Investing</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Index Funds in Australia: How They Work &amp; Where to Start
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Index funds track a market benchmark — the ASX 200, S&P 500, or global equities — at a fraction of the cost of active management. In Australia, most index investing happens via ASX-listed ETFs from Vanguard, BetaShares, and iShares.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "0.04%", l: "Cheapest ETF MER (IVV, A200)", sub: "vs 0.7–1.5% for active funds" },
                { v: "80%+", l: "Active funds underperform", sub: "10-year SPIVA data, Australian equities" },
                { v: "$0", l: "Minimum investment (ETFs)", sub: "One unit at market price" },
                { v: "T+2", l: "Settlement", sub: "ASX-listed ETFs settle in 2 days" },
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

        {/* Popular index ETFs */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Popular ASX-listed index ETFs</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-700">ETF</th>
                    <th className="text-left p-4 font-bold text-slate-700">Manager</th>
                    <th className="text-left p-4 font-bold text-slate-700">Index</th>
                    <th className="text-right p-4 font-bold text-slate-700">MER p.a.</th>
                    <th className="text-left p-4 font-bold text-slate-700">Market</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { ticker: "VAS", manager: "Vanguard", index: "S&P/ASX 300", mer: "0.07%", market: "Australian equities (300 stocks)" },
                    { ticker: "A200", manager: "BetaShares", index: "Solactive Australia 200", mer: "0.04%", market: "Australian equities (200 stocks)" },
                    { ticker: "IOZ", manager: "iShares", index: "S&P/ASX 200", mer: "0.09%", market: "Australian equities (200 stocks)" },
                    { ticker: "VGS", manager: "Vanguard", index: "MSCI World ex-Australia", mer: "0.18%", market: "Developed markets (~1,500 stocks)" },
                    { ticker: "BGBL", manager: "BetaShares", index: "Solactive GBS Developed Markets", mer: "0.08%", market: "Developed markets global equities" },
                    { ticker: "IVV", manager: "iShares", index: "S&P 500", mer: "0.04%", market: "US large cap (500 stocks)" },
                    { ticker: "NDQ", manager: "BetaShares", index: "NASDAQ 100", mer: "0.22%", market: "US tech-heavy large cap (100 stocks)" },
                    { ticker: "VDHG", manager: "Vanguard", index: "Blended (diversified high growth)", mer: "0.27%", market: "Multi-asset: 90% equities, 10% bonds" },
                    { ticker: "DHHF", manager: "BetaShares", index: "Blended (diversified)", mer: "0.19%", market: "Multi-asset: 100% equities blend" },
                    { ticker: "VAF", manager: "Vanguard", index: "Bloomberg AusBond Composite", mer: "0.15%", market: "Australian fixed income (bonds)" },
                  ].map((row) => (
                    <tr key={row.ticker} className="hover:bg-slate-50">
                      <td className="p-4 font-extrabold text-blue-700">{row.ticker}</td>
                      <td className="p-4 text-slate-600">{row.manager}</td>
                      <td className="p-4 text-slate-600 text-xs">{row.index}</td>
                      <td className="p-4 text-right font-bold text-green-700">{row.mer}</td>
                      <td className="p-4 text-xs text-slate-500">{row.market}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">MER figures as at 2025-26. Verify current MER in the relevant PDS. Not a recommendation.</p>
          </div>
        </section>

        {/* ETF vs managed fund */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">ETF vs index managed fund: which is better?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "ASX-listed ETF",
                  pros: ["Buy and sell through any broker — no minimums beyond one unit", "Real-time pricing; buy at market price throughout trading hours", "Highly transparent — holdings published daily", "Works inside SMSF, margin loan accounts, or personal brokerage", "Brokerage cost: typically $0-$9.50 per trade"],
                  cons: ["Brokerage cost per trade makes small regular contributions expensive", "Bid-ask spread applies (usually tiny for liquid ETFs)", "Distributions require manual reinvestment unless DRP active"],
                  color: "border-blue-200 bg-blue-50",
                },
                {
                  title: "Index managed fund (unlisted)",
                  pros: ["No brokerage — ideal for regular small contributions (dollar-cost averaging)", "Automatic distribution reinvestment at no cost", "Simplified record keeping — fewer CGT events than ETF trading", "Direct account with fund manager (Vanguard Personal Investor, IndieMF)"],
                  cons: ["Priced once daily at NAV — no intraday trading", "Minimum investment: varies by fund ($500–$5,000 typically)", "Only available on select platforms; not always in standard brokerage", "Less transparent holdings disclosure"],
                  color: "border-green-200 bg-green-50",
                },
              ].map((col) => (
                <div key={col.title} className={`rounded-xl border p-5 ${col.color}`}>
                  <h3 className="font-extrabold text-slate-900 mb-3">{col.title}</h3>
                  <div className="space-y-1 mb-3">
                    {col.pros.map((pro) => (
                      <div key={pro} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-green-600 flex-shrink-0">✓</span>
                        {pro}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {col.cons.map((con) => (
                      <div key={con} className="flex gap-2 text-sm text-slate-500">
                        <span className="text-slate-400 flex-shrink-0">–</span>
                        {con}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to start */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to buy an index ETF in Australia</h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Open a brokerage account",
                  body: "To buy ASX-listed ETFs, you need a brokerage account. Low-cost options include CommSec Pocket, Pearler, SelfWealth, Stake, and moomoo. For regular automated investing with no brokerage, consider Pearler's auto-invest feature or a Vanguard Personal Investor account for Vanguard managed funds.",
                },
                {
                  step: "2",
                  title: "Choose your index and ETF",
                  body: "The most popular starting choices are VAS or A200 (Australian equities), VGS or BGBL (global developed markets), or a diversified multi-asset ETF like VDHG or DHHF for a one-ETF portfolio. Use the MER table above as a guide — the cheapest option is not always the best fit (consider the underlying index breadth, distribution frequency, and fund size).",
                },
                {
                  step: "3",
                  title: "Place a market or limit order",
                  body: "Search your ETF ticker (e.g., VAS) in your brokerage app. A market order buys at the current price; a limit order lets you set a maximum price. For liquid ETFs like VAS or IVV, the bid-ask spread is tiny (0.01%–0.03%), so market orders are typically fine. Review the confirmation showing total cost including brokerage.",
                },
                {
                  step: "4",
                  title: "Keep records for tax",
                  body: "Record the date, number of units, price, and brokerage for every purchase — you'll need this when you eventually sell to calculate your cost base for CGT. Most brokerage accounts keep records, but download annual statements and keep your own spreadsheet. The ETF will provide an annual tax statement (AMMA) for use in your tax return.",
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
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/etfs" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">ETF hub →</Link>
              <Link href="/compare/etfs" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Compare ETFs →</Link>
              <Link href="/tax/investment-income" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Investment income tax →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
