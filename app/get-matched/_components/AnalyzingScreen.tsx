"use client";

import { useEffect, useState } from "react";

/**
 * 1.5-second interstitial between the last answered question and the
 * result screen. Cycles three tips so the perceived effort matches the
 * complexity of what's actually happening server-side (routing rules
 * resolve, risk scan, top-match scoring, template lookup).
 *
 * Respects `prefers-reduced-motion`: the spinner becomes a static dot,
 * and the tip rotation stays but at the same interval so timing math
 * downstream stays predictable.
 */

const TIPS = [
  { emoji: "🎯", text: "Matching your goals to the right route…" },
  { emoji: "🔍", text: "Checking platforms, advisors and opportunities…" },
  { emoji: "✨", text: "Personalising your action plan…" },
];

interface Props {
  /** Called once when the interstitial completes its display time. */
  onComplete: () => void;
}

export default function AnalyzingScreen({ onComplete }: Props) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // 1500ms total split into three ~500ms tip rotations.
    const rotateIv = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearInterval(rotateIv);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const tip = TIPS[tipIndex] ?? TIPS[0]!;

  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="text-center max-w-md">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 motion-safe:animate-spin"
            style={{ animationDuration: "1s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            {tip.emoji}
          </div>
        </div>
        <p className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
          Building your action plan…
        </p>
        <p
          key={tipIndex}
          className="text-sm text-slate-500 motion-safe:animate-fade-in"
          style={{ animation: "iv-fade-in 300ms ease-out" }}
        >
          {tip.text}
        </p>
        <style>{`
          @keyframes iv-fade-in {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
