"use client";

/**
 * Client-side rendering of the 14-day day×hour availability overlay.
 *
 * Reasons it's a client component despite no obvious interactivity:
 * (1) we render times in the visitor's local timezone — server doesn't
 *     know that; (2) the booking-link click should open in a new tab
 *     without a page reload; (3) keeps the parent page lightweight
 *     since the bucket math runs in the browser on a small data set.
 *
 * For each pro_availability_slot we increment one bucket per hour the
 * slot covers (rounded down). Buckets are keyed by (dayIndex, hour)
 * where day 0 = today.
 */

import { useMemo, useState } from "react";
import Link from "next/link";

interface Slot {
  professionalId: number;
  proName: string;
  startAt: string;
  endAt: string;
}

interface Props {
  slots: Slot[];
  memberCount: number;
}

interface CellKey {
  dayIndex: number;
  hour: number;
}

interface CellData extends CellKey {
  pros: { id: number; name: string }[];
}

const HOURS_TO_SHOW = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function bucketKey(d: Date): string {
  const dayIdx = Math.floor((d.getTime() - startOfToday()) / 86_400_000);
  return `${dayIdx}-${d.getHours()}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function TeamAvailabilityGrid({ slots, memberCount }: Props) {
  const [hovered, setHovered] = useState<CellData | null>(null);

  const buckets = useMemo(() => {
    const map = new Map<string, CellData>();
    const todayStart = startOfToday();

    for (const slot of slots) {
      const start = new Date(slot.startAt);
      const end = new Date(slot.endAt);
      // Walk each hour the slot covers and tag the bucket.
      const cursor = new Date(start);
      cursor.setMinutes(0, 0, 0);
      while (cursor < end) {
        const dayIdx = Math.floor((cursor.getTime() - todayStart) / 86_400_000);
        if (dayIdx >= 0 && dayIdx < 14) {
          const key = bucketKey(cursor);
          let cell = map.get(key);
          if (!cell) {
            cell = { dayIndex: dayIdx, hour: cursor.getHours(), pros: [] };
            map.set(key, cell);
          }
          if (!cell.pros.some((p) => p.id === slot.professionalId)) {
            cell.pros.push({ id: slot.professionalId, name: slot.proName });
          }
        }
        cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
      }
    }
    return map;
  }, [slots]);

  const days = useMemo(() => {
    const out: { dayIndex: number; label: string; isWeekend: boolean }[] = [];
    const todayStart = new Date(startOfToday());
    for (let i = 0; i < 14; i++) {
      const d = new Date(todayStart.getTime() + i * 86_400_000);
      const day = d.getDay();
      out.push({
        dayIndex: i,
        label: d.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
        }),
        isWeekend: day === 0 || day === 6,
      });
    }
    return out;
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6">
      <div className="overflow-x-auto">
        <table className="text-xs text-slate-700 min-w-full">
          <thead>
            <tr>
              <th scope="col" className="text-left font-semibold pr-2 pb-2 sticky left-0 bg-white">
                Time
              </th>
              {days.map((d) => (
                <th
                  key={d.dayIndex}
                  className={`pb-2 px-1 text-center font-semibold ${
                    d.isWeekend ? "text-slate-400" : "text-slate-700"
                  }`}
                  scope="col"
                >
                  <span className="block text-[10px]">{d.label.split(" ")[0]}</span>
                  <span className="block text-sm">{d.label.split(" ")[1]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS_TO_SHOW.map((h) => (
              <tr key={h}>
                <th
                  className="text-right font-medium pr-2 py-0.5 text-slate-500 sticky left-0 bg-white"
                  scope="row"
                >
                  {h.toString().padStart(2, "0")}:00
                </th>
                {days.map((d) => {
                  const cell = buckets.get(`${d.dayIndex}-${h}`);
                  const count = cell?.pros.length ?? 0;
                  // Discrete intensity: 0, 1, 2-3, 4+.
                  const bgCls =
                    count === 0
                      ? "bg-slate-50"
                      : count === 1
                        ? "bg-emerald-200"
                        : count <= 3
                          ? "bg-emerald-400"
                          : "bg-emerald-600";
                  const ringCls =
                    hovered &&
                    hovered.dayIndex === d.dayIndex &&
                    hovered.hour === h
                      ? "ring-2 ring-violet-500"
                      : "";
                  // Single-pro cell → deep-link to that pro's booking flow.
                  const singleProHref =
                    cell && cell.pros.length === 1
                      ? `/pros/${cell.pros[0]?.id}#book`
                      : null;
                  const inner = (
                    <span className={`block w-full h-5 ${bgCls} ${ringCls}`} />
                  );
                  return (
                    <td
                      key={d.dayIndex}
                      className="p-0.5 align-middle"
                      onMouseEnter={() =>
                        cell ? setHovered(cell) : setHovered(null)
                      }
                      onMouseLeave={() => setHovered(null)}
                    >
                      {singleProHref ? (
                        <Link
                          href={singleProHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-slate-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          {["bg-slate-50", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map(
            (cls) => (
              <span key={cls} className={`w-4 h-3 ${cls} rounded-sm border border-slate-200`} />
            ),
          )}
        </div>
        <span>More members open</span>
        <span className="ml-auto">
          Showing next 14 days × {memberCount}{" "}
          {memberCount === 1 ? "member" : "members"} ·{" "}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </span>
      </div>

      {hovered && (
        <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs">
          <p className="font-semibold text-violet-900 mb-1">
            Day {hovered.dayIndex === 0 ? "today" : `+${hovered.dayIndex}`} ·{" "}
            {hovered.hour.toString().padStart(2, "0")}:00 — open from{" "}
            {hovered.pros.length}{" "}
            {hovered.pros.length === 1 ? "member" : "members"}
          </p>
          <ul className="space-y-0.5">
            {hovered.pros.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pros/${p.id}#book`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-700 hover:text-violet-900 hover:underline"
                >
                  {p.name} → book
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
