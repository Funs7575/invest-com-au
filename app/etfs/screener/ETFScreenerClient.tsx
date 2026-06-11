"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ETF_DATA, type ETF, type ETFAssetClass, type ETFProvider } from "@/lib/etf-data";
import SearchInput from "@/components/directory/SearchInput";
import RangeSlider from "@/components/directory/RangeSlider";
import ResultCount from "@/components/directory/ResultCount";
import EmptyState from "@/components/directory/EmptyState";

type SortKey = "ticker" | "mer" | "aumMillions" | "distributionYield";
type SortDir = "asc" | "desc";

const ASSET_CLASS_OPTIONS: { value: ETFAssetClass | "all"; label: string }[] = [
  { value: "all", label: "All Asset Classes" },
  { value: "australian-shares", label: "Australian Shares" },
  { value: "us-shares", label: "US Shares" },
  { value: "global-shares", label: "Global Shares" },
  { value: "international-shares", label: "International Shares" },
  { value: "dividends", label: "High Dividend" },
  { value: "bonds", label: "Bonds & Fixed Income" },
  { value: "esg", label: "ESG / Sustainable" },
  { value: "sector", label: "Sector / Thematic" },
  { value: "emerging-markets", label: "Emerging Markets" },
];

const PROVIDER_OPTIONS: { value: ETFProvider | "all"; label: string }[] = [
  { value: "all", label: "All Providers" },
  { value: "Vanguard", label: "Vanguard" },
  { value: "BlackRock iShares", label: "BlackRock iShares" },
  { value: "BetaShares", label: "BetaShares" },
  { value: "SPDR", label: "SPDR" },
  { value: "VanEck", label: "VanEck" },
];

