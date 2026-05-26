/**
 * GET /api/widget/trust-mark — Self-contained "Verified by invest.com.au"
 * embeddable trust mark badge served as application/javascript.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget):
 *   • Access-Control-Allow-Origin: * is INTENTIONAL.
 *   • Must NEVER read user-context data. Only public profile columns.
 *   • Uses anon-key (createStaticClient) so RLS enforces active-only reads.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Query params:
 *   ?type=advisor|firm — required
 *   ?slug=<slug>       — required
 *   ?theme=light|dark  — colour theme (default: light)
 *   ?compact=1         — compact inline badge (no card frame)
 *
 * Renders inside a Shadow DOM. Shows:
 *   - "Verified by invest.com.au" label + checkmark
 *   - AFSL number (if present)
 *   - Entity name + link to profile page
 *   - Methodology link (to /how-we-verify)
 *   - General disclaimer
 *
 * ISR 1h: same as other public widget routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import { normaliseAfslNumber } from "@/lib/afsl-register";

export const runtime = "nodejs";
export const revalidate = 3600;

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
  const type = params.get("type");
  const slug = params.get("slug")?.trim() ?? "";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const compact = params.get("compact") === "1";

  const fail = (msg: string) =>
    new NextResponse(`/* invest.com.au trust mark: ${msg} */`, {
      status: 400,
      headers: { "Content-Type": "application/javascript; charset=utf-8", ...CORS },
    });

  if (type !== "advisor" && type !== "firm") return fail('?type= must be "advisor" or "firm"');
  if (!slug) return fail("missing ?slug=");

  const supabase = createStaticClient();

  let entityName = "";
  let afslNumber: string | null = null;
  let profilePath = "";
  let isVerified = false;

  if (type === "advisor") {
    const { data } = await supabase
      .from("professionals")
      .select("name, afsl_number, verified, slug")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return fail("advisor not found");
    entityName = data.name;
    afslNumber = data.afsl_number ?? null;
    profilePath = `/advisor/${data.slug}`;
    isVerified = data.verified;
  } else {
    const { data } = await supabase
      .from("advisor_firms")
      .select("name, afsl_number, slug")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (!data) return fail("firm not found");
    entityName = data.name;
    afslNumber = data.afsl_number ?? null;
    profilePath = `/firm/${data.slug}`;
    isVerified = true; // Active firms on the platform are considered verified
  }

  // Resolve AFSL status from register for active display
  let afslStatusLabel = "";
  if (afslNumber) {
    const normalised = normaliseAfslNumber(afslNumber);
    const { data: afslRow } = await supabase
      .from("afsl_register")
      .select("status")
      .eq("afsl_number", normalised)
      .maybeSingle();
    if (afslRow?.status === "current") afslStatusLabel = "current";
  }

  const isDark = theme === "dark";
  const bg = isDark ? "#1e293b" : "#ffffff";
  const border = isDark ? "#334155" : "#e2e8f0";
  const text = isDark ? "#f1f5f9" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const accent = "#059669";
  const BASE = "https://invest.com.au";

  const nameJson = JSON.stringify(entityName);
  const profileUrl = `${BASE}${profilePath}`;
  const methodologyUrl = `${BASE}/how-we-verify`;
  const afslLine = afslNumber
    ? `+ '<div class="itm-afsl">AFSL ' + ${JSON.stringify(afslNumber)} + ${afslStatusLabel === "current" ? `'<span class="itm-current">· Current</span>'` : `''`} + '</div>'`
    : "";

  const unverifiedNotice = isVerified
    ? ""
    : `container.innerHTML += '<div class="itm-unverified">Verification pending</div>';`;

  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var scripts = document.querySelectorAll("script[src*='/api/widget/trust-mark']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  var host = document.createElement("div");
  host.setAttribute("data-invest-trust-mark", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);
  var shadow = host.attachShadow({ mode: "open" });

  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block; }",
    ".itm { background:${bg}; border:1px solid ${border}; border-radius:${compact ? "8px" : "12px"}; padding:${compact ? "8px 12px" : "12px 16px"}; display:inline-flex; align-items:center; gap:10px; max-width:${compact ? "280px" : "320px"}; }",
    ".itm-badge { flex-shrink:0; width:${compact ? "28px" : "36px"}; height:${compact ? "28px" : "36px"}; border-radius:50%; background:${accent}20; display:flex; align-items:center; justify-content:center; }",
    ".itm-badge svg { color:${accent}; }",
    ".itm-body { min-width:0; }",
    ".itm-verified { font-size:${compact ? "11px" : "12px"}; font-weight:700; color:${accent}; letter-spacing:.03em; text-transform:uppercase; }",
    ".itm-name { font-size:${compact ? "12px" : "13px"}; font-weight:600; color:${text}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }",
    ".itm-name a { color:inherit; text-decoration:none; }",
    ".itm-name a:hover { text-decoration:underline; }",
    ".itm-afsl { font-size:11px; color:${muted}; margin-top:2px; }",
    ".itm-current { color:${accent}; font-weight:600; margin-left:4px; }",
    ".itm-unverified { font-size:11px; color:#d97706; margin-top:2px; }",
    ".itm-footer { font-size:10px; color:${muted}; margin-top:3px; }",
    ".itm-footer a { color:${muted}; text-decoration:underline; }",
  ].join("\\n");
  shadow.appendChild(styles);

  var container = document.createElement("div");
  container.className = "itm";
  container.innerHTML =
    '<div class="itm-badge">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 6L9 17l-5-5"/>' +
      '</svg>' +
    '</div>' +
    '<div class="itm-body">' +
      '<div class="itm-verified">Verified by invest.com.au</div>' +
      '<div class="itm-name"><a href="${profileUrl}" target="_blank" rel="noopener noreferrer">' + ${nameJson} + '</a></div>' +
      ${afslLine} +
      '<div class="itm-footer"><a href="${methodologyUrl}" target="_blank" rel="noopener noreferrer nofollow">How we verify</a></div>' +
    '</div>';
  ${unverifiedNotice}
  shadow.appendChild(container);
})();
`;

  return new NextResponse(js.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      ...CORS,
    },
  });
}
