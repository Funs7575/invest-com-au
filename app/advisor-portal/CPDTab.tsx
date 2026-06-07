"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { CpdSummary } from "@/lib/course-certificates";

// ── Circular progress SVG ──────────────────────────────────────────────────────

function CircularProgress({
  earned,
  target,
}: {
  earned: number;
  target: number;
}) {
  const pct = Math.min(1, earned / target);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32" aria-hidden="true">
      {/* Track */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="10"
      />
      {/* Progress arc */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={pct >= 1 ? "#10b981" : "#7c3aed"}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Centre label */}
      <text
        x="60"
        y="54"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#0f172a"
      >
        {earned.toFixed(1)}
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fontSize="10"
        fill="#64748b"
      >
        of {target} hrs
      </text>
    </svg>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  conduct: "Conduct",
  client_care: "Client Care",
  regulatory: "Regulatory",
};

const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-100 text-blue-700",
  conduct: "bg-violet-100 text-violet-700",
  client_care: "bg-emerald-100 text-emerald-700",
  regulatory: "bg-amber-100 text-amber-700",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function CPDTab() {
  const [summary, setSummary] = useState<CpdSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/cpd")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load CPD data");
        return r.json() as Promise<CpdSummary>;
      })
      .then(setSummary)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-100 rounded-xl" />
        <div className="h-32 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <Icon name="alert-triangle" size={24} className="text-red-400 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-red-700">{error ?? "Failed to load CPD data."}</p>
      </div>
    );
  }

  const { earned, target, remaining, year, breakdown, courses } = summary;
  const pct = Math.min(100, Math.round((earned / target) * 100));
  const isComplete = earned >= target;

  // Breakdown bars
  const breakdownItems = [
    { key: "technical", label: "Technical", value: breakdown.technical },
    { key: "conduct", label: "Conduct", value: breakdown.conduct },
    { key: "client_care", label: "Client Care", value: breakdown.client_care },
    { key: "regulatory", label: "Regulatory", value: breakdown.regulatory },
  ] as const;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-slate-900">CPD Tracker</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Continuing Professional Development — ASIC requires 40 hours per CPD year (July–June).
          Current year: {year}.
        </p>
      </div>

      {/* Progress card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
        <CircularProgress earned={earned} target={target} />

        <div className="flex-1 min-w-0 text-center sm:text-left">
          {isComplete ? (
            <>
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-2">
                <Icon name="check-circle" size={14} />
                CPD Year Complete
              </div>
              <p className="text-2xl font-extrabold text-slate-900">
                {earned} / {target} hours
              </p>
              <p className="text-sm text-slate-500 mt-1">
                You&apos;ve met your {year} CPD requirement. Well done!
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-slate-900">
                {earned} / {target} hours
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-semibold text-violet-700">{remaining} hours remaining</span>
                {" "}to meet your {year} requirement ({pct}% complete).
              </p>
              <Link
                href="/courses?cpd=1"
                className="inline-block mt-3 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
              >
                Browse CPD Courses
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Breakdown by category */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Hours by Category</h3>
        <div className="space-y-3">
          {breakdownItems.map(({ key, label, value }) => {
            const catPct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[key]}`}>
                    {label}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {value > 0 ? `${value} hr${value !== 1 ? "s" : ""}` : "—"}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      key === "technical" ? "bg-blue-500"
                        : key === "conduct" ? "bg-violet-500"
                        : key === "client_care" ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${catPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[0.6rem] text-slate-400 mt-3">
          ASIC does not mandate a split between categories — all hours count toward the 40-hour total.
          The breakdown is shown for your own records.
        </p>
      </div>

      {/* Completed CPD courses */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">CPD Courses Completed</h3>
        <p className="text-[0.6rem] text-slate-400 mb-3">
          Courses you&apos;ve finished that count toward your {year} CPD hours.
        </p>

        {courses.length > 0 ? (
          <div className="space-y-2">
            {courses.map((c) => (
              <div
                key={c.course_id}
                className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {c.course_title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                        CATEGORY_COLORS[c.cpd_category] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {CATEGORY_LABELS[c.cpd_category] ?? c.cpd_category}
                    </span>
                    <span className="text-[0.6rem] text-slate-400">
                      {new Date(c.completed_at).toLocaleDateString("en-AU")}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-emerald-600">
                    +{c.hours_earned} hr{c.hours_earned !== 1 ? "s" : ""}
                  </p>
                  {c.certificate_number && (
                    <p className="text-[0.55rem] text-slate-400 mt-0.5">
                      {c.certificate_number}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Icon name="award" size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">
              No CPD courses completed yet for {year}.
            </p>
            <Link
              href="/courses?cpd=1"
              className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
            >
              Browse CPD Courses →
            </Link>
          </div>
        )}
      </div>

      {/* Compliance note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <div className="flex gap-2">
          <Icon name="info" size={14} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>ASIC CPD Requirements:</strong> Licensed financial advisers must complete 40 CPD
            hours per year (July 1 – June 30). Hours must be split across structured and unstructured
            activities. Courses completed on invest.com.au may count as structured CPD — check with
            your licensee to confirm the activities are approved for your AFSL.
          </div>
        </div>
      </div>
    </div>
  );
}
