"use client";

import { useEffect, useState } from "react";

interface ConfettiProps {
  /** Number of particles. Keep ≤ 32 — pure CSS, but DOM nodes add up. */
  count?: number;
  /** Particle colours; defaults to the celebration palette. */
  colors?: string[];
  /** Extra classes on the positioning container. */
  className?: string;
}

const DEFAULT_COLORS = ["#f59e0b", "#f25822", "#10b981", "#3b82f6", "#8b5cf6"];

/**
 * Reusable confetti burst (RETAIL_UX_NORTHSTAR §7.1), extracted from the
 * inline implementation on the quiz results screen. Fires once on mount —
 * remount (or key-change) to fire again. Renders nothing when the user
 * prefers reduced motion: a flash of instantly-finished particles is worse
 * than no particles.
 *
 * Positioning: absolutely fills its nearest positioned ancestor. Wrap in a
 * `relative` container sized to the celebrated element.
 */
export default function Confetti({ count = 24, colors = DEFAULT_COLORS, className }: ConfettiProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
  }, []);

  if (!enabled) return null;

  return (
    <div className={`confetti-container confetti-active pointer-events-none ${className ?? ""}`} aria-hidden>
      {/* eslint-disable react-hooks/purity -- decorative confetti, deliberate randomness on each render */}
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="confetti-particle"
          style={
            {
              "--confetti-color": colors[i % colors.length],
              "--confetti-x": `${-60 + Math.random() * 120}px`,
              "--confetti-delay": `${i * 0.04}s`,
              "--confetti-fall": `${60 + Math.random() * 70}px`,
              "--confetti-rotate": `${180 + Math.random() * 360}deg`,
              left: `${10 + Math.random() * 80}%`,
            } as React.CSSProperties
          }
        />
      ))}
      {/* eslint-enable react-hooks/purity */}
    </div>
  );
}
