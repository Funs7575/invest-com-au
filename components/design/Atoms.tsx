import type { CSSProperties, ReactNode } from "react";
import { DesignIcon } from "./DesignIcon";

const FLAGS: Record<string, string> = {
  AU: "\u{1F1E6}\u{1F1FA}",
  US: "\u{1F1FA}\u{1F1F8}",
  GB: "\u{1F1EC}\u{1F1E7}",
  SG: "\u{1F1F8}\u{1F1EC}",
  HK: "\u{1F1ED}\u{1F1F0}",
  CN: "\u{1F1E8}\u{1F1F3}",
  KR: "\u{1F1F0}\u{1F1F7}",
  AE: "\u{1F1E6}\u{1F1EA}",
  IN: "\u{1F1EE}\u{1F1F3}",
  NZ: "\u{1F1F3}\u{1F1FF}",
};

export function FlagChip({ code, label }: { code: string; label?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 999,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--color-ink-500)",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{FLAGS[code] ?? "\u{1F3F3}️"}</span>
      {label ?? code}
    </span>
  );
}

export type SponsorKind = "promoted" | "deal" | "featured" | "editor";

export function SponsorChip({ kind }: { kind: SponsorKind }) {
  if (kind === "promoted") {
    return (
      <span
        className="iv2-pill"
        style={{ background: "var(--color-amber-50)", color: "var(--color-amber-700)", border: "1px solid var(--color-amber-100)" }}
      >
        <DesignIcon name="star" size={10} strokeWidth={2.4} fill="currentColor" /> Promoted
      </span>
    );
  }
  if (kind === "deal") {
    return (
      <span
        className="iv2-pill"
        style={{ background: "var(--color-coral-50)", color: "var(--color-coral-700)", border: "1px solid var(--color-coral-100)" }}
      >
        <DesignIcon name="zap" size={10} strokeWidth={2.4} /> Deal
      </span>
    );
  }
  if (kind === "featured") {
    return (
      <span
        className="iv2-pill"
        style={{ background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
      >
        <DesignIcon name="sparkles" size={10} strokeWidth={2.4} /> Featured
      </span>
    );
  }
  // editor's pick
  return (
    <span
      className="iv2-pill"
      style={{ background: "var(--color-ink-50)", color: "var(--color-ink-700)", border: "1px solid #e5e7eb" }}
    >
      <DesignIcon name="check" size={10} strokeWidth={2.4} /> Editor&rsquo;s pick
    </span>
  );
}

export function BrandMark({ tone = "dark", size = 22 }: { tone?: "dark" | "light"; size?: number }) {
  const ink = tone === "dark" ? "var(--color-ink-900)" : "white";
  const dim = tone === "dark" ? "var(--color-ink-400)" : "rgba(255,255,255,.55)";
  const square = size + 6;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-.025em",
        fontFamily: "var(--font-display)",
      }}
    >
      <span
        style={{
          width: square,
          height: square,
          borderRadius: 8,
          background: "linear-gradient(140deg, var(--color-coral-500), var(--color-coral-700))",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: square * 0.55,
          fontWeight: 800,
          boxShadow: "0 2px 0 rgba(0,0,0,.08) inset",
          flexShrink: 0,
        }}
        aria-hidden
      >
        i
      </span>
      <span style={{ color: ink }}>
        invest<span style={{ color: dim, fontWeight: 600 }}>.com.au</span>
      </span>
    </span>
  );
}

export function MiniLabel({ children, color, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <span className="iv2-mini" style={{ color: color ?? "var(--color-coral-600)", ...style }}>
      {children}
    </span>
  );
}

export function StatChip({ value, label, accent = "var(--color-coral-500)" }: { value: string; label: string; accent?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: "var(--color-ink-50)",
        border: "1px solid #e5e7eb",
        fontSize: 11.5,
        fontWeight: 600,
        color: "var(--color-ink-500)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 99, background: accent }} aria-hidden />
      <span className="font-mono tnum" style={{ color: "var(--color-ink-900)", fontWeight: 700 }}>{value}</span>
      {label}
    </span>
  );
}

export function Logo({ name, bg = "var(--color-ink-700)", size = 28, color = "white" }: { name: string; bg?: string; size?: number; color?: string }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: bg,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: "-.02em",
        fontFamily: "var(--font-display)",
        flexShrink: 0,
        border: "1px solid rgba(0,0,0,.06)",
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}
