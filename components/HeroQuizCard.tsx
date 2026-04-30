"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesignIcon } from "@/components/design/DesignIcon";

type AnswerId = "diy" | "marketplace" | "advisor" | "mix";

const ANSWERS: ReadonlyArray<{
  id: AnswerId;
  label: string;
  hint: string;
  icon: string;
  accent: string;
  href: string;
}> = [
  {
    id: "diy",
    label: "Invest myself, on a platform",
    hint: "Shares, ETFs, super, crypto — DIY",
    icon: "trending-up",
    accent: "#60a5fa",
    href: "/quiz?seed=compare",
  },
  {
    id: "marketplace",
    label: "Browse private deals & listings",
    hint: "Funds, businesses, farmland, mining, commercial",
    icon: "sparkles",
    accent: "#fbbf24",
    href: "/quiz?seed=deals",
  },
  {
    id: "advisor",
    label: "Speak with a verified advisor",
    hint: "Planner, accountant, broker — your situation",
    icon: "users",
    accent: "#34d399",
    href: "/quiz?seed=advisor",
  },
  {
    id: "mix",
    label: "A mix of all of the above",
    hint: "Show me the full picture",
    icon: "compass",
    accent: "var(--color-coral-400)",
    href: "/quiz?seed=mix",
  },
];

export default function HeroQuizCard() {
  const router = useRouter();
  const [pick, setPick] = useState<AnswerId | null>(null);

  const continueHref = pick ? ANSWERS.find((a) => a.id === pick)?.href : null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 14,
        padding: "22px 24px 18px",
        boxShadow: "0 24px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span
          className="iv2-pill"
          style={{
            background: "rgba(242,88,34,.16)",
            color: "var(--color-coral-300)",
            border: "1px solid rgba(242,88,34,.3)",
            fontSize: 11,
          }}
        >
          <DesignIcon name="zap" size={11} /> Start here · 60 seconds
        </span>
      </div>

      <div
        className="font-display"
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.024em",
          lineHeight: 1.1,
          marginBottom: 18,
          color: "white",
        }}
      >
        How do you want to invest?
      </div>

      <div role="radiogroup" aria-label="How do you want to invest?" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ANSWERS.map((opt) => {
          const sel = pick === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => setPick(opt.id)}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: sel ? `1.5px solid ${opt.accent}` : "1px solid rgba(255,255,255,.1)",
                background: sel
                  ? `color-mix(in oklch, ${opt.accent} 14%, transparent)`
                  : "rgba(255,255,255,.03)",
                textAlign: "left",
                fontFamily: "inherit",
                color: "white",
                transition: "background .15s ease, border-color .15s ease, transform .15s ease",
                transform: sel ? "translateX(2px)" : "none",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `color-mix(in oklch, ${opt.accent} 22%, transparent)`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: opt.accent,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                <DesignIcon name={opt.icon} size={22} strokeWidth={2.4} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "white", letterSpacing: "-.012em" }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 500 }}>
                  {opt.hint}
                </span>
              </span>
              <DesignIcon
                name="arrow-right"
                size={14}
                style={{ marginLeft: "auto", color: sel ? opt.accent : "rgba(255,255,255,.35)" }}
                strokeWidth={2.4}
              />
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>No email needed · Skip anytime</span>
        <button
          type="button"
          className="iv2-cta"
          disabled={!pick}
          onClick={() => continueHref && router.push(continueHref)}
          style={{ fontSize: 12.5, padding: "7px 14px" }}
        >
          Continue <DesignIcon name="arrow-right" size={11} />
        </button>
      </div>
    </div>
  );
}
