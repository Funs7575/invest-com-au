import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import {
  evaluateEmbedGate,
  embedAccessRequiredResponse,
  meterEmbedLoad,
} from "@/lib/embed-gate";

export const runtime = "nodejs";
// 1h ISR cache — broker fee data changes at most daily via the fee cron.
export const revalidate = 3600;

/**
 * GET /api/widget/calculator — Returns self-contained JavaScript that renders
 * an interactive brokerage-fee / trade-cost calculator inside a Shadow DOM.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embed feature.
 *   • Must NEVER read user-context data (no cookies, no auth, no per-user
 *     state). Fee data here is identical to the public broker pages.
 *   • Uses the anon-key client so Postgres RLS enforces active-only reads.
 *     Do NOT swap to createAdminClient().
 *   • Cache-Control allows public CDN caching — responses are not
 *     personalised.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AFSL compliance: this widget performs factual arithmetic on publicly
 * disclosed broker fee schedules. It does NOT constitute financial product
 * advice. The rendered widget includes the site's general-advice disclaimer
 * (lib/compliance.ts GENERAL_ADVICE_WARNING) so consumers are aware.
 *
 * Query params:
 *   ?market=asx|us         — which fee column to show (default: asx)
 *   ?theme=light|dark      — colour theme (default: light)
 *   ?limit=5               — max brokers to show (default: 5, max: 10)
 *   ?amount=5000           — default trade amount pre-filled (default: 5000)
 *   ?ref=<partnerId>       — partner attribution; appended to all outbound
 *                            invest.com.au links (no storage, query-param only)
 *   ?license=wlt_xxx       — embed partner key (widget license token). Required
 *                            when the `embed_partner_gating` flag is on; always
 *                            used for per-partner usage metering (lib/embed-gate.ts).
 */
