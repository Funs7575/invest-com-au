import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

/**
 * Site-wide default OpenGraph image.
 *
 * Next.js App Router convention: a top-level `app/opengraph-image.tsx`
 * is auto-served at `/opengraph-image.png` and propagated to every
 * route's <meta property="og:image"> unless a child segment
 * explicitly overrides it (via its own `opengraph-image.tsx` file
 * or `metadata.openGraph.images`).
 *
 * Why this exists: per the 2026-04-26 audit (§8.6, P0-6), pages that
 * defined their own `openGraph` block without `images` lost the
 * layout-level `/api/og` fallback and shipped favicon-tier social
 * cards. Adding the file-system convention here means EVERY page
 * gets a proper card by default — even pages that didn't realise
 * they needed to opt in.
 *
 * Renders Edge-side; cached by Next.js + Vercel CDN.
 */

export const runtime = "edge";
export const alt = `${SITE_NAME} — Compare Australian Investing Platforms`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const brandBg = "#0f172a";
  const green = "#15803d";
  const amber = "#f59e0b";

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
          backgroundColor: brandBg,
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
            background: `linear-gradient(to right, ${green}, ${amber})`,
            display: "flex",
          }}
        />

        {/* Logo / wordmark */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 28,
            opacity: 0.85,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${green}, ${amber})`,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            $
          </span>
          {SITE_NAME}
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 24,
            display: "flex",
          }}
        >
          Compare Platforms.
          <br />
          Find Advisors.
        </div>

        {/* Subhead */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            opacity: 0.78,
            lineHeight: 1.3,
            maxWidth: "85%",
            display: "flex",
          }}
        >
          {SITE_DESCRIPTION}
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 80,
            right: 80,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            fontWeight: 600,
            opacity: 0.65,
          }}
        >
          <span>invest.com.au</span>
          <span style={{ color: amber }}>Independent · Verified · 2026</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
