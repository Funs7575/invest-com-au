import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getCategoryBySlug } from "@/lib/best-broker-categories";
import type { Broker } from "@/lib/types";

export const runtime = "edge";

// Columns the category filter/sort lambdas in lib/best-broker-categories.ts
// reference, plus `name` for display. Kept in sync with the property
// accesses in that module — if a new category references a new broker
// field in its filter/sort, add the column here.
const BEST_OG_COLUMNS =
  "name, slug, rating, is_crypto, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, inactivity_fee, platform_type, markets, accepts_non_residents, accepts_temporary_residents";

// Category-family colour idiom — reuses the exact gradient/accent/badge
// tokens from app/api/og/vertical/route.tsx. `best` slugs don't map 1:1
// onto vertical slugs, so we classify by keyword and fall back to the
// shared default. Deliberately not a new visual system.
const FAMILY_COLORS: Record<string, { gradient: string; accent: string; badge: string }> = {
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
  shares: {
    gradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)",
    accent: "#fde68a",
    badge: "#78350f",
  },
};

const DEFAULT_COLORS = {
  gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
  accent: "#94a3b8",
  badge: "#0f172a",
};

function colorsForSlug(slug: string) {
  if (/crypto|bitcoin/.test(slug)) return FAMILY_COLORS.crypto;
  if (/savings|term-deposit|cash|high-interest/.test(slug)) return FAMILY_COLORS.savings;
  if (/super|smsf|retire/.test(slug)) return FAMILY_COLORS.super;
  if (/cfd|forex|leverage/.test(slug)) return FAMILY_COLORS.cfd;
  return FAMILY_COLORS.shares ?? DEFAULT_COLORS;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug parameter", { status: 400 });
  }

  const cat = getCategoryBySlug(slug);
  if (!cat) {
    return new Response("Category not found", { status: 404 });
  }

  const colors = colorsForSlug(slug) ?? DEFAULT_COLORS;

  // Fetch active brokers and rank them with the category's own filter/sort
  // so the OG image reflects the same top picks shown on the page.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("brokers")
    .select(BEST_OG_COLUMNS)
    .eq("status", "active");

  const brokers = (data ?? []) as unknown as Broker[];
  const ranked = brokers.filter(cat.filter).sort(cat.sort);
  const top = ranked.slice(0, 3);
  const count = ranked.length;
  const topRating = top[0]?.rating ?? 0;

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
            {count > 0 && (
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
                {count} Compared
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
              fontSize: cat.h1.length > 40 ? "44px" : "56px",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "24px",
              display: "flex",
            }}
          >
            {cat.h1}
          </div>

          {/* Ranked top picks — the distinguishing data of a "best" page.
              Falls back to a subtitle line when no broker qualifies (e.g.
              placeholder categories with filter: () => false). */}
          {top.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {top.map((b, i) => (
                <div
                  key={b.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    fontSize: "24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      fontSize: "18px",
                      fontWeight: 800,
                      color: colors.badge,
                      backgroundColor: colors.accent,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ display: "flex", fontWeight: 700 }}>{b.name}</span>
                  {i === 0 && (
                    <span
                      style={{
                        display: "flex",
                        fontSize: "16px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: colors.accent,
                      }}
                    >
                      Top Pick
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
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
          )}

          {/* Key stat + feature pills */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "auto",
              paddingTop: "24px",
              alignItems: "center",
            }}
          >
            {topRating > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: colors.accent,
                }}
              >
                <span style={{ display: "flex" }}>{"★"}</span>
                <span style={{ display: "flex" }}>{topRating.toFixed(1)}/5 top pick</span>
              </div>
            )}
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
                <span style={{ display: "flex" }}>{"✓"}</span>
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
            Australia{"’"}s Independent Platform Comparison
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
      },
    }
  );
}
