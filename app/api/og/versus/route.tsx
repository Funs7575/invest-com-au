import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slugsParam = searchParams.get("slugs");

  if (!slugsParam) {
    return new Response("Missing slugs parameter", { status: 400 });
  }

  const brokerSlugs = slugsParam.split("-vs-").filter(Boolean);

  if (brokerSlugs.length < 2 || brokerSlugs.length > 4) {
    return new Response("Need 2-4 brokers in slug1-vs-slug2 format", { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: brokers } = await supabase
    .from("brokers")
    .select("name, slug, color, rating, platform_type")
    .in("slug", brokerSlugs)
    .eq("status", "active");

  if (!brokers || brokers.length < 2) {
    return new Response("Brokers not found", { status: 404 });
  }

  // Preserve URL order
  const ordered = brokerSlugs
    .map((s) => brokers.find((b) => b.slug === s))
    .filter(Boolean) as typeof brokers;

  const leftBroker = ordered[0];
  const rightBroker = ordered[1];
  const leftColor = leftBroker.color || "#3b82f6";
  const rightColor = rightBroker.color || "#ef4444";

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
          backgroundColor: "#0f172a",
        }}
      >
        {/* Top accent bar - split colors */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            display: "flex",
          }}
        >
          <div style={{ flex: 1, backgroundColor: leftColor, display: "flex" }} />
          <div style={{ flex: 1, backgroundColor: rightColor, display: "flex" }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "50px 80px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "3px",
              color: "#f59e0b",
            }}
          >
            Side-by-Side Comparison 2026
          </div>
        </div>

        {/* Main versus area */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "0 80px",
            alignItems: "center",
            justifyContent: "center",
            gap: "0px",
          }}
        >
          {/* Left broker */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: "12px",
            }}
          >
            {/* Color circle with initial */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: leftColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 800,
              }}
            >
              {leftBroker.name.charAt(0)}
            </div>
            <div
              style={{
                fontSize: leftBroker.name.length > 18 ? "28px" : "36px",
                fontWeight: 800,
                display: "flex",
                textAlign: "center",
              }}
            >
              {leftBroker.name}
            </div>
            {leftBroker.rating > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ color: "#fbbf24", fontSize: "20px", display: "flex" }}>
                  {"\u2605"}
                </span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#fbbf24", display: "flex" }}>
                  {leftBroker.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* VS divider */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              padding: "0 24px",
            }}
          >
            <div
              style={{
                width: "2px",
                height: "40px",
                backgroundColor: "#334155",
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: "40px",
                fontWeight: 900,
                color: "#f59e0b",
                display: "flex",
                padding: "8px 0",
              }}
            >
              VS
            </div>
            <div
              style={{
                width: "2px",
                height: "40px",
                backgroundColor: "#334155",
                display: "flex",
              }}
            />
          </div>

          {/* Right broker */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: "12px",
            }}
          >
            {/* Color circle with initial */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: rightColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 800,
              }}
            >
              {rightBroker.name.charAt(0)}
            </div>
            <div
              style={{
                fontSize: rightBroker.name.length > 18 ? "28px" : "36px",
                fontWeight: 800,
                display: "flex",
                textAlign: "center",
              }}
            >
              {rightBroker.name}
            </div>
            {rightBroker.rating > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ color: "#fbbf24", fontSize: "20px", display: "flex" }}>
                  {"\u2605"}
                </span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#fbbf24", display: "flex" }}>
                  {rightBroker.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Additional brokers if 3+ */}
        {ordered.length > 2 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0 80px 16px",
              gap: "16px",
            }}
          >
            {ordered.slice(2).map((b) => (
              <div
                key={b.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "16px",
                  color: "#94a3b8",
                }}
              >
                <span style={{ display: "flex" }}>vs</span>
                <span style={{ fontWeight: 700, color: "white", display: "flex" }}>
                  {b.name}
                </span>
                {b.rating > 0 && (
                  <span style={{ color: "#fbbf24", display: "flex" }}>
                    {"\u2605"} {b.rating.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

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
            Honest reviews {"\u00b7"} Real fees {"\u00b7"} Updated daily
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
