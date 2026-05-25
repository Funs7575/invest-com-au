"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdvisorShortlist } from "@/lib/hooks/useAdvisorShortlist";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  buildAdvisorCompareMatrix,
  type AdvisorCompareInput,
  type MatrixCell,
  type MatrixRowKey,
} from "@/lib/advisor-compare-matrix";
import Icon from "@/components/Icon";

/* ─── Cell renderers ──────────────────────────────────────────────────────── */

function renderCell(cell: MatrixCell | undefined): React.ReactNode {
  if (!cell) return <span className="text-slate-400 text-xs">—</span>;

  switch (cell.kind) {
    case "text":
      if (cell.missing) {
        return <span className="text-slate-400 text-xs">—</span>;
      }
      return <span className="text-slate-700 text-sm">{cell.value}</span>;

    case "badge_list":
      if (cell.missing || cell.items.length === 0) {
        return <span className="text-slate-400 text-xs">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {cell.items.slice(0, 5).map((item) => (
            <span
              key={item}
              className="text-[0.6rem] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full border border-violet-100 leading-normal"
            >
              {item}
            </span>
          ))}
        </div>
      );

    case "boolean":
      if (cell.missing) {
        return <span className="text-slate-400 text-xs">—</span>;
      }
      if (cell.value === true) {
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
            <Icon name="check-circle" size={13} />
            {cell.display}
          </span>
        );
      }
      return <span className="text-slate-500 text-xs font-medium">{cell.display}</span>;

    case "score":
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Gauge pill */}
          <div className="relative w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-current transition-all"
              style={{ width: `${cell.overall}%` }}
            />
          </div>
          <span className="font-bold text-slate-800 text-sm tabular-nums">{cell.overall}</span>
          <span className={`text-xs font-semibold ${cell.labelColor}`}>{cell.label}</span>
        </div>
      );
  }
}

/**
 * Returns true when a cell holds a notably positive value (for green-highlight
 * logic). Only applied to the verified and accepts_new_clients rows — we do
 * NOT "best" highlight Trust Score because that would imply a recommendation.
 */
function isCellPositive(rowKey: MatrixRowKey, cell: MatrixCell | undefined): boolean {
  if (!cell) return false;
  if (rowKey === "verified" && cell.kind === "boolean") return cell.value === true;
  if (rowKey === "accepts_new_clients" && cell.kind === "boolean") return cell.value === true;
  return false;
}

/* ─── Slug validation ─────────────────────────────────────────────────────── */

// Slug shape: lowercase letters, digits, hyphens. Reject anything else
// so a crafted ?add=… URL can't inject arbitrary text into the
// shortlist (which is rendered/used as part of API URLs downstream).
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function AdvisorCompareClient() {
  const { slugs, toggle, clear, has } = useAdvisorShortlist();
  const [advisors, setAdvisors] = useState<AdvisorCompareInput[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const addHandledRef = useRef(false);

  // Deep-link support: /advisors/compare?add=<slug> auto-toggles the
  // slug into the shortlist and strips the param from the URL. Lets
  // the AI concierge, marketing emails, or partner sites populate the
  // compare matrix in one click. Idempotent — re-clicking the link
  // doesn't double-toggle thanks to addHandledRef + has().
  useEffect(() => {
    if (addHandledRef.current) return;
    const raw = searchParams?.get("add")?.trim().toLowerCase() ?? "";
    if (!raw) return;
    addHandledRef.current = true;
    if (SLUG_RE.test(raw) && !has(raw)) {
      toggle(raw);
    }
    // Strip the param so refresh / share doesn't re-toggle.
    router.replace(pathname ?? "/advisors/compare", { scroll: false });
    // toggle/has change identity on every render; guarded by ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (slugs.length === 0) {
      setAdvisors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const compareSlgs = slugs.slice(0, 3);
    const params = compareSlgs.map((s) => `slugs=${encodeURIComponent(s)}`).join("&");
    fetch(`/api/advisor-compare?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.advisors)) {
          setAdvisors(data.advisors as AdvisorCompareInput[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slugs]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (slugs.length === 0) {
    return (
      <div className="text-center py-20">
        <Icon name="bookmark" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">No advisors saved</h1>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
          Browse advisors and tap the bookmark icon to save up to 3 for side-by-side comparison.
        </p>
        <Link
          href="/advisors"
          className="inline-block px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
        >
          Browse Advisors
        </Link>
      </div>
    );
  }

  const matrix = buildAdvisorCompareMatrix(advisors);
  const { rows, columns, cells } = matrix;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Compare Advisors</h1>
          <p className="text-sm text-slate-500 mt-1">
            {columns.length} advisor{columns.length !== 1 ? "s" : ""} compared side by side
          </p>
        </div>
        <button
          onClick={clear}
          className="text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Comparison table — sticky Feature column + advisor columns */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* ── Advisor header row ── */}
            <thead>
              <tr className="border-b border-slate-200">
                {/* Feature label header */}
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 sticky left-0 z-10 min-w-[9rem]">
                  Feature
                </th>

                {columns.map((col) => {
                  const advisor = advisors.find((a) => a.slug === col.slug);
                  return (
                    <th key={col.slug} className="px-4 py-4 text-center min-w-[200px] align-top">
                      {/* Remove button */}
                      <div className="flex justify-end mb-1">
                        <button
                          onClick={() => toggle(col.slug)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          title="Remove from comparison"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>

                      {/* Photo */}
                      <Link href={col.profilePath} className="block group">
                        <div className="mx-auto mb-2 w-16 h-16">
                          {col.photo_url ? (
                            <Image
                              src={col.photo_url}
                              alt={col.name}
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-full object-cover mx-auto"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-2xl font-bold text-violet-600 mx-auto">
                              {col.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 text-sm leading-tight group-hover:underline">
                          {col.name}
                        </p>
                        {col.firm_name && (
                          <p className="text-xs text-slate-500 mt-0.5">{col.firm_name}</p>
                        )}
                      </Link>

                      {/* CTAs */}
                      <div className="mt-3 space-y-1.5">
                        <Link
                          href={col.profilePath}
                          className="block w-full py-2 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
                        >
                          View Profile
                        </Link>
                        {advisor?.booking_link ? (
                          <a
                            href={advisor.booking_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            Book Now
                          </a>
                        ) : (
                          <a
                            href={`${col.profilePath}#contact`}
                            className="block w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            Request Consult
                          </a>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* ── Feature rows ── */}
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/50">
                  {/* Sticky label column */}
                  <td className="px-4 py-3 bg-slate-50/50 sticky left-0 z-10 align-top">
                    <p className="text-sm font-medium text-slate-700">{row.label}</p>
                    <p className="text-[0.65rem] text-slate-400 mt-0.5 leading-snug max-w-[8rem]">
                      {row.description}
                    </p>
                  </td>

                  {/* One cell per advisor column */}
                  {columns.map((col) => {
                    const cell = cells[row.key]?.[col.slug];
                    const highlight = isCellPositive(row.key, cell);
                    return (
                      <td
                        key={col.slug}
                        className={`px-4 py-3 align-top ${highlight ? "bg-emerald-50" : ""}`}
                      >
                        {renderCell(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AFSL compliance warning — required on all advisor pages */}
      <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-xs text-amber-800 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
      </div>

      {/* Add more prompt */}
      {columns.length < 3 && (
        <div className="mt-4 text-center">
          <Link
            href="/advisors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            <Icon name="plus-circle" size={16} />
            Add another advisor to compare
          </Link>
        </div>
      )}
    </div>
  );
}
