import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

// Map vertical slug to gradient and accent colors
const VERTICAL_COLORS: Record<string, { gradient: string; accent: string; badge: string }> = {
  "share-trading": {
    gradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)",
    accent: "#fde68a",
    badge: "#78350f",
  },
  crypto: {
    gradient: "linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #f97316 100%)",
    accent: "#fed7aa",
    badge: "#7c2d12",
  },
  savings: {
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)",
    accent: "#bae6fd",
    badge: "#0c4a6e",
  },
  super: {
    gradient: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)",
    accent: "#a7f3d0",
    badge: "#064e3b",
  },
  cfd: {
    gradient: "linear-gradient(135deg, #881337 0%, #be123c 50%, #f43f5e 100%)",
    accent: "#fecdd3",
    badge: "#881337",
  },
};

const DEFAULT_COLORS = {
  gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
  accent: "#94a3b8",
  badge: "#0f172a",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug parameter", { status: 400 });
  }

  // Import verticals at runtime to support edge
  const colors = VERTICAL_COLORS[slug] || DEFAULT_COLORS;

  // Vertical metadata map (avoids importing non-edge-compatible modules)
  const verticalMeta: Record<string, { h1: string; platformTypes: string[] }> = {
    "share-trading": { h1: "Best Share Trading Platforms in Australia", platformTypes: ["share_broker"] },
    crypto: { h1: "Best Cryptocurrency Exchanges in Australia", platformTypes: ["crypto_exchange"] },
    savings: { h1: "Best Savings Accounts & Term Deposits in Australia", platformTypes: ["savings_account", "term_deposit"] },
    super: { h1: "Best Super Funds in Australia", platformTypes: ["super_fund"] },
    cfd: { h1: "Best CFD & Forex Brokers in Australia", platformTypes: ["cfd_forex"] },
  };

  const meta = verticalMeta[slug];
  if (!meta) {
    return new Response("Vertical not found", { status: 404 });
  }

  // Fetch broker count
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { count } = await supabase
    .from("brokers")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .in("platform_type", meta.platformTypes);

  const brokerCount = count || 0;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          color: "white",
          background: colors.gradient,
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
            backgroundColor: colors.accent,
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "60px 80px 40px",
            flex: 1,
          }}
        >
          {/* Badge row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "28px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
                color: colors.badge,
                backgroundColor: colors.accent,
                padding: "8px 16px",
                borderRadius: "6px",
              }}
            >
              Compare & Save
            </div>
            {brokerCount > 0 && (
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  color: colors.accent,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  border: `1px solid rgba(255, 255, 255, 0.2)`,
                  padding: "8px 16px",
                  borderRadius: "6px",
                }}
              >
                {brokerCount}+ Platforms
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
                color: colors.accent,
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                border: `1px solid rgba(255, 255, 255, 0.2)`,
                padding: "8px 16px",
                borderRadius: "6px",
              }}
            >
              2026
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: meta.h1.length > 40 ? "44px" : "56px",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "24px",
              display: "flex",
            }}
          >
            {meta.h1}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "24px",
              color: colors.accent,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Independent reviews, real fees, updated monthly.
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "auto",
              paddingTop: "24px",
            }}
          >
            {["Fees Verified", "Expert Reviews", "No Bias"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "16px",
                  color: colors.accent,
                }}
              >
                <span style={{ display: "flex" }}>{"\u2713"}</span>
                <span style={{ display: "flex" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 80px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
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
          <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.4)", display: "flex" }}>
            Australia{"\u2019"}s Independent Platform Comparison
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
