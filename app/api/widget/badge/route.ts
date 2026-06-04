import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import { computeAdvisorTrustScore } from "@/lib/advisor-trust-score";
import { CURRENT_YEAR } from "@/lib/seo";

export const runtime = "nodejs";
// 1h ISR — advisor profiles refresh hourly; broker health scores are stable daily.
export const revalidate = 3600;

/**
 * GET /api/widget/badge — Returns self-contained JavaScript that renders an
 * embeddable score badge inside a Shadow DOM for a SINGLE named entity.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embed feature.
 *   • Must NEVER read user-context data. No cookies, no auth, no per-user
 *     state. Only public columns are read.
 *   • Uses the anon-key client so Postgres RLS enforces active-only reads.
 *     Do NOT swap to createAdminClient().
 *   • Cache-Control allows public CDN caching — responses are not
 *     personalised.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AFSL COMPLIANCE NOTE:
 *   This badge surfaces a SINGLE entity's OWN factual, already-computed,
 *   already-public score. It does NOT compare entities against each other,
 *   does NOT rank, award, or imply "best" status. It is a factual composite
 *   of objective, publicly-checkable data points for THAT entity alone.
 *   The general-advice disclaimer is always included.
 *   A methodology link (/advisor/trust-score-methodology or
 *   /health-scores) is included so consumers can audit the
 *   scoring algorithm.
 *
 * Query params:
 *   ?type=advisor|broker  — which score to display (required)
 *   ?slug=<slug>          — entity slug (required)
 *   ?theme=light|dark     — colour theme (default: light)
 *   ?ref=<partnerId>      — partner attribution; appended to all outbound links
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  // Sanitize slug to the slug charset before it is ever echoed back. The 404
  // branches below interpolate it into a `/* … "${slug}" … */` JS comment
  // served as application/javascript; an unsanitized `*/<payload>/*` would
  // break out of the comment and inject script. Slugs are always [a-z0-9-],
  // so stripping everything else is lossless for legitimate lookups.
  const slug = (params.get("slug") ?? "")
    .trim()
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 100);
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const ref = params.get("ref") || "";

  // ── Validate required params ────────────────────────────────────────────
  if (type !== "advisor" && type !== "broker") {
    return new NextResponse(
      `/* invest.com.au score badge: missing or invalid ?type= param (must be "advisor" or "broker") */`,
      {
        status: 400,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  if (!slug) {
    return new NextResponse(
      `/* invest.com.au score badge: missing ?slug= param */`,
      {
        status: 400,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const supabase = createStaticClient();

  // ── Fetch entity data ───────────────────────────────────────────────────

  if (type === "advisor") {
    const { data: row } = await supabase
      .from("professionals")
      .select(
        "name, slug, type, photo_url, bio, verified, afsl_number, registration_number, verified_at, created_at, years_experience, qualifications, education, memberships, fee_structure, fee_description, linkedin_url, website, languages, rating, review_count, location_display, status",
      )
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (!row) {
      return new NextResponse(
        `/* invest.com.au score badge: advisor "${slug}" not found or inactive */`,
        {
          status: 404,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const advisor = row as {
      name: string;
      slug: string;
      type: string | null;
      photo_url: string | null;
      bio: string | null;
      verified: boolean | null;
      afsl_number: string | null;
      registration_number: string | null;
      verified_at: string | null;
      created_at: string | null;
      years_experience: number | null;
      qualifications: unknown[] | null;
      education: unknown[] | null;
      memberships: unknown[] | null;
      fee_structure: string | null;
      fee_description: string | null;
      linkedin_url: string | null;
      website: string | null;
      languages: unknown[] | null;
      rating: number | null;
      review_count: number | null;
      location_display: string | null;
    };

    const scoreResult = computeAdvisorTrustScore(advisor);

    const refParam = ref
      ? `ref=${encodeURIComponent(ref)}&source=badge-advisor`
      : "ref=widget&source=badge-advisor";

    const badgeData = {
      name: advisor.name,
      slug: advisor.slug,
      photo_url: advisor.photo_url,
      location_display: advisor.location_display,
      score: scoreResult.overall,
      label: scoreResult.label,
      labelColor: scoreResult.labelColor,
      scoreType: "Advisor Trust Score",
      profileUrl: `https://invest.com.au/advisor/${advisor.slug}`,
      methodologyUrl: "https://invest.com.au/advisor/trust-score-methodology",
    };

    const js = buildBadgeJs({
      badgeData,
      theme,
      refParam,
      widgetAttr: "data-invest-badge-advisor",
      disclaimerPrefix: "Advisor Trust Scores",
    });

    return new NextResponse(js, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cross-Origin-Resource-Policy": "cross-origin",
        Vary: "Origin",
      },
    });
  }

  // ── Broker badge ─────────────────────────────────────────────────────────

  const { data: brokerRow } = await supabase
    .from("brokers")
    .select(
      "name, slug, rating, regulated_by, year_founded, headquarters, chess_sponsored, is_crypto, platform_type, logo_url, color, icon, status",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!brokerRow) {
    return new NextResponse(
      `/* invest.com.au score badge: broker "${slug}" not found or inactive */`,
      {
        status: 404,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const broker = brokerRow as {
    name: string;
    slug: string;
    rating: number | null;
    regulated_by: string | null;
    year_founded: number | null;
    headquarters: string | null;
    chess_sponsored: boolean | null;
    is_crypto: boolean | null;
    platform_type: string | null;
    logo_url: string | null;
    color: string | null;
    icon: string | null;
  };

  // Compute broker health score — same algorithm as /api/widget/health-scores
  // and /api/broker-health calculateSafetyScore.
  const currentYear = CURRENT_YEAR;
  let score = 0;
  const regLower = (broker.regulated_by || "").toLowerCase();

  const asic = regLower.includes("asic") ? 25 : 0;
  const afsl = regLower.includes("afsl") || regLower.includes("afs licence") ? 10 : 0;
  const intlReg =
    regLower.includes("fca") || regLower.includes("sec") || regLower.includes("mas") ? 5 : 0;
  const chess = broker.chess_sponsored ? 20 : 0;

  let yearsPoints = 0;
  if (broker.year_founded) {
    const yearsOp = currentYear - broker.year_founded;
    if (yearsOp >= 20) yearsPoints = 20;
    else if (yearsOp >= 10) yearsPoints = 15;
    else if (yearsOp >= 5) yearsPoints = 10;
    else if (yearsOp >= 2) yearsPoints = 5;
  }

  let ratingPoints = 0;
  if (broker.rating) {
    if (broker.rating >= 4.5) ratingPoints = 10;
    else if (broker.rating >= 4.0) ratingPoints = 8;
    else if (broker.rating >= 3.5) ratingPoints = 5;
    else if (broker.rating >= 3.0) ratingPoints = 3;
  }

  const typePoints = broker.platform_type === "share_broker" ? 5 : 0;
  const hqLower = (broker.headquarters || "").toLowerCase();
  let hqPoints = 0;
  if (
    hqLower.includes("australia") ||
    hqLower.includes("sydney") ||
    hqLower.includes("melbourne")
  )
    hqPoints = 5;
  else if (
    hqLower.includes("uk") ||
    hqLower.includes("london") ||
    hqLower.includes("united states")
  )
    hqPoints = 4;
  else if (hqLower.includes("singapore") || hqLower.includes("hong kong")) hqPoints = 3;

  score = Math.min(asic + afsl + intlReg + chess + yearsPoints + ratingPoints + typePoints + hqPoints, 100);
  const brokerLabel = score >= 80 ? "Strong" : score >= 50 ? "Moderate" : "Caution";
  const brokerLabelColor =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-blue-600" : "text-amber-600";

  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=badge-broker`
    : "ref=widget&source=badge-broker";

  const badgeData = {
    name: broker.name,
    slug: broker.slug,
    photo_url: broker.logo_url,
    location_display: broker.headquarters,
    score,
    label: brokerLabel,
    labelColor: brokerLabelColor,
    scoreType: "Broker Health Score",
    profileUrl: `https://invest.com.au/health-scores/${broker.slug}`,
    methodologyUrl: "https://invest.com.au/health-scores",
  };

  const js = buildBadgeJs({
    badgeData,
    theme,
    refParam,
    widgetAttr: "data-invest-badge-broker",
    disclaimerPrefix: "Broker Health Scores",
  });

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cross-Origin-Resource-Policy": "cross-origin",
      Vary: "Origin",
    },
  });
}

