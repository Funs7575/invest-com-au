import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import { CURRENT_YEAR } from "@/lib/seo";

export const runtime = "nodejs";
// 1h ISR — rates refresh daily but 1h caching gives Vercel CDN a hot pool.
export const revalidate = 3600;

/**
 * GET /api/widget/best-rates — Returns self-contained JavaScript that renders
 * an embeddable best-rates table (savings accounts and/or term deposits) inside
 * a Shadow DOM. Optionally co-branded with a named advisor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors all other /api/widget/* routes):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embed feature.
 *   • Must NEVER read user-context data. No cookies, no auth, no per-user state.
 *   • Only public columns read via the anon-key static client (RLS enforces active-only).
 *   • Cache-Control allows public CDN caching — responses are not personalised.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AFSL COMPLIANCE NOTE:
 *   This widget shows factual, publicly available rate data from financial
 *   institutions. It does NOT constitute personal financial advice, does NOT
 *   compare individual investors' situations, and does NOT make personal
 *   recommendations. The general-information disclaimer is always included.
 *   The "for_advisor_slug" co-branding only attaches the advisor's name/link
 *   to the header — it does not change the rate data or imply an endorsement.
 *
 * Query params:
 *   ?type=savings|term_deposit|all — product kind (default: savings)
 *   ?for_advisor_slug=<slug>       — optional advisor co-branding
 *   ?theme=light|dark              — colour theme (default: light)
 *   ?limit=5                       — number of rows (default: 5, max: 10)
 *   ?ref=<partnerId>               — partner attribution appended to outbound links
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawType = params.get("type") ?? "savings";
  const productKind =
    rawType === "term_deposit" ? "term_deposit" : rawType === "all" ? "all" : "savings";
  const forAdvisorSlug = params.get("for_advisor_slug")?.trim().slice(0, 128) ?? "";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const rawLimit = parseInt(params.get("limit") ?? "5", 10);
  const limit = Math.min(10, Math.max(1, isNaN(rawLimit) ? 5 : rawLimit));
  const ref = params.get("ref")?.trim().slice(0, 64) ?? "";

  const CORS_HEADERS = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin",
  };

  const supabase = createStaticClient();

  // ── Optional advisor co-branding ─────────────────────────────────────────
  let advisorName: string | null = null;
  let advisorProfileUrl: string | null = null;

  if (forAdvisorSlug) {
    const { data: advisorRow } = await supabase
      .from("professionals")
      .select("name, slug")
      .eq("slug", forAdvisorSlug)
      .eq("status", "active")
      .maybeSingle();

    if (advisorRow) {
      advisorName = (advisorRow as { name: string; slug: string }).name;
      advisorProfileUrl = `https://invest.com.au/advisor/${advisorRow.slug}`;
    }
  }

  // ── Fetch rate data ──────────────────────────────────────────────────────
  let query = supabase
    .from("savings_rate_snapshots")
    .select("rate_bps, intro_rate_bps, intro_term_months, product_kind, term_months, broker_id, brokers!inner(name, slug, logo_url)")
    .order("rate_bps", { ascending: false })
    .limit(limit);

  if (productKind !== "all") {
    const dbKind = productKind === "term_deposit" ? "term_deposit" : "savings_account";
    query = query.eq("product_kind", dbKind);
  }

  const { data: rateRows } = await query;

  type RateRow = {
    rate_bps: number;
    intro_rate_bps: number | null;
    intro_term_months: number | null;
    product_kind: string;
    term_months: number | null;
    broker_id: number;
    brokers: { name: string; slug: string; logo_url: string | null } | null;
  };

  const rows = ((rateRows ?? []) as unknown as RateRow[]).map((r) => ({
    brokerName: r.brokers?.name ?? "Unknown",
    brokerSlug: r.brokers?.slug ?? "",
    ratePct: (r.rate_bps / 100).toFixed(2),
    introRatePct: r.intro_rate_bps != null ? (r.intro_rate_bps / 100).toFixed(2) : null,
    introTermMonths: r.intro_term_months ?? null,
    productKind: r.product_kind,
    termMonths: r.term_months ?? null,
  }));

  const refParam = ref
    ? `ref=${encodeURIComponent(ref)}&source=widget-best-rates`
    : "ref=widget&source=widget-best-rates";

  const headingLabel =
    productKind === "term_deposit"
      ? "Best Term Deposits"
      : productKind === "all"
      ? "Best Savings Rates & Term Deposits"
      : "Best Savings Accounts";

  const js = buildRatesJs({
    rows,
    advisorName,
    advisorProfileUrl,
    heading: headingLabel,
    theme,
    refParam,
    year: CURRENT_YEAR,
  });

  return new NextResponse(js, { status: 200, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

type RateEntry = {
  brokerName: string;
  brokerSlug: string;
  ratePct: string;
  introRatePct: string | null;
  introTermMonths: number | null;
  productKind: string;
  termMonths: number | null;
};

function buildRatesJs(opts: {
  rows: RateEntry[];
  advisorName: string | null;
  advisorProfileUrl: string | null;
  heading: string;
  theme: "light" | "dark";
  refParam: string;
  year: number;
}): string {
  const { rows, advisorName, advisorProfileUrl, heading, theme, refParam, year } = opts;

  const DISCLAIMER =
    "General information only. Rate data is sourced from public disclosures by financial institutions " +
    "and is refreshed regularly. Rates may change at any time. Not personal financial advice. " +
    `Always verify current rates with the provider before making financial decisions. © ${year} Invest.com.au`;

  return `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var ROWS = ${JSON.stringify(rows)};
  var ADVISOR_NAME = ${JSON.stringify(advisorName)};
  var ADVISOR_URL = ${JSON.stringify(advisorProfileUrl)};
  var HEADING = ${JSON.stringify(heading)};
  var THEME = ${JSON.stringify(theme)};
  var DISCLAIMER = ${JSON.stringify(DISCLAIMER)};
  var REF_PARAM = ${JSON.stringify(refParam)};
  var BASE = "https://invest.com.au";

  var scripts = document.querySelectorAll("script[src*='/api/widget/best-rates']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  var host = document.createElement("div");
  host.setAttribute("data-invest-best-rates", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  var isDark = THEME === "dark";
  var bg       = isDark ? "#1e293b" : "#ffffff";
  var border   = isDark ? "#334155" : "#e2e8f0";
  var text     = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted= isDark ? "#94a3b8" : "#64748b";
  var accent   = "#059669";
  var rowHover = isDark ? "#1e2d3d" : "#f8fafc";
  var headerBg = isDark ? "#0f172a" : "#f1f5f9";

  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".ibw { background:" + bg + "; border:1px solid " + border + "; border-radius:12px; overflow:hidden; font-size:13px; color:" + text + "; }",
    ".ibw-header { padding:12px 16px; border-bottom:1px solid " + border + "; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }",
    ".ibw-heading { font-weight:800; font-size:14px; color:" + text + "; }",
    ".ibw-advisor { font-size:11px; color:" + textMuted + "; }",
    ".ibw-advisor a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".ibw-advisor a:hover { text-decoration:underline; }",
    "table { width:100%; border-collapse:collapse; }",
    "thead { background:" + headerBg + "; }",
    "th { padding:8px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:" + textMuted + "; }",
    "th:last-child { text-align:right; }",
    "td { padding:9px 12px; border-top:1px solid " + border + "; vertical-align:middle; }",
    "td:last-child { text-align:right; }",
    "tr:hover td { background:" + rowHover + "; }",
    ".ibw-broker-name { font-weight:600; color:" + text + "; }",
    ".ibw-broker-name a { color:inherit; text-decoration:none; }",
    ".ibw-broker-name a:hover { text-decoration:underline; color:" + accent + "; }",
    ".ibw-product { font-size:10px; color:" + textMuted + "; margin-top:1px; }",
    ".ibw-rate { font-weight:800; font-size:15px; color:" + accent + "; }",
    ".ibw-intro { font-size:10px; color:" + textMuted + "; margin-top:1px; }",
    ".ibw-cta { display:inline-block; padding:5px 10px; border:1px solid " + accent + "; color:" + accent + "; border-radius:6px; text-decoration:none; font-size:11px; font-weight:700; white-space:nowrap; }",
    ".ibw-cta:hover { background:" + accent + "; color:#fff; }",
    ".ibw-disclaimer { padding:8px 14px 10px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; line-height:1.5; }",
    ".ibw-footer { padding:5px 14px 8px; text-align:right; font-size:10px; color:" + textMuted + "; }",
    ".ibw-footer a { color:" + accent + "; text-decoration:none; font-weight:600; }",
    ".ibw-footer a:hover { text-decoration:underline; }",
    ".ibw-empty { padding:20px 16px; text-align:center; color:" + textMuted + "; font-size:12px; }",
  ].join("\\n");
  shadow.appendChild(styles);

  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function buildProductLabel(row) {
    if (row.productKind === "term_deposit") {
      return "Term deposit" + (row.termMonths ? " · " + row.termMonths + "m" : "");
    }
    return "Savings account";
  }

  function buildIntroLabel(row) {
    if (!row.introRatePct) return "";
    return row.introTermMonths
      ? row.introRatePct + "% p.a. intro (" + row.introTermMonths + "m), then " + row.ratePct + "% p.a."
      : row.introRatePct + "% p.a. intro rate";
  }

  var container = document.createElement("div");
  container.className = "ibw";

  // Header
  var headerAdvisorHtml = "";
  if (ADVISOR_NAME && ADVISOR_URL) {
    headerAdvisorHtml = '<span class="ibw-advisor">Rates for clients of <a href="' + esc(ADVISOR_URL) + '?' + REF_PARAM + '" target="_blank" rel="noopener noreferrer">' + esc(ADVISOR_NAME) + '</a></span>';
  }
  container.innerHTML =
    '<div class="ibw-header">' +
      '<span class="ibw-heading">' + esc(HEADING) + '</span>' +
      headerAdvisorHtml +
    '</div>';

  if (ROWS.length === 0) {
    container.innerHTML += '<div class="ibw-empty">No rate data available.</div>';
  } else {
    var tableHtml =
      '<table>' +
        '<thead><tr>' +
          '<th>Provider</th>' +
          '<th>Product</th>' +
          '<th>Rate p.a.</th>' +
          '<th></th>' +
        '</tr></thead>' +
        '<tbody>';

    for (var i = 0; i < ROWS.length; i++) {
      var row = ROWS[i];
      var brokerUrl = BASE + "/brokers/" + esc(row.brokerSlug) + "?" + REF_PARAM;
      var introLabel = buildIntroLabel(row);
      tableHtml +=
        '<tr>' +
          '<td><div class="ibw-broker-name"><a href="' + brokerUrl + '" target="_blank" rel="noopener noreferrer">' + esc(row.brokerName) + '</a></div></td>' +
          '<td><div class="ibw-product">' + esc(buildProductLabel(row)) + '</div></td>' +
          '<td>' +
            '<div class="ibw-rate">' + esc(row.ratePct) + '%</div>' +
            (introLabel ? '<div class="ibw-intro">' + esc(introLabel) + '</div>' : '') +
          '</td>' +
          '<td><a class="ibw-cta" href="' + brokerUrl + '" target="_blank" rel="noopener noreferrer nofollow">Compare</a></td>' +
        '</tr>';
    }
    tableHtml += '</tbody></table>';
    container.innerHTML += tableHtml;
  }

  container.innerHTML +=
    '<div class="ibw-disclaimer">' + esc(DISCLAIMER) + '</div>' +
    '<div class="ibw-footer">Powered by <a href="' + BASE + '?' + REF_PARAM + '" target="_blank" rel="noopener noreferrer">Invest.com.au</a></div>';

  shadow.appendChild(container);
})();
`;
}
