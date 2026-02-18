import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "Compare Australian Brokers";
  const subtitle =
    searchParams.get("subtitle") || "Honest reviews, real fees, updated daily.";
  const type = searchParams.get("type") || "default";

  const brandBg = "#0f172a";
  const green = "#15803d";
  const amber = "#f59e0b";

  const typeLabel =
    type === "broker"
      ? "Broker Review"
      : type === "article"
        ? "Guide"
        : type === "scenario"
          ? "Investing Scenario"
          : type === "best"
            ? "Best Broker Guide"
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
            background: `linear-gradient(to right, ${green}, ${amber})`,
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
              color: amber,
              marginBottom: "16px",
            }}
          >
            {typeLabel}
          </div>
        )}

        {/* Title */}
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
    }
  );
}
