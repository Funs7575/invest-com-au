/**
 * Server-safe icon component using Lucide-style SVG paths.
 * Works in both server and client components (no hooks, no "use client").
 *
 * Usage: <Icon name="sprout" size={24} className="text-green-600" />
 */

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

/* Each entry is an array of SVG path/element strings in d-attribute format.
   Circles use the format "circle:cx,cy,r" for special handling. */
const icons: Record<string, string[]> = {
  sprout: [
    "M7 20h10",
    "M10 20c5.5-2.5.8-6.4 3-10",
    "M9.5 9.4c1.1-1.7 3.4-3.2 6.5-2.8",
    "M13 14c-2-2-4.5-2.5-7 0",
  ],
  lightbulb: [
    "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
    "M9 18h6",
    "M10 22h4",
  ],
  target: [
    "circle:12,12,10",
    "circle:12,12,6",
    "circle:12,12,2",
  ],
  flame: [
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  ],
  coins: [
    "ellipse:12,5,10,3",
    "M2 12c0 1.66 4.47 3 10 3s10-1.34 10-3",
    "M2 5v14c0 1.66 4.47 3 10 3s10-1.34 10-3V5",
    "M2 8.5c0 1.66 4.47 3 10 3s10-1.34 10-3",
  ],
  "dollar-sign": [
    "M12 2v20",
    "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  ],
  calculator: [
    "rect:4,2,16,20,2",
    "M8 10h8",
    "M8 14h.01",
    "M12 14h.01",
    "M16 14h.01",
    "M8 18h.01",
    "M12 18h.01",
    "M16 18h.01",
    "M4 6h16",
  ],
  star: [
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  ],
  "shield-check": [
    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    "M9 12l2 2 4-4",
  ],
  lock: [
    "rect:3,11,18,11,2",
    "M7 11V7a5 5 0 0 1 10 0v4",
  ],
  building: [
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18",
    "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",
    "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",
    "M10 6h4",
    "M10 10h4",
    "M10 14h4",
    "M10 18h4",
  ],
  "arrow-left-right": [
    "M8 3L4 7l4 4",
    "M4 7h16",
    "M16 21l4-4-4-4",
    "M20 17H4",
  ],
  "arrow-right-left": [
    "M16 3l4 4-4 4",
    "M20 7H4",
    "M8 21l-4-4 4-4",
    "M4 17h16",
  ],
  search: [
    "circle:11,11,8",
    "M21 21l-4.35-4.35",
  ],
  swords: [
    "M14.5 17.5L3 6V3h3l11.5 11.5",
    "M13 19l6-6",
    "M16 16l4 4",
    "M19 21l2-2",
    "M14.5 6.5L18 3h3v3l-3.5 3.5",
    "M5 14l4 4",
    "M7 17l-3 3",
    "M3 21l2-2",
  ],
  globe: [
    "circle:12,12,10",
    "M2 12h20",
    "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  ],
  mail: [
    "rect:2,4,20,16,0",
    "M22 7l-10 7L2 7",
  ],
  trophy: [
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
    "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
    "M4 22h16",
    "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22",
    "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22",
    "M18 2H6v7a6 6 0 0 0 12 0V2z",
  ],
  "party-popper": [
    "M5.8 11.3L2 22l10.7-3.79",
    "M4 3h.01",
    "M22 8h.01",
    "M15 2h.01",
    "M22 20h.01",
    "M22 2l-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.09.6-.07 1.23-.44 1.74L13 14",
    "M8.65 10l4.35-4.35c.51-.37 1.14-.53 1.74-.44a2.9 2.9 0 0 0 3.12-1.96L22 2",
  ],
  "bar-chart": [
    "M12 20V10",
    "M6 20V4",
    "M18 20v-4",
  ],
  "file-text": [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6",
    "M16 13H8",
    "M16 17H8",
    "M10 9H8",
  ],
  calendar: [
    "rect:3,4,18,18,2",
    "M16 2v4",
    "M8 2v4",
    "M3 10h18",
  ],
  "pause-circle": [
    "circle:12,12,10",
    "M10 15V9",
    "M14 15V9",
  ],
  "alert-triangle": [
    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    "M12 9v4",
    "M12 17h.01",
  ],
  scale: [
    "M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z",
    "M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z",
    "M7 21h10",
    "M12 3v18",
    "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",
  ],
  zap: [
    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  ],
  "check-circle": [
    "M22 11.08V12a10 10 0 1 1-5.93-9.14",
    "M22 4L12 14.01l-3-3",
  ],
  info: [
    "circle:12,12,10",
    "M12 16v-4",
    "M12 8h.01",
  ],
  "clipboard-list": [
    "rect:8,2,8,4,1",
    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
    "M12 11h4",
    "M12 16h4",
    "M8 11h.01",
    "M8 16h.01",
  ],
  shuffle: [
    "M16 3h5v5",
    "M4 20L21 3",
    "M21 16v5h-5",
    "M15 15l6 6",
    "M4 4l5 5",
  ],
  bitcoin: [
    "M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894",
    "M12.983 12.195c4.924.869 6.14-6.025 1.215-6.893",
    "M5.86 18.047l7.907 1.042",
    "M8.116 1.066l-.346 1.97",
    "M11.78 1.71l-.346 1.97",
    "M5.674 16.083l.347-1.97",
    "M9.338 16.753l.347-1.97",
  ],
};

export default function Icon({ name, size = 24, className = "" }: IconProps) {
  const paths = icons[name];
  if (!paths) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((p, i) => {
        if (p.startsWith("circle:")) {
          const [cx, cy, r] = p.replace("circle:", "").split(",");
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        if (p.startsWith("rect:")) {
          const [x, y, w, h, rx] = p.replace("rect:", "").split(",");
          return <rect key={i} x={x} y={y} width={w} height={h} rx={rx || "0"} />;
        }
        if (p.startsWith("ellipse:")) {
          const [cx, cy, rx, ry] = p.replace("ellipse:", "").split(",");
          return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />;
        }
        return <path key={i} d={p} />;
      })}
    </svg>
  );
}
