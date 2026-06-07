"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FirmPerformanceSummary, MemberMetrics } from "@/lib/firm-performance";

interface Props {
  summary: FirmPerformanceSummary;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className="text-slate-700 text-xs font-medium" title={`${rating.toFixed(2)} / 5`}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-500 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

function MemberRow({ m, rank }: { m: MemberMetrics; rank: number }) {
  const initials = m.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">{rank}</span>
          {m.photoUrl ? (
            <Image
              src={m.photoUrl}
              alt={m.name}
              width={32}
              height={32}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-violet-700">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <Link
              href={`/advisors/${m.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-slate-800 hover:text-violet-700 truncate block"
            >
              {m.name}
            </Link>
            {m.rank !== null && (
              <span className="text-[11px] text-slate-400">
                Platform rank #{m.rank}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="text-sm font-bold text-slate-900">{fmt(m.views30d)}</span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className={`text-sm font-bold ${m.enquiries30d > 0 ? "text-emerald-700" : "text-slate-400"}`}>
          {fmt(m.enquiries30d)}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-slate-600">
        {fmt(m.bookingClicks30d)}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <StarRating rating={m.avgRating} />
        {m.reviewCount > 0 && (
          <div className="text-[10px] text-slate-400 mt-0.5">{m.reviewCount} review{m.reviewCount !== 1 ? "s" : ""}</div>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell min-w-[120px]">
        {m.score !== null ? (
          <div className="space-y-1">
            <ScoreBar value={m.responseScore} color="bg-violet-400" />
            <ScoreBar value={m.profileScore} color="bg-blue-400" />
          </div>
        ) : (
          <span className="text-xs text-slate-400">No data</span>
        )}
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        {m.score !== null ? (
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-50 text-violet-800 text-sm font-extrabold border border-violet-100">
            {m.score}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

export default function FirmPerformanceClient({ summary: initialSummary }: Props) {
  const [summary, setSummary] = useState<FirmPerformanceSummary>(initialSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/firm-portal/performance", { cache: "no-store" });
      const json = (await res.json()) as { summary?: FirmPerformanceSummary; error?: string };
      if (!res.ok || !json.summary) throw new Error(json.error ?? "Could not refresh.");
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const conversionRate =
    summary.totals.views30d > 0
      ? ((summary.totals.enquiries30d / summary.totals.views30d) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Firm-level summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Profile views", value: fmt(summary.totals.views30d), sub: "last 30 days" },
          { label: "Enquiries", value: fmt(summary.totals.enquiries30d), sub: "last 30 days" },
          { label: "Booking clicks", value: fmt(summary.totals.bookingClicks30d), sub: "last 30 days" },
          { label: "Conversion rate", value: `${conversionRate}%`, sub: "enquiry / view" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{card.label}</p>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Member leaderboard */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Member performance</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {summary.windowStart} – {summary.windowEnd} · {summary.yearMonth} leaderboard
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            aria-busy={refreshing}
            className="text-xs text-violet-700 hover:text-violet-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <p role="alert" className="px-5 py-3 text-sm text-red-600">{error}</p>
        )}

        {summary.members.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No active members found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Firm performance metrics">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-4 py-2.5 font-medium">Advisor</th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-right">Views</th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-right">Enquiries</th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-right">Bookings</th>
                  <th scope="col" className="px-4 py-2.5 font-medium hidden md:table-cell">Rating</th>
                  <th scope="col" className="px-4 py-2.5 font-medium hidden lg:table-cell">
                    <span title="Top bar = response score; bottom = profile score">Response / Profile</span>
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium text-right hidden sm:table-cell">Score</th>
                </tr>
              </thead>
              <tbody>
                {summary.members.map((m, i) => (
                  <MemberRow key={m.professionalId} m={m} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Score = composite platform rank (reviews · response · profile). Updated nightly.
        <Link href="/firm-portal/analytics" className="ml-2 underline hover:text-slate-700">
          Lead analytics →
        </Link>
        <Link href="/firm-portal/billing" className="ml-2 underline hover:text-slate-700">
          Billing →
        </Link>
      </p>
    </div>
  );
}
