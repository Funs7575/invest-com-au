/**
 * Reusable funnel visualization — pure SVG, no external libraries.
 * Renders a series of trapezoid stages getting narrower toward the bottom.
 */

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface SVGFunnelProps {
  stages: FunnelStage[];
  width?: number;
  stageHeight?: number;
  gap?: number;
  className?: string;
}

const DEFAULT_FUNNEL_COLORS = [
  "#16a34a", "#22c55e", "#65a30d", "#d97706", "#dc2626",
];

export default function SVGFunnel({
  stages,
  width = 480,
  stageHeight = 52,
  gap = 4,
  className = "",
}: SVGFunnelProps) {
  if (stages.length === 0) return null;

  const maxValue = stages[0]?.value || 1;
  const totalHeight = stages.length * (stageHeight + gap) - gap + 20;
  const padding = 16;
  const labelAreaWidth = 160;
  const funnelAreaWidth = width - labelAreaWidth - padding * 2;
  const centerX = labelAreaWidth + padding + funnelAreaWidth / 2;

  return (
    <svg
      width={width}
      height={totalHeight}
      viewBox={`0 0 ${width} ${totalHeight}`}
      className={`block w-full ${className}`}
      style={{ maxWidth: width }}
      aria-hidden="true"
    >
      {stages.map((stage, i) => {
        const y = i * (stageHeight + gap) + 10;
        const nextStage = stages[i + 1];

        // Current stage width based on value proportion
        const topWidthRatio = stage.value / maxValue;
        const bottomWidthRatio = nextStage
          ? nextStage.value / maxValue
          : topWidthRatio * 0.7;

        const topHalfWidth = (topWidthRatio * funnelAreaWidth) / 2;
        const bottomHalfWidth = (bottomWidthRatio * funnelAreaWidth) / 2;

        const color =
          stage.color || DEFAULT_FUNNEL_COLORS[i % DEFAULT_FUNNEL_COLORS.length];

        // Trapezoid points
        const x1 = centerX - topHalfWidth; // top-left
        const x2 = centerX + topHalfWidth; // top-right
        const x3 = centerX + bottomHalfWidth; // bottom-right
        const x4 = centerX - bottomHalfWidth; // bottom-left

        const dropOff =
          i > 0
            ? (((stages[i - 1].value - stage.value) / stages[i - 1].value) * 100).toFixed(1)
            : null;

        const convRate = ((stage.value / maxValue) * 100).toFixed(1);

        return (
          <g key={stage.label + i}>
            {/* Trapezoid shape */}
            <polygon
              points={`${x1},${y} ${x2},${y} ${x3},${y + stageHeight} ${x4},${y + stageHeight}`}
              fill={color}
              opacity={0.85}
              rx={4}
            />

            {/* Value label inside */}
            <text
              x={centerX}
              y={y + stageHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fontWeight={700}
              fill="white"
              className="select-none"
            >
              {stage.value.toLocaleString()}
            </text>

            {/* Stage label on left */}
            <text
              x={labelAreaWidth - 4}
              y={y + stageHeight / 2 - 6}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={600}
              fill="#334155"
              className="select-none"
            >
              {stage.label}
            </text>

            {/* Conversion rate under label */}
            <text
              x={labelAreaWidth - 4}
              y={y + stageHeight / 2 + 8}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={10}
              fill="#94a3b8"
              className="select-none"
            >
              {convRate}% of total
            </text>

            {/* Drop-off arrow between stages */}
            {dropOff && (
              <text
                x={centerX + topHalfWidth + 12}
                y={y + stageHeight / 2}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={10}
                fill="#ef4444"
                fontWeight={600}
                className="select-none"
              >
                -{dropOff}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
