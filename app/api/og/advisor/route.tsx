import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug parameter", { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: pro } = await supabase
    .from("professionals")
    .select("name, firm_name, type, location_display, rating, review_count, specialties")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!pro) {
    return new Response("Advisor not found", { status: 404 });
  }

  const typeLabels: Record<string, string> = {
    smsf_accountant: "SMSF Accountant",
    financial_planner: "Financial Planner",
    property_advisor: "Property Advisor",
    tax_agent: "Tax Agent",
    mortgage_broker: "Mortgage Broker",
    estate_planner: "Estate Planner",
    insurance_broker: "Insurance Broker",
    buyers_agent: "Buyers Agent",
  };

  const typeLabel = typeLabels[pro.type] || "Financial Professional";
  const rating = pro.rating || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const specialties = (pro.specialties || []).slice(0, 3);

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
          background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)",
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
            background: "linear-gradient(to right, #a78bfa, #c4b5fd, #e9d5ff)",
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
              color: "#c4b5fd",
              marginBottom: "16px",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ display: "flex" }}>VERIFIED {typeLabel.toUpperCase()}</span>
          </div>

          {/* Advisor name */}
          <div
            style={{
              fontSize: pro.name.length > 25 ? "48px" : "60px",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "12px",
              display: "flex",
            }}
          >
            {pro.name}
          </div>

          {/* Firm name */}
          {pro.firm_name && (
            <div
              style={{
                fontSize: "26px",
                color: "#c4b5fd",
                marginBottom: "20px",
                display: "flex",
              }}
            >
              {pro.firm_name}
            </div>
          )}

          {/* Rating stars */}
          {rating > 0 && (
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
                    fontSize: "26px",
                    display: "flex",
                    color:
                      i < fullStars
                        ? "#fbbf24"
                        : i === fullStars && hasHalf
                          ? "#fbbf24"
                          : "#4c1d95",
                  }}
                >
                  {"\u2605"}
                </div>
              ))}
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#fbbf24",
                  marginLeft: "8px",
                  display: "flex",
                }}
              >
                {rating.toFixed(1)}/5
              </div>
              {pro.review_count > 0 && (
                <div
                  style={{
                    fontSize: "16px",
                    color: "#a78bfa",
                    marginLeft: "4px",
                    display: "flex",
                  }}
                >
                  ({pro.review_count} review{pro.review_count === 1 ? "" : "s"})
                </div>
              )}
            </div>
          )}

          {/* Location and type info */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "24px",
            }}
          >
            {pro.location_display && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ fontSize: "13px", color: "#a78bfa", display: "flex" }}>
                  LOCATION
                </div>
                <div style={{ fontSize: "22px", fontWeight: 700, display: "flex" }}>
                  {pro.location_display}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ fontSize: "13px", color: "#a78bfa", display: "flex" }}>
                SPECIALISATION
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, display: "flex" }}>
                {typeLabel}
              </div>
            </div>
          </div>

          {/* Specialties */}
          {specialties.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {specialties.map((spec: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    color: "#e9d5ff",
                    backgroundColor: "rgba(167, 139, 250, 0.2)",
                    border: "1px solid rgba(167, 139, 250, 0.3)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                  }}
                >
                  {spec.length > 30 ? spec.slice(0, 30) + "..." : spec}
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
            borderTop: "1px solid rgba(167, 139, 250, 0.2)",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#a78bfa",
              display: "flex",
            }}
          >
            Invest.com.au
          </div>
          <div style={{ fontSize: "14px", color: "#7c3aed", display: "flex" }}>
            Find a verified financial advisor
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
