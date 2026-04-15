/**
 * Tiny server-rendered SVG chart for daily verdict counts.
 *
 * Renders an auto-acted vs escalated vs rejected stacked area
 * chart for a single feature. No client JS — we don't need
 * interactivity for a small static dashboard chart, and avoiding
 * a chart lib keeps the bundle lean.
 *
 * Input is an array of rows from automation_verdict_daily. Rows
 * are expected to be ordered by day ascending; the chart pads
 * missing days with zeros internally.
 */

export interface VerdictDailyRow {
  day: string; // ISO date
  auto_acted: number;
  escalated: number;
  rejected: number;
  approved: number;
}

interface Props {
  rows: VerdictDailyRow[];
  width?: number;
  height?: number;
  daysBack?: number;
}

const SERIES: Array<{
  key: keyof Omit<VerdictDailyRow, "day">;
  label: string;
  color: string;
}> = [
  { key: "auto_acted", label: "Auto-acted", color: "#10b981" },
  { key: "escalated", label: "Escalated", color: "#f59e0b" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
];

export default function VerdictChart({
  rows,
  width = 640,
  height = 180,
  daysBack = 30,
}: Props) {
  // Build a dense array of the last N days so gaps show as zero.
  const today = new Date();
  const dense: VerdictDailyRow[] = [];
  const rowByDay = new Map(rows.map((r) => [r.day, r]));
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dense.push(
      rowByDay.get(key) || {
        day: key,
        auto_acted: 0,
        escalated: 0,
        rejected: 0,
        approved: 0,
      },
    );
  }

  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = Math.max(
    1,
    ...dense.map((d) => d.auto_acted + d.escalated + d.rejected),
  );

  // Build stacked area paths
  const xOf = (i: number) =>
    dense.length > 1 ? padL + (i * innerW) / (dense.length - 1) : padL + innerW / 2;
  const yOf = (v: number) => padT + innerH - (v / max) * innerH;

  // For stacked series we accumulate bottom offsets per point.
  const bottoms = dense.map(() => 0);
  const seriesPaths: Array<{ color: string; label: string; d: string }> = [];

  for (const s of SERIES) {
    const topPoints: string[] = [];
    const bottomPoints: string[] = [];
    dense.forEach((row, i) => {
      const bottom = bottoms[i];
      const top = bottom + (row[s.key] as number);
      topPoints.push(`${xOf(i)},${yOf(top)}`);
      bottomPoints.push(`${xOf(i)},${yOf(bottom)}`);
      bottoms[i] = top;
    });
    const d = `M ${topPoints.join(" L ")} L ${bottomPoints.reverse().join(" L ")} Z`;
    seriesPaths.push({ color: s.color, label: s.label, d });
  }

  // Y axis ticks (0, max/2, max)
  const ticks = [0, Math.round(max / 2), max];

  return (
    <figure className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <figcaption className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Verdicts, last {daysBack} days</h3>
        <div className="flex gap-3 text-[0.65rem]">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-slate-600">{s.label}</span>
            </span>
          ))}
        </div>
      </figcaption>
      <div className="p-3">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Verdicts chart">
          {/* grid */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={width - padR}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke="#e2e8f0"
                strokeDasharray="2 2"
              />
              <text
                x={padL - 4}
                y={yOf(t) + 3}
                textAnchor="end"
                fontSize="9"
                fill="#64748b"
              >
                {t}
              </text>
            </g>
          ))}

          {/* stacked areas */}
          {seriesPaths.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} fillOpacity={0.6} stroke={s.color} strokeWidth="1" />
          ))}

          {/* x-axis labels at the ends */}
          <text x={padL} y={height - 6} fontSize="9" fill="#64748b">
            {dense[0]?.day.slice(5)}
          </text>
          <text x={width - padR} y={height - 6} fontSize="9" fill="#64748b" textAnchor="end">
            {dense[dense.length - 1]?.day.slice(5)}
          </text>
        </svg>
      </div>
    </figure>
  );
}
