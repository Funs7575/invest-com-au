import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import { CURRENT_YEAR } from "@/lib/seo";

export const runtime = "nodejs";
// 24h ISR cache — health score inputs (ASIC regulation, years operating)
// are stable; the cron snapshot runs daily.
export const revalidate = 86400;

/**
 * GET /api/widget/health-scores — Returns self-contained JavaScript that
 * renders an embeddable broker health-score widget inside a Shadow DOM.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embed feature.
 *   • Must NEVER read user-context data. No cookies, no auth, no per-user
 *     state. Only public, active-broker columns are read.
 *   • Uses the anon-key client so Postgres RLS enforces active-only reads.
 *     Do NOT swap to createAdminClient(). The broker_health_scores table is
 *     service-role only (no anon policy); we compute scores from the public
 *     `brokers` table instead, mirroring the /api/broker-health logic.
 *   • Cache-Control allows public CDN caching — responses are not
 *     personalised.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AFSL compliance: scores are computed from factual, publicly disclosed
 * regulatory attributes (ASIC status, AFSL, CHESS, years operating, rating).
 * They are NOT financial advice and do NOT constitute a personal
 * recommendation. The general-advice disclaimer is included.
 *
 * Scoring mirrors /api/broker-health (calculateSafetyScore):
 *   ASIC regulated +25, holds AFSL +10, CHESS sponsored +20,
 *   international regulator +5, years operating (up to +20),
 *   editorial rating (up to +10), AU HQ (up to +5).
 *
 * Query params:
 *   ?brokers=stake,commsec   — comma-separated slugs (optional filter)
 *   ?limit=5                 — max brokers (default: 5, max: 10)
 *   ?theme=light|dark        — colour theme (default: light)
 *   ?ref=<partnerId>         — partner attribution; appended to all outbound
 *                              invest.com.au links
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const brokerSlugs = params.get("brokers")?.split(",").filter(Boolean) ?? [];
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const parsedLimit = parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isNaN(parsedLimit)
    ? 5
    : Math.min(Math.max(parsedLimit, 1), 10);
  const ref = params.get("ref") || "";

  const supabase = createStaticClient();

  let query = supabase
    .from("brokers")
    .select(
      "name, slug, rating, regulated_by, year_founded, headquarters, chess_sponsored, is_crypto, platform_type, logo_url, color, icon",
    )
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(limit);

  if (brokerSlugs.length > 0) {
    query = query.in("slug", brokerSlugs);
  }

  const { data: brokers } = await query;
  const rows = (brokers || []) as {
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
  }[];

  // Compute health scores server-side, embedding results in the JS payload.
  // Mirrors /api/broker-health calculateSafetyScore so the widget shows the
  // same scores as the broker-health detail page.
  const currentYear = CURRENT_YEAR;

  interface ScoreResult {
    name: string;
    slug: string;
    logo_url: string | null;
    color: string | null;
    icon: string | null;
    safety_score: number;
    safety_label: string;
    score_breakdown: { asic: number; afsl: number; chess: number; years: number; rating: number };
  }

  const scored: ScoreResult[] = rows.map((b) => {
    let score = 0;
    const regLower = (b.regulated_by || "").toLowerCase();

    const asic = regLower.includes("asic") ? 25 : 0;
    const afsl = regLower.includes("afsl") || regLower.includes("afs licence") ? 10 : 0;
    const intlReg =
      regLower.includes("fca") || regLower.includes("sec") || regLower.includes("mas") ? 5 : 0;
    const chess = b.chess_sponsored ? 20 : 0;

    let yearsPoints = 0;
    if (b.year_founded) {
      const yearsOp = currentYear - b.year_founded;
      if (yearsOp >= 20) yearsPoints = 20;
      else if (yearsOp >= 10) yearsPoints = 15;
      else if (yearsOp >= 5) yearsPoints = 10;
      else if (yearsOp >= 2) yearsPoints = 5;
    }

    let ratingPoints = 0;
    if (b.rating) {
      if (b.rating >= 4.5) ratingPoints = 10;
      else if (b.rating >= 4.0) ratingPoints = 8;
      else if (b.rating >= 3.5) ratingPoints = 5;
      else if (b.rating >= 3.0) ratingPoints = 3;
    }

    const typePoints = b.platform_type === "share_broker" ? 5 : 0;
    const hqLower = (b.headquarters || "").toLowerCase();
    let hqPoints = 0;
    if (hqLower.includes("australia") || hqLower.includes("sydney") || hqLower.includes("melbourne"))
      hqPoints = 5;
    else if (hqLower.includes("uk") || hqLower.includes("london") || hqLower.includes("united states"))
      hqPoints = 4;
    else if (hqLower.includes("singapore") || hqLower.includes("hong kong"))
      hqPoints = 3;

    score = Math.min(asic + afsl + intlReg + chess + yearsPoints + ratingPoints + typePoints + hqPoints, 100);
    const label = score >= 80 ? "Strong" : score >= 50 ? "Moderate" : "Caution";

    return {
      name: b.name,
      slug: b.slug,
      logo_url: b.logo_url,
      color: b.color,
      icon: b.icon,
      safety_score: score,
      safety_label: label,
      score_breakdown: { asic, afsl, chess, years: yearsPoints, rating: ratingPoints },
    };
  });

  const scoredJson = JSON.stringify(scored);

  // Ref param string for outbound links.
  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=health-scores-widget`
    : "ref=widget&source=health-scores-embed";

  const DISCLAIMER =
    "General information only. Health scores are computed from publicly disclosed regulatory " +
    "attributes and are not a personal recommendation. Not financial advice.";

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var BROKERS = ${scoredJson};
  var THEME = ${JSON.stringify(theme)};
  var DISCLAIMER = ${JSON.stringify(DISCLAIMER)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  // Find the script tag that loaded us (last matching script on page)
  var scripts = document.querySelectorAll("script[src*='/api/widget/health-scores']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host element + shadow DOM for style isolation
  var host = document.createElement("div");
  host.setAttribute("data-invest-health-widget", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  // ─── Theme tokens ──────────────────────────────────────────────
  var isDark = THEME === "dark";
  var bg       = isDark ? "#1e293b" : "#ffffff";
  var bgInput  = isDark ? "#0f172a" : "#f8fafc";
  var border   = isDark ? "#334155" : "#e2e8f0";
  var text     = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted= isDark ? "#94a3b8" : "#64748b";
  var rowHover = isDark ? "#334155" : "#f8fafc";
  var accent   = "#059669";
  var ctaBg    = "#059669";
  var ctaText  = "#ffffff";
  var strongBg = isDark ? "#064e3b" : "#ecfdf5";
  var strongBorder = isDark ? "#10b981" : "#a7f3d0";
  var cautionBg = isDark ? "#431407" : "#fff7ed";
  var cautionBorder = isDark ? "#f97316" : "#fed7aa";
  var cautionText = isDark ? "#fb923c" : "#c2410c";
  var moderateBg = isDark ? "#1e3a5f" : "#eff6ff";
  var moderateBorder = isDark ? "#3b82f6" : "#bfdbfe";
  var moderateText = isDark ? "#60a5fa" : "#1d4ed8";

  // ─── Styles ────────────────────────────────────────────────────
  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".ihw { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; max-width:720px; font-size:13px; color:" + text + "; }",
    ".ihw-header { padding:12px 16px; font-weight:700; font-size:15px; border-bottom:1px solid " + border + "; display:flex; align-items:center; justify-content:space-between; }",
    ".ihw-row { display:grid; grid-template-columns:1fr 70px 90px 90px; align-items:center; padding:10px 16px; border-bottom:1px solid " + border + "; transition:background .15s; }",
    ".ihw-row:hover { background:" + rowHover + "; }",
    ".ihw-row:last-child { border-bottom:none; }",
    ".ihw-thead { display:grid; grid-template-columns:1fr 70px 90px 90px; padding:7px 16px; background:" + bgInput + "; border-bottom:1px solid " + border + "; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:" + textMuted + "; }",
    ".ihw-name { font-weight:600; display:flex; align-items:center; gap:7px; font-size:13px; }",
    ".ihw-logo { width:24px; height:24px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:10px; flex-shrink:0; overflow:hidden; }",
    ".ihw-logo img { width:100%; height:100%; object-fit:contain; }",
    ".ihw-score { font-weight:700; font-size:14px; font-variant-numeric:tabular-nums; }",
    ".ihw-bar-wrap { height:6px; background:" + (isDark ? "#334155" : "#f1f5f9") + "; border-radius:3px; overflow:hidden; }",
    ".ihw-bar { height:100%; border-radius:3px; transition:width .4s ease; background:" + accent + "; }",
    ".ihw-label { display:inline-block; padding:2px 8px; border-radius:100px; font-size:10px; font-weight:700; }",
    ".ihw-label.strong { background:" + strongBg + "; color:" + accent + "; border:1px solid " + strongBorder + "; }",
    ".ihw-label.moderate { background:" + moderateBg + "; color:" + moderateText + "; border:1px solid " + moderateBorder + "; }",
    ".ihw-label.caution { background:" + cautionBg + "; color:" + cautionText + "; border:1px solid " + cautionBorder + "; }",
    ".ihw-cta { display:inline-block; padding:4px 10px; background:" + ctaBg + "; color:" + ctaText + "; border-radius:6px; text-decoration:none; font-weight:600; font-size:11px; text-align:center; transition:opacity .15s; white-space:nowrap; }",
    ".ihw-cta:hover { opacity:.88; }",
    ".ihw-disclaimer { padding:8px 16px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; line-height:1.5; }",
    ".ihw-footer { padding:8px 16px; text-align:center; font-size:11px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".ihw-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".ihw-footer a:hover { text-decoration:underline; }",
    ".ihw-empty { padding:24px 16px; text-align:center; font-size:13px; color:" + textMuted + "; }",
    "@media (max-width:480px) { .ihw-row { grid-template-columns:1fr 60px 70px; } .ihw-thead { grid-template-columns:1fr 60px 70px; } .ihw-hide-sm { display:none; } }",
  ].join("\\n");
  shadow.appendChild(styles);

  // ─── Helpers ───────────────────────────────────────────────────
  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  // ─── Build container ───────────────────────────────────────────
  var container = document.createElement("div");
  container.className = "ihw";

  container.innerHTML =
    '<div class="ihw-header">' +
      '<span>Broker Health Scores</span>' +
      '<a href="' + BASE + '/health-scores?' + REF_PARAM + '" target="_blank" style="font-size:11px;font-weight:400;color:' + textMuted + ';text-decoration:none;">Full scores &rarr;</a>' +
    '</div>';

  if (BROKERS.length === 0) {
    container.innerHTML += '<div class="ihw-empty">No broker data available.</div>';
  } else {
    container.innerHTML +=
      '<div class="ihw-thead">' +
        '<div>Broker</div>' +
        '<div style="text-align:center">Score</div>' +
        '<div class="ihw-hide-sm">Bar</div>' +
        '<div style="text-align:center">Rating</div>' +
      '</div>';

    for (var i = 0; i < BROKERS.length; i++) {
      var b = BROKERS[i];
      var barWidth = Math.max(b.safety_score, 2);
      var labelClass = b.safety_label === "Strong" ? "strong" : b.safety_label === "Moderate" ? "moderate" : "caution";
      var link = BASE + "/health-scores/" + esc(b.slug) + "?" + REF_PARAM;

      var logoHtml = b.logo_url
        ? '<div class="ihw-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(b.logo_url) + '" alt="' + esc(b.name) + '"></div>'
        : '<div class="ihw-logo" style="background:' + esc(b.color || "#059669") + '20;color:' + esc(b.color || "#059669") + '">' + esc((b.icon || b.name.charAt(0))) + '</div>';

      container.innerHTML +=
        '<div class="ihw-row">' +
          '<div class="ihw-name">' + logoHtml + '<a href="' + link + '" target="_blank" style="color:inherit;text-decoration:none;">' + esc(b.name) + '</a></div>' +
          '<div style="text-align:center"><span class="ihw-score">' + b.safety_score + '</span><span style="font-size:10px;color:' + textMuted + '">/100</span></div>' +
          '<div class="ihw-hide-sm"><div style="display:flex;align-items:center;gap:6px;"><div class="ihw-bar-wrap" style="flex:1"><div class="ihw-bar" style="width:' + barWidth + '%"></div></div><span class="ihw-label ' + labelClass + '">' + esc(b.safety_label) + '</span></div></div>' +
          '<div style="text-align:center"><a class="ihw-cta" href="' + link + '" target="_blank" rel="noopener noreferrer">Details</a></div>' +
        '</div>';
    }
  }

  container.innerHTML += '<div class="ihw-disclaimer">' + esc(DISCLAIMER) + '</div>';
  container.innerHTML += '<div class="ihw-footer">Powered by <a href="' + BASE + '/health-scores?' + REF_PARAM + '" target="_blank">invest.com.au</a></div>';

  shadow.appendChild(container);
})();
`;

  return new NextResponse(js.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      // Public-by-design: see header comment. Mirrors /api/widget CORS policy.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cross-Origin-Resource-Policy": "cross-origin",
      Vary: "Origin",
    },
  });
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
