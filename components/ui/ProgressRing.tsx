"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** Track + progress colours (any CSS colour). */
  trackColor?: string;
  progressColor?: string;
  /** Accessible label, e.g. "Profile 60% complete". Required — the ring is information, not decoration. */
  label: string;
  /** Centre slot (avatar, percentage text, icon). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Circular progress indicator (RETAIL_UX_NORTHSTAR §7.1 / D5).
 * Pure SVG — animates stroke-dashoffset from 0 to `value` on mount via a
 * CSS transition (token `--motion-celebrate`), then follows `value` changes.
 * Honours prefers-reduced-motion through the global animation override.
 */
export default function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  trackColor = "#e2e8f0",
  progressColor = "#f59e0b",
  label,
  children,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  // Start at 0 and move to the real value after mount so the ring sweeps in.
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown / 100);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset var(--motion-celebrate, 350ms) var(--ease-out-soft, ease-out)" }}
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  );
}
