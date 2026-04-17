"use client";

import { useState, useMemo } from "react";
import type { DTACountry } from "@/lib/foreign-investment-data";

interface Props {
  countries: DTACountry[];
  defaultRates: { dividendUnfranked: number; interest: number; royalties: number };
  dtaDisclaimer: string;
}

function countryFlag(code: string): string {
  // Convert ISO 3166-1 alpha-2 code to emoji flag
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

export default function DTASearchTable({ countries, defaultRates, dtaDisclaimer }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.country.toLowerCase().includes(q));
  }, [countries, query]);

  const noMatch = filtered.length === 0;

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your country (e.g. United States, Japan, UK…)"
          className="w-full sm:max-w-md px-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
          aria-label="Search countries in DTA table"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Country</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">DTA</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Dividends</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Interest</th>
              <th className="text-center px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Royalties</th>
            </tr>
          </thead>
          <tbody>
            {noMatch ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No matching country found. Australia has DTAs with 40+ countries — if yours isn&apos;t listed, standard rates apply (dividends 30%, royalties 30%).
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={c.countryCode}
                  className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                >
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none" aria-hidden="true">{countryFlag(c.countryCode)}</span>
                      <div>
                        <span className="font-medium text-slate-900">{c.country}</span>
                        {c.dtaEffectiveYear && (
                          <span className="text-slate-400 font-normal ml-1.5">({c.dtaEffectiveYear})</span>
                        )}
                        {c.notes && (
                          <p className="text-[0.65rem] text-slate-500 mt-0.5 leading-relaxed">{c.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.hasDTA ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-700 rounded-full text-xs font-bold">✓</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-red-50 text-red-400 rounded-full text-xs font-bold">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${c.dividendWHT <= 15 ? "text-green-700" : c.dividendWHT <= 20 ? "text-amber-700" : "text-red-700"}`}>
                      {c.dividendWHT}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${c.interestWHT <= 10 ? "text-green-700" : "text-amber-700"}`}>
                      {c.interestWHT}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${c.royaltiesWHT <= 10 ? "text-green-700" : c.royaltiesWHT <= 15 ? "text-amber-700" : "text-red-700"}`}>
                      {c.royaltiesWHT}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!noMatch && (
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-200">
                <td className="px-4 py-3 font-bold text-xs text-slate-600">No DTA (default rates)</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-red-50 text-red-400 rounded-full text-xs font-bold">✗</span>
                </td>
                <td className="px-4 py-3 text-center text-xs font-bold text-red-700">{defaultRates.dividendUnfranked}%</td>
                <td className="px-4 py-3 text-center text-xs font-bold text-amber-700">{defaultRates.interest}%</td>
                <td className="px-4 py-3 text-center text-xs font-bold text-red-700">{defaultRates.royalties}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400 leading-relaxed">{dtaDisclaimer}</p>
    </div>
  );
}
