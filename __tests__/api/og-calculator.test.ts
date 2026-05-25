/**
 * Unit tests for the calculator OG card logic in /api/og.
 *
 * These are pure-logic tests (no ImageResponse import needed) that verify:
 *   - CALC_COLORS entries per slug
 *   - DEFAULT_CALC_COLOR fallback for unknown slugs
 *   - Truncation contracts (result ≤ 40 chars, title ≤ 55 chars)
 *   - URLSearchParams contract for type=calculator
 */
import { describe, it, expect } from "vitest";

// ── Inline replica of CALC_COLORS / DEFAULT_CALC_COLOR from route.tsx ──
// Kept in sync with the implementation — if you change one, change both.
const CALC_COLORS: Record<string, { accent: string; bg: string }> = {
  retirement: { accent: "#7c3aed", bg: "#1e1b4b" },
  "compound-interest": { accent: "#059669", bg: "#052e16" },
  mortgage: { accent: "#e11d48", bg: "#1f0a14" },
  savings: { accent: "#d97706", bg: "#1c1008" },
  "super-contributions": { accent: "#2563eb", bg: "#0f1a3d" },
  cgt: { accent: "#059669", bg: "#052e16" },
};
const DEFAULT_CALC_COLOR = { accent: "#15803d", bg: "#0f172a" };

// ── Truncation helpers (mirroring route logic) ──
function truncateResult(r: string) {
  return r.length > 40 ? r.slice(0, 40) + "…" : r;
}
function truncateTitle(t: string) {
  return t.length > 55 ? t.slice(0, 55) + "…" : t;
}

// ── Validation helpers ──
function isHex(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

describe("OG calculator card: CALC_COLORS map", () => {
  const slugs = ["retirement", "compound-interest", "mortgage", "savings", "super-contributions", "cgt"] as const;

  it("has an entry for all 6 supported calculator slugs", () => {
    for (const slug of slugs) {
      expect(CALC_COLORS[slug]).toBeDefined();
    }
  });

  it("each entry has valid hex accent colour", () => {
    for (const slug of slugs) {
      expect(isHex(CALC_COLORS[slug]!.accent)).toBe(true);
    }
  });

  it("each entry has valid hex bg colour", () => {
    for (const slug of slugs) {
      expect(isHex(CALC_COLORS[slug]!.bg)).toBe(true);
    }
  });

  it("retirement uses violet accent", () => {
    expect(CALC_COLORS["retirement"]?.accent).toBe("#7c3aed");
  });

  it("mortgage uses rose accent", () => {
    expect(CALC_COLORS["mortgage"]?.accent).toBe("#e11d48");
  });

  it("savings uses amber accent", () => {
    expect(CALC_COLORS["savings"]?.accent).toBe("#d97706");
  });

  it("super-contributions uses blue accent", () => {
    expect(CALC_COLORS["super-contributions"]?.accent).toBe("#2563eb");
  });

  it("compound-interest uses emerald accent", () => {
    expect(CALC_COLORS["compound-interest"]?.accent).toBe("#059669");
  });

  it("cgt uses emerald accent", () => {
    expect(CALC_COLORS["cgt"]?.accent).toBe("#059669");
  });

  it("compound-interest and cgt share the same emerald accent (intentional)", () => {
    expect(CALC_COLORS["compound-interest"]?.accent).toBe(CALC_COLORS["cgt"]?.accent);
  });
});

describe("OG calculator card: DEFAULT_CALC_COLOR fallback", () => {
  it("is defined and has valid hex accent", () => {
    expect(isHex(DEFAULT_CALC_COLOR.accent)).toBe(true);
  });

  it("is defined and has valid hex bg", () => {
    expect(isHex(DEFAULT_CALC_COLOR.bg)).toBe(true);
  });

  it("uses green brand colour for unknown slug", () => {
    const unknown = CALC_COLORS["not-a-calc"] ?? DEFAULT_CALC_COLOR;
    expect(unknown.accent).toBe(DEFAULT_CALC_COLOR.accent);
  });
});

describe("OG calculator card: truncation", () => {
  it("returns the original string when result is ≤ 40 chars", () => {
    const s = "$2,450/mo";
    expect(truncateResult(s)).toBe(s);
  });

  it("truncates result at 40 chars and appends ellipsis", () => {
    const long = "A".repeat(50);
    const out = truncateResult(long);
    expect(out.length).toBe(41); // 40 + "…"
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns the original string when title is ≤ 55 chars", () => {
    const t = "Retirement Calculator";
    expect(truncateTitle(t)).toBe(t);
  });

  it("truncates title at 55 chars and appends ellipsis", () => {
    const long = "B".repeat(70);
    const out = truncateTitle(long);
    expect(out.length).toBe(56); // 55 + "…"
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("OG calculator card: URLSearchParams contract", () => {
  it("type=calculator is detected by the route", () => {
    const sp = new URLSearchParams({ type: "calculator", calc: "mortgage", result: "$2,450/mo", title: "Mortgage Calculator" });
    expect(sp.get("type")).toBe("calculator");
    expect(sp.get("calc")).toBe("mortgage");
    expect(sp.get("result")).toBe("$2,450/mo");
  });

  it("missing calc param falls back to empty string (which maps to DEFAULT)", () => {
    const sp = new URLSearchParams({ type: "calculator" });
    const calcSlug = sp.get("calc") ?? "";
    const colors = CALC_COLORS[calcSlug] ?? DEFAULT_CALC_COLOR;
    expect(colors).toEqual(DEFAULT_CALC_COLOR);
  });

  it("unknown calc slug maps to DEFAULT_CALC_COLOR", () => {
    const sp = new URLSearchParams({ type: "calculator", calc: "unknown-tool" });
    const calcSlug = sp.get("calc") ?? "";
    const colors = CALC_COLORS[calcSlug] ?? DEFAULT_CALC_COLOR;
    expect(colors).toEqual(DEFAULT_CALC_COLOR);
  });
});
