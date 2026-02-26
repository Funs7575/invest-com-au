/**
 * Tiny inline SVG sparkline for showing trends in KPI cards.
 * No external dependencies — pure SVG polyline.
 *
 * Usage: <Sparkline data={[3, 5, 2, 8, 4]} color="#3b82f6" />
 */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showFill?: boolean;
  className?: string;
}

export default function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#3b82f6",
  showFill = true,
  className = "",
}: SparklineProps) {
  if (data.length < 2) return null;

  const padding = 1;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const fillPoints = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block ${className}`}
      aria-hidden="true"
    >
      {showFill && (
        <polygon
          points={fillPoints}
          fill={color}
          opacity={0.1}
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2);
        const lastY = padding + (1 - (data[data.length - 1] - min) / range) * (height - padding * 2);
        return <circle cx={lastX} cy={lastY} r={2} fill={color} />;
      })()}
    </svg>
  );
}
