/**
 * Reusable donut/ring chart — pure SVG, no external libraries.
 * Renders a donut chart with legend showing percentages.
 */

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface SVGDonutChartProps {
  data: DonutSegment[];
  /** Outer radius */
  size?: number;
  /** Ring thickness as fraction of radius (0-1) */
  thickness?: number;
  /** Center label (e.g., total) */
  centerLabel?: string;
  /** Center sub-label */
  centerSubLabel?: string;
  /** Show legend */
  showLegend?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  "#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed",
  "#059669", "#0891b2", "#e11d48", "#4f46e5", "#ca8a04",
];

export default function SVGDonutChart({
  data,
  size = 160,
  thickness = 0.35,
  centerLabel,
  centerSubLabel,
  showLegend = true,
  className = "",
}: SVGDonutChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * (1 - thickness);

  // Build arc segments
  let cumAngle = -90; // Start from top
  const segments = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1Outer = cx + outerR * Math.cos(startRad);
    const y1Outer = cy + outerR * Math.sin(startRad);
    const x2Outer = cx + outerR * Math.cos(endRad);
    const y2Outer = cy + outerR * Math.sin(endRad);

    const x1Inner = cx + innerR * Math.cos(endRad);
    const y1Inner = cy + innerR * Math.sin(endRad);
    const x2Inner = cx + innerR * Math.cos(startRad);
    const y2Inner = cy + innerR * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
      "Z",
    ].join(" ");

    return {
      ...d,
      path,
      color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      percentage: ((d.value / total) * 100).toFixed(1),
    };
  });

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        aria-hidden="true"
      >
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="white"
            strokeWidth={1.5}
          >
            <title>{`${seg.label}: ${seg.value} (${seg.percentage}%)`}</title>
          </path>
        ))}

        {/* Center labels */}
        {centerLabel && (
          <text
            x={cx}
            y={centerSubLabel ? cy - 6 : cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={18}
            fontWeight={700}
            fill="#1e293b"
          >
            {centerLabel}
          </text>
        )}
        {centerSubLabel && (
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#94a3b8"
          >
            {centerSubLabel}
          </text>
        )}
      </svg>

      {showLegend && (
        <div className="space-y-1.5 min-w-0">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-slate-600 truncate">{seg.label}</span>
              <span className="text-slate-900 font-semibold ml-auto whitespace-nowrap">
                {seg.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
