"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";

/* ─── Types ─── */

type Category = "All" | "Australian Shares" | "International" | "Bonds" | "Property" | "Thematic" | "Diversified";
type SortKey = "mer" | "name" | "ticker";

interface ETF {
  ticker: string;
  name: string;
  provider: string;
  mer: number;
  category: Exclude<Category, "All">;
  description: string;
}

/* ─── Hardcoded ETF Data ─── */

const ETF_DATA: ETF[] = [
  { ticker: "VAS", name: "Vanguard Australian Shares Index", provider: "Vanguard", mer: 0.07, category: "Australian Shares", description: "Tracks the S&P/ASX 300 Index, providing broad exposure to Australian large-, mid- and small-cap shares." },
  { ticker: "VGS", name: "Vanguard MSCI Index International Shares", provider: "Vanguard", mer: 0.18, category: "International", description: "Tracks the MSCI World ex-Australia Index, giving exposure to over 1,500 companies in developed markets." },
  { ticker: "IVV", name: "iShares S&P 500", provider: "iShares", mer: 0.04, category: "International", description: "Tracks the S&P 500 Index, providing exposure to the 500 largest US-listed companies." },
  { ticker: "A200", name: "BetaShares Australia 200", provider: "BetaShares", mer: 0.04, category: "Australian Shares", description: "Tracks the Solactive Australia 200 Index, covering the 200 largest ASX-listed companies at a low cost." },
  { ticker: "NDQ", name: "BetaShares NASDAQ 100", provider: "BetaShares", mer: 0.48, category: "International", description: "Tracks the NASDAQ-100 Index, offering concentrated exposure to US technology and growth companies." },
  { ticker: "VDHG", name: "Vanguard Diversified High Growth Index", provider: "Vanguard", mer: 0.27, category: "Diversified", description: "A diversified fund of funds with a 90/10 growth/defensive split across Australian and international shares, bonds and property." },
  { ticker: "VAP", name: "Vanguard Australian Property Securities Index", provider: "Vanguard", mer: 0.23, category: "Property", description: "Tracks the S&P/ASX 300 A-REIT Index, providing exposure to Australian listed property trusts." },
  { ticker: "VGB", name: "Vanguard Australian Fixed Interest Index", provider: "Vanguard", mer: 0.20, category: "Bonds", description: "Tracks the Bloomberg AusBond Composite Index, offering exposure to Australian government and corporate bonds." },
  { ticker: "IOZ", name: "iShares Core S&P/ASX 200", provider: "iShares", mer: 0.05, category: "Australian Shares", description: "Tracks the S&P/ASX 200 Index, providing low-cost exposure to the top 200 ASX-listed companies." },
  { ticker: "DHHF", name: "BetaShares Diversified All Growth", provider: "BetaShares", mer: 0.19, category: "Diversified", description: "A single-fund diversified portfolio with 100% allocation to growth assets across Australian and global shares." },
  { ticker: "HACK", name: "BetaShares Global Cybersecurity", provider: "BetaShares", mer: 0.67, category: "Thematic", description: "Tracks the Nasdaq CTA Cybersecurity Index, investing in global companies focused on cybersecurity." },
  { ticker: "ETHI", name: "BetaShares Global Sustainability Leaders", provider: "BetaShares", mer: 0.59, category: "Thematic", description: "Invests in global companies that are leaders in sustainability, screened against ethical criteria." },
  { ticker: "MVW", name: "VanEck Australian Equal Weight", provider: "VanEck", mer: 0.35, category: "Australian Shares", description: "Equally weights ASX-listed companies, reducing concentration risk compared to market-cap-weighted funds." },
  { ticker: "QUAL", name: "VanEck MSCI International Quality", provider: "VanEck", mer: 0.40, category: "International", description: "Tracks the MSCI World ex-Australia Quality Index, selecting companies with high ROE, stable earnings and low leverage." },
  { ticker: "STW", name: "SPDR S&P/ASX 200", provider: "SPDR", mer: 0.05, category: "Australian Shares", description: "One of Australia's oldest ETFs, tracking the S&P/ASX 200 Index with broad large-cap exposure." },
];

const CATEGORIES: Category[] = ["All", "Australian Shares", "International", "Bonds", "Property", "Thematic", "Diversified"];

/* ─── Component ─── */

