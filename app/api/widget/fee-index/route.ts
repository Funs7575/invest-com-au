import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import {
  evaluateEmbedGate,
  embedAccessRequiredResponse,
  meterEmbedLoad,
} from "@/lib/embed-gate";

export const runtime = "nodejs";
// 1h ISR cache — fee data changes at most daily via the fee cron.
export const revalidate = 3600;

/**
 * GET /api/widget/fee-index — Returns self-contained JavaScript that renders
 * an embeddable AU brokerage-fee-index table widget inside a Shadow DOM.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embed feature.
 *   • Must NEVER read user-context data. No cookies, no auth, no per-user
 *     state. The data here is the same as on the public broker pages.
 *   • Uses the anon-key client so Postgres RLS enforces active-only reads.
 *     Do NOT swap to createAdminClient().
 *   • Cache-Control allows public CDN caching — responses are not
 *     personalised.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AFSL compliance: this widget presents factual aggregate brokerage-fee
 * data (ASX per-trade fees, US share fees, FX spreads) from publicly
 * disclosed broker fee schedules. It is NOT financial advice.
 * The general-advice disclaimer is included in the rendered output.
 *
 * "Fee index" here means the market-wide view — a sortable table of per-
 * broker fees so visitors can compare the AU brokerage fee landscape at a
 * glance. This mirrors the information on the /fee-index public page.
 *
 * Query params:
 *   ?market=asx|us          — which market's fees to highlight (default: asx)
 *   ?sort=asx_fee|us_fee|rating — sort column (default: asx_fee ascending)
 *   ?theme=light|dark        — colour theme (default: light)
 *   ?limit=10                — max brokers (default: 10, max: 20)
 *   ?ref=<partnerId>         — partner attribution; appended to all outbound
 *                              invest.com.au links
 *   ?license=wlt_xxx         — embed partner key; required when the
 *                              `embed_partner_gating` flag is on, always
 *                              metered (lib/embed-gate.ts)
 */
