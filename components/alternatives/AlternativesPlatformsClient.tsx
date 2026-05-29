"use client";

/**
 * Client-side interactive layer for /invest/alternatives/platforms.
 *
 * Wraps the directory primitives (SearchInput, SortDropdown, FilterPanel,
 * FacetGroup, FilterChips, ResultCount) around the static PLATFORMS data.
 * This component owns all filter/sort state so the server component can
 * remain a simple async RSC that passes data down.
 *
 * Filters:
 *  - asset class (multiselect)
 *  - Australian access (boolean)
 * Sort: rating (desc), minimum investment (asc), name (asc)
 */

import { useState, useMemo, useCallback } from "react";
import SearchInput from "@/components/directory/SearchInput";
import SortDropdown from "@/components/directory/SortDropdown";
import FilterPanel from "@/components/directory/FilterPanel";
import FacetGroup from "@/components/directory/FacetGroup";
import FilterChips from "@/components/directory/FilterChips";
import ResultCount from "@/components/directory/ResultCount";
import ScrollReveal from "@/components/ScrollReveal";
import { renderStars } from "@/lib/tracking";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface AlternativePlatform {
  name: string;
  slug: string;
  assetClass: string;
  /** Numeric minimum in AUD-equivalent for sorting. */
  minInvestmentAud: number;
  minInvestment: string;
  fees: string;
  /** true = direct AU access, false = requires overseas account. */
  australianDirect: boolean;
  australiaAccess: string;
  rating: number;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  signupFromAustralia: string;
}

type SortKey = "rating" | "min_investment" | "name";

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "rating", label: "Highest rated" },
  { value: "min_investment", label: "Lowest minimum" },
  { value: "name", label: "Name (A–Z)" },
];

const ASSET_CLASS_OPTIONS = [
  { value: "Wine", label: "Wine" },
  { value: "Art", label: "Art" },
  { value: "Fractional (mixed)", label: "Fractional (mixed)" },
  { value: "Collectibles", label: "Collectibles" },
  { value: "Luxury goods", label: "Luxury goods" },
] as const;

/* ── Component ────────────────────────────────────────────────────────────── */

interface Props {
  platforms: ReadonlyArray<AlternativePlatform>;
}

