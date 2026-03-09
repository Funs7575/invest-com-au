"use client";

import Link from "next/link";

interface DailyClickData {
  date: string;
  count: number;
}

interface Props {
  dailyClicks: DailyClickData[];
}

export default function AdminClickChart({ dailyClicks }: Props) {
  const chartHeight = 120;
  const chartMax = Math.max(...dailyClicks.map((d) => d.count), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Click Trend</h2>
          <p className="text-xs text-slate-500">Last 14 days</p>
        </div>
        <Link href="/admin/analytics" className="text-xs text-amber-600 hover:text-amber-700">
          Full Analytics →
        </Link>
      </div>
      <div className="flex items-end gap-1" style={{ height: chartHeight }}>
        {dailyClicks.map((d, i) => {
          const barH = chartMax > 0 ? (d.count / chartMax) * (chartHeight - 20) : 0;
          const isToday = d.date === new Date().toISOString().split("T")[0];
          const isLastWeek = i < 7;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end group relative"
              style={{ height: chartHeight }}
            >
              {/* Tooltip */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[0.6rem] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {d.count} click{d.count !== 1 ? "s" : ""} · {new Date(d.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </div>
              <div
                className={`w-full rounded-t transition-colors ${
                  isToday
                    ? "bg-amber-500"
                    : isLastWeek
                    ? "bg-slate-200 group-hover:bg-slate-300"
                    : "bg-amber-400/70 group-hover:bg-amber-500"
                }`}
                style={{ height: Math.max(barH, 2), minHeight: 2 }}
              />
              {/* Date label — show every other day */}
              {i % 2 === 0 && (
                <div className="text-[0.55rem] text-slate-400 mt-1 leading-none">
                  {new Date(d.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[0.65rem] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" /> Previous 7d</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/70 inline-block" /> Last 7d</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Today</span>
      </div>
    </div>
  );
}
