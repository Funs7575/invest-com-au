"use client";

import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Formatter for display. Defaults to en-AU integer grouping. */
  format?: (n: number) => string;
  /** Animation length for a value change. */
  durationMs?: number;
  /** Re-trigger the amber highlight flash on change (`.number-flash`). */
  flash?: boolean;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-AU");

/**
 * Live number that rolls between values (RETAIL_UX_NORTHSTAR §7.1 / D9).
 *
 * React renders the current value; on changes, the effect re-rolls the text
 * node from the previous value inside requestAnimationFrame — no re-renders
 * per frame. For scroll-triggered count-up-from-zero use the existing
 * `components/ui/CountUp.tsx`. Reduced motion snaps straight to the new
 * value.
 */
export default function AnimatedNumber({
  value,
  format = defaultFormat,
  durationMs = 600,
  flash = true,
  className,
}: AnimatedNumberProps) {
  const el = useRef<HTMLSpanElement>(null);

  // Previous value lives in a ref and is only touched inside the effect.
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const from = previous.current;
    previous.current = value;
    // First mount (nothing to roll from) or unchanged value: React's own
    // render already shows the right text.
    if (from === null || from === value) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = format(value);
      return;
    }

    if (flash) {
      node.classList.remove("number-flash");
      // Force a reflow so re-adding the class restarts the keyframe.
      void node.offsetWidth;
      node.classList.add("number-flash");
    }

    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      node.textContent = format(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, flash, format]);

  return (
    <span ref={el} className={`tnum ${className ?? ""}`}>
      {format(value)}
    </span>
  );
}
