"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export type FundType =
  | "managed_fund"
  | "syndicated_property"
  | "infrastructure"
  | "unlisted_equity"
  | "wholesale"
  | "retail";

export interface FundListing {
  id: number;
  title: string;
  slug: string;
  fund_type: FundType | null;
  manager_name: string | null;
  description: string | null;
  min_investment_cents: number | null;
  target_return_percent: number | null;
  fund_size_cents: number | null;
  open_to_retail: boolean | null;
  siv_complying: boolean | null;
  firb_relevant: boolean | null;
  featured: boolean | null;
  featured_tier: "standard" | "premium" | "platinum" | null;
  status: string | null;
}

const FUND_TYPE_LABELS: Record<FundType, string> = {
  managed_fund: "Managed Fund",
  syndicated_property: "Syndicated Property",
  infrastructure: "Infrastructure",
  unlisted_equity: "Unlisted Equity",
  wholesale: "Wholesale",
  retail: "Retail",
};

const MIN_INVESTMENT_BANDS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $50K", min: 0, max: 50000 * 100 },
  { label: "$50K – $250K", min: 50000 * 100, max: 250000 * 100 },
  { label: "$250K – $1M", min: 250000 * 100, max: 1000000 * 100 },
  { label: "$1M+", min: 1000000 * 100, max: Infinity },
];

const PAGE_SIZE = 12;

function formatCentsAud(cents: number | null): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  if (dollars >= 1_000_000)
    return `$${(dollars / 1_000_000).toFixed(dollars >= 10_000_000 ? 0 : 1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatReturn(pct: number | null): string {
  if (pct == null) return "—";
  const num = Number(pct);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

export default function FundsDirectoryClient({
  funds,
}: {
  funds: FundListing[];
}) {
  const [selectedType, setSelectedType] = useState<"all" | FundType>("all");
  const [minBand, setMinBand] = useState<number>(0);
  const [sivOnly, setSivOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const band = MIN_INVESTMENT_BANDS[minBand]!;
    return funds.filter((f) => {
      if (selectedType !== "all" && f.fund_type !== selectedType) return false;
      const min = f.min_investment_cents ?? 0;
      if (min < band.min || min > band.max) return false;
      if (sivOnly && !f.siv_complying) return false;
      if (featuredOnly && !f.featured) return false;
      return true;
    });
  }, [funds, selectedType, minBand, sivOnly, featuredOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function resetToPageOne<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <>
      {/* Filter bar */}
      <section className="bg-slate-50 border-b border-slate-200 py-5 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap items-end gap-3 md:gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Fund type
              </label>
              <select
                value={selectedType}
                onChange={(e) =>
                  resetToPageOne(setSelectedType)(
                    e.target.value as "all" | FundType,
                  )
                }
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                {(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((t) => (
                  <option key={t} value={t}>
                    {FUND_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Minimum investment
              </label>
              <select
                value={minBand}
                onChange={(e) =>
                  resetToPageOne(setMinBand)(parseInt(e.target.value, 10))
                }
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {MIN_INVESTMENT_BANDS.map((b, i) => (
                  <option key={b.label} value={i}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sivOnly}
                onChange={(e) => resetToPageOne(setSivOnly)(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              SIV-complying only
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(e) =>
                  resetToPageOne(setFeaturedOnly)(e.target.checked)
                }
                className="accent-amber-500 w-4 h-4"
              />
              Featured only
            </label>

            <div className="flex-1 text-right text-xs text-slate-500">
              {filtered.length}{" "}
              {filtered.length === 1 ? "fund" : "funds"} matching
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-10 bg-white">
        <div className="container-custom">
          {paged.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-500">
                No funds match the current filters. Try widening your minimum
                investment or clearing the SIV filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((f) => (
                <FundCard key={f.id} fund={f} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}

function FundCard({ fund }: { fund: FundListing }) {
  const typeLabel = fund.fund_type
    ? FUND_TYPE_LABELS[fund.fund_type]
    : "Fund";
  const isFeatured = Boolean(fund.featured);

  return (
    <article
      className={`bg-white rounded-xl overflow-hidden transition-shadow hover:shadow-md ${
        isFeatured
          ? "border-2 border-amber-500"
          : "border border-slate-200"
      }`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {typeLabel}
          </span>
          {isFeatured && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500 text-white">
              Featured
            </span>
          )}
          {fund.siv_complying && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              SIV Complying
            </span>
          )}
          {fund.open_to_retail && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Retail
            </span>
          )}
        </div>

        <h3 className="text-base font-extrabold text-slate-900 leading-tight mb-1 line-clamp-2">
          {fund.title}
        </h3>
        {fund.manager_name && (
          <p className="text-xs text-slate-500 mb-3">{fund.manager_name}</p>
        )}

        {fund.description && (
          <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">
            {fund.description}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
            <dt className="text-[10px] font-bold uppercase text-slate-500">
              Min investment
            </dt>
            <dd className="font-extrabold text-slate-900">
              {formatCentsAud(fund.min_investment_cents)}
            </dd>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
            <dt className="text-[10px] font-bold uppercase text-slate-500">
              Target return
            </dt>
            <dd className="font-extrabold text-slate-900">
              {formatReturn(fund.target_return_percent)}
            </dd>
          </div>
        </dl>

        <Link
          href={`/invest/funds/${fund.slug}`}
          className="inline-flex items-center justify-center gap-1.5 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          Register interest
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </article>
  );
}
