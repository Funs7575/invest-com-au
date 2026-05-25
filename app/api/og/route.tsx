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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "Compare Australian Platforms";
  const subtitle =
    searchParams.get("subtitle") || "Honest reviews, real fees, updated daily.";
  const type = searchParams.get("type") || "default";
  const personaParam = searchParams.get("persona") ?? "";

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