function formatAUM(millions: number): string {
  return millions >= 1000
    ? `$${(millions / 1000).toFixed(1)}B`
    : `$${millions}M`;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="text-slate-500 ml-1">↕</span>;
  return <span className="text-amber-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

function assetClassBadge(cls: ETFAssetClass): string {
  const colors: Record<ETFAssetClass, string> = {
    "australian-shares": "bg-amber-100 text-amber-800",
    "us-shares": "bg-blue-100 text-blue-800",
    "global-shares": "bg-purple-100 text-purple-800",
    "international-shares": "bg-indigo-100 text-indigo-800",
    "dividends": "bg-green-100 text-green-800",
    "bonds": "bg-slate-100 text-slate-700",
    "esg": "bg-emerald-100 text-emerald-800",
    "sector": "bg-rose-100 text-rose-800",
    "emerging-markets": "bg-orange-100 text-orange-800",
    "property": "bg-teal-100 text-teal-800",
  };
  return colors[cls] ?? "bg-slate-100 text-slate-600";
}

function assetClassLabel(cls: ETFAssetClass): string {
  const labels: Record<ETFAssetClass, string> = {
    "australian-shares": "AU Shares",
    "us-shares": "US Shares",
    "global-shares": "Global",
    "international-shares": "Intl Shares",
    "dividends": "Dividends",
    "bonds": "Bonds",
    "esg": "ESG",
    "sector": "Sector",
    "emerging-markets": "Emerging",
    "property": "Property",
  };
  return labels[cls] ?? cls;
}

export default function ETFScreenerClient() {
  const [assetClass, setAssetClass] = useState<ETFAssetClass | "all">("all");
  const [provider, setProvider] = useState<ETFProvider | "all">("all");
  const [maxMER, setMaxMER] = useState<number>(2.0);
  const [frankingOnly, setFrankingOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("aumMillions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const results = ETF_DATA.filter((etf) => {
      if (assetClass !== "all" && etf.assetClass !== assetClass) return false;
      if (provider !== "all" && etf.provider !== provider) return false;
      if (etf.mer > maxMER) return false;
      if (frankingOnly && etf.frankingPercent === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!etf.ticker.toLowerCase().includes(q) && !etf.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    results.sort((a: ETF, b: ETF) => {
      const av = a[sortKey as keyof ETF] as number | string;
      const bv = b[sortKey as keyof ETF] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return results;
  }, [assetClass, provider, maxMER, frankingOnly, sortKey, sortDir, search]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d: SortDir) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "ticker" ? "asc" : "desc");
    }
  }

  return (
    <div>
      {/* Filters */}
      <section className="py-6 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="etf-screener-search" className="block text-xs font-semibold text-slate-700 mb-1.5">Search</label>
              <SearchInput
                id="etf-screener-search"
                value={search}
                onChange={setSearch}
                placeholder="VAS, NDQ, iShares..."
                ariaLabel="Search ETFs by ticker or name"
              />
            </div>
            <div>
              <label htmlFor="etf-asset-class" className="block text-xs font-semibold text-slate-700 mb-1.5">Asset Class</label>
              <select
                id="etf-asset-class"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as ETFAssetClass | "all")}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {ASSET_CLASS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="etf-provider" className="block text-xs font-semibold text-slate-700 mb-1.5">Provider</label>
              <select
                id="etf-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as ETFProvider | "all")}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {PROVIDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <RangeSlider
                label="Max MER"
                min={0.03}
                max={2.0}
                step={0.01}
                value={maxMER}
                onChange={setMaxMER}
                formatValue={(v) => `${v.toFixed(2)}%`}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={frankingOnly}
                onChange={(e) => setFrankingOnly(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              Franking credits only
            </label>
            <ResultCount total={filtered.length} noun={`of ${ETF_DATA.length} ETFs shown`} className="!text-xs" />
          </div>
        </div>
      </section>

      {/* Results table */}
      <section className="py-6">
        <div className="container-custom overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState
              title="No ETFs match your filters"
              body="Try widening the MER range or clearing a filter."
              suggestions={[{ label: "Reset filters", onClick: () => { setAssetClass("all"); setProvider("all"); setMaxMER(2.0); setFrankingOnly(false); setSearch(""); } }]}
            />
          ) : (
            <table className="w-full text-sm border-collapse min-w-[700px]" aria-label="ETF screener results">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th
                    scope="col"
                    className="text-left py-3 px-4 text-xs font-bold cursor-pointer select-none"
                    onClick={() => toggleSort("ticker")}
                    aria-sort={sortKey === "ticker" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Ticker <SortIcon col="ticker" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Name</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold hidden sm:table-cell">Category</th>
                  <th
                    scope="col"
                    className="text-right py-3 px-4 text-xs font-bold cursor-pointer select-none"
                    onClick={() => toggleSort("mer")}
                    aria-sort={sortKey === "mer" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    MER <SortIcon col="mer" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    scope="col"
                    className="text-right py-3 px-4 text-xs font-bold cursor-pointer select-none"
                    onClick={() => toggleSort("aumMillions")}
                    aria-sort={sortKey === "aumMillions" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    AUM <SortIcon col="aumMillions" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    scope="col"
                    className="text-right py-3 px-4 text-xs font-bold cursor-pointer select-none"
                    onClick={() => toggleSort("distributionYield")}
                    aria-sort={sortKey === "distributionYield" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Yield <SortIcon col="distributionYield" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Franking</th>
                  <th scope="col" className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((etf: ETF) => (
                  <tr key={etf.ticker} className="bg-white hover:bg-amber-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-900 text-base">{etf.ticker}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-medium text-slate-700 leading-snug max-w-xs">{etf.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{etf.provider}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${assetClassBadge(etf.assetClass)}`}>
                        {assetClassLabel(etf.assetClass)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold text-sm ${etf.mer <= 0.1 ? "text-green-700" : etf.mer <= 0.3 ? "text-slate-800" : "text-orange-600"}`}>
                        {etf.mer}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-slate-700">
                      {formatAUM(etf.aumMillions)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-slate-700">
                      {etf.distributionYield}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {etf.frankingPercent > 0 ? (
                        <span className="text-xs font-bold text-amber-700">{etf.frankingPercent}%</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/etfs/${etf.ticker.toLowerCase()}`}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-800 whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
