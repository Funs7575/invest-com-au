import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getGuide } from "@/lib/how-to-guides";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug parameter", { status: 400 });
  }

  const guide = getGuide(slug);

  if (!guide) {
    return new Response("Guide not found", { status: 404 });
  }

  const stepCount = guide.steps.length;

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
          background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)",
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
            background: "linear-gradient(to right, #6ee7b7, #a7f3d0, #d1fae5)",
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
              marginBottom: "24px",
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
                color: "#064e3b",
                backgroundColor: "#a7f3d0",
                padding: "8px 16px",
                borderRadius: "6px",
              }}
            >
              Step-by-Step Guide
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
                color: "#a7f3d0",
                backgroundColor: "rgba(167, 243, 208, 0.15)",
                border: "1px solid rgba(167, 243, 208, 0.3)",
                padding: "8px 16px",
                borderRadius: "6px",
              }}
            >
              {stepCount} Steps
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: guide.h1.length > 40 ? "44px" : "56px",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "20px",
              display: "flex",
            }}
          >
            {guide.h1}
          </div>

          {/* Intro text */}
          <div
            style={{
              fontSize: "22px",
              color: "#a7f3d0",
              lineHeight: 1.4,
              display: "flex",
              marginBottom: "32px",
            }}
          >
            {guide.metaDescription.length > 120
              ? guide.metaDescription.slice(0, 120) + "..."
              : guide.metaDescription}
          </div>

          {/* Step preview circles */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {guide.steps.slice(0, 6).map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                {i < Math.min(guide.steps.length - 1, 5) && (
                  <div
                    style={{
                      width: "20px",
                      height: "2px",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                    }}
                  />
                )}
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
            borderTop: "1px solid rgba(167, 243, 208, 0.2)",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#6ee7b7",
              display: "flex",
            }}
          >
            Invest.com.au
          </div>
          <div style={{ fontSize: "14px", color: "#047857", display: "flex" }}>
            How-To Guides for Australian Investors
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
