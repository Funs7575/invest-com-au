/**
 * Reusable horizontal bar chart — pure SVG, no external libraries.
 * Renders labeled horizontal bars with optional value labels.
 */

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface SVGBarChartProps {
  data: BarItem[];
  /** Bar height in px */
  barHeight?: number;
  /** Gap between bars in px */
  gap?: number;
  /** Max width of chart area in px */
  width?: number;
  /** Format value for display */
  formatValue?: (v: number) => string;
  /** Default bar color */
  color?: string;
  className?: string;
}

export default function SVGBarChart({
  data,
  barHeight = 28,
  gap = 8,
  width = 500,
  formatValue = (v) => String(v),
  color = "#16a34a",
  className = "",
}: SVGBarChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const labelWidth = 140;
  const valueWidth = 70;
  const chartWidth = width - labelWidth - valueWidth;
  const totalHeight = data.length * (barHeight + gap) - gap + 8;

  return (
    <svg
      width={width}
      height={totalHeight}
      viewBox={`0 0 ${width} ${totalHeight}`}
      className={`block w-full ${className}`}
      style={{ maxWidth: width }}
      aria-hidden="true"
    >
      {data.map((item, i) => {
        const y = i * (barHeight + gap) + 4;
        const barWidth = Math.max((item.value / maxValue) * chartWidth, 2);
        const barColor = item.color || color;

        return (
          <g key={item.label + i}>
            {/* Label */}
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={11}
              fill="#64748b"
              className="select-none"
            >
              {item.label.length > 18
                ? item.label.slice(0, 17) + "..."
                : item.label}
            </text>

            {/* Bar background */}
            <rect
              x={labelWidth}
              y={y}
              width={chartWidth}
              height={barHeight}
              rx={4}
              fill="#f1f5f9"
            />

            {/* Bar */}
            <rect
              x={labelWidth}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={barColor}
              opacity={0.85}
            >
              <animate
                attributeName="width"
                from="0"
                to={barWidth}
                dur="0.5s"
                fill="freeze"
              />
            </rect>

            {/* Value label */}
            <text
              x={labelWidth + chartWidth + 8}
              y={y + barHeight / 2}
              textAnchor="start"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={600}
              fill="#334155"
              className="select-none"
            >
              {formatValue(item.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