export async function GET(request: NextRequest) {
  const gateStart = Date.now();
  // Embed partner gate — flag-controlled. Unauthorised loads render a
  // branded "get access" card (still 200 JS, never a script error).
  const gate = await evaluateEmbedGate(request);
  if (!gate.authorised) {
    return embedAccessRequiredResponse("Brokerage Fee Index");
  }

  const params = request.nextUrl.searchParams;
  const market = params.get("market") === "us" ? "us" : "asx";
  const rawSort = params.get("sort") || "";
  const sort: "asx_fee" | "us_fee" | "rating" = ["asx_fee", "us_fee", "rating"].includes(rawSort)
    ? (rawSort as "asx_fee" | "us_fee" | "rating")
    : "asx_fee";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const parsedLimit = parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isNaN(parsedLimit)
    ? 10
    : Math.min(Math.max(parsedLimit, 1), 20);
  const ref = params.get("ref") || "";

  const supabase = createStaticClient();

  // Determine Supabase ordering. For fees we want ascending (cheapest first);
  // for rating we want descending (highest first).
  const isRatingSort = sort === "rating";

  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "name, slug, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, rating, logo_url, color, icon",
    )
    .eq("status", "active")
    .eq("is_crypto", false)
    .order(isRatingSort ? "rating" : sort === "us_fee" ? "us_fee_value" : "asx_fee_value", {
      ascending: !isRatingSort,
      nullsFirst: false,
    })
    .limit(limit);

  const rows = (brokers || []) as {
    name: string;
    slug: string;
    asx_fee: string | null;
    asx_fee_value: number | null;
    us_fee: string | null;
    us_fee_value: number | null;
    fx_rate: string | null;
    rating: number | null;
    logo_url: string | null;
    color: string | null;
    icon: string | null;
  }[];

  const brokersJson = JSON.stringify(rows);

  // Ref param string for outbound links.
  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=fee-index-widget`
    : "ref=widget&source=fee-index-embed";

  const DISCLAIMER =
    "General information only. Fee data sourced from publicly disclosed broker schedules. " +
    "Not financial advice. Always verify current fees directly with the provider before trading.";

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var BROKERS = ${brokersJson};
  var MARKET = ${JSON.stringify(market)};
  var THEME = ${JSON.stringify(theme)};
  var DISCLAIMER = ${JSON.stringify(DISCLAIMER)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  // Find the script tag that loaded us (last matching script on page)
  var scripts = document.querySelectorAll("script[src*='/api/widget/fee-index']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host element + shadow DOM for style isolation
  var host = document.createElement("div");
  host.setAttribute("data-invest-fee-index-widget", "true");
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
  var cheapestBg = isDark ? "#064e3b" : "#ecfdf5";
  var cheapestBorder = isDark ? "#10b981" : "#a7f3d0";

  // ─── Styles ────────────────────────────────────────────────────
  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".ifi { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; max-width:720px; font-size:13px; color:" + text + "; }",
    ".ifi-header { padding:12px 16px; font-weight:700; font-size:15px; border-bottom:1px solid " + border + "; display:flex; align-items:center; justify-content:space-between; }",
    ".ifi-thead { display:grid; grid-template-columns:1fr 90px 90px 70px 90px; padding:7px 16px; background:" + bgInput + "; border-bottom:1px solid " + border + "; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:" + textMuted + "; }",
    ".ifi-row { display:grid; grid-template-columns:1fr 90px 90px 70px 90px; align-items:center; padding:9px 16px; border-bottom:1px solid " + border + "; transition:background .15s; }",
    ".ifi-row:hover { background:" + rowHover + "; }",
    ".ifi-row:last-child { border-bottom:none; }",
    ".ifi-row.cheapest { background:" + cheapestBg + "; border-left:3px solid " + accent + "; }",
    ".ifi-name { font-weight:600; display:flex; align-items:center; gap:7px; font-size:13px; }",
    ".ifi-logo { width:24px; height:24px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:10px; flex-shrink:0; overflow:hidden; }",
    ".ifi-logo img { width:100%; height:100%; object-fit:contain; }",
    ".ifi-badge { font-size:9px; font-weight:700; text-transform:uppercase; color:" + accent + "; background:" + cheapestBg + "; border:1px solid " + cheapestBorder + "; border-radius:4px; padding:1px 5px; }",
    ".ifi-fee { font-variant-numeric:tabular-nums; font-weight:600; font-size:12px; }",
    ".ifi-fee.highlight { color:" + accent + "; }",
    ".ifi-rating { color:" + accent + "; font-weight:700; font-size:12px; }",
    ".ifi-cta { display:inline-block; padding:4px 10px; background:" + ctaBg + "; color:" + ctaText + "; border-radius:6px; text-decoration:none; font-weight:600; font-size:11px; text-align:center; transition:opacity .15s; white-space:nowrap; }",
    ".ifi-cta:hover { opacity:.88; }",
    ".ifi-disclaimer { padding:8px 16px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; line-height:1.5; }",
    ".ifi-footer { padding:8px 16px; text-align:center; font-size:11px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".ifi-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".ifi-footer a:hover { text-decoration:underline; }",
    ".ifi-empty { padding:24px 16px; text-align:center; font-size:13px; color:" + textMuted + "; }",
    /* Responsive: hide less-critical columns on small widths */
    "@media (max-width:500px) { .ifi-thead { grid-template-columns:1fr 80px 60px; } .ifi-row { grid-template-columns:1fr 80px 60px; } .ifi-hide-sm { display:none; } }",
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
  container.className = "ifi";

  var marketLabel = MARKET === "us" ? "US Shares" : "ASX Shares";
  container.innerHTML =
    '<div class="ifi-header">' +
      '<span>AU Brokerage Fee Index — ' + marketLabel + '</span>' +
      '<a href="' + BASE + '/fee-index?' + REF_PARAM + '" target="_blank" style="font-size:11px;font-weight:400;color:' + textMuted + ';text-decoration:none;">Full index &rarr;</a>' +
    '</div>';

  if (BROKERS.length === 0) {
    container.innerHTML += '<div class="ifi-empty">No fee data available.</div>';
  } else {
    // Column headers
    container.innerHTML +=
      '<div class="ifi-thead">' +
        '<div>Broker</div>' +
        '<div>ASX Fee</div>' +
        '<div class="ifi-hide-sm">US Fee</div>' +
        '<div class="ifi-hide-sm">Rating</div>' +
        '<div></div>' +
      '</div>';

    // Find cheapest broker for primary market
    var cheapestIdx = -1;
    var cheapestVal = Infinity;
    for (var i = 0; i < BROKERS.length; i++) {
      var fv = MARKET === "us" ? BROKERS[i].us_fee_value : BROKERS[i].asx_fee_value;
      if (fv !== null && fv !== undefined && fv < cheapestVal) {
        cheapestVal = fv;
        cheapestIdx = i;
      }
    }

    for (var j = 0; j < BROKERS.length; j++) {
      var b = BROKERS[j];
      var isCheapest = (j === cheapestIdx);

      var logoHtml = b.logo_url
        ? '<div class="ifi-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(b.logo_url) + '" alt="' + esc(b.name) + '"></div>'
        : '<div class="ifi-logo" style="background:' + esc(b.color || "#059669") + '20;color:' + esc(b.color || "#059669") + '">' + esc((b.icon || b.name.charAt(0))) + '</div>';

      var badge = isCheapest ? ' <span class="ifi-badge">Cheapest</span>' : "";
      var link = BASE + "/go/" + esc(b.slug) + "?" + REF_PARAM;
      var asxClass = MARKET === "asx" ? ' highlight' : "";
      var usClass  = MARKET === "us"  ? ' highlight' : "";

      container.innerHTML +=
        '<div class="ifi-row' + (isCheapest ? " cheapest" : "") + '">' +
          '<div class="ifi-name">' + logoHtml + esc(b.name) + badge + '</div>' +
          '<div><span class="ifi-fee' + asxClass + '">' + esc(b.asx_fee || "N/A") + '</span></div>' +
          '<div class="ifi-hide-sm"><span class="ifi-fee' + usClass + '">' + esc(b.us_fee || "N/A") + '</span></div>' +
          '<div class="ifi-hide-sm"><span class="ifi-rating">' + (b.rating ? parseFloat(b.rating).toFixed(1) : "N/A") + '</span></div>' +
          '<div><a class="ifi-cta" href="' + link + '" target="_blank" rel="noopener noreferrer nofollow sponsored">Visit &rarr;</a></div>' +
        '</div>';
    }
  }

  container.innerHTML += '<div class="ifi-disclaimer">' + esc(DISCLAIMER) + '</div>';
  container.innerHTML += '<div class="ifi-footer">Powered by <a href="' + BASE + '/fee-index?' + REF_PARAM + '" target="_blank">invest.com.au</a></div>';

  shadow.appendChild(container);
})();
`;

  // Per-partner usage metering — fire-and-forget, fail-open.
  meterEmbedLoad({
    license: gate.license,
    endpoint: "/api/widget/fee-index",
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
