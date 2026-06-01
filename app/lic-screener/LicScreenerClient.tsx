"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LIC_DATA, ntaPremiumDiscount, type LIC, type LICFocus } from "@/lib/lic-data";
import ResultCount from "@/components/directory/ResultCount";

type SortKey = "ticker" | "dividendYield" | "frankingPct" | "managementCostPct" | "aumMillions" | "ntaDiscount";
type SortDir = "asc" | "desc";

const FOCUS_OPTIONS: { value: LICFocus | "all"; label: string }[] = [
  { value: "all", label: "All Focuses" },
  { value: "australian-shares", label: "Australian Shares" },
  { value: "small-mid-cap", label: "Small & Mid Cap" },
  { value: "global-shares", label: "Global Shares" },
  { value: "income-dividends", label: "Income / Dividends" },
  { value: "value", label: "Value Style" },
  { value: "growth", label: "Growth Style" },
];

const FRANKING_OPTIONS = [
  { value: "all", label: "Any Franking" },
  { value: "fully", label: "Fully Franked (100%)" },
  { value: "partial", label: "Partially Franked" },
  { value: "unfranked", label: "Unfranked (0%)" },
];

function focusBadge(focus: LICFocus): string {
  const colors: Record<LICFocus, string> = {
    "australian-shares": "bg-amber-100 text-amber-800",
    "small-mid-cap": "bg-purple-100 text-purple-800",
    "global-shares": "bg-blue-100 text-blue-800",
    "income-dividends": "bg-green-100 text-green-800",
    "value": "bg-orange-100 text-orange-800",
    "growth": "bg-rose-100 text-rose-800",
    "alternative": "bg-slate-100 text-slate-700",
  };
  return colors[focus] ?? "bg-slate-100 text-slate-600";
}

