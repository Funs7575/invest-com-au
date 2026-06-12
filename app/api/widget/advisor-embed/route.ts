import { NextRequest, NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTouch } from "@/lib/attribution";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  isAdvisorEmbedType,
  normaliseAdvisorEmbedTheme,
  advisorEmbedMeta,
  advisorEmbedUtmQuery,
  type AdvisorEmbedType,
  type AdvisorEmbedTheme,
} from "@/lib/widget/advisor-embed";
import { verifyAdvisorEmbedToken } from "@/lib/widget/advisor-embed-token";

const log = logger("widget:advisor-embed");

export const runtime = "nodejs";
// 5-min ISR floor. Embeds change only when an adviser gets a new review or
// edits their profile, so a 5-min CDN window is plenty fresh while keeping
// origin load negligible. The per-response Cache-Control below restates this
// so the Vercel edge and downstream caches agree (s-maxage>=300 per spec).
export const revalidate = 300;

/**
 * GET /api/widget/advisor-embed — self-serve "Embed Kit" for advisers.
 *
 * Returns self-contained JavaScript (or an HTML wrapper for the iframe
 * variant) that renders one of three Shadow-DOM embeds an adviser pastes
 * onto their OWN website, each linking back to their invest.com.au profile:
 *
 *   ?type=badge   — rating badge: "4.9★ · 31 verified reviews · Verified on…"
 *   ?type=reviews — carousel of the 3-5 most recent PUBLISHED (approved) reviews
 *   ?type=book    — "Book a consultation" button (booking_link-aware deep-link)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PUBLIC-BY-DESIGN ENDPOINT — CORS contract (mirrors /api/widget/badge):
 *   • `Access-Control-Allow-Origin: *` is INTENTIONAL — embeds load cross-origin.
 *   • Reads ONLY the same public data the public advisor profile already shows
 *     (name, rating, approved-review count, approved reviews, booking link).
 *     Reviews are filtered to status='approved' — exactly the public-profile
 *     contract (lib RLS policy "Public can view approved reviews"). No PII
 *     beyond the reviewer's display name, which the profile already renders.
 *   • Uses the anon-key static client so Postgres RLS enforces active-only
 *     reads. Do NOT swap to createAdminClient() for the data read (the admin
 *     client is used ONLY for the fire-and-forget attribution write, which is
 *     a service_role-only table).
 *   • Aggressive public CDN caching — responses are not personalised.
 *
 * TOKEN GATE (lib/widget/advisor-embed-token.ts):
 *   • A signed, slug-bound token proves the snippet was minted by the logged-in
 *     owner of this profile (so scrapers can't mass-mint live embeds). The data
 *     is public, but the embed is only meant to render where the adviser placed
 *     it. Revocation = the adviser regenerates the token in the portal, or the
 *     profile is deactivated (status≠active), or the platform secret is rotated.
 *   • Invalid token / unknown / inactive adviser ⇒ render NOTHING (204 for the
 *     iframe HTML wrapper; an inert HTML/JS comment for the script variant).
 *     We never surface a visible error box on a stranger's site.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * AFSL COMPLIANCE:
 *   The rating badge surfaces the adviser's OWN aggregate review rating and
 *   approved-review count — the same figures the public profile shows. It is
 *   not a ranking, comparison, "best" label, or personal recommendation. The
 *   reviews carousel shows the adviser's own approved client reviews verbatim.
 *   None of the three embeds give product advice; a general-information note is
 *   included where reviews/ratings appear.
 *
 * Query params:
 *   ?type=badge|reviews|book   — embed kind (required)
 *   ?slug=<advisor-slug>       — adviser slug (required; must match token)
 *   ?token=aet1.…              — signed embed token (required)
 *   ?theme=light|dark|auto     — colour theme (default: light; auto = prefers-color-scheme)
 *   ?format=js|html            — js (default, <script>) or html (iframe document)
 */

// Shared headers for the inert "render nothing" responses. Still public-CDN
// cacheable + permissive CORS so a revoked snippet fails quietly and the edge
// absorbs the load rather than hammering the origin.
const SILENT_CACHE = "public, max-age=300, s-maxage=300";

function jsHeaders(cache: string): HeadersInit {
  return {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": cache,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin",
  };
}

function htmlHeaders(cache: string): HeadersInit {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": cache,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin",
  };
}

/**
 * "Render nothing" response. For the iframe HTML wrapper we return 204 (a blank
 * frame); for the <script> variant we return an inert comment (200) so the
 * consuming page never logs a script-load error. Either way: no visible UI.
 */
