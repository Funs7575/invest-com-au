"use client";

/**
 * MarketplaceFilterBar — horizontal pill-popover filter bar for /invest.
 *
 * Replaces the old "filters live only in a sidebar / mobile drawer" model
 * with a row of primary facet pills (Quick starts · Budget · Sector ·
 * Location · Kind) plus an "All filters" button that opens the existing
 * <FilterPanel> drawer for the long-tail facets. It reads and writes the
 * SAME URL params the drawer uses (`setParams`), so the filter pipeline
 * downstream is untouched and back-button / shareable links keep working.
 *
 * Compliance note (see docs/strategy/REGULATORY-AVOID-LIST.md):
 *  - "Quick starts" are FACTUAL filter combinations, not personalised
 *    product recommendations. They set existing URL params and nothing
 *    more — no scoring, no "best for you" framing.
 *  - The capital-growth quick start keeps the wholesale / s708 gate
 *    (`wholesale=true`) on equity raises so retail browsers don't get a
 *    one-tap path into un-gated capital-raising offers.
 *  - The result figure is a literal count of listings matching the active
 *    filters ("142 matches") — a fact about the result set, not an advice
 *    signal.
 *
 * Reuses the canonical <FilterChips> primitive for the active-filter row.
 */

import { useCallback, useState } from "react";
import Icon from "@/components/Icon";
import FilterChips from "@/components/directory/FilterChips";
import { FilterPill as Pill, FilterPopover as Popover } from "@/components/directory/FilterPill";
import { ALL_LISTING_KINDS, TICKET_BUCKETS, listingKindMeta } from "@/lib/listing-kind";
import type { ListingKind } from "@/lib/types";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

/**
 * Quick starts — each writes a combination of EXISTING URL params and
 * nothing else. Labels are descriptive of the filter applied, deliberately
 * neutral (no "recommended" / "best for you"). The `growth` start retains
 * the wholesale gate on equity raises.
 */
interface QuickStart {
  id: string;
  icon: string;
  label: string;
  sub: string;
  apply: Record<string, string>;
}

const QUICK_STARTS: QuickStart[] = [
  { id: "foreign", icon: "globe", label: "Foreign-buyer eligible", sub: "FIRB-eligible listings", apply: { firb: "eligible" } },
  { id: "operate", icon: "briefcase", label: "Buy & operate a business", sub: "Owner-operator businesses", apply: { kind: "for_sale_business" } },
  { id: "income", icon: "trending-up", label: "Income (5%+ yield)", sub: "Filters to yield ≥ 5%", apply: { min_yield: "5" } },
  { id: "growth", icon: "rocket", label: "Growth & raises", sub: "Equity raises · wholesale (s708)", apply: { kind: "equity_raise,project_equity", wholesale: "true" } },
  { id: "alt", icon: "gem", label: "Collectibles & alternatives", sub: "Physical assets · royalties", apply: { kind: "physical_asset,royalty" } },
  { id: "public", icon: "bar-chart-3", label: "Public markets (ASX)", sub: "Listed securities & ETFs", apply: { kind: "listed_security" } },
];

/** Params a quick start can write — cleared before a new start is applied. */
const QUICK_START_PARAMS = ["kind", "firb", "min_yield", "wholesale"] as const;

export interface MarketplaceFilterBarProps {
  /** Current URL params snapshot (from useSearchParams()). */
  params: URLSearchParams;
  /** The SAME setter InvestListingsClient uses (writes URL, scroll:false). */
  setParams: (updates: Record<string, string>) => void;
  /** Opens the existing <FilterPanel> drawer for advanced facets. */
  onOpenAllFilters: () => void;
  /** Count of active advanced (drawer-only) filters, for the "All filters" badge. */
  advancedCount: number;
  /** Live result count for the count row. */
  resultCount: number;
  /** Top-level sector categories (slug + label) for the Sector popover. */
  categories: { slug: string; label: string }[];
  /** Per-category counts. */
  categoryCounts: Record<string, number>;
  /** Per-kind counts. */
  kindCounts: Record<string, number>;
  /** Per-state counts. */
  stateCounts: Record<string, number>;
  /** Active-chip descriptors for the chip row. */
  activeChips: { label: string; onClear: () => void }[];
  onClearAll: () => void;
  /** Hide the Sector pill on vertical pages where the category is locked. */
  showSector?: boolean;
}

