"use client";

import { useEffect, useRef, useState } from "react";

const INTEREST_LABELS: Record<string, string> = {
  shares: "Shares",
  etfs: "ETFs",
  crypto: "Crypto",
  super: "Super",
  property: "Property",
  savings: "Savings",
  insurance: "Insurance",
  cfd: "CFD & Forex",
};

function humanise(value: string): string {
  return value
    .split(/[_-]/)
    .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface ArrivalSequenceProps {
  name?: string | null;
  interests: string[];
  experience?: string | null;
  goal?: string | null;
  onDone: () => void;
}

/**
 * D4 (RETAIL_UX_NORTHSTAR): onboarding's last moment — the user watches
 * their home being assembled from their own answers, instead of landing on
 * a banner above a settings page. ~4s, skippable, auto-advances; under
 * reduced motion it renders the static summary and waits for the button.
 * Strictly "what you told us" framing (§9 — no advice, no product claims).
 */
export default function ArrivalSequence({ name, interests, experience, goal, onDone }: ArrivalSequenceProps) {
  const [reduced, setReduced] = useState(false);
  const doneRef = useRef(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      const raf = requestAnimationFrame(() => setReduced(true));
      return () => cancelAnimationFrame(raf);
    }
    const focusTimer = setTimeout(() => ctaRef.current?.focus(), 1800);
    const autoTimer = setTimeout(finish, 4500);
    return () => {
      clearTimeout(focusTimer);
      clearTimeout(autoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only choreography
  }, []);

  const interestLine =
    interests.length > 0
      ? interests.map((i) => INTEREST_LABELS[i] ?? humanise(i)).join(" · ")
      : "Broad — we'll follow what you explore";

  const cards: { eyebrow: string; line: string }[] = [
    { eyebrow: "Your focus", line: interestLine },
    {
      eyebrow: "Calibrated for",
      line: [experience ? humanise(experience) : null, goal ? humanise(goal) : null]
        .filter(Boolean)
        .join(" · ") || "You — as we learn more",
    },
    { eyebrow: "Always true", line: "General information only — every decision stays yours" },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--color-ink-900, #0b1422)" }}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={finish}
        className="absolute top-4 right-4 text-xs font-semibold text-white/60 hover:text-white transition-colors px-3 py-2"
      >
        Skip
      </button>

      <p className="text-sm font-semibold text-white/70">
        {name ? `${name}, this is yours now.` : "This is yours now."}
      </p>
      <h1 className="font-display mt-1 text-2xl md:text-3xl font-extrabold text-white">
        Building your home
      </h1>

      <div className="mt-6 w-full max-w-sm space-y-2.5 text-left">
        {cards.map((card, i) => (
          <div
            key={card.eyebrow}
            className={reduced ? "" : "result-card-in"}
            style={
              reduced
                ? undefined
                : { animationDelay: `${0.35 + i * 0.45}s`, animationFillMode: "both" }
            }
          >
            <div className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-400">
                {card.eyebrow}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{card.line}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        ref={ctaRef}
        type="button"
        onClick={finish}
        className={`mt-7 inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 ${reduced ? "" : "result-card-in"}`}
        style={reduced ? undefined : { animationDelay: "1.7s", animationFillMode: "both" }}
      >
        Open my home
      </button>
    </div>
  );
}