export default function ETFCompareClient() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [sortKey, setSortKey] = useState<SortKey>("mer");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let list = activeCategory === "All" ? ETF_DATA : ETF_DATA.filter((e) => e.category === activeCategory);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "mer") cmp = a.mer - b.mer;
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "ticker") cmp = a.ticker.localeCompare(b.ticker);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [activeCategory, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === "mer"); // MER defaults asc, others asc too
    }
  }

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return (
      <Icon name={sortAsc ? "arrow-up" : "arrow-down"} size={14} className="inline ml-0.5 text-indigo-600" />
    );
  };

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <div className="container-custom py-10 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2 md:mb-3">
              Compare Australian ETFs
            </h1>
            <p className="text-indigo-100 text-sm md:text-base leading-relaxed max-w-2xl mb-3">
              Side-by-side comparison of management fees, categories and providers for
              Australia&apos;s most popular exchange-traded funds. Filter by category and sort
              to find the right ETF for your portfolio.
            </p>
            <SocialProofCounter variant="badge" />
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <div className="container-custom py-6 md:py-10">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-5 md:mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ─── Desktop Table ─── */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 cursor-pointer select-none hover:text-slate-900" onClick={() => handleSort("ticker")}>
                  Ticker <SortIndicator column="ticker" />
                </th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-slate-900" onClick={() => handleSort("name")}>
                  Fund Name <SortIndicator column="name" />
                </th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-slate-900 text-right" onClick={() => handleSort("mer")}>
                  MER % <SortIndicator column="mer" />
                </th>
                <th className="px-4 py-3">Category</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((etf) => (
                <tr key={etf.ticker} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${etf.ticker} ASX ETF`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {etf.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    <div>{etf.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 max-w-md">{etf.description}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{etf.provider}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    <span className={etf.mer <= 0.10 ? "text-emerald-600" : etf.mer >= 0.50 ? "text-amber-600" : "text-slate-900"}>
                      {etf.mer.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {etf.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Mobile Cards ─── */}
        <div className="md:hidden space-y-3 mb-6">
          {/* Mobile sort controls */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            {(
              [
                { key: "mer" as SortKey, label: "MER" },
                { key: "name" as SortKey, label: "Name" },
                { key: "ticker" as SortKey, label: "Ticker" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  sortKey === key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {label} {sortKey === key && (sortAsc ? "\u2191" : "\u2193")}
              </button>
            ))}
          </div>

          {filtered.map((etf) => (
            <div key={etf.ticker} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Link
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${etf.ticker} ASX ETF`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-indigo-600 hover:underline text-sm"
                  >
                    {etf.ticker}
                  </Link>
                  <p className="text-xs text-slate-900 font-medium">{etf.name}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-0.5">{etf.provider}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${etf.mer <= 0.10 ? "text-emerald-600" : etf.mer >= 0.50 ? "text-amber-600" : "text-slate-900"}`}>
                  {etf.mer.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-slate-100 text-slate-500">
                  {etf.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{etf.description}</p>
            </div>
          ))}
        </div>

        {/* ─── Advisor Match CTA ─── */}
        <section className="mb-8 md:mb-10">
          <div className="bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-200/60 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <Icon name="briefcase" size={20} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1">
                  Need help building an ETF portfolio?
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">
                  A financial planner can design a diversified ETF portfolio matched to your
                  risk profile, goals, and tax situation.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/find-advisor?need=planning"
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Find a Financial Planner &rarr;
                  </Link>
                  <Link
                    href="/find-advisor"
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Browse All Advisors &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SEO Content ─── */}
        <section className="max-w-3xl mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
            Investing in ETFs in Australia
          </h2>
          <div className="prose prose-sm prose-slate max-w-none text-slate-600 space-y-3">
            <p>
              Exchange-traded funds (ETFs) have become the most popular way for Australians to build
              diversified portfolios at low cost. Listed on the ASX, ETFs trade like ordinary shares
              but give you instant exposure to hundreds or thousands of underlying assets &mdash;
              from Australian blue-chips to global tech companies, bonds, and property.
            </p>
            <h3 className="text-base font-bold text-slate-900 mt-4 mb-1">What is the MER?</h3>
            <p>
              The Management Expense Ratio (MER) is the annual fee charged by the fund manager,
              expressed as a percentage of your investment. A 0.07% MER means you pay $0.70 per year
              for every $1,000 invested. Lower MERs compound into significantly larger balances over
              decades, making fee comparison one of the most important steps when choosing an ETF.
            </p>
            <h3 className="text-base font-bold text-slate-900 mt-4 mb-1">How to choose an ETF</h3>
            <p>
              Start by deciding on your asset allocation &mdash; how much you want in Australian
              shares, international shares, bonds, and other asset classes. Then compare ETFs within
              each category by MER, tracking error, fund size, and provider reputation. Popular
              choices like VAS and A200 both track Australian large-caps but differ slightly in index,
              fee, and number of holdings.
            </p>
            <h3 className="text-base font-bold text-slate-900 mt-4 mb-1">Diversified ETFs vs building your own</h3>
            <p>
              If you prefer simplicity, diversified ETFs like VDHG and DHHF bundle multiple asset
              classes into a single fund with automatic rebalancing. For hands-on investors, building
              a portfolio from individual ETFs (e.g. VAS + VGS + VGB) gives you more control over
              your allocation and can reduce overall fees.
            </p>
            <h3 className="text-base font-bold text-slate-900 mt-4 mb-1">Tax considerations</h3>
            <p>
              ETF distributions are generally taxed as income. Franking credits from Australian share
              ETFs can reduce your tax bill, while international ETFs may include foreign income tax
              offsets. Consider speaking with a financial planner or tax agent to optimise your ETF
              portfolio for your personal tax situation.
            </p>
          </div>
        </section>

        {/* ─── Disclaimer ─── */}
        <div className="border-t border-slate-200 pt-4 pb-6">
          <p className="text-[0.65rem] text-slate-400 leading-relaxed max-w-3xl">
            <strong>Disclaimer:</strong> ETF data shown is indicative and sourced from public product
            disclosure statements. MERs may change. This page is for informational purposes only and
            does not constitute financial advice. Past performance is not indicative of future returns.
            Always read the PDS before investing.
          </p>
        </div>
      </div>
    </>
  );
}
