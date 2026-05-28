import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const PERSONA_OG: Record<string, { emoji: string; color: string }> = {
  Accumulator:         { emoji: "📈", color: "#0891b2" },
  "FIRE-Chaser":       { emoji: "🔥", color: "#b45309" },
  "Wealth-Protector":  { emoji: "🛡️", color: "#7c3aed" },
  "Cautious-Builder":  { emoji: "🌱", color: "#16a34a" },
  "SMSF-Architect":    { emoji: "🏛️", color: "#1d4ed8" },
};

export const runtime = "edge";

/** Accent colour per calculator slug for the OG card. */
const CALC_COLORS: Record<string, { accent: string; bg: string }> = {
  retirement: { accent: "#7c3aed", bg: "#1e1b4b" },
  "compound-interest": { accent: "#059669", bg: "#052e16" },
  mortgage: { accent: "#e11d48", bg: "#1f0a14" },
  savings: { accent: "#d97706", bg: "#1c1008" },
  "super-contributions": { accent: "#2563eb", bg: "#0f1a3d" },
  cgt: { accent: "#059669", bg: "#052e16" },
};
const DEFAULT_CALC_COLOR = { accent: "#15803d", bg: "#0f172a" };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "Compare Australian Platforms";
  const subtitle =
    searchParams.get("subtitle") || "Honest reviews, real fees, updated daily.";
  const type = searchParams.get("type") || "default";
  const personaParam = searchParams.get("persona") ?? "";

  // ── Calculator result card ──────────────────────────────────────
  if (type === "calculator") {
    const calcSlug = searchParams.get("calc") ?? "";
    const result = searchParams.get("result") ?? "";
    const calcTitle = searchParams.get("title") ?? "Calculator Result";
    const colors = CALC_COLORS[calcSlug] ?? DEFAULT_CALC_COLOR;

    const displayResult = result.length > 40 ? result.slice(0, 40) + "…" : result;
    const displayTitle = calcTitle.length > 55 ? calcTitle.slice(0, 55) + "…" : calcTitle;
    const disclaimer = "General information only. Not financial advice.";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 80px",
            backgroundColor: colors.bg,
            color: "white",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Accent top bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "8px",
              backgroundColor: colors.accent,
              display: "flex",
            }}
          />

          {/* Calculator badge */}
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "2px",
              color: colors.accent,
              marginBottom: "20px",
            }}
          >
            {displayTitle}
          </div>

          {/* Headline result */}
          <div
            style={{
              fontSize: displayResult.length > 20 ? "64px" : "80px",
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: "24px",
              display: "flex",
              color: "white",
            }}
          >
            {displayResult}
          </div>

          {/* Disclaimer strip */}
          <div
            style={{
              fontSize: "16px",
              color: "#94a3b8",
              display: "flex",
            }}
          >
            {disclaimer}
          </div>

          {/* Bottom branding */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              left: "80px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: colors.accent,
                display: "flex",
              }}
            >
              Invest.com.au
            </div>
            <div style={{ fontSize: "16px", color: "#64748b", display: "flex" }}>
              Australia&apos;s Independent Broker Comparison
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          // Calculator result cards are per-user-input: shorter cache than
          // static OG pages (86400/2592000) so popular links stay fresh.
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  }

  // ── Standard card ───────────────────────────────────────────────
  const brandBg = "#0f172a";
  const green = "#15803d";
  const amber = "#f59e0b";

  const personaMeta = PERSONA_OG[personaParam];

  const typeLabel =
    type === "persona"
      ? "Investor Persona"
      : type === "broker"
        ? "Broker Review"
        : type === "article"
          ? "Guide"
          : type === "scenario"
            ? "Investing Scenario"
            : type === "best"
              ? "Best Platform Guide"
              : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: brandBg,
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: type === "persona" && personaMeta
              ? `linear-gradient(to right, ${personaMeta.color}, ${amber})`
              : `linear-gradient(to right, ${green}, ${amber})`,
            display: "flex",
          }}
        />

        {/* Type badge */}
        {typeLabel && (
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              textTransform: "uppercase",
              letterSpacing: "2px",
              color: type === "persona" && personaMeta ? personaMeta.color : amber,
              marginBottom: "16px",
            }}
          >
            {typeLabel}
          </div>
        )}

        {/* Persona layout: emoji + name side by side */}
        {type === "persona" && personaMeta ? (
          <div style={{ display: "flex", alignItems: "center", gap: "28px", marginBottom: "20px" }}>
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                background: personaMeta.color + "30",
                border: `3px solid ${personaMeta.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "52px",
                flexShrink: 0,
              }}
            >
              {personaMeta.emoji}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "56px",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: "white",
                  display: "flex",
                }}
              >
                {title}
              </div>
            </div>
          </div>
        ) : (
          /* Default title layout */
          <div
            style={{
              fontSize: title.length > 40 ? "44px" : "56px",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "20px",
              display: "flex",
            }}
          >
            {title}
          </div>
        )}

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          {subtitle.length > 100 ? subtitle.slice(0, 100) + "..." : subtitle}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: green,
              display: "flex",
            }}
          >
            Invest.com.au
          </div>
          <div style={{ fontSize: "16px", color: "#64748b", display: "flex" }}>
            Australia&apos;s Independent Broker Comparison
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Crawlers (Google, Twitter, Facebook, LinkedIn, Slack) hit OG
        // routes on every link share. PNG render = font load + JSX → PNG
        // encode, which is the slowest thing this app does at runtime.
        // 24h browser + 30d shared (CDN) means a popular link shared 1k
        // times triggers ~1 actual render instead of 1k.
        "Cache-Control":
          "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
      },
    }
  );
}
