/**
 * Pure-SVG radar / spider chart for multi-broker comparison.
 *
 * Stays consistent with the codebase's hand-rolled chart convention
 * (no recharts/d3) — see SVGBarChart, SVGLineChart, SVGDonutChart.
 *
 * Each axis is normalised against its own (min, max) so e.g. broker
 * rating (1-5 higher-better) and FX spread (0-1.5% lower-better) can
 * coexist on the same polygon. `polarity: "lower-better"` flips the
 * axis so a lower raw value plots at the outer edge (visually "good").
 *
 * Accessibility: each polygon gets a <title> via aria-label rather than
 * the parent SVG being aria-hidden — the data is meaningful and screen
 * readers should hear it. WCAG 1.4.11 — every series gets a distinct
 * stroke colour AND a distinct dasharray so colour-blind users aren't
 * left guessing.
 */

export interface RadarAxis {
  label: string;
  /** Minimum raw value for normalisation. If omitted, derived from data. */
  min?: number;
  /** Maximum raw value for normalisation. If omitted, derived from data. */
  max?: number;
  /** "higher-better" plots high values at the outer edge (default). */
  polarity?: "higher-better" | "lower-better";
}

export interface RadarSeries {
  name: string;
  /**
   * Values aligned to the `axes` prop by index. `null` means "no data" —
   * the polygon collapses to the centre on that axis (we don't pretend
   * an unknown is best/worst).
   */
  values: ReadonlyArray<number | null>;
  /** Optional explicit colour. If omitted, picks from DEFAULT_COLOURS. */
  color?: string;
}

interface SVGRadarChartProps {
  axes: ReadonlyArray<RadarAxis>;
  series: ReadonlyArray<RadarSeries>;
  /** Outer chart size in px. Internal coords are `viewBox`-driven so this scales. */
  size?: number;
  /** Number of concentric grid rings. */
  rings?: number;
  className?: string;
}

const DEFAULT_COLOURS = [
  "#0ea5e9", // sky-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
];

const DEFAULT_DASHARRAYS = ["0", "4 4", "2 6", "8 4"];

function deriveRange(
  axes: ReadonlyArray<RadarAxis>,
  series: ReadonlyArray<RadarSeries>,
): Array<{ min: number; max: number; polarity: "higher-better" | "lower-better" }> {
  return axes.map((axis, i) => {
    const polarity = axis.polarity ?? "higher-better";
    if (axis.min !== undefined && axis.max !== undefined) {
      return { min: axis.min, max: axis.max, polarity };
    }
    const values = series
      .map((s) => s.values[i])
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (values.length === 0) return { min: 0, max: 1, polarity };
    return {
      min: axis.min ?? Math.min(...values),
      max: axis.max ?? Math.max(...values),
      polarity,
    };
  });
}

function pointFor(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  norm01: number,
): [number, number] {
  const r = radius * Math.max(0, Math.min(1, norm01));
  return [cx + Math.sin(angle) * r, cy - Math.cos(angle) * r];
}

