"use client";

/**
 * Interactive table for the Super Fund Performance Explorer. The full
 * dataset arrives as props (a few hundred rows at most — APRA's fund
 * universe), so search, type filter, and column sorting are all local:
 * no API, no spinner, instant.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { SuperFund } from "@/lib/super-funds";

type SortKey = "name" | "totalAssetsBn" | "memberAccounts" | "ror10yr" | "ror5yr" | "expenseRatioPct";

const COLUMNS: { key: SortKey; label: string; numeric: boolean; title?: string }[] = [
  { key: "name", label: "Fund", numeric: false },
  { key: "ror10yr", label: "10yr return", numeric: true, title: "Net rate of return, 10 years, % p.a." },
  { key: "ror5yr", label: "5yr return", numeric: true, title: "Net rate of return, 5 years, % p.a." },
  { key: "expenseRatioPct", label: "Expenses", numeric: true, title: "Operating expense ratio, %" },
  { key: "totalAssetsBn", label: "Assets", numeric: true, title: "Total assets, $ billions" },
  { key: "memberAccounts", label: "Members", numeric: true, title: "Number of member accounts" },
];

function fmt(value: number | undefined, kind: "pct" | "bn" | "count"): string {
  if (value === undefined) return "—";
  if (kind === "pct") return `${value.toFixed(1)}%`;
  if (kind === "bn") return `$${value.toLocaleString("en-AU", { maximumFractionDigits: 1 })}bn`;
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}m`
    : value >= 1_000
      ? `${Math.round(value / 1_000)}k`
      : String(value);
}

export default function SuperFundsExplorer({ funds, types }: { funds: SuperFund[]; types: string[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("ror10yr");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = funds;
    if (typeFilter) list = list.filter((f) => f.fundType === typeFilter);
    if (q.length >= 2) {
      list = list.filter(
        (f) => f.name.toLowerCase().includes(q) || (f.trustee ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      const av = a[sortKey];
      const bv = b[sortKey];
      // Funds without the figure always sink to the bottom, whatever the order.
      if (av === undefined && bv === undefined) return a.name.localeCompare(b.name);
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return av - bv;
    });
    if (sortKey !== "name" && sortDesc) {
      const present = sorted.filter((f) => f[sortKey] !== undefined).reverse();
      const missing = sorted.filter((f) => f[sortKey] === undefined);
      return [...present, ...missing];
    }
    return sorted;
  }, [funds, query, typeFilter, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      // Expenses read best ascending (cheapest first); returns/size descending.
      setSortDesc(key !== "expenseRatioPct" && key !== "name");
    }
  };

  return (
    <div>
      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fund or trustee name"
            aria-label="Search super funds"
            className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by fund type">
          <button
            onClick={() => setTypeFilter(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${typeFilter === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              aria-pressed={typeFilter === t}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${typeFilter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-2" aria-live="polite">
        {rows.length} fund{rows.length === 1 ? "" : "s"}
        {typeFilter ? ` · ${typeFilter}` : ""} · click a column to sort
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" className={c.numeric ? "text-right" : "text-left"}>
                  <button
                    onClick={() => toggleSort(c.key)}
                    title={c.title}
                    className={`w-full px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-slate-900 transition-colors ${c.numeric ? "text-right" : "text-left"}`}
                  >
                    {c.label}
                    {sortKey === c.key && (
                      <span aria-hidden className="ml-1">{sortDesc ? "↓" : "↑"}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.abn} className="border-b border-slate-100 last:border-0 hover:bg-amber-50/50 transition-colors">
                <td className="px-3 py-2.5">
                  <Link href={`/super/funds/${f.slug}`} className="font-semibold text-slate-900 hover:text-amber-700 transition-colors">
                    {f.name}
                  </Link>
                  <span className="block text-[0.7rem] text-slate-500">{f.fundType}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-800">{fmt(f.ror10yr, "pct")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmt(f.ror5yr, "pct")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmt(f.expenseRatioPct, "pct")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmt(f.totalAssetsBn, "bn")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmt(f.memberAccounts, "count")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  No funds match {query.trim() ? `"${query.trim()}"` : "this filter"}. Try a different
                  spelling, or check the fund on the ATO&apos;s YourSuper tool.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
