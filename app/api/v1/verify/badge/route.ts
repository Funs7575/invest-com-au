/**
 * GET /api/v1/verify/badge?afsl=<number>
 *
 * Hosted, embeddable "Verified by Invest.com.au" trust-mark. Returns an
 * SVG image that a licensee can hotlink from their own site:
 *
 *   <a href="https://invest.com.au/afsl/123456" rel="noopener">
 *     <img src="https://invest.com.au/api/v1/verify/badge?afsl=123456"
 *          alt="AFSL 123456 verified by Invest.com.au" height="56" />
 *   </a>
 *
 * The badge reflects live public-register status: a green "Verified" mark
 * when the AFSL is current on the public register, a neutral/amber mark
 * otherwise. No authentication (it's a public embed, like the OG image
 * routes), but IP rate-limited so it can't be abused as a free bulk
 * register-lookup oracle.
 *
 * SECURITY: reads PUBLIC register data ONLY via `verifyAfslSubject`
 * (`afsl_register` cache + optional ASIC vendor). It never touches
 * `authorised_representatives` / `credit_representatives` (our own ARs'
 * private contact data, service-role-only).
 *
 * This is a factual register mark — not financial advice, no recommendation.
 */

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { verifyAfslSubject } from "@/lib/verify-registry";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
// Public, identical per AFSL → safe to CDN-cache. Rate limit still applies on
// cache misses (function invocations). Mirrors /api/afsl/[number].
export const revalidate = 3600;

/** Escape the five XML special chars for safe embedding in SVG text. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface BadgeTheme {
  bg: string;
  accent: string;
  label: string;
  sub: string;
  mark: string;
}

function themeFor(outcome: string): BadgeTheme {
  // Verified → green; cancelled/suspended/ceased → amber; everything else
  // (invalid / not_found / unverifiable) → neutral slate.
  if (outcome === "verified") {
    return {
      bg: "#ecfdf5",
      accent: "#047857",
      label: "Verified by Invest.com.au",
      sub: "AFSL current on the public register",
      mark: "#10b981",
    };
  }
  if (outcome === "not_current") {
    return {
      bg: "#fffbeb",
      accent: "#b45309",
      label: "Not currently verified",
      sub: "AFSL not current on the public register",
      mark: "#f59e0b",
    };
  }
  return {
    bg: "#f8fafc",
    accent: "#475569",
    label: "Not verified",
    sub: "AFSL not found on the public register",
    mark: "#94a3b8",
  };
}

/**
 * Build the SVG. Fixed 320x56 lockup: a status dot, a two-line label, and a
 * small "AFSL <n>" chip. All dynamic text is xml-escaped.
 */
function renderSvg(opts: {
  afsl: string;
  outcome: string;
  licensee: string | null;
}): string {
  const theme = themeFor(opts.outcome);
  const afsl = xmlEscape(opts.afsl || "—");
  const sub = xmlEscape(theme.sub);
  const licensee = opts.licensee ? xmlEscape(opts.licensee) : null;
  // Prefer the licensee name on the sub-line when verified and known.
  const subLine =
    opts.outcome === "verified" && licensee ? licensee : sub;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="56" viewBox="0 0 320 56" role="img" aria-label="AFSL ${afsl} — ${xmlEscape(theme.label)}">
  <rect x="0.5" y="0.5" width="319" height="55" rx="8" fill="${theme.bg}" stroke="${theme.accent}" stroke-opacity="0.25"/>
  <circle cx="22" cy="28" r="9" fill="${theme.mark}"/>
  <path d="M17.5 28 l3 3 l6 -6" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="42" y="24" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="${theme.accent}">${xmlEscape(theme.label)}</text>
  <text x="42" y="40" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="10.5" fill="${theme.accent}" fill-opacity="0.85">${subLine}</text>
  <rect x="246" y="16" width="64" height="24" rx="12" fill="#ffffff" stroke="${theme.accent}" stroke-opacity="0.35"/>
  <text x="278" y="32" text-anchor="middle" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="${theme.accent}">AFSL ${afsl}</text>
</svg>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const afslParam = (url.searchParams.get("afsl") || "").slice(0, 40);

  // 60 renders / min / IP — generous for legit embeds (served off the edge
  // cache on repeat), tight enough to make bulk register-probing uneconomic.
  const allowed = await isAllowed("verify_badge", ipKey({ headers: req.headers }), {
    max: 60,
    refillPerSec: 1,
  });
  if (!allowed) {
    return new Response("Rate limit exceeded.", {
      status: 429,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (!afslParam.trim()) {
    return new Response("Missing ?afsl parameter.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Public-register lookup only. Never reads private AR/CR data.
  const result = await verifyAfslSubject(afslParam);

  const svg = renderSvg({
    afsl: result.number || afslParam.replace(/\D+/g, ""),
    outcome: result.outcome,
    licensee: result.licensee_name,
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Public + identical per AFSL: cache at the edge. Shorter SWR so a
      // status change (e.g. licence cancelled) propagates within a day.
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      // Allow cross-origin <img> embedding from any licensee site.
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "noindex",
      "X-Verify-Source": SITE_URL,
    },
  });
}
