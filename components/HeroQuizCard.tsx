"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesignIcon } from "@/components/design/DesignIcon";

type AnswerId = "deals" | "advisor" | "compare" | "foreign";

const ANSWERS: ReadonlyArray<{ id: AnswerId; label: string; icon: string; accent: string; href: string }> = [
  { id: "deals",   label: "I want to see deals beyond the ASX",      icon: "sparkles",      accent: "#fbbf24", href: "/quiz?seed=deals" },
  { id: "advisor", label: "I need to talk to a licensed human",       icon: "users",         accent: "#34d399", href: "/quiz?seed=advisor" },
  { id: "compare", label: "Compare brokers / super / savings",        icon: "trending-down", accent: "#60a5fa", href: "/quiz?seed=compare" },
  { id: "foreign", label: "I'm on a visa or have foreign assets",     icon: "globe",         accent: "#f59e0b", href: "/quiz?seed=foreign" },
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
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.5)" }}>Q 1 of 6</span>
      </div>

      <div
        className="font-display"
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-.022em",
          lineHeight: 1.15,
          marginBottom: 14,
          color: "white",
        }}
      >
        What brings you here today?
      </div>

      <div role="radiogroup" aria-label="What brings you here today?" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                padding: "11px 12px",
                borderRadius: 9,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 11,
                border: sel ? `1.5px solid ${opt.accent}` : "1px solid rgba(255,255,255,.1)",
                background: sel
                  ? `color-mix(in oklch, ${opt.accent} 14%, transparent)`
                  : "rgba(255,255,255,.03)",
                textAlign: "left",
                fontFamily: "inherit",
                color: "white",
                transition: "background .15s ease, border-color .15s ease",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: `color-mix(in oklch, ${opt.accent} 22%, transparent)`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: opt.accent,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                <DesignIcon name={opt.icon} size={13} strokeWidth={2.4} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
              <DesignIcon
                name="arrow-right"
                size={11}
                style={{ marginLeft: "auto", color: sel ? opt.accent : "rgba(255,255,255,.3)" }}
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