export default function MarketplaceFilterBar({
  params,
  setParams,
  onOpenAllFilters,
  advancedCount,
  resultCount,
  categories,
  categoryCounts,
  kindCounts,
  stateCounts,
  activeChips,
  onClearAll,
  showSector = true,
}: MarketplaceFilterBarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = useCallback((id: string) => setOpen((o) => (o === id ? null : id)), []);
  const close = useCallback(() => setOpen(null), []);

  const kinds = (params.get("kind") ?? "").split(",").filter(Boolean);
  const state = params.get("state") ?? "";
  const category = params.get("category") ?? "";
  const price = params.get("price") ?? "";

  // A quick start is "active" only when every param it writes matches the URL.
  const activeStart = QUICK_STARTS.find((s) =>
    Object.entries(s.apply).every(([k, v]) => (params.get(k) ?? "") === v),
  );

  const applyStart = (s: QuickStart) => {
    const reset: Record<string, string> = {};
    for (const p of QUICK_START_PARAMS) reset[p] = "";
    setParams({ ...reset, ...s.apply });
    close();
  };

  const toggleKind = (k: string) => {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k];
    setParams({ kind: next.join(",") });
  };

  const firstKind = kinds[0];
  const kindValue =
    kinds.length === 1 && firstKind
      ? listingKindMeta(firstKind as ListingKind).label
      : kinds.length > 1
        ? `${kinds.length} kinds`
        : undefined;

  const priceLabel = price ? TICKET_BUCKETS.find((b) => b.key === price)?.label : undefined;
  const categoryLabel = category ? categories.find((c) => c.slug === category)?.label : undefined;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick starts */}
        <div className="relative">
          <Pill
            icon="target"
            label="Quick starts"
            value={activeStart?.label}
            active={!!activeStart}
            open={open === "start"}
            onClick={() => toggle("start")}
          />
          <Popover open={open === "start"} onClose={close} label="Quick starts">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Jump to a common search</p>
            <div className="flex flex-col gap-1.5">
              {QUICK_STARTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applyStart(s)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                    activeStart?.id === s.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <Icon name={s.icon} size={14} className="text-amber-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-slate-900">{s.label}</span>
                    <span className="block text-[11px] text-slate-400">{s.sub}</span>
                  </span>
                </button>
              ))}
            </div>
            {activeStart && (
              <button
                type="button"
                onClick={() => {
                  const reset: Record<string, string> = {};
                  for (const p of QUICK_START_PARAMS) reset[p] = "";
                  setParams(reset);
                  close();
                }}
                className="mt-2 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
              >
                Clear quick start
              </button>
            )}
            <p className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 leading-snug">
              Applies filters only — general information, not personal advice.
            </p>
          </Popover>
        </div>

        {/* Budget */}
        <div className="relative">
          <Pill
            icon="wallet"
            label="Budget"
            value={priceLabel}
            active={!!price}
            open={open === "budget"}
            onClick={() => toggle("budget")}
          />
          <Popover open={open === "budget"} onClose={close} label="Ticket size">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Ticket size</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TICKET_BUCKETS.map((b) => (
                <button
                  key={b.key || "any"}
                  type="button"
                  onClick={() => {
                    setParams({ price: b.key });
                    close();
                  }}
                  className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    price === b.key ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Popover>
        </div>

        {/* Sector */}
        {showSector && categories.length > 0 && (
          <div className="relative">
            <Pill
              icon="layers"
              label="Sector"
              value={categoryLabel}
              active={!!category}
              open={open === "sector"}
              onClick={() => toggle("sector")}
            />
            <Popover open={open === "sector"} onClose={close} label="Sector">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Sector</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                {categories.map((c) => {
                  const count = categoryCounts[c.slug] ?? 0;
                  const selected = category === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      disabled={count === 0}
                      onClick={() => {
                        setParams({ category: selected ? "" : c.slug, sub: "" });
                        close();
                      }}
                      className={`flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg border text-xs font-semibold disabled:opacity-40 transition-colors ${
                        selected ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="truncate">{c.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            </Popover>
          </div>
        )}

        {/* Location */}
        <div className="relative">
          <Pill
            icon="map-pin"
            label="Location"
            value={state || undefined}
            active={!!state}
            open={open === "state"}
            onClick={() => toggle("state")}
          />
          <Popover open={open === "state"} onClose={close} label="Location">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">State</p>
            <div className="grid grid-cols-4 gap-1.5">
              {AU_STATES.map((s) => {
                const count = stateCounts[s] ?? 0;
                const selected = state === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={count === 0}
                    onClick={() => {
                      setParams({ state: selected ? "" : s });
                      close();
                    }}
                    className={`py-2 rounded-lg border text-xs font-bold disabled:opacity-40 transition-colors ${
                      selected ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {s}
                    <span className="block text-[9px] font-mono text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </Popover>
        </div>

        {/* Kind */}
        <div className="relative">
          <Pill
            icon="tag"
            label="Kind"
            value={kindValue}
            active={kinds.length > 0}
            open={open === "kind"}
            onClick={() => toggle("kind")}
          />
          <Popover open={open === "kind"} onClose={close} label="Investment kind">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Investment kind</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LISTING_KINDS.map((k) => {
                const meta = listingKindMeta(k);
                const count = kindCounts[k] ?? 0;
                const selected = kinds.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={count === 0}
                    onClick={() => toggleKind(k)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold disabled:opacity-40 transition-colors ${
                      selected ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Icon name={meta.icon} size={11} />
                    {meta.label}
                    <span className="font-mono text-[10px] text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </Popover>
        </div>

        {/* All filters → existing FilterPanel drawer */}
        <button
          type="button"
          onClick={onOpenAllFilters}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold whitespace-nowrap transition-colors ${
            advancedCount > 0 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
          }`}
        >
          <Icon name="sliders" size={13} />
          All filters
          {advancedCount > 0 && (
            <span className="ml-0.5 text-[10px] font-mono bg-amber-500 text-white rounded-full px-1.5 py-0.5">{advancedCount}</span>
          )}
        </button>

        {/* Result count — literal count of listings matching active filters. */}
        <span className="ml-auto text-sm text-slate-500" aria-live="polite">
          <span className="font-extrabold text-slate-900">{resultCount}</span> {resultCount === 1 ? "match" : "matches"}
        </span>
      </div>

      {/* Active-filter chips (canonical primitive) */}
      <FilterChips chips={activeChips} onClearAll={onClearAll} />
    </div>
  );
}
