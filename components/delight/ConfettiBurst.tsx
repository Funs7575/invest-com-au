"use client";

/**
 * Reusable one-shot confetti burst — extracted from the quiz results
 * screen so every "moment" surface (first save, profile complete, brief
 * live) celebrates with the same house physics instead of reinventing it.
 *
 * Pure CSS animation via the existing globals.css contract
 * (.confetti-container/.confetti-particle + custom properties); decorative
 * and aria-hidden, and the global prefers-reduced-motion rules apply.
 *
 * Render it when the moment happens: `{justCompleted && <ConfettiBurst />}`.
 * Particle randomness is computed once on mount so re-renders don't
 * re-scatter mid-flight.
 */

import { useState } from "react";

interface Particle {
  x: string;
  delay: string;
  fall: string;
  rotate: string;
  color: string;
  left: string;
}

const COLORS = ["#15803d", "#f59e0b", "#fbbf24", "#16a34a", "#ef4444", "#6366f1"];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    x: `${-60 + Math.random() * 120}px`,
    delay: `${i * 0.04}s`,
    fall: `${50 + Math.random() * 50}px`,
    rotate: `${Math.random() * 720 - 360}deg`,
    color: COLORS[i % COLORS.length]!,
    left: `${8 + (i / count) * 84}%`,
  }));
}

export default function ConfettiBurst({ count = 24 }: { count?: number }) {
  // Lazy initial state: randomness runs exactly once per mount.
  const [particles] = useState<Particle[]>(() => makeParticles(count));

  return (
    <div className="confetti-container confetti-active" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="confetti-particle"
          style={
            {
              "--confetti-x": p.x,
              "--confetti-delay": p.delay,
              "--confetti-fall": p.fall,
              "--confetti-rotate": p.rotate,
              "--confetti-color": p.color,
              left: p.left,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