function focusLabel(focus: LICFocus): string {
  const labels: Record<LICFocus, string> = {
    "australian-shares": "Australian Shares",
    "small-mid-cap": "Small & Mid Cap",
    "global-shares": "Global Shares",
    "income-dividends": "Income",
    "value": "Value",
    "growth": "Growth",
    "alternative": "Alternative",
  };
  return labels[focus] ?? focus;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="text-slate-300 ml-1 text-xs">↕</span>;
  return <span className="text-amber-600 ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

function fmtPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function LicScreenerClient() {
  const [focus, setFocus] = useState<LICFocus | "all">("all");
  const [franking, setFranking] = useState<"all" | "fully" | "partial" | "unfranked">("all");
  const [maxMer, setMaxMer] = useState<number | "">("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("aumMillions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let data = LIC_DATA;
    if (focus !== "all") data = data.filter((l) => l.focus === focus);
    if (franking === "fully") data = data.filter((l) => l.frankingPct === 100);
    if (franking === "partial") data = data.filter((l) => l.frankingPct > 0 && l.frankingPct < 100);
    if (franking === "unfranked") data = data.filter((l) => l.frankingPct === 0);
    if (maxMer !== "" && typeof maxMer === "number") data = data.filter((l) => l.managementCostPct <= maxMer);
    if (showDiscount) data = data.filter((l) => ntaPremiumDiscount(l) < 0);
    return data;
  }, [focus, franking, maxMer, showDiscount]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "ntaDiscount") {
        av = ntaPremiumDiscount(a);
        bv = ntaPremiumDiscount(b);
      } else {
        av = a[sortKey] as number;
        bv = b[sortKey] as number;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const selectedLic: LIC | undefined = selected ? LIC_DATA.find((l) => l.ticker === selected) : undefined;
  const selectedDiscount = selectedLic ? ntaPremiumDiscount(selectedLic) : 0;

  return (
    <div className="py-5 md:py-10">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/etfs" className="hover:text-slate-900">ETFs</Link>
          <span>/</span>
          <span className="text-slate-700">LIC Screener</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 md:p-8 text-white mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full mb-3 text-xs font-bold uppercase tracking-wide">
            15 ASX LICs
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">LIC Screener</h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            Compare Listed Investment Companies (LICs) by yield, franking, NTA discount, and management cost. Filter by investment focus to find LICs that match your income or growth objectives.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold">{LIC_DATA.length}</p>
              <p className="text-[0.65rem] text-slate-400">LICs covered</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold">{LIC_DATA.filter((l) => l.frankingPct === 100).length}</p>
              <p className="text-[0.65rem] text-slate-400">Fully franked</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold">{LIC_DATA.filter((l) => ntaPremiumDiscount(l) < 0).length}</p>
              <p className="text-[0.65rem] text-slate-400">At a discount</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Investment Focus</label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value as LICFocus | "all")}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Franking</label>
              <select
                value={franking}
                onChange={(e) => setFranking(e.target.value as typeof franking)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {FRANKING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Mgmt Cost (%)</label>
              <input
                type="number"
                min="0.1"
                max="2"
                step="0.1"
                value={maxMer}
                onChange={(e) => setMaxMer(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="e.g. 0.5"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  role="switch"
                  aria-checked={showDiscount}
                  onClick={() => setShowDiscount((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${showDiscount ? "bg-slate-700" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showDiscount ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs font-semibold text-slate-600">Discounts only</span>
              </label>
            </div>
          </div>
<ResultCount total={sorted.length} noun={`of ${LIC_DATA.length} LICs`} className="mt-3 !text-xs" />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-36">LIC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Focus</th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("dividendYield")}
                  >
                    Yield <SortIcon col="dividendYield" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("frankingPct")}
                  >
                    Franking <SortIcon col="frankingPct" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("ntaDiscount")}
                  >
                    NTA ±% <SortIcon col="ntaDiscount" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("managementCostPct")}
                  >
                    Mgmt % <SortIcon col="managementCostPct" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort("aumMillions")}
                  >
                    AUM <SortIcon col="aumMillions" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((lic) => {
                  const discount = ntaPremiumDiscount(lic);
                  const isSelected = selected === lic.ticker;
                  return (
                    <tr
                      key={lic.ticker}
                      onClick={() => setSelected(isSelected ? null : lic.ticker)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? "bg-slate-50" : "hover:bg-slate-50/60"}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{lic.ticker}</p>
                        <p className="text-[0.65rem] text-slate-400 truncate max-w-[120px]">{lic.name.split(" ").slice(0, 3).join(" ")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[0.6rem] font-semibold px-1.5 py-0.5 rounded ${focusBadge(lic.focus)}`}>
                          {focusLabel(lic.focus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{lic.dividendYield}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={lic.frankingPct === 100 ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                          {lic.frankingPct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={discount < -5 ? "text-emerald-700" : discount < 0 ? "text-emerald-600" : discount > 5 ? "text-red-600" : "text-slate-600"}>
                          {discount >= 0 ? "+" : ""}{discount.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{lic.managementCostPct.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {lic.aumMillions >= 1000
                          ? `$${(lic.aumMillions / 1000).toFixed(1)}B`
                          : `$${lic.aumMillions}M`}
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No LICs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selectedLic && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedLic.ticker} — {selectedLic.name}</h2>
                <p className="text-xs text-slate-500">{selectedLic.manager} · Since {selectedLic.inceptionYear}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{selectedLic.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-emerald-600">{selectedLic.dividendYield}%</p>
                <p className="text-[0.65rem] text-slate-400">Dividend Yield</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-slate-900">{selectedLic.frankingPct}%</p>
                <p className="text-[0.65rem] text-slate-400">Franking</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className={`text-lg font-extrabold ${selectedDiscount < 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {selectedDiscount >= 0 ? "+" : ""}{selectedDiscount.toFixed(1)}%
                </p>
                <p className="text-[0.65rem] text-slate-400">NTA Premium/Discount</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-slate-900">{selectedLic.managementCostPct.toFixed(2)}%</p>
                <p className="text-[0.65rem] text-slate-400">Mgmt Cost</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">NTA vs Share Price</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">{fmtPrice(selectedLic.sharePriceCents)}</p>
                  <p className="text-[0.6rem] text-slate-400">Share Price</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">{fmtPrice(selectedLic.ntaPostTaxCents)}</p>
                  <p className="text-[0.6rem] text-slate-400">Post-tax NTA</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-slate-900">{fmtPrice(selectedLic.ntaPreTaxCents)}</p>
                  <p className="text-[0.6rem] text-slate-400">Pre-tax NTA</p>
                </div>
              </div>
            </div>
            <ul className="space-y-1 mb-4">
              {selectedLic.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-amber-500 mt-0.5 shrink-0">✓</span>
                  {h}
                </li>
              ))}
            </ul>
            <p className="text-[0.6rem] text-slate-400">
              Data as at {selectedLic.dataAsOf}. Source: {selectedLic.dataSource}. NTA and price data are indicative only — verify current figures via the LIC&apos;s monthly NTA announcement on ASX.
            </p>
          </div>
        )}

        {/* Adviser CTA */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900 mb-1">Not sure which LICs suit your portfolio?</p>
            <p className="text-xs text-slate-500">
              A financial adviser can help you evaluate LICs within the context of your full portfolio, tax position, and income objectives — including how they sit alongside ETFs and direct shares.
            </p>
          </div>
          <Link
            href="/advisors/financial-planners"
            className="shrink-0 px-5 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
          >
            Find an Adviser
          </Link>
        </div>

        <p className="text-[0.65rem] text-slate-400 leading-relaxed">
          Data as at May 2026. NTA figures are based on most recent monthly announcements and are indicative only. Share prices are approximate. Management costs may not include performance fees or transaction costs. This is general information only — not financial advice. Past performance is not indicative of future returns. Seek independent financial advice before investing.
        </p>
      </div>
    </div>
  );
}