function renderNothing(format: "js" | "html", reason: string): NextResponse {
  if (format === "html") {
    return new NextResponse(null, { status: 204, headers: htmlHeaders(SILENT_CACHE) });
  }
  // Reason is a fixed internal string (never attacker-controlled), safe to echo.
  return new NextResponse(`/* invest.com.au embed: ${reason} */`, {
    status: 200,
    headers: jsHeaders(SILENT_CACHE),
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const rawType = params.get("type");
  const format = params.get("format") === "html" ? "html" : "js";
  const theme = normaliseAdvisorEmbedTheme(params.get("theme"));
  // Sanitise slug to the slug charset before it is ever echoed into a JS/HTML
  // comment or used in a query. Slugs are always [a-z0-9-]; stripping the rest
  // is lossless for legitimate lookups and closes a comment-breakout vector
  // (same posture as /api/widget/badge).
  const slug = (params.get("slug") ?? "")
    .trim()
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 100);
  const token = params.get("token") ?? "";

  // ── Validate shape. Bad params ⇒ render nothing (never an error box). ──────
  if (!isAdvisorEmbedType(rawType) || !slug || !token) {
    return renderNothing(format, "missing or invalid parameters");
  }
  const type: AdvisorEmbedType = rawType;

  // ── Verify the signed, slug-bound token. ──────────────────────────────────
  const verified = verifyAdvisorEmbedToken(token, { expectedSlug: slug });
  if (!verified.ok) {
    // reason is logged for ops only; the public response is always silent.
    log.debug("advisor embed token rejected", { slug, type, reason: verified.reason });
    return renderNothing(format, "unavailable");
  }

  // ── Per-IP rate limit (token-gated, but still cap abuse / scraping). ───────
  // Generous: legitimate page loads are absorbed by the CDN, so origin hits are
  // rare. Fail-open (lib/rate-limit-db) so a DB blip never blanks live embeds.
  if (!(await isAllowed("advisor_embed", ipKey(request), { max: 120, refillPerSec: 1 }))) {
    return renderNothing(format, "rate limited");
  }

  // ── Fetch the adviser (anon client → RLS enforces status='active'). ───────
  const supabase = createStaticClient();
  const { data: row } = await supabase
    .from("professionals")
    .select("id, name, slug, type, photo_url, rating, review_count, verified, location_display, booking_link, booking_intro, initial_consultation_free, status")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!row) {
    // Unknown or inactive adviser — hard kill switch. Render nothing.
    return renderNothing(format, "unavailable");
  }

  const advisor = row as {
    id: number;
    name: string;
    slug: string;
    type: string | null;
    photo_url: string | null;
    rating: number | null;
    review_count: number | null;
    verified: boolean | null;
    location_display: string | null;
    booking_link: string | null;
    booking_intro: string | null;
    initial_consultation_free: boolean | null;
  };

  // Token id must match the adviser row id — defence in depth on top of the
  // slug binding (a token minted for a since-renamed slug can't be replayed).
  if (verified.professionalId !== advisor.id) {
    return renderNothing(format, "unavailable");
  }

  // ── For the reviews carousel, fetch the most recent APPROVED reviews. ──────
  // status='approved' is the public-profile contract; only the fields the
  // profile itself renders are projected (reviewer display name, rating,
  // title, body, date). No reviewer_email / moderation columns.
  let reviews: Array<{
    reviewer_name: string;
    rating: number;
    title: string | null;
    body: string;
    created_at: string | null;
  }> = [];
  if (type === "reviews") {
    const { data: reviewRows } = await supabase
      .from("professional_reviews")
      .select("reviewer_name, rating, title, body, created_at")
      .eq("professional_id", advisor.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(5);
    reviews = (reviewRows ?? []) as typeof reviews;
  }

  // ── Outbound profile link — UTM-tagged dofollow backlink to the profile. ──
  const utm = advisorEmbedUtmQuery(type, advisor.slug);
  const profileUrl = `https://invest.com.au/advisor/${advisor.slug}?${utm}`;
  // Booking deep-link: prefer the adviser's own booking_link (what the profile
  // "Book a Call" CTA uses); otherwise deep-link to the profile contact anchor.
  const bookingUrl = advisor.booking_link
    ? advisor.booking_link
    : `https://invest.com.au/advisor/${advisor.slug}?${utm}#contact`;

  // ── Fire-and-forget impression attribution. ──────────────────────────────
  // attribution_touches fits the contract (source/medium/campaign/page_path);
  // the destination profile path carries the adviser slug. service_role-only
  // table, so the admin client is correct here. Never blocks the response.
  void recordImpression({ type, slug: advisor.slug }).catch(() => {});

  // ── Build the embed JS. ───────────────────────────────────────────────────
  const js = buildAdvisorEmbedJs({
    type,
    theme,
    advisor: {
      name: advisor.name,
      slug: advisor.slug,
      photo_url: advisor.photo_url,
      rating: advisor.rating ?? 0,
      review_count: advisor.review_count ?? 0,
      verified: !!advisor.verified,
      location_display: advisor.location_display,
      booking_intro: advisor.booking_intro,
      initial_consultation_free: !!advisor.initial_consultation_free,
    },
    reviews,
    profileUrl,
    bookingUrl,
  });

  if (format === "html") {
    // Iframe wrapper for site builders that strip <script>. The same JS runs
    // inside the frame's own document; Shadow DOM still isolates within it.
    const meta = advisorEmbedMeta(type);
    const html = buildIframeDocument({ js, title: `${meta.label} — invest.com.au` });
    return new NextResponse(html, {
      status: 200,
      headers: htmlHeaders("public, max-age=300, s-maxage=300"),
    });
  }

  return new NextResponse(js, {
    status: 200,
    headers: jsHeaders("public, max-age=300, s-maxage=300"),
  });
}

/**
 * CORS pre-flight. Mirrors the rest of /api/widget/*.
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

// ── Attribution impression ────────────────────────────────────────────────

async function recordImpression(opts: { type: AdvisorEmbedType; slug: string }): Promise<void> {
  try {
    const admin = createAdminClient();
    // session_id is required and there is no per-visitor session for a passive
    // embed impression, so we key by adviser+type — impressions roll up by
    // adviser/medium, which is all this signal needs.
    await recordTouch(admin, {
      sessionId: `embed:${opts.slug}`,
      event: "view",
      source: "embed",
      medium: opts.type,
      campaign: "advisor-embed-kit",
      pagePath: `/advisor/${opts.slug}`,
      vertical: "advisors",
    });
  } catch (err) {
    // Structured log only — attribution must never affect the served embed.
    log.debug("embed impression attribution failed", {
      slug: opts.slug,
      type: opts.type,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Embed JS builder ───────────────────────────────────────────────────────

interface EmbedAdvisor {
  name: string;
  slug: string;
  photo_url: string | null;
  rating: number;
  review_count: number;
  verified: boolean;
  location_display: string | null;
  booking_intro: string | null;
  initial_consultation_free: boolean;
}

interface EmbedReview {
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string | null;
}

const REVIEWS_DISCLAIMER =
  "Reviews are submitted by verified clients and reflect their own experience. " +
  "General information only — not financial advice.";

function buildAdvisorEmbedJs(opts: {
  type: AdvisorEmbedType;
  theme: AdvisorEmbedTheme;
  advisor: EmbedAdvisor;
  reviews: EmbedReview[];
  profileUrl: string;
  bookingUrl: string;
}): string {
  const { type, theme, advisor, reviews, profileUrl, bookingUrl } = opts;

  // Trim review bodies before they enter the payload — caps the served size so
  // one verbose review can't bloat every embed load (spec: cap payload sizes).
  const trimmedReviews = reviews.slice(0, 5).map((r) => ({
    name: r.reviewer_name,
    rating: r.rating,
    title: r.title ? r.title.slice(0, 120) : null,
    body: r.body.length > 280 ? `${r.body.slice(0, 277)}…` : r.body,
    date: r.created_at,
  }));

  const payload = {
    type,
    theme,
    advisor: {
      name: advisor.name,
      photo_url: advisor.photo_url,
      rating: advisor.rating,
      review_count: advisor.review_count,
      verified: advisor.verified,
      location_display: advisor.location_display,
      booking_intro: advisor.booking_intro,
      initial_consultation_free: advisor.initial_consultation_free,
    },
    reviews: trimmedReviews,
    profileUrl,
    bookingUrl,
    reviewsDisclaimer: REVIEWS_DISCLAIMER,
  };

  return `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var DATA = ${JSON.stringify(payload)};
  var TYPE = DATA.type;
  var THEME = DATA.theme;
  var A = DATA.advisor;

  // Find the script tag that loaded us. In the iframe wrapper there is exactly
  // one such tag; on a host page it is the last matching one.
  var scripts = document.querySelectorAll("script[src*='/api/widget/advisor-embed']");
  var currentScript = document.currentScript || scripts[scripts.length - 1];
  var mountAfter = currentScript || document.body && document.body.lastChild;
  if (!mountAfter || !mountAfter.parentNode) {
    if (!document.body) return;
    mountAfter = document.body.appendChild(document.createElement("div"));
  }

  var host = document.createElement("div");
  host.setAttribute("data-invest-advisor-embed", TYPE);
  mountAfter.parentNode.insertBefore(host, mountAfter.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  // ─── Theme tokens. THEME='auto' follows the host's prefers-color-scheme. ──
  var prefersDark = false;
  try {
    prefersDark = typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch (e) {}
  var isDark = THEME === "dark" || (THEME === "auto" && prefersDark);

  var bg        = isDark ? "#1e293b" : "#ffffff";
  var border    = isDark ? "#334155" : "#e2e8f0";
  var text      = isDark ? "#f1f5f9" : "#0f172a";
  var textMuted = isDark ? "#94a3b8" : "#64748b";
  var accent    = "#059669";
  var star      = "#f59e0b";
  var cardBg    = isDark ? "#0f172a" : "#f8fafc";

  var styles = document.createElement("style");
  styles.textContent = [
    // all:initial fully isolates from host CSS; we then set only what we need.
    ":host { all: initial; }",
    ".ie { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; box-sizing:border-box; background:" + bg + "; border:1px solid " + border + "; border-radius:12px; color:" + text + "; max-width:420px; font-size:13px; line-height:1.45; overflow:hidden; }",
    ".ie *, .ie *::before, .ie *::after { box-sizing:border-box; }",
    ".ie a { color:" + accent + "; text-decoration:none; }",
    ".ie a:hover { text-decoration:underline; }",
    ".ie-pad { padding:14px 16px; }",
    ".ie-stars { color:" + star + "; letter-spacing:1px; font-size:14px; }",
    ".ie-rating-num { font-weight:800; font-size:20px; }",
    ".ie-muted { color:" + textMuted + "; }",
    ".ie-name { font-weight:700; font-size:14px; }",
    ".ie-row { display:flex; align-items:center; gap:10px; }",
    ".ie-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; overflow:hidden; background:" + accent + "22; display:flex; align-items:center; justify-content:center; font-weight:700; color:" + accent + "; }",
    ".ie-avatar img { width:100%; height:100%; object-fit:cover; }",
    ".ie-verified { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:" + accent + "; }",
    ".ie-cta { display:block; width:100%; text-align:center; padding:11px 14px; background:" + accent + "; color:#fff; border-radius:9px; font-weight:700; font-size:14px; }",
    ".ie-cta:hover { opacity:.9; text-decoration:none; }",
    ".ie-review { background:" + cardBg + "; border:1px solid " + border + "; border-radius:9px; padding:10px 12px; }",
    ".ie-review + .ie-review { margin-top:8px; }",
    ".ie-review-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px; }",
    ".ie-review-name { font-weight:700; font-size:12px; }",
    ".ie-review-title { font-weight:700; font-size:12px; margin:2px 0; }",
    ".ie-review-body { font-size:12px; color:" + text + "; }",
    ".ie-disclaimer { padding:8px 16px; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".ie-footer { padding:7px 16px; text-align:center; font-size:10px; color:" + textMuted + "; border-top:1px solid " + border + "; }",
    ".ie-footer a { font-weight:600; }",
  ].join("\\n");
  shadow.appendChild(styles);

  function esc(s) {
    if (s === null || s === undefined) return "";
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }
  function starStr(n) {
    var full = Math.round(Number(n) || 0);
    var out = "";
    for (var i = 0; i < 5; i++) out += i < full ? "\\u2605" : "\\u2606";
    return out;
  }
  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("en-AU", { year: "numeric", month: "short" });
    } catch (e) { return ""; }
  }

  var c = document.createElement("div");
  c.className = "ie";
  var PROFILE = DATA.profileUrl;
  var BOOKING = DATA.bookingUrl;

  if (TYPE === "badge") {
    var hasRating = A.rating > 0 && A.review_count > 0;
    var reviewWord = A.review_count === 1 ? "verified review" : "verified reviews";
    c.innerHTML =
      '<div class="ie-pad">' +
        '<div class="ie-row">' +
          (A.photo_url
            ? '<div class="ie-avatar"><img src="' + esc(A.photo_url) + '" alt="' + esc(A.name) + '"></div>'
            : '<div class="ie-avatar">' + esc((A.name || "A").charAt(0)) + '</div>') +
          '<div style="flex:1;min-width:0;">' +
            '<a class="ie-name" href="' + esc(PROFILE) + '" target="_blank" rel="noopener" style="color:inherit;">' + esc(A.name) + '</a>' +
            (A.location_display ? '<div class="ie-muted" style="font-size:11px;">' + esc(A.location_display) + '</div>' : '') +
          '</div>' +
        '</div>' +
        (hasRating
          ? '<div class="ie-row" style="margin-top:10px;">' +
              '<span class="ie-rating-num">' + (Math.round(A.rating * 10) / 10).toFixed(1) + '</span>' +
              '<span class="ie-stars">' + starStr(A.rating) + '</span>' +
              '<span class="ie-muted" style="font-size:12px;">' + A.review_count + ' ' + reviewWord + '</span>' +
            '</div>'
          : '') +
        (A.verified ? '<div class="ie-verified" style="margin-top:8px;">\\u2713 Verified on invest.com.au</div>' : '') +
      '</div>' +
      '<div class="ie-footer">' +
        '<a href="' + esc(PROFILE) + '" target="_blank" rel="noopener">View profile on invest.com.au &rarr;</a>' +
      '</div>';
  } else if (TYPE === "book") {
    c.innerHTML =
      '<div class="ie-pad">' +
        '<div class="ie-row" style="margin-bottom:10px;">' +
          (A.photo_url
            ? '<div class="ie-avatar"><img src="' + esc(A.photo_url) + '" alt="' + esc(A.name) + '"></div>'
            : '<div class="ie-avatar">' + esc((A.name || "A").charAt(0)) + '</div>') +
          '<div style="flex:1;min-width:0;">' +
            '<div class="ie-name">' + esc(A.name) + '</div>' +
            '<div class="ie-muted" style="font-size:11px;">' +
              esc(A.booking_intro || (A.initial_consultation_free ? "Free initial consultation" : "Book a consultation")) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<a class="ie-cta" href="' + esc(BOOKING) + '" target="_blank" rel="noopener">Book a consultation</a>' +
      '</div>' +
      '<div class="ie-footer">' +
        '<a href="' + esc(PROFILE) + '" target="_blank" rel="noopener">via invest.com.au</a>' +
      '</div>';
  } else {
    // reviews carousel
    var revs = DATA.reviews || [];
    var inner = '<div class="ie-pad">' +
      '<div class="ie-row" style="justify-content:space-between;margin-bottom:10px;">' +
        '<a class="ie-name" href="' + esc(PROFILE) + '" target="_blank" rel="noopener" style="color:inherit;">' + esc(A.name) + '</a>' +
        (A.rating > 0 && A.review_count > 0
          ? '<span class="ie-muted" style="font-size:12px;"><span class="ie-stars">' + starStr(A.rating) + '</span> ' + (Math.round(A.rating * 10) / 10).toFixed(1) + '</span>'
          : '') +
      '</div>';
    if (revs.length === 0) {
      inner += '<div class="ie-muted" style="font-size:12px;">No published reviews yet.</div>';
    } else {
      for (var i = 0; i < revs.length; i++) {
        var rv = revs[i];
        inner +=
          '<div class="ie-review">' +
            '<div class="ie-review-head">' +
              '<span class="ie-review-name">' + esc(rv.name) + '</span>' +
              '<span class="ie-stars" style="font-size:12px;">' + starStr(rv.rating) + '</span>' +
            '</div>' +
            (rv.title ? '<div class="ie-review-title">' + esc(rv.title) + '</div>' : '') +
            '<div class="ie-review-body">' + esc(rv.body) + '</div>' +
            (rv.date ? '<div class="ie-muted" style="font-size:10px;margin-top:4px;">' + esc(fmtDate(rv.date)) + '</div>' : '') +
          '</div>';
      }
    }
    inner += '</div>';
    inner += '<div class="ie-disclaimer">' + esc(DATA.reviewsDisclaimer) + '</div>';
    inner += '<div class="ie-footer"><a href="' + esc(PROFILE) + '" target="_blank" rel="noopener">Read all reviews on invest.com.au &rarr;</a></div>';
    c.innerHTML = inner;
  }

  shadow.appendChild(c);
})();
`.trim();
}

/**
 * HTML document for the iframe variant. Inlines the same embed JS so builders
 * that strip <script> from pasted HTML still get a working embed (the script
 * lives in the framed document we control, not their pasted markup).
 */
function buildIframeDocument(opts: { js: string; title: string }): string {
  // The JS is generated by us (no user HTML), but we still escape `</script`
  // defensively so a future data change can't terminate the inline block early.
  const safeJs = opts.js.replace(/<\/(script)/gi, "<\\/$1");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(opts.title)}</title>
<style>html,body{margin:0;padding:0;background:transparent;}</style>
</head>
<body>
<script>${safeJs}</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
