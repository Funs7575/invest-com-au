import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";
import { wrappedFyForDate } from "@/lib/wrapped";

/**
 * Public OG card for /wrapped — deliberately GENERIC marketing art.
 *
 * Privacy design: shared /wrapped links always render this card. Personal
 * numbers never appear in any crawlable image; the user's own stats are
 * only available through the session-authenticated
 * /api/account/wrapped-card endpoint ("Download my card").
 */

export const runtime = "edge";
export const alt = `FY Money Wrapped — your year in money, recapped | ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fy = wrappedFyForDate(new Date());
  const bg = "#1e1b4b"; // deep indigo
  const violet = "#8b5cf6";
  const amber = "#f59e0b";

  const tiles = [
    { kicker: "TRACKED", value: "$ ••,•••" },
    { kicker: "GOALS", value: "• of • on track" },
    { kicker: "HEALTH SCORE", value: "• → •" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: bg,
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Brand accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: `linear-gradient(to right, ${violet}, ${amber})`,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: "18px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "6px",
            color: amber,
            marginBottom: "18px",
          }}
        >
          {fy.label} · Your year in money
        </div>

        <div
          style={{
            fontSize: "78px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            marginBottom: "20px",
            display: "flex",
          }}
        >
          Money Wrapped
        </div>

        <div
          style={{
            fontSize: "26px",
            color: "#c4b5fd",
            lineHeight: 1.35,
            maxWidth: "78%",
            display: "flex",
            marginBottom: "36px",
          }}
        >
          Goals, balances, health score and streaks — your financial year, recapped from your
          own saved data.
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          {tiles.map((tile) => (
            <div
              key={tile.kicker}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(139, 92, 246, 0.18)",
                border: "1px solid rgba(196, 181, 253, 0.35)",
                borderRadius: "18px",
                padding: "20px 26px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "3px",
                  color: "#c4b5fd",
                  marginBottom: "8px",
                }}
              >
                {tile.kicker}
              </div>
              <div style={{ display: "flex", fontSize: "30px", fontWeight: 800 }}>
                {tile.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            right: "80px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "20px",
            fontWeight: 600,
            opacity: 0.7,
          }}
        >
          <span>invest.com.au/wrapped</span>
          <span style={{ color: amber }}>Built from your own saved data</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
