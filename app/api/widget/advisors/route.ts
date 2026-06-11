import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import {
  evaluateEmbedGate,
  embedAccessRequiredResponse,
  meterEmbedLoad,
} from "@/lib/embed-gate";

export const runtime = "nodejs";
// 1h ISR cache — advisor data refreshes infrequently.
export const revalidate = 3600;

/**
 * GET /api/widget/advisors — Returns self-contained JavaScript that renders
 * an embeddable financial-advisor directory widget inside a Shadow DOM.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embed feature.
 *   • Must NEVER read user-context data. No cookies, no auth, no per-user
 *     state. Only public, active-advisor columns are returned.
 *   • Uses the anon-key client so Postgres RLS enforces active-only reads.
 *     Do NOT swap to createAdminClient().
 *   • Cache-Control allows public CDN caching — responses are not
 *     personalised.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AFSL compliance: this widget presents factual directory information
 * (advisor names, types, locations, ratings). It does NOT constitute
 * financial product advice or a referral/personal recommendation.
 * The general-advice disclaimer is included in the rendered output.
 *
 * Query params:
 *   ?type=financial-planner|mortgage-broker|...   — filter by advisor type
 *   ?state=NSW|VIC|QLD|...                        — filter by AU state
 *   ?limit=5                                      — max advisors (default 5, max 10)
 *   ?theme=light|dark                             — colour theme (default: light)
 *   ?ref=<partnerId>                              — partner attribution; appended to
 *                                                   all outbound invest.com.au links
 *   ?license=wlt_xxx                              — embed partner key; required when
 *                                                   the `embed_partner_gating` flag is
 *                                                   on, always metered (lib/embed-gate.ts)
 */