export default function SVGRadarChart({
  axes,
  series,
  size = 340,
  rings = 4,
  className = "",
}: SVGRadarChartProps) {
  if (axes.length < 3) {
    // Radar charts need at least 3 axes to be a polygon.
    return null;
  }
  if (series.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  // Leave generous padding for axis labels around the edge.
  const radius = size / 2 - 56;

  const ranges = deriveRange(axes, series);
  const angleStep = (Math.PI * 2) / axes.length;

  // Concentric grid polygons (visual reference for value scale).
  const gridPolygons: string[] = [];
  for (let r = 1; r <= rings; r += 1) {
    const fraction = r / rings;
    const pts = axes
      .map((_, i) => {
        const [x, y] = pointFor(cx, cy, radius, i * angleStep, fraction);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    gridPolygons.push(pts);
  }

  // Axis spokes from centre to perimeter.
  const spokes = axes.map((_, i) => {
    const [x, y] = pointFor(cx, cy, radius, i * angleStep, 1);
    return { x1: cx, y1: cy, x2: x, y2: y };
  });

  // Per-series polygon points.
  const seriesPolygons = series.map((s, sIdx) => {
    const stroke = s.color ?? DEFAULT_COLOURS[sIdx % DEFAULT_COLOURS.length] ?? "#64748b";
    const dasharray = DEFAULT_DASHARRAYS[sIdx % DEFAULT_DASHARRAYS.length] ?? "0";
    const points = axes
      .map((_, i) => {
        const raw = s.values[i];
        const range = ranges[i];
        if (
          raw === null ||
          raw === undefined ||
          Number.isNaN(raw) ||
          !range
        ) {
          // Collapse this vertex to centre on missing data.
          return `${cx.toFixed(1)},${cy.toFixed(1)}`;
        }
        const span = range.max - range.min;
        if (span === 0) {
          // All values identical → mid-radius.
          const [x, y] = pointFor(cx, cy, radius, i * angleStep, 0.5);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }
        let norm = (raw - range.min) / span;
        if (range.polarity === "lower-better") norm = 1 - norm;
        const [x, y] = pointFor(cx, cy, radius, i * angleStep, norm);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { name: s.name, points, stroke, dasharray };
  });

  // Axis labels positioned slightly outside the perimeter.
  const labels = axes.map((axis, i) => {
    const [lx, ly] = pointFor(cx, cy, radius + 18, i * angleStep, 1);
    // Anchor based on quadrant so labels don't overlap the polygon.
    const angle = i * angleStep;
    let textAnchor: "start" | "middle" | "end" = "middle";
    if (Math.sin(angle) > 0.2) textAnchor = "start";
    else if (Math.sin(angle) < -0.2) textAnchor = "end";
    return { label: axis.label, x: lx, y: ly, textAnchor };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`block ${className}`}
      role="img"
      aria-label={`Radar comparison of ${series
        .map((s) => s.name)
        .join(", ")} across ${axes.length} dimensions`}
    >
      {/* Grid polygons */}
      <g aria-hidden="true">
        {gridPolygons.map((pts, i) => (
          <polygon
            key={`grid-${i}`}
            points={pts}
            className="fill-slate-50 stroke-slate-200"
            strokeWidth={1}
          />
        ))}
        {spokes.map((s, i) => (
          <line
            key={`spoke-${i}`}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            className="stroke-slate-200"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Series polygons (drawn after grid so they sit on top) */}
      {seriesPolygons.map((sp, i) => (
        <g key={sp.name + i}>
          <title>{sp.name}</title>
          <polygon
            points={sp.points}
            fill={sp.stroke}
            fillOpacity={0.15}
            stroke={sp.stroke}
            strokeWidth={2}
            strokeDasharray={sp.dasharray}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {/* Axis labels */}
      <g>
        {labels.map((l, i) => (
          <text
            key={`label-${i}`}
            x={l.x}
            y={l.y}
            textAnchor={l.textAnchor}
            dominantBaseline="middle"
            fontSize={11}
            className="fill-slate-700 select-none"
          >
            {l.label}
          </text>
        ))}
      </g>

      {/* Legend (bottom-aligned, single row, wraps if needed via foreignObject-free fallback) */}
      <g transform={`translate(${cx}, ${size - 8})`} aria-hidden="true">
        {series.map((s, sIdx) => {
          const stroke =
            s.color ?? DEFAULT_COLOURS[sIdx % DEFAULT_COLOURS.length] ?? "#64748b";
          const x = (sIdx - (series.length - 1) / 2) * 84;
          return (
            <g key={s.name + sIdx} transform={`translate(${x}, 0)`}>
              <rect x={-32} y={-7} width={10} height={2} fill={stroke} />
              <text
                x={-18}
                y={-3}
                fontSize={10}
                className="fill-slate-700 select-none"
              >
                {s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
