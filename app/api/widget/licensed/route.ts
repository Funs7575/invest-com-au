/**
 * GET /api/widget/licensed — White-label broker comparison widget.
 *
 * Identical to /api/widget except the "Powered by invest.com.au" attribution
 * footer is omitted when a valid Pro/Enterprise license token is supplied via
 * ?license=wlt_xxx. Falls back silently to the footer-included version if
 * the token is absent or invalid, so embed breakage is impossible.
 *
 * Supported widget params (same as /api/widget):
 *   ?brokers=stake,commsec   — comma-separated broker slugs
 *   ?type=table|compact      — layout (default: table)
 *   ?theme=light|dark        — colour theme (default: light)
 *   ?limit=5                 — max brokers (default 5, max 10)
 *   ?widget=<catalogue-slug> — curated content filter
 *   ?ref=<partnerId>         — partner attribution
 *
 * White-label param:
 *   ?license=wlt_xxx         — license token from POST /api/v1/widget-licenses
 *
 * CORS contract:
 *   Served as `application/javascript` to any origin — same as /api/widget.
 *   No user-context data is read or exposed.
 *
 * Caching:
 *   Without a valid license: public CDN cache (same as /api/widget), 1hr.
 *   With a valid license:    private browser cache, 15 min. The token is in
 *   the URL so each unique license has its own cache entry — no cross-user
 *   contamination.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWidgetCatalogueEntry } from "@/lib/widget/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // License validation requires a DB lookup

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cross-Origin-Resource-Policy": "cross-origin",
  Vary: "Origin",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const brokerSlugs = params.get("brokers")?.split(",").filter(Boolean) ?? [];
  const widgetType = params.get("type") === "compact" ? "compact" : "table";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "5", 10) || 5, 1), 10);
  const ref = params.get("ref") ?? "";
  const licenseToken = params.get("license") ?? "";

  const widgetSlug = params.get("widget");
  const catalogueEntry = widgetSlug ? getWidgetCatalogueEntry(widgetSlug) : undefined;
  const widgetHeading = catalogueEntry?.heading ?? "Broker Comparison";

  const supabase = createAdminClient();

  // Resolve license — hash the token and look it up. Service-role bypasses the
  // deny-all RLS on widget_licenses so we can validate without user JWT.
  let showBranding = true;
  if (licenseToken.startsWith("wlt_")) {
    const hash = createHash("sha256").update(licenseToken).digest("hex");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: license } = await (supabase as any)
      .from("widget_licenses")
      .select("id, allowed_domains")
      .eq("token_hash", hash)
      .eq("is_active", true)
      .maybeSingle();

    if (license) {
      // If the license has an allowlist, enforce it. Otherwise allow any origin.
      const origin = request.headers.get("origin") ?? "";
      const domains = (license.allowed_domains as string[]) ?? [];
      if (
        domains.length === 0 ||
        domains.some((d) => origin.endsWith(d) || origin === `https://${d}` || origin === `http://${d}`)
      ) {
        showBranding = false;
      }
    }
  }

  // Fetch broker data using admin client (reads same active brokers as anon client via RLS)
  let query = supabase
    .from("brokers")
    .select("name, slug, asx_fee, us_fee, fx_rate, rating, chess_sponsored, platform_type, logo_url, color, icon, deal, deal_text")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(limit);

  if (brokerSlugs.length > 0) {
    query = query.in("slug", brokerSlugs);
  } else if (catalogueEntry) {
    switch (catalogueEntry.filter) {
      case "crypto":
        query = query.eq("platform_type", "crypto_exchange");
        break;
      case "savings":
        query = query.eq("platform_type", "savings_account");
        break;
      case "term-deposits":
        query = query.eq("platform_type", "term_deposit");
        break;
      case "asx":
        query = query.eq("platform_type", "share_broker").not("asx_fee_value", "is", null);
        break;
      case "us":
        query = query.eq("platform_type", "share_broker").not("us_fee_value", "is", null);
        break;
    }
  }

  const { data: brokers } = await query;
  const rows = brokers ?? [];

  const brokersJson = JSON.stringify(rows);
  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=widget`
    : "ref=widget&source=embed";

  const footerHtml = showBranding
    ? `container.innerHTML += '<div class="icw-footer">Powered by <a href="' + BASE + "?" + REF_PARAM + '" target="_blank">invest.com.au</a></div>';`
    : `/* white-label: attribution footer omitted */`;

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var BROKERS = ${brokersJson};
  var TYPE = ${JSON.stringify(widgetType)};
  var THEME = ${JSON.stringify(theme)};
  var WIDGET_HEADING = ${JSON.stringify(widgetHeading)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  var scripts = document.querySelectorAll("script[src*='/api/widget']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

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
    ".icw-compact .icw-card { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid " + border + "; }",
    ".icw-compact .icw-card:last-of-type { border-bottom:none; }",
    ".icw-compact .icw-info { flex:1; min-width:0; }",
    ".icw-compact .icw-info-name { font-weight:600; font-size:13px; }",
    ".icw-compact .icw-info-sub { font-size:11px; color:" + textMuted + "; }",
    "@media (max-width:480px) { .icw-row { grid-template-columns:1fr 70px 80px; } .icw-hide-sm { display:none; } }",
  ].join("\\n");
  shadow.appendChild(styles);

  var container = document.createElement("div");
  container.className = "icw";

  if (TYPE === "compact") {
    container.classList.add("icw-compact");
    container.innerHTML = '<div class="icw-header">' + esc(WIDGET_HEADING) + '</div>';
    BROKERS.forEach(function(b) {
      var logoHtml = b.logo_url
        ? '<div class="icw-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(b.logo_url) + '" alt="' + esc(b.name) + '"></div>'
        : '<div class="icw-logo" style="background:' + esc(b.color) + '20;color:' + esc(b.color) + '">' + esc((b.icon || b.name.charAt(0))) + '</div>';
      var link = BASE + "/go/" + esc(b.slug) + "?" + REF_PARAM;
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
    container.innerHTML = '<div class="icw-header">' + esc(WIDGET_HEADING) + '</div>';
    container.innerHTML += '<div class="icw-row" style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:' + textMuted + '">' +
      '<div>Broker</div><div>ASX Fee</div><div class="icw-hide-sm">US Fee</div><div class="icw-hide-sm">Rating</div><div></div></div>';
    BROKERS.forEach(function(b) {
      var logoHtml = b.logo_url
        ? '<div class="icw-logo" style="background:#fff;border:1px solid ' + border + '"><img src="' + esc(b.logo_url) + '" alt="' + esc(b.name) + '"></div>'
        : '<div class="icw-logo" style="background:' + esc(b.color) + '20;color:' + esc(b.color) + '">' + esc((b.icon || b.name.charAt(0))) + '</div>';
      var link = BASE + "/go/" + esc(b.slug) + "?" + REF_PARAM;
      container.innerHTML += '<div class="icw-row">' +
        '<div class="icw-name">' + logoHtml + esc(b.name) + '</div>' +
        '<div>' + esc(b.asx_fee || "N/A") + '</div>' +
        '<div class="icw-hide-sm">' + esc(b.us_fee || "N/A") + '</div>' +
        '<div class="icw-hide-sm icw-rating">' + (b.rating ? b.rating + '/5' : 'N/A') + '</div>' +
        '<div><a class="icw-cta" href="' + link + '" target="_blank" rel="noopener noreferrer nofollow sponsored">Visit &rarr;</a></div>' +
      '</div>';
    });
  }

  ${footerHtml}
  shadow.appendChild(container);

  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }
})();
`;

  const cacheControl = showBranding
    ? "public, max-age=3600, s-maxage=3600"
    : "private, max-age=900";

  return new NextResponse(js.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": cacheControl,
      ...CORS,
    },
  });
}