// ── Badge JS builder ─────────────────────────────────────────────────────────

interface BadgePayload {
  name: string;
  slug: string;
  photo_url: string | null;
  location_display: string | null;
  score: number;
  label: string;
  labelColor: string;
  scoreType: string;
  profileUrl: string;
  methodologyUrl: string;
}

function buildBadgeJs(opts: {
  badgeData: BadgePayload;
  theme: "light" | "dark";
  refParam: string;
  widgetAttr: string;
  disclaimerPrefix: string;
}): string {
  const { badgeData, theme, refParam, widgetAttr, disclaimerPrefix } = opts;

  const DISCLAIMER =
    `General information only. ${disclaimerPrefix} are computed from factual, publicly disclosed ` +
    `attributes and are not a personal recommendation or financial advice. ` +
    `See the methodology link for full scoring details.`;

  return `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var BADGE = ${JSON.stringify(badgeData)};
  var THEME = ${JSON.stringify(theme)};
  var DISCLAIMER = ${JSON.stringify(DISCLAIMER)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  // Find the script tag that loaded us
  var scripts = document.querySelectorAll("script[src*='/api/widget/badge']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host element + shadow DOM for style isolation
  var host = document.createElement("div");
  host.setAttribute(${JSON.stringify(widgetAttr)}, "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  // ─── Theme tokens ──────────────────────────────────────────────
  var isDark = THEME === "dark";
  var bg       = isDark ? "#1e293b" : "#ffffff";
  var border   = isDark ? "#334155" : "#e2e8f0";
  var text     = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted= isDark ? "#94a3b8" : "#64748b";
  var accent   = "#059669";
  var trackBg  = isDark ? "#334155" : "#f1f5f9";

  // Score band colours
  var score = BADGE.score;
  var gaugeColor = score >= 80 ? "#059669" : score >= 50 ? "#3b82f6" : "#f59e0b";

  // ─── Styles ────────────────────────────────────────────────────
  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".ibw { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; max-width:320px; font-size:13px; color:" + text + "; }",
    ".ibw-body { padding:16px; }",
    ".ibw-name { font-weight:700; font-size:14px; line-height:1.3; margin-bottom:2px; }",
    ".ibw-location { font-size:11px; color:" + textMuted + "; margin-bottom:12px; }",
    ".ibw-score-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }",
    ".ibw-gauge { position:relative; width:56px; height:56px; flex-shrink:0; }",
    ".ibw-gauge svg { width:100%; height:100%; transform:rotate(-90deg); }",
    ".ibw-gauge-track { fill:none; stroke:" + trackBg + "; stroke-width:7; }",
    ".ibw-gauge-fill { fill:none; stroke:" + gaugeColor + "; stroke-width:7; stroke-linecap:round; transition:stroke-dashoffset .5s ease; }",
    ".ibw-gauge-text { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }",
    ".ibw-gauge-num { font-weight:800; font-size:14px; line-height:1; color:" + gaugeColor + "; }",
    ".ibw-gauge-denom { font-size:8px; color:" + textMuted + "; }",
    ".ibw-score-meta { flex:1; min-width:0; }",
    ".ibw-score-type { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:" + textMuted + "; margin-bottom:3px; }",
    ".ibw-label { font-size:13px; font-weight:700; color:" + gaugeColor + "; margin-bottom:4px; }",
    ".ibw-methodology { font-size:10px; color:" + textMuted + "; }",
    ".ibw-methodology a { color:" + accent + "; text-decoration:none; }",
    ".ibw-methodology a:hover { text-decoration:underline; }",
    ".ibw-cta { display:block; width:100%; text-align:center; padding:8px 12px; background:" + accent + "; color:#fff; border-radius:8px; text-decoration:none; font-weight:700; font-size:12px; margin-top:4px; transition:opacity .15s; box-sizing:border-box; }",
    ".ibw-cta:hover { opacity:.88; }",
    ".ibw-disclaimer { padding:8px 12px 10px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; line-height:1.5; }",
    ".ibw-footer { padding:6px 12px 8px; text-align:center; font-size:10px; color:" + textMuted + "; }",
    ".ibw-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".ibw-footer a:hover { text-decoration:underline; }",
  ].join("\\n");
  shadow.appendChild(styles);

  // ─── Helpers ───────────────────────────────────────────────────
  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  // Gauge circumference for r=22
  var r = 22;
  var circ = 2 * Math.PI * r;
  var filled = Math.max(0, Math.min(1, score / 100)) * circ;
  var dashOffset = circ - filled;

  // ─── Build container ───────────────────────────────────────────
  var container = document.createElement("div");
  container.className = "ibw";

  var profileLink = esc(BADGE.profileUrl) + "?" + REF_PARAM;
  var methLink = esc(BADGE.methodologyUrl) + "?" + REF_PARAM;

  container.innerHTML =
    '<div class="ibw-body">' +
      '<div class="ibw-name"><a href="' + profileLink + '" target="_blank" style="color:inherit;text-decoration:none;">' + esc(BADGE.name) + '</a></div>' +
      (BADGE.location_display ? '<div class="ibw-location">' + esc(BADGE.location_display) + '</div>' : '') +
      '<div class="ibw-score-row">' +
        '<div class="ibw-gauge">' +
          '<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">' +
            '<circle class="ibw-gauge-track" cx="28" cy="28" r="' + r + '" />' +
            '<circle class="ibw-gauge-fill" cx="28" cy="28" r="' + r + '" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + dashOffset.toFixed(2) + '" />' +
          '</svg>' +
          '<div class="ibw-gauge-text"><span class="ibw-gauge-num">' + score + '</span><span class="ibw-gauge-denom">/100</span></div>' +
        '</div>' +
        '<div class="ibw-score-meta">' +
          '<div class="ibw-score-type">' + esc(BADGE.scoreType) + '</div>' +
          '<div class="ibw-label">' + esc(BADGE.label) + '</div>' +
          '<div class="ibw-methodology">Score explained: <a href="' + methLink + '" target="_blank" rel="noopener noreferrer">methodology &rarr;</a></div>' +
        '</div>' +
      '</div>' +
      '<a class="ibw-cta" href="' + profileLink + '" target="_blank" rel="noopener noreferrer">View full profile</a>' +
    '</div>' +
    '<div class="ibw-disclaimer">' + esc(DISCLAIMER) + '</div>' +
    '<div class="ibw-footer">Powered by <a href="' + BASE + '/embed?' + REF_PARAM + '" target="_blank">invest.com.au</a></div>';

  shadow.appendChild(container);
})();
`.trim();
}

/**
 * CORS pre-flight. Mirrors /api/widget OPTIONS handler.
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
