/**
 * Reusable line chart — pure SVG, no external libraries.
 * Renders a time-series line chart with optional area fill, dots, and grid.
 */

interface DataPoint {
  label: string;
  value: number;
}

interface SVGLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

export default function SVGLineChart({
  data,
  width = 500,
  height = 200,
  color = "#16a34a",
  showArea = true,
  showDots = true,
  showGrid = true,
  formatValue = (v) => String(v),
  className = "",
}: SVGLineChartProps) {
  if (data.length < 2) return null;

  const padding = { top: 20, right: 16, bottom: 32, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + (1 - (d.value - minVal) / range) * chartHeight,
    ...d,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const areaPath = [
    `M ${points[0].x} ${padding.top + chartHeight}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${padding.top + chartHeight}`,
    "Z",
  ].join(" ");

  // Grid lines
  const gridLines = 4;
  const gridSteps = Array.from({ length: gridLines + 1 }, (_, i) => {
    const val = minVal + (i / gridLines) * range;
    const y = padding.top + (1 - i / gridLines) * chartHeight;
    return { val, y };
  });

  // X axis labels (show ~5)
  const xLabelStep = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xLabelStep === 0 || i === data.length - 1);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full ${className}`}
      style={{ maxWidth: width }}
      aria-hidden="true"
    >
      {/* Grid lines */}
      {showGrid &&
        gridSteps.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.y}
              x2={padding.left + chartWidth}
              y2={g.y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={i === 0 ? "0" : "4,4"}
            />
            <text
              x={padding.left - 8}
              y={g.y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              fill="#94a3b8"
            >
              {formatValue(g.val)}
            </text>
          </g>
        ))}

      {/* Area fill */}
      {showArea && (
        <path d={areaPath} fill={color} opacity={0.08} />
      )}

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {showDots &&
        points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="white" stroke={color} strokeWidth={2} />
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </g>
        ))}

      {/* X axis labels */}
      {xLabels.map((d, i) => {
        const idx = data.indexOf(d);
        const x = padding.left + (idx / (data.length - 1)) * chartWidth;
        return (
          <text
            key={i}
            x={x}
            y={height - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
