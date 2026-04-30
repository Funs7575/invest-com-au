import type { CSSProperties } from "react";

const DESIGN_ICONS: Record<string, string> = {
  "arrow-right":   "M5 12h14M13 6l6 6-6 6",
  "arrow-up-right":"M7 17 17 7M9 7h8v8",
  "chevron-right": "m9 18 6-6-6-6",
  "chevron-down":  "m6 9 6 6 6-6",
  "chevron-up":    "m18 15-6-6-6 6",
  "search":        "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4-4",
  "filter":        "M3 5h18l-7 9v6l-4-2v-4Z",
  "check":         "m4 12 5 5L20 6",
  "x":             "m6 6 12 12M18 6 6 18",
  "globe":         "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm-9-9h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z",
  "shield-check":  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-11 2 2 5-5",
  "zap":           "m13 2-9 11h7l-1 9 9-11h-7l1-9Z",
  "sparkles":      "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4 8.4 15.6M15.6 8.4l2.8-2.8",
  "trending-up":   "M3 17l6-6 4 4 8-8M14 7h7v7",
  "trending-down": "M3 7l6 6 4-4 8 8M14 17h7v-7",
  "users":         "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8",
  "megaphone":     "M3 11l13-7v16L3 13Zm0 0v2a3 3 0 0 0 3 3h1l1 4h3l-1-4",
  "mail":          "M3 7h18v12H3zM3 7l9 7 9-7",
  "star":          "m12 2 3 7 7 .6-5.4 4.6L18.5 22 12 18l-6.5 4 1.9-7.8L2 9.6 9 9Z",
  "menu":          "M3 6h18M3 12h18M3 18h18",
  "compass":       "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4-14-2 6-6 2 2-6 6-2Z",
  "map-pin":       "M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z",
  "factory":       "M3 21V10l6 4V10l6 4V6l6 4v11ZM7 17h2M11 17h2M15 17h2",
  "building":      "M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M9 21v-4h6v4M8 7h2M8 11h2M14 7h2M14 11h2",
  "wind":          "M3 8h12a3 3 0 1 0-3-3M3 14h17a3 3 0 1 1-3 3M3 11h9",
  "wheat":         "M12 22V8M12 8c-2 0-4-2-4-4 2 0 4 2 4 4Zm0 0c2 0 4-2 4-4-2 0-4 2-4 4Zm0 4c-2 0-4-2-4-4 2 0 4 2 4 4Zm0 0c2 0 4-2 4-4-2 0-4 2-4 4Z",
  "briefcase":     "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  "calculator":    "M5 3h14v18H5zM9 7h6M8 12h2M12 12h2M16 12h.5M8 16h2M12 16h2M16 16h.5",
  "home":          "M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2Z",
};

export interface DesignIconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
  className?: string;
  style?: CSSProperties;
}

export function DesignIcon({ name, size = 16, strokeWidth = 1.8, fill = "none", className, style }: DesignIconProps) {
  const d = DESIGN_ICONS[name];
  if (!d) return <span aria-hidden style={{ display: "inline-block", width: size, height: size, ...style }} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
