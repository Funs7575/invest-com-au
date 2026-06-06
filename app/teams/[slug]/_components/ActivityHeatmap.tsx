/**
 * Activity heatmap for a Pro Squad — day-of-week × hour-of-day grid of
 * member-side `brief_messages` over the last 90 days. Server-rendered;
 * receives pre-bucketed data from the parent page so this component
 * stays a pure visualisation.
 *
 * Consumer trust signal: shows when the squad is most responsive
 * without asking the squad to write copy. A pro looking at the team
 * profile sees "they're typically online Tuesdays 10am–4pm" at a
 * glance.
 */

interface Props {
  /** 7×24 matrix — buckets[day][hour] = message count. Day 0 = Sunday. */
  buckets: number[][];
  /** Total messages across the matrix — controls whether we render. */
  total: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ActivityHeatmap({ buckets, total }: Props) {
  if (total === 0) return null;

  // Find max bucket so we can scale opacity.
  let max = 0;
  for (const row of buckets) {
    for (const n of row) {
      if (n > max) max = n;
    }
  }
  if (max === 0) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
      <h2 className="text-sm font-bold text-slate-900 mb-1">
        When this squad is most active
      </h2>
      <p className="text-xs text-slate-600 mb-4">
        Member-side message activity over the last 90 days. Darker cells
        = more replies. Times shown in your local timezone (
        {Intl.DateTimeFormat().resolvedOptions().timeZone}).
      </p>
      <div className="overflow-x-auto">
        <table className="text-[10px] text-slate-500 select-none">
          <thead>
            <tr>
              <th scope="col" className="w-10" />
              {Array.from({ length: 24 }).map((_, h) => (
                <th
                  key={h}
                  className="font-normal text-center w-4"
                  scope="col"
                >
                  {h % 6 === 0 ? h.toString().padStart(2, "0") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((row, day) => (
              <tr key={day}>
                <th
                  className="font-semibold text-right pr-2 text-slate-700"
                  scope="row"
                >
                  {DAY_LABELS[day]}
                </th>
                {row.map((count, hour) => {
                  const intensity = count === 0 ? 0 : count / max;
                  // Tailwind doesn't allow arbitrary opacity classes
                  // mid-render, so map intensity onto a discrete scale.
                  const bgCls =
                    intensity === 0
                      ? "bg-slate-100"
                      : intensity < 0.2
                        ? "bg-emerald-200"
                        : intensity < 0.5
                          ? "bg-emerald-400"
                          : intensity < 0.8
                            ? "bg-emerald-600"
                            : "bg-emerald-800";
                  return (
                    <td
                      key={hour}
                      title={
                        count > 0
                          ? `${DAY_LABELS[day]} ${hour}:00 — ${count} replies`
                          : ""
                      }
                      className={`${bgCls} w-4 h-4 border border-white`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          {["bg-slate-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600", "bg-emerald-800"].map(
            (cls) => (
              <span key={cls} className={`w-3 h-3 ${cls} rounded-sm`} />
            ),
          )}
        </div>
        <span>More</span>
        <span className="ml-auto">
          {total.toLocaleString()} replies analysed
        </span>
      </div>
    </section>
  );
}