export default function AlternativesPlatformsClient({ platforms }: Props) {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");
  const [filterOpen, setFilterOpen] = useState(false);
  const [assetClassFilter, setAssetClassFilter] = useState<Set<string>>(new Set());
  const [auOnlyFilter, setAuOnlyFilter] = useState(false);

  // ── Derived filtered + sorted list ───────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...platforms];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.assetClass.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (assetClassFilter.size > 0) {
      result = result.filter((p) => assetClassFilter.has(p.assetClass));
    }

    if (auOnlyFilter) {
      result = result.filter((p) => p.australianDirect);
    }

    result.sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "min_investment") return a.minInvestmentAud - b.minInvestmentAud;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [platforms, search, sort, assetClassFilter, auOnlyFilter]);

  const handleClearAll = useCallback(() => {
    setSearch("");
    setAssetClassFilter(new Set());
    setAuOnlyFilter(false);
  }, []);

  // ── Active filter chips ───────────────────────────────────────────────────
  const chips = useMemo(() => {
    const c = [];
    for (const ac of assetClassFilter) {
      c.push({ label: ac, onClear: () => setAssetClassFilter((prev) => { const n = new Set(prev); n.delete(ac); return n; }) });
    }
    if (auOnlyFilter) {
      c.push({ label: "AU direct only", onClear: () => setAuOnlyFilter(false) });
    }
    return c;
  }, [assetClassFilter, auOnlyFilter]);

  const activeFilterCount = chips.length;

  // ── Per-option counts for FacetGroup ────────────────────────────────────
  const assetClassCounts = useMemo(() => {
    const base = auOnlyFilter ? platforms.filter((p) => p.australianDirect) : platforms;
    const counts: Record<string, number> = {};
    for (const p of base) {
      counts[p.assetClass] = (counts[p.assetClass] ?? 0) + 1;
    }
    return counts;
  }, [platforms, auOnlyFilter]);

  return (
    <div>
      {/* ── Toolbar row ── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SearchInput
          id="alts-platforms-search"
          value={search}
          onChange={setSearch}
          placeholder="Search platforms…"
          className="flex-1 min-w-[180px]"
        />
        <SortDropdown
          options={SORT_OPTIONS}
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          ariaLabel="Sort platforms"
        />
        {/* Mobile filter button */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-400 transition-colors"
          aria-label="Open filters"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2" /></svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Active chips ── */}
      <FilterChips chips={chips} onClearAll={activeFilterCount > 0 ? handleClearAll : undefined} className="mb-3" />

      {/* ── Layout: sidebar + results ── */}
      <div className="flex gap-6">
        {/* Filter sidebar (desktop inline + mobile drawer) */}
        <FilterPanel
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onClearAll={handleClearAll}
          activeCount={activeFilterCount}
          resultCount={filtered.length}
          heading="Filters"
          variant="responsive"
        >
          <FacetGroup
            label="Asset Class"
            options={ASSET_CLASS_OPTIONS}
            selected={assetClassFilter}
            onChange={setAssetClassFilter}
            counts={assetClassCounts}
            layout="rows"
          />

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Australian Access
            </legend>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={auOnlyFilter}
                onChange={(e) => setAuOnlyFilter(e.target.checked)}
                className="accent-amber-500 w-4 h-4 shrink-0"
              />
              Direct AU access only
            </label>
          </fieldset>
        </FilterPanel>

        {/* Results area */}
        <div className="flex-1 min-w-0">
          {/* Result count */}
          <ResultCount
            total={filtered.length}
            noun={filtered.length === 1 ? "platform" : "platforms"}
            className="mb-4"
          />

          {/* ── Comparison table (desktop) ── */}
          <div className="hidden md:block overflow-x-auto mb-8">
            <ScrollReveal animation="table-row-stagger" as="table" className="w-full border border-slate-200 rounded-lg">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Platform</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Asset Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Min Investment</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Fees</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">AU Access</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((p, i) => (
                  <tr
                    key={p.slug}
                    className={`hover:bg-slate-50 ${i === 0 ? "bg-rose-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`#${p.slug}`}
                        className="font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        {p.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                        {p.assetClass}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{p.minInvestment}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{p.fees}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          p.australianDirect
                            ? "text-emerald-600 font-semibold"
                            : "text-amber-600"
                        }
                      >
                        {p.australiaAccess}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber-500 text-sm">{renderStars(p.rating)}</span>
                      <span className="text-xs text-slate-500 ml-1">{p.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollReveal>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3 mb-6">
            {filtered.map((p, i) => (
              <a
                key={p.slug}
                href={`#${p.slug}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <span className="font-bold text-slate-900">{p.name}</span>
                  </div>
                  <span className="text-xs text-amber-500">
                    {renderStars(p.rating)} {p.rating}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                  <span className="text-slate-400">Asset Class</span>
                  <span>{p.assetClass}</span>
                  <span className="text-slate-400">Minimum</span>
                  <span>{p.minInvestment}</span>
                  <span className="text-slate-400">Fees</span>
                  <span>{p.fees}</span>
                  <span className="text-slate-400">AU Access</span>
                  <span className={p.australianDirect ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                    {p.australiaAccess}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* ── Empty state ── */}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg font-semibold mb-1">No platforms match your filters</p>
              <p className="text-sm">Try broadening your search or clearing some filters.</p>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-3 text-sm font-semibold text-rose-600 hover:text-rose-800 underline underline-offset-2"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* ── Detailed platform sections ── */}
          {filtered.length > 0 && (
            <div className="space-y-8 mb-8 md:mb-10">
              {filtered.map((p) => (
                <ScrollReveal key={p.slug} animation="scroll-fade-in">
                  <section
                    id={p.slug}
                    className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 scroll-mt-20"
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                      <span className="text-xs font-medium px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                        {p.assetClass}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ml-auto ${
                          p.australianDirect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.australiaAccess}
                      </span>
                      <span className="text-sm text-amber-500">
                        {renderStars(p.rating)} {p.rating}/5
                      </span>
                    </div>

                    {/* Key metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Min Investment", value: p.minInvestment },
                        { label: "Fees", value: p.fees },
                        { label: "Asset Class", value: p.assetClass },
                        { label: "AU Access", value: p.australiaAccess },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                          <div className="text-[0.65rem] uppercase tracking-wide text-slate-400 mb-0.5">
                            {label}
                          </div>
                          <div className="text-sm font-bold text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {p.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <h4 className="text-sm font-bold text-emerald-800 mb-2">Pros</h4>
                        <ul className="space-y-1.5">
                          {p.pros.map((pro) => (
                            <li key={pro} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">+</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <h4 className="text-sm font-bold text-red-800 mb-2">Cons</h4>
                        <ul className="space-y-1.5">
                          {p.cons.map((con) => (
                            <li key={con} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-red-600 font-bold mt-0.5 shrink-0">−</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                      <p className="text-sm">
                        <strong className="text-slate-800">Best for: </strong>
                        <span className="text-slate-600">{p.bestFor}</span>
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-blue-800 mb-1">
                        How to Sign Up from Australia
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {p.signupFromAustralia}
                      </p>
                    </div>
                  </section>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
