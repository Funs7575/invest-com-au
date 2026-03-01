"use client";

import { useEffect, useState } from "react";
import type { CohortStats } from "@/lib/types";

// Editorial fallback data for when cohort is too small
const ILLUSTRATIVE_DATA: CohortStats = {
  cohort_label: "Illustrative",
  total_count: 0,
  sufficient_data: false,
  broker_distribution: [
    { broker_slug: "stake", broker_name: "Stake", count: 34, percentage: 34 },
    { broker_slug: "commsec", broker_name: "CommSec", count: 25, percentage: 25 },
    { broker_slug: "selfwealth", broker_name: "SelfWealth", count: 18, percentage: 18 },
    { broker_slug: "cmc-markets", broker_name: "CMC Markets", count: 14, percentage: 14 },
    { broker_slug: "moomoo", broker_name: "Moomoo", count: 9, percentage: 9 },
  ],
};

const BAR_COLORS = ["#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac"];

interface Props {
  experience: string;
  range: string;
  interest?: string;
}

export default function CohortInsights({ experience, range, interest }: Props) {
  const [data, setData] = useState<CohortStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ experience, range });
    if (interest) params.set("interest", interest);

    fetch(`/api/cohort-stats?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [experience, range, interest]);

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-48 bg-slate-200 rounded mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Use real data if sufficient, otherwise use editorial illustrative data
  const displayData = data?.sufficient_data ? data : ILLUSTRATIVE_DATA;
  const isIllustrative = !data?.sufficient_data;
  const cohortLabel = data?.cohort_label || "Similar Investors";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-700">
          People Like You Also Chose
        </h3>
        {isIllustrative && (
          <span className="text-[0.69rem] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
            Sample Data
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {isIllustrative ? (
          <>
            Based on editorial research for <strong>{cohortLabel}</strong> investors.
            Personalised data appears once enough quiz responses are collected.
          </>
        ) : (
          <>
            Based on <strong>{data!.total_count}</strong> quiz results from{" "}
            <strong>{cohortLabel}</strong> investors.
          </>
        )}
      </p>

      <div className="space-y-2.5">
        {displayData.broker_distribution.map((b, i) => (
          <div key={b.broker_slug} className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-700 w-24 truncate">
              {b.broker_name}
            </span>
            <div className="flex-1 h-5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${b.percentage}%`,
                  background: BAR_COLORS[i] || BAR_COLORS[4],
                }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 w-10 text-right">
              {b.percentage}%
            </span>
          </div>
        ))}
      </div>

      {isIllustrative && (
        <p className="text-[0.69rem] text-slate-400 mt-3 italic">
          Based on our editorial research, not live user data. Personalised
          cohort statistics will replace these once enough quiz responses from
          similar investor profiles are collected.
        </p>
      )}
    </div>
  );
}
