"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface SuburbData {
  id: number;
  suburb: string;
  state: string;
  postcode: string | null;
  median_price_house: number | null;
  median_price_unit: number | null;
  rental_yield_house: number | null;
  rental_yield_unit: number | null;
  vacancy_rate: number | null;
  capital_growth_1yr: number | null;
  capital_growth_3yr: number | null;
  capital_growth_5yr: number | null;
  capital_growth_10yr: number | null;
  population: number | null;
  population_growth: number | null;
  median_age: number | null;
  median_income: number | null;
  distance_to_cbd_km: number | null;
}

type SortKey = "suburb" | "median_price_house" | "rental_yield_house" | "vacancy_rate" | "capital_growth_10yr" | "distance_to_cbd_km";

function formatPrice(cents: number | null): string {
  if (!cents) return "—";
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export default function SuburbResearchPage() {
  const [suburbs, setSuburbs] = useState<SuburbData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("capital_growth_10yr");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<SuburbData | null>(null);

  const fetchSuburbs = useCallback(async () => {
    setLoading(true);
    const params = search.length >= 2 ? `?q=${encodeURIComponent(search)}` : "";
    try {
      const res = await fetch(`/api/property/suburbs${params}`);
      const data = await res.json();
      setSuburbs(Array.isArray(data) ? data : []);
    } catch {
      setSuburbs([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchSuburbs, 300);
    return () => clearTimeout(timer);
  }, [fetchSuburbs]);

  const sorted = [...suburbs].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    if (typeof aVal === "string" && typeof bVal === "string") return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); } else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <Icon name="chevron-down" size={12} className="text-slate-300" />;
    return <Icon name={sortAsc ? "chevron-up" : "chevron-down"} size={12} className="text-amber-500" />;
  };

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          <nav className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-600">Property</Link>
            <span>/</span>
            <span className="text-slate-600">Suburb Research</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Suburb Research Tool</h1>
          <p className="text-sm text-slate-500">Median prices, rental yields, vacancy rates, and capital growth for Australia&apos;s top investment suburbs.</p>
        </div>
      </section>

      {/* Search */}
      <section className="bg-slate-50 border-b border-slate-200 sticky top-16 lg:top-20 z-30">
        <div className="container-custom py-3">
          <div className="relative max-w-md">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search suburb name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>
      </section>

      <section className="py-6 md:py-8">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Table */}
            <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-16">
                  <Icon name="bar-chart" size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No suburbs found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("suburb")}>
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">Suburb <SortIcon col="suburb" /></span>
                        </th>
                        <th className="text-right px-4 py-3 cursor-pointer hover:bg-slate-100 hidden md:table-cell" onClick={() => handleSort("median_price_house")}>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-600">Median House <SortIcon col="median_price_house" /></span>
                        </th>
                        <th className="text-right px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("rental_yield_house")}>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-600">Yield <SortIcon col="rental_yield_house" /></span>
                        </th>
                        <th className="text-right px-4 py-3 cursor-pointer hover:bg-slate-100 hidden sm:table-cell" onClick={() => handleSort("vacancy_rate")}>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-600">Vacancy <SortIcon col="vacancy_rate" /></span>
                        </th>
                        <th className="text-right px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("capital_growth_10yr")}>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-600">10yr Growth <SortIcon col="capital_growth_10yr" /></span>
                        </th>
                        <th className="text-right px-4 py-3 cursor-pointer hover:bg-slate-100 hidden lg:table-cell" onClick={() => handleSort("distance_to_cbd_km")}>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-600">CBD km <SortIcon col="distance_to_cbd_km" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((s) => (
                        <tr
                          key={s.id}
                          className={`border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${
                            selected?.id === s.id ? "bg-amber-50" : "hover:bg-slate-50"
                          }`}
                          onClick={() => setSelected(selected?.id === s.id ? null : s)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">{s.suburb}</span>
                            <span className="text-xs text-slate-400 ml-1">{s.state}</span>
                          </td>
                          <td className="text-right px-4 py-3 text-slate-700 hidden md:table-cell">{formatPrice(s.median_price_house)}</td>
                          <td className="text-right px-4 py-3 text-emerald-600 font-semibold">{s.rental_yield_house ? `${s.rental_yield_house}%` : "—"}</td>
                          <td className="text-right px-4 py-3 text-slate-700 hidden sm:table-cell">{s.vacancy_rate != null ? `${s.vacancy_rate}%` : "—"}</td>
                          <td className="text-right px-4 py-3 text-amber-600 font-bold">{s.capital_growth_10yr ? `${s.capital_growth_10yr}%` : "—"}</td>
                          <td className="text-right px-4 py-3 text-slate-500 hidden lg:table-cell">{s.distance_to_cbd_km != null ? `${s.distance_to_cbd_km}km` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div className="lg:col-span-1">
                <div className="border border-slate-200 rounded-2xl p-5 lg:sticky lg:top-24">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">{selected.suburb}, {selected.state}</h2>
                    <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                      <Icon name="x-circle" size={18} />
                    </button>
                  </div>

                  {selected.postcode && <p className="text-xs text-slate-400 mb-4">Postcode: {selected.postcode}</p>}

                  <div className="space-y-3">
                    {selected.median_price_house && <div className="flex justify-between"><span className="text-xs text-slate-500">Median House Price</span><span className="text-sm font-bold text-slate-900">{formatPrice(selected.median_price_house)}</span></div>}
                    {selected.median_price_unit && <div className="flex justify-between"><span className="text-xs text-slate-500">Median Unit Price</span><span className="text-sm font-bold text-slate-900">{formatPrice(selected.median_price_unit)}</span></div>}
                    {selected.rental_yield_house && <div className="flex justify-between"><span className="text-xs text-slate-500">Rental Yield (House)</span><span className="text-sm font-bold text-emerald-600">{selected.rental_yield_house}%</span></div>}
                    {selected.rental_yield_unit && <div className="flex justify-between"><span className="text-xs text-slate-500">Rental Yield (Unit)</span><span className="text-sm font-bold text-emerald-600">{selected.rental_yield_unit}%</span></div>}
                    {selected.vacancy_rate != null && <div className="flex justify-between"><span className="text-xs text-slate-500">Vacancy Rate</span><span className="text-sm font-bold text-slate-900">{selected.vacancy_rate}%</span></div>}

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Capital Growth</p>
                      {selected.capital_growth_1yr && <div className="flex justify-between"><span className="text-xs text-slate-500">1 Year</span><span className="text-sm font-bold text-amber-600">{selected.capital_growth_1yr}%</span></div>}
                      {selected.capital_growth_3yr && <div className="flex justify-between"><span className="text-xs text-slate-500">3 Year</span><span className="text-sm font-bold text-amber-600">{selected.capital_growth_3yr}%</span></div>}
                      {selected.capital_growth_5yr && <div className="flex justify-between"><span className="text-xs text-slate-500">5 Year</span><span className="text-sm font-bold text-amber-600">{selected.capital_growth_5yr}%</span></div>}
                      {selected.capital_growth_10yr && <div className="flex justify-between"><span className="text-xs text-slate-500">10 Year</span><span className="text-sm font-bold text-amber-600">{selected.capital_growth_10yr}%</span></div>}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Demographics</p>
                      {selected.population && <div className="flex justify-between"><span className="text-xs text-slate-500">Population</span><span className="text-sm font-bold text-slate-900">{selected.population.toLocaleString()}</span></div>}
                      {selected.population_growth && <div className="flex justify-between"><span className="text-xs text-slate-500">Pop. Growth</span><span className="text-sm font-bold text-slate-900">{selected.population_growth}%</span></div>}
                      {selected.median_age && <div className="flex justify-between"><span className="text-xs text-slate-500">Median Age</span><span className="text-sm font-bold text-slate-900">{selected.median_age}</span></div>}
                      {selected.median_income && <div className="flex justify-between"><span className="text-xs text-slate-500">Median Income</span><span className="text-sm font-bold text-slate-900">${selected.median_income.toLocaleString()}</span></div>}
                      {selected.distance_to_cbd_km != null && <div className="flex justify-between"><span className="text-xs text-slate-500">Distance to CBD</span><span className="text-sm font-bold text-slate-900">{selected.distance_to_cbd_km}km</span></div>}
                    </div>
                  </div>

                  <Link
                    href={`/property/buyer-agents`}
                    className="block w-full text-center py-2.5 mt-4 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-all"
                  >
                    Find an Agent in {selected.suburb}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
