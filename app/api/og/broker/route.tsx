import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug parameter", { status: 400 });
  }

  // Fetch broker data
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: broker } = await supabase
    .from("brokers")
    .select("name, slug, color, rating, asx_fee, us_fee, chess_sponsored, pros, editors_pick")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!broker) {
    return new Response("Broker not found", { status: 404 });
  }

  const brandBg = "#0f172a";
  const brokerColor = broker.color || "#f59e0b";
  const rating = broker.rating || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const pros = (broker.pros || []).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: brandBg,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent bar in broker's brand color */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            backgroundColor: brokerColor,
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
          {/* Type badge */}
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "3px",
              color: brokerColor,
              marginBottom: "12px",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {broker.editors_pick && (
              <span style={{ display: "flex" }}>{"★ EDITOR'S PICK · "}</span>
            )}
            <span style={{ display: "flex" }}>BROKER REVIEW 2026</span>
          </div>

          {/* Broker name */}
          <div
            style={{
              fontSize: broker.name.length > 20 ? "52px" : "64px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "16px",
              display: "flex",
            }}
          >
            {broker.name}
          </div>

          {/* Rating stars */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "24px",
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  fontSize: "28px",
                  display: "flex",
                  color:
                    i < fullStars
                      ? "#f59e0b"
                      : i === fullStars && hasHalf
                        ? "#f59e0b"
                        : "#334155",
                }}
              >
                ★
              </div>
            ))}
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#f59e0b",
                marginLeft: "8px",
                display: "flex",
              }}
            >
              {rating.toFixed(1)}/5
            </div>
          </div>

          {/* Key facts row */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "24px",
            }}
          >
            {broker.asx_fee && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ fontSize: "13px", color: "#64748b", display: "flex" }}>
                  ASX TRADE FEE
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, display: "flex" }}>
                  {broker.asx_fee}
                </div>
              </div>
            )}
            {broker.us_fee && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ fontSize: "13px", color: "#64748b", display: "flex" }}>
                  US TRADE FEE
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, display: "flex" }}>
                  {broker.us_fee}
                </div>
              </div>
            )}
            {broker.chess_sponsored && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ fontSize: "13px", color: "#64748b", display: "flex" }}>
                  CHESS
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#10b981", display: "flex" }}>
                  ✓ Sponsored
                </div>
              </div>
            )}
          </div>

          {/* Top pros */}
          {pros.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pros.map((pro: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "18px",
                    color: "#94a3b8",
                  }}
                >
                  <span style={{ color: "#10b981", display: "flex" }}>✓</span>
                  <span style={{ display: "flex" }}>
                    {pro.length > 50 ? pro.slice(0, 50) + "..." : pro}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom branding bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 80px",
            borderTop: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#15803d",
              display: "flex",
            }}
          >
            Invest.com.au
          </div>
          <div style={{ fontSize: "14px", color: "#475569", display: "flex" }}>
            Honest reviews · Real fees · Updated daily
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
