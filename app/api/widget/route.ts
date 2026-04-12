import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/widget — Returns self-contained JavaScript that renders an
 * embeddable broker comparison widget inside a Shadow DOM container.
 *
 * Query params:
 *   ?brokers=stake,commsec   — comma-separated broker slugs (optional filter)
 *   ?type=table|compact      — widget layout (default: table)
 *   ?theme=light|dark        — colour theme (default: light)
 *   ?limit=5                 — max brokers to show (default: 5, max: 10)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const brokerSlugs = params.get("brokers")?.split(",").filter(Boolean) || [];
  const widgetType = params.get("type") === "compact" ? "compact" : "table";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "5", 10) || 5, 1), 10);

  // Fetch broker data server-side so the widget JS has everything inline
  const supabase = createAdminClient();
  let query = supabase
    .from("brokers")
    .select("name, slug, asx_fee, us_fee, fx_rate, rating, chess_sponsored, platform_type, logo_url, color, icon, deal, deal_text")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(limit);

  if (brokerSlugs.length > 0) {
    query = query.in("slug", brokerSlugs);
  }

  const { data: brokers } = await query;
  const rows = brokers || [];

  // Serialise broker data into the JS payload
  const brokersJson = JSON.stringify(rows);

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var BROKERS = ${brokersJson};
  var TYPE = ${JSON.stringify(widgetType)};
  var THEME = ${JSON.stringify(theme)};
  var BASE = "https://invest.com.au";

  // Find the script tag that loaded us (last script on page)
  var scripts = document.querySelectorAll("script[src*='/api/widget']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host element + shadow DOM for style isolation
  var host = document.createElement("div");
  host.setAttribute("data-invest-widget", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  var isDark = THEME === "dark";
  var bg = isDark ? "#1e293b" : "#ffffff";
  var border = isDark ? "#334155" : "#e2e8f0";
  var text = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted = isDark ? "#94a3b8" : "#64748b";
  var rowHover = isDark ? "#334155" : "#f8fafc";
  var accent = "#059669";
  var ctaBg = "#059669";
  var ctaText = "#ffffff";

  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
    ".icw { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; max-width:720px; font-size:13px; color:" + text + "; }",
    ".icw-header { padding:12px 16px; font-weight:700; font-size:15px; border-bottom:1px solid " + border + "; }",
    ".icw-row { display:grid; grid-template-columns:1fr 90px 90px 70px 100px; align-items:center; padding:10px 16px; border-bottom:1px solid " + border + "; transition:background .15s; }",
    ".icw-row:hover { background:" + rowHover + "; }",
    ".icw-row:last-child { border-bottom:none; }",
    ".icw-name { font-weight:600; display:flex; align-items:center; gap:8px; }",
    ".icw-logo { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0; overflow:hidden; }",
    ".icw-logo img { width:100%; height:100%; object-fit:contain; }",
    ".icw-muted { color:" + textMuted + "; font-size:12px; }",
    ".icw-rating { color:" + accent + "; font-weight:700; }",
    ".icw-cta { display:inline-block; padding:5px 12px; background:" + ctaBg + "; color:" + ctaText + "; border-radius:6px; text-decoration:none; font-weight:600; font-size:12px; text-align:center; transition:opacity .15s; }",
    ".icw-cta:hover { opacity:.9; }",
    ".icw-footer { padding:8px 16px; text-align:center; font-size:11px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".icw-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".icw-footer a:hover { text-decoration:underline; }",
    /* Compact layout */
    ".icw-compact .icw-card { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid " + border + "; }",
    ".icw-compact .icw-card:last-of-type { border-bottom:none; }",
    ".icw-compact .icw-info { flex:1; min-width:0; }",
    ".icw-compact .icw-info-name { font-weight:600; font-size:13px; }",
    ".icw-compact .icw-info-sub { font-size:11px; color:" + textMuted + "; }",
    /* Responsive: hide less-critical columns on small widths */
    "@media (max-width:480px) { .icw-row { grid-template-columns:1fr 70px 80px; } .icw-hide-sm { display:none; } }",
  ].join("\\n");
  shadow.appendChild(styles);

  var container = document.createElement("div");
  container.className = "icw";

  if (TYPE === "compact") {
    container.classList.add("icw-compact");
    container.innerHTML = '<div class="icw-header">Broker Comparison</div>';
    BROKERS.forEach(function(b) {
      var logoHtml = b.logo_url
        ? '<div class="icw-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(b.logo_url) + '" alt="' + esc(b.name) + '"></div>'
        : '<div class="icw-logo" style="background:' + esc(b.color) + '20;color:' + esc(b.color) + '">' + esc((b.icon || b.name.charAt(0))) + '</div>';
      var link = BASE + "/go/" + esc(b.slug) + "?ref=widget&source=embed";
      container.innerHTML += '<div class="icw-card">' +
        logoHtml +
        '<div class="icw-info">' +
          '<div class="icw-info-name">' + esc(b.name) + '</div>' +
          '<div class="icw-info-sub">' + (b.asx_fee || "N/A") + ' ASX &middot; ' + (b.rating || "N/A") + '/5</div>' +
        '</div>' +
        '<a class="icw-cta" href="' + link + '" target="_blank" rel="noopener noreferrer nofollow sponsored">Visit</a>' +
      '</div>';
    });
  } else {
    // Table layout
    container.innerHTML = '<div class="icw-header">Broker Comparison</div>';
    container.innerHTML += '<div class="icw-row" style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:' + textMuted + '">' +
      '<div>Broker</div><div>ASX Fee</div><div class="icw-hide-sm">US Fee</div><div class="icw-hide-sm">Rating</div><div></div></div>';
    BROKERS.forEach(function(b) {
      var logoHtml = b.logo_url
        ? '<div class="icw-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(b.logo_url) + '" alt="' + esc(b.name) + '"></div>'
        : '<div class="icw-logo" style="background:' + esc(b.color) + '20;color:' + esc(b.color) + '">' + esc((b.icon || b.name.charAt(0))) + '</div>';
      var link = BASE + "/go/" + esc(b.slug) + "?ref=widget&source=embed";
      container.innerHTML += '<div class="icw-row">' +
        '<div class="icw-name">' + logoHtml + esc(b.name) + '</div>' +
        '<div>' + esc(b.asx_fee || "N/A") + '</div>' +
        '<div class="icw-hide-sm">' + esc(b.us_fee || "N/A") + '</div>' +
        '<div class="icw-hide-sm icw-rating">' + (b.rating ? b.rating + '/5' : 'N/A') + '</div>' +
        '<div><a class="icw-cta" href="' + link + '" target="_blank" rel="noopener noreferrer nofollow sponsored">Visit &rarr;</a></div>' +
      '</div>';
    });
  }

  container.innerHTML += '<div class="icw-footer">Powered by <a href="' + BASE + '?ref=widget" target="_blank">invest.com.au</a></div>';
  shadow.appendChild(container);

  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }
})();
`;

  return new NextResponse(js.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