export async function GET(request: NextRequest) {
  const gateStart = Date.now();
  // Embed partner gate — flag-controlled. Unauthorised loads render a
  // branded "get access" card (still 200 JS, never a script error).
  const gate = await evaluateEmbedGate(request);
  if (!gate.authorised) {
    return embedAccessRequiredResponse("Brokerage Fee Calculator");
  }

  const params = request.nextUrl.searchParams;
  const market = params.get("market") === "us" ? "us" : "asx";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const parsedLimit = parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isNaN(parsedLimit)
    ? 5
    : Math.min(Math.max(parsedLimit, 1), 10);
  const parsedAmount = parseFloat(params.get("amount") ?? "");
  const defaultAmount = Number.isNaN(parsedAmount)
    ? 5000
    : Math.min(Math.max(parsedAmount, 1), 1_000_000);
  // Partner attribution — see /api/widget for the same pattern.
  const ref = params.get("ref") || "";

  // Anon-key client: RLS enforces active-only broker rows. See header comment.
  const supabase = createStaticClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "name, slug, asx_fee_value, us_fee_value, fx_rate, logo_url, color, icon, affiliate_url",
    )
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("rating", { ascending: false })
    .limit(limit);

  const rows = (brokers || []) as {
    name: string;
    slug: string;
    asx_fee_value: number | null;
    us_fee_value: number | null;
    fx_rate: number | null;
    logo_url: string | null;
    color: string | null;
    icon: string | null;
    affiliate_url: string | null;
  }[];

  const brokersJson = JSON.stringify(rows);

  // Ref param string for outbound links. Partner ID takes priority; falls
  // back to the generic calculator-widget attribution signal.
  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=calc-widget`
    : "ref=widget&source=calc-embed";

  // General-advice disclaimer text — keep in sync with
  // lib/compliance.ts GENERAL_ADVICE_WARNING.
  const DISCLAIMER =
    "General information only. Does not take into account your personal situation. " +
    "Not financial advice. Consider the PDS and TMD before making any investment decision.";

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var BROKERS = ${brokersJson};
  var DEFAULT_MARKET = ${JSON.stringify(market)};
  var DEFAULT_AMOUNT = ${JSON.stringify(defaultAmount)};
  var THEME = ${JSON.stringify(theme)};
  var DISCLAIMER = ${JSON.stringify(DISCLAIMER)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  // Find the script tag that loaded us (last matching script on page)
  var scripts = document.querySelectorAll("script[src*='/api/widget/calculator']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host element + shadow DOM for style isolation
  var host = document.createElement("div");
  host.setAttribute("data-invest-calc-widget", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  // ─── Theme tokens ──────────────────────────────────────────────
  var isDark = THEME === "dark";
  var bg      = isDark ? "#1e293b" : "#ffffff";
  var bgInput = isDark ? "#0f172a" : "#f8fafc";
  var border  = isDark ? "#334155" : "#e2e8f0";
  var text    = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted = isDark ? "#94a3b8" : "#64748b";
  var rowHover  = isDark ? "#334155" : "#f8fafc";
  var accent    = "#059669";
  var accentBg  = "#059669";
  var accentText = "#ffffff";
  var cheapestBg = isDark ? "#064e3b" : "#ecfdf5";
  var cheapestBorder = isDark ? "#10b981" : "#a7f3d0";
  var barBg      = isDark ? "#334155" : "#f1f5f9";

  // ─── Styles ────────────────────────────────────────────────────
  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".icw { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; max-width:720px; font-size:13px; color:" + text + "; }",
    ".icw-header { padding:12px 16px; font-weight:700; font-size:15px; border-bottom:1px solid " + border + "; display:flex; align-items:center; justify-content:space-between; }",
    ".icw-controls { padding:10px 16px; border-bottom:1px solid " + border + "; display:flex; gap:8px; align-items:center; flex-wrap:wrap; background:" + bgInput + "; }",
    ".icw-label { font-size:11px; font-weight:600; color:" + textMuted + "; text-transform:uppercase; letter-spacing:.05em; margin-right:4px; }",
    ".icw-input { padding:5px 10px; border:1px solid " + border + "; border-radius:6px; background:" + bg + "; color:" + text + "; font-size:13px; font-weight:600; width:110px; outline:none; }",
    ".icw-input:focus { border-color:" + accent + "; box-shadow:0 0 0 2px " + accent + "33; }",
    ".icw-btn { padding:5px 12px; border:1px solid " + border + "; border-radius:6px; background:" + bg + "; color:" + textMuted + "; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }",
    ".icw-btn.active { background:" + accent + "; color:#fff; border-color:" + accent + "; }",
    ".icw-btn:hover:not(.active) { border-color:" + accent + "; color:" + accent + "; }",
    ".icw-row { display:grid; grid-template-columns:1fr 80px 90px 90px; align-items:center; padding:9px 16px; border-bottom:1px solid " + border + "; transition:background .15s; }",
    ".icw-row:hover { background:" + rowHover + "; }",
    ".icw-row:last-child { border-bottom:none; }",
    ".icw-row.cheapest { background:" + cheapestBg + "; border-left:3px solid " + accent + "; }",
    ".icw-name { font-weight:600; display:flex; align-items:center; gap:7px; font-size:13px; }",
    ".icw-logo { width:24px; height:24px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:10px; flex-shrink:0; overflow:hidden; }",
    ".icw-logo img { width:100%; height:100%; object-fit:contain; }",
    ".icw-badge { font-size:9px; font-weight:700; text-transform:uppercase; color:" + accent + "; background:" + cheapestBg + "; border:1px solid " + cheapestBorder + "; border-radius:4px; padding:1px 5px; margin-left:4px; }",
    ".icw-bar-wrap { height:6px; background:" + barBg + "; border-radius:3px; overflow:hidden; }",
    ".icw-bar { height:100%; border-radius:3px; transition:width .4s ease; }",
    ".icw-bar.cheapest { background:" + accent + "; }",
    ".icw-bar.rest { background:#f59e0b; }",
    ".icw-cost { font-weight:700; font-size:13px; font-variant-numeric:tabular-nums; }",
    ".icw-pct { font-size:11px; color:" + textMuted + "; font-variant-numeric:tabular-nums; }",
    ".icw-cta { display:inline-block; padding:4px 11px; background:" + accentBg + "; color:" + accentText + "; border-radius:6px; text-decoration:none; font-weight:600; font-size:11px; text-align:center; transition:opacity .15s; white-space:nowrap; }",
    ".icw-cta:hover { opacity:.88; }",
    ".icw-summary { padding:8px 16px; background:" + bgInput + "; border-top:1px solid " + border + "; font-size:12px; color:" + textMuted + "; text-align:center; }",
    ".icw-summary strong { color:" + text + "; }",
    ".icw-footer { padding:8px 16px; text-align:center; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".icw-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".icw-disclaimer { padding:8px 16px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; line-height:1.5; }",
    /* Header column row */
    ".icw-thead { display:grid; grid-template-columns:1fr 80px 90px 90px; padding:7px 16px; background:" + bgInput + "; border-bottom:1px solid " + border + "; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:" + textMuted + "; }",
    /* Responsive: collapse cost bar col on narrow widths */
    "@media (max-width:480px) { .icw-row { grid-template-columns:1fr 90px 80px; } .icw-thead { grid-template-columns:1fr 90px 80px; } .icw-col-bar { display:none; } }",
  ].join("\\n");
  shadow.appendChild(styles);

  // ─── State ─────────────────────────────────────────────────────
  var currentMarket = DEFAULT_MARKET;
  var currentAmount = DEFAULT_AMOUNT;

  // ─── Calc logic (mirrors TradeCostCalculator.tsx) ──────────────
  function computeResults(amount) {
    var results = [];
    for (var i = 0; i < BROKERS.length; i++) {
      var b = BROKERS[i];
      if (currentMarket === "asx") {
        var brokerage = b.asx_fee_value;
        if (brokerage === null || brokerage === undefined || brokerage >= 999) continue;
        results.push({
          broker: b,
          brokerage: brokerage,
          fxCost: 0,
          totalCost: brokerage,
          pctOfTrade: amount > 0 ? (brokerage / amount) * 100 : 0,
        });
      } else {
        var brok2 = b.us_fee_value;
        if (brok2 === null || brok2 === undefined || brok2 >= 999) continue;
        var fxCost = amount * ((b.fx_rate || 0) / 100);
        var total = brok2 + fxCost;
        results.push({
          broker: b,
          brokerage: brok2,
          fxCost: fxCost,
          totalCost: total,
          pctOfTrade: amount > 0 ? (total / amount) * 100 : 0,
        });
      }
    }
    results.sort(function(a, b) { return a.totalCost - b.totalCost; });
    return results;
  }

  function fmt(n) {
    return "$" + n.toFixed(2);
  }

  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  // ─── Render ────────────────────────────────────────────────────
  function render() {
    var amount = parseFloat(String(currentAmount)) || 0;
    var results = computeResults(amount);
    var cheapestCost = results.length > 0 ? results[0].totalCost : 0;
    var mostExpensiveCost = results.length > 0 ? results[results.length - 1].totalCost : 1;

    var container = document.createElement("div");
    container.className = "icw";

    // Header
    container.innerHTML =
      '<div class="icw-header">' +
        '<span>Brokerage Fee Calculator</span>' +
        '<a href="' + BASE + '/trade-cost-calculator?' + REF_PARAM + '" target="_blank" style="font-size:11px;font-weight:400;color:' + textMuted + ';text-decoration:none;">Full calculator &rarr;</a>' +
      '</div>';

    // Controls
    var marketBtnASX = '<button class="icw-btn' + (currentMarket === "asx" ? " active" : "") + '" data-market="asx">ASX</button>';
    var marketBtnUS  = '<button class="icw-btn' + (currentMarket === "us"  ? " active" : "") + '" data-market="us">US</button>';
    container.innerHTML +=
      '<div class="icw-controls">' +
        '<span class="icw-label">Amount</span>' +
        '<input class="icw-input" type="number" value="' + esc(String(currentAmount)) + '" min="1" step="500" aria-label="Trade amount in AUD" />' +
        '<span style="font-size:12px;color:' + textMuted + '">AUD</span>' +
        '<span style="margin-left:4px;">' + marketBtnASX + marketBtnUS + '</span>' +
      '</div>';

    // Column headers
    container.innerHTML +=
      '<div class="icw-thead">' +
        '<div>Broker</div>' +
        '<div style="text-align:right">Total</div>' +
        '<div style="text-align:right">% of trade</div>' +
        '<div class="icw-col-bar"></div>' +
      '</div>';

    // Result rows
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var isCheapest = (i === 0);
      var barWidth = mostExpensiveCost > 0 ? Math.max((r.totalCost / mostExpensiveCost) * 100, 2) : 2;

      var logoHtml = r.broker.logo_url
        ? '<div class="icw-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(r.broker.logo_url) + '" alt="' + esc(r.broker.name) + '"></div>'
        : '<div class="icw-logo" style="background:' + esc(r.broker.color || "#059669") + '20;color:' + esc(r.broker.color || "#059669") + '">' + esc((r.broker.icon || r.broker.name.charAt(0))) + '</div>';

      var badge = isCheapest ? '<span class="icw-badge">Cheapest</span>' : '';
      var link = r.broker.affiliate_url
        ? esc(r.broker.affiliate_url) + (r.broker.affiliate_url.includes("?") ? "&" : "?") + REF_PARAM
        : BASE + "/go/" + esc(r.broker.slug) + "?" + REF_PARAM;

      container.innerHTML +=
        '<div class="icw-row' + (isCheapest ? " cheapest" : "") + '">' +
          '<div class="icw-name">' + logoHtml + esc(r.broker.name) + badge + '</div>' +
          '<div style="text-align:right"><span class="icw-cost">' + fmt(r.totalCost) + '</span></div>' +
          '<div style="text-align:right"><span class="icw-pct">' + r.pctOfTrade.toFixed(2) + '%</span></div>' +
          '<div class="icw-col-bar"><div class="icw-bar-wrap"><div class="icw-bar ' + (isCheapest ? "cheapest" : "rest") + '" style="width:' + barWidth.toFixed(1) + '%"></div></div></div>' +
        '</div>';
    }

    if (results.length === 0) {
      container.innerHTML += '<div style="padding:20px;text-align:center;color:' + textMuted + ';font-size:13px;">No brokers found for ' + (currentMarket === "asx" ? "ASX" : "US") + ' trades.</div>';
    }

    // Savings summary
    if (results.length >= 2) {
      var saving = results[results.length - 1].totalCost - results[0].totalCost;
      container.innerHTML +=
        '<div class="icw-summary">Cheapest saves <strong>' + fmt(saving) + '</strong> per trade vs. most expensive</div>';
    }

    // Disclaimer — AFSL-required general advice warning
    container.innerHTML += '<div class="icw-disclaimer">' + esc(DISCLAIMER) + '</div>';

    // Footer
    container.innerHTML += '<div class="icw-footer">Powered by <a href="' + BASE + "?" + REF_PARAM + '" target="_blank">invest.com.au</a></div>';

    // Swap in
    while (shadow.firstChild && shadow.firstChild !== styles) shadow.removeChild(shadow.firstChild);
    // Remove everything except styles node, then append
    var existing = shadow.querySelector(".icw");
    if (existing) shadow.removeChild(existing);
    shadow.appendChild(container);

    // Wire up controls
    var input = shadow.querySelector(".icw-input");
    if (input) {
      input.addEventListener("input", function(e) {
        var val = parseFloat(e.target.value);
        if (Number.isFinite(val) && val > 0) {
          currentAmount = val;
          render();
        }
      });
    }
    shadow.querySelectorAll("[data-market]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        currentMarket = btn.getAttribute("data-market");
        render();
      });
    });
  }

  render();
})();
`;

  // Per-partner usage metering — fire-and-forget, fail-open.
  meterEmbedLoad({
    license: gate.license,
    endpoint: "/api/widget/calculator",
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