export async function GET(request: NextRequest) {
  const gateStart = Date.now();
  // Embed partner gate — flag-controlled. Unauthorised loads render a
  // branded "get access" card (still 200 JS, never a script error).
  const gate = await evaluateEmbedGate(request);
  if (!gate.authorised) {
    return embedAccessRequiredResponse("Top Financial Advisors");
  }

  const params = request.nextUrl.searchParams;
  const typeFilter = params.get("type") || "";
  const stateFilter = params.get("state") || "";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const parsedLimit = parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isNaN(parsedLimit)
    ? 5
    : Math.min(Math.max(parsedLimit, 1), 10);
  // Partner attribution: threaded through all outbound links to invest.com.au.
  // No storage, no new tables — purely a query-param passthrough for affiliate
  // attribution on the destination page.
  const ref = params.get("ref") || "";

  const supabase = createStaticClient();

  let query = supabase
    .from("professionals")
    .select(
      "id, slug, name, firm_name, type, location_state, location_suburb, location_display, photo_url, fee_structure, initial_consultation_free, rating, review_count, verified, offer_text, offer_active",
    )
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(limit);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (stateFilter) {
    query = query.eq("location_state", stateFilter);
  }

  const { data: advisors } = await query;
  const rows = advisors || [];

  const advisorsJson = JSON.stringify(rows);

  // Build the ref query param string for outbound links.
  // If a partnerId was provided, it takes priority; otherwise fall back
  // to the default widget attribution signal so analytics can distinguish
  // traffic from widget embeds.
  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=advisor-widget`
    : "ref=widget&source=advisor-embed";

  const DISCLAIMER =
    "General information only. Does not take into account your personal situation. " +
    "Not financial advice. Consider seeking professional advice before making any financial decision.";

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var ADVISORS = ${advisorsJson};
  var THEME = ${JSON.stringify(theme)};
  var DISCLAIMER = ${JSON.stringify(DISCLAIMER)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  // Find the script tag that loaded us (last matching script on page)
  var scripts = document.querySelectorAll("script[src*='/api/widget/advisors']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host element + shadow DOM for style isolation
  var host = document.createElement("div");
  host.setAttribute("data-invest-advisors-widget", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  // ─── Theme tokens ──────────────────────────────────────────────
  var isDark = THEME === "dark";
  var bg       = isDark ? "#1e293b" : "#ffffff";
  var border   = isDark ? "#334155" : "#e2e8f0";
  var text     = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted= isDark ? "#94a3b8" : "#64748b";
  var rowHover = isDark ? "#334155" : "#f8fafc";
  var accent   = "#059669";
  var ctaBg    = "#059669";
  var ctaText  = "#ffffff";
  var badgeBg  = isDark ? "#064e3b" : "#ecfdf5";
  var badgeBorder = isDark ? "#10b981" : "#a7f3d0";

  // ─── Styles ────────────────────────────────────────────────────
  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".iaw { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; max-width:720px; font-size:13px; color:" + text + "; }",
    ".iaw-header { padding:12px 16px; font-weight:700; font-size:15px; border-bottom:1px solid " + border + "; display:flex; align-items:center; justify-content:space-between; }",
    ".iaw-card { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; border-bottom:1px solid " + border + "; transition:background .15s; }",
    ".iaw-card:hover { background:" + rowHover + "; }",
    ".iaw-card:last-child { border-bottom:none; }",
    ".iaw-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; overflow:hidden; background:" + accent + "20; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; color:" + accent + "; }",
    ".iaw-avatar img { width:100%; height:100%; object-fit:cover; }",
    ".iaw-body { flex:1; min-width:0; }",
    ".iaw-name { font-weight:700; font-size:13px; display:flex; align-items:center; gap:5px; flex-wrap:wrap; }",
    ".iaw-firm { font-size:11px; color:" + textMuted + "; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
    ".iaw-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:5px; }",
    ".iaw-pill { font-size:10px; padding:2px 7px; border-radius:100px; background:" + (isDark ? "#334155" : "#f1f5f9") + "; color:" + textMuted + "; white-space:nowrap; }",
    ".iaw-pill.free { background:" + badgeBg + "; color:" + accent + "; border:1px solid " + badgeBorder + "; }",
    ".iaw-verified { display:inline-block; width:14px; height:14px; background:" + accent + "; border-radius:50%; color:#fff; font-size:9px; text-align:center; line-height:14px; flex-shrink:0; }",
    ".iaw-rating { font-size:11px; font-weight:700; color:" + accent + "; }",
    ".iaw-offer { font-size:11px; color:" + textMuted + "; margin-top:4px; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
    ".iaw-cta { display:inline-block; padding:5px 12px; background:" + ctaBg + "; color:" + ctaText + "; border-radius:6px; text-decoration:none; font-weight:600; font-size:11px; white-space:nowrap; transition:opacity .15s; align-self:center; flex-shrink:0; }",
    ".iaw-cta:hover { opacity:.88; }",
    ".iaw-disclaimer { padding:8px 16px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; line-height:1.5; }",
    ".iaw-footer { padding:8px 16px; text-align:center; font-size:11px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".iaw-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".iaw-footer a:hover { text-decoration:underline; }",
    ".iaw-empty { padding:24px 16px; text-align:center; font-size:13px; color:" + textMuted + "; }",
    "@media (max-width:480px) { .iaw-card { gap:8px; } .iaw-cta { padding:4px 8px; font-size:10px; } }",
  ].join("\\n");
  shadow.appendChild(styles);

  // ─── Helpers ───────────────────────────────────────────────────
  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function fmtType(t) {
    if (!t) return "";
    return t.replace(/-/g, " ").replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
  }

  // ─── Render ────────────────────────────────────────────────────
  var container = document.createElement("div");
  container.className = "iaw";

  container.innerHTML =
    '<div class="iaw-header">' +
      '<span>Financial Advisors</span>' +
      '<a href="' + BASE + '/advisors?' + REF_PARAM + '" target="_blank" style="font-size:11px;font-weight:400;color:' + textMuted + ';text-decoration:none;">Browse all &rarr;</a>' +
    '</div>';

  if (ADVISORS.length === 0) {
    container.innerHTML += '<div class="iaw-empty">No advisors found matching your filters.</div>';
  } else {
    for (var i = 0; i < ADVISORS.length; i++) {
      var a = ADVISORS[i];
      var profileUrl = BASE + "/advisors/" + esc(a.slug) + "?" + REF_PARAM;

      var avatarHtml = a.photo_url
        ? '<div class="iaw-avatar"><img src="' + esc(a.photo_url) + '" alt="' + esc(a.name) + '"></div>'
        : '<div class="iaw-avatar">' + esc((a.name || "A").charAt(0)) + '</div>';

      var verifiedHtml = a.verified
        ? '<span class="iaw-verified" title="Verified advisor">&#10003;</span>'
        : "";

      var ratingHtml = a.rating
        ? '<span class="iaw-rating">&#9733; ' + parseFloat(a.rating).toFixed(1) + '</span>' +
          (a.review_count ? '<span style="font-size:10px;color:' + textMuted + '"> (' + a.review_count + ')</span>' : "")
        : "";

      var typePill = a.type
        ? '<span class="iaw-pill">' + esc(fmtType(a.type)) + '</span>'
        : "";
      var statePill = a.location_state
        ? '<span class="iaw-pill">' + esc(a.location_state) + '</span>'
        : "";
      var freePill = a.initial_consultation_free
        ? '<span class="iaw-pill free">Free consult</span>'
        : "";
      var feePill = a.fee_structure
        ? '<span class="iaw-pill">' + esc(fmtType(a.fee_structure)) + '</span>'
        : "";

      var offerHtml = a.offer_active && a.offer_text
        ? '<div class="iaw-offer">Offer: ' + esc(a.offer_text) + '</div>'
        : "";

      container.innerHTML +=
        '<div class="iaw-card">' +
          avatarHtml +
          '<div class="iaw-body">' +
            '<div class="iaw-name">' + esc(a.name) + verifiedHtml + (ratingHtml ? ' <span style="margin-left:2px;">' + ratingHtml + '</span>' : '') + '</div>' +
            (a.firm_name ? '<div class="iaw-firm">' + esc(a.firm_name) + '</div>' : '') +
            '<div class="iaw-meta">' + typePill + statePill + feePill + freePill + '</div>' +
            offerHtml +
          '</div>' +
          '<a class="iaw-cta" href="' + profileUrl + '" target="_blank" rel="noopener noreferrer">View &rarr;</a>' +
        '</div>';
    }
  }

  container.innerHTML += '<div class="iaw-disclaimer">' + esc(DISCLAIMER) + '</div>';
  container.innerHTML += '<div class="iaw-footer">Powered by <a href="' + BASE + '/advisors?' + REF_PARAM + '" target="_blank">invest.com.au</a></div>';

  shadow.appendChild(container);
})();
`;

  // Per-partner usage metering — fire-and-forget, fail-open.
  meterEmbedLoad({
    license: gate.license,
    endpoint: "/api/widget/advisors",
    request,
    statusCode: 200,
    startedAt: gateStart,
  });

  return new NextResponse(js.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Licensed loads cache privately so shared CDN caches never serve a
      // domain-restricted partner's payload to another site.
      "Cache-Control": gate.license
        ? "private, max-age=900"
        : "public, max-age=3600, s-maxage=3600",
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
