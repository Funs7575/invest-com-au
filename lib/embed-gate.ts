/**
 * Embed partner gating + metering for the /api/widget/* embed surfaces.
 *
 * What this is
 * ------------
 * The JS widgets (broker table, fee calculator, advisors, fee-index,
 * health-scores, best-rates) have historically been public-by-design:
 * any site could embed them with attribution. This module turns them
 * into a partner-gated product:
 *
 *   - The embed credential is the existing **widget license token**
 *     (`wlt_…`, minted via POST /api/v1/widget-licenses and hanging off
 *     an `api_keys` row). It is the one secret the embed architecture
 *     already passes in URLs (`?license=wlt_…`), and it already carries
 *     a per-license `allowed_domains` allowlist.
 *   - Gating is controlled by the `embed_partner_gating` feature flag
 *     (lib/feature-flags.ts). Flag **off / missing → today's behaviour**
 *     (public embeds, nothing breaks at merge). Flag on → unauthorised
 *     embeds render a clean branded "Powered by invest.com.au — get
 *     access" card instead of widget data. Authorised embeds (valid
 *     license whose domain allowlist matches the embedding site) keep
 *     working exactly as before. Flip the flag in the admin
 *     feature-flags UI — no deploy needed.
 *
 * Deliberately NOT gated: /api/widget/badge and /api/widget/trust-mark.
 * Those are attribution badges advisors/brokers place on their own
 * sites pointing back at invest.com.au — a growth loop, not a data
 * product.
 *
 * Metering
 * --------
 * Every widget load that presents a valid license is metered into the
 * existing `api_request_log` table (via lib/api-auth.ts `logApiRequest`)
 * against the license's parent `api_keys.id` — giving per-key,
 * per-endpoint, per-day counts for future billing/reporting. Metering is
 * fire-and-forget and fail-open: it can never fail or slow an embed.
 *
 * Failure posture
 * ---------------
 * Embeds run on third-party pages, so every path here fails towards
 * "serve the widget": flag lookup errors → gating off; license lookup
 * errors → treated as no license (which only matters when the flag is
 * on). `evaluateEmbedGate` never throws.
 */

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports -- widget_licenses is deny-all by design (no anon/authenticated policy); embeds are an anonymous path with no JWT, so license validation requires the service-role client (same pattern as /api/widget/licensed)
import { createAdminClient } from "@/lib/supabase/admin";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logApiRequest } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

const log = logger("embed-gate");

/** Feature flag controlling whether unauthorised embeds are gated. */
export const EMBED_PARTNER_GATING_FLAG = "embed_partner_gating";

export interface WidgetLicenseIdentity {
  /** widget_licenses.id */
  licenseId: string;
  /** Parent api_keys.id — the metering/billing anchor. */
  apiKeyId: string;
  /** Domain allowlist on the license (empty = any domain). */
  allowedDomains: string[];
}

export interface EmbedGateResult {
  /** Serve the real widget (true) or the get-access state (false). */
  authorised: boolean;
  /** Whether the `embed_partner_gating` flag evaluated on. */
  gatingActive: boolean;
  /**
   * The validated license behind this load, when one was presented and
   * passed validation — populated even when gating is off so loads are
   * metered per partner either way.
   */
  license: WidgetLicenseIdentity | null;
}

/**
 * Hostname of the page embedding the widget. `<script src>` loads do
 * not send an Origin header (that is a CORS-fetch concept), so fall
 * back to the Referer, which browsers send for cross-origin script
 * loads under the default `strict-origin-when-cross-origin` policy.
 */
function embeddingHost(request: NextRequest): string | null {
  for (const header of ["origin", "referer"]) {
    const value = request.headers.get(header);
    if (!value) continue;
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      // Malformed header — try the next one.
    }
  }
  return null;
}

/** True when `host` is `domain` or a subdomain of it. */
function hostMatchesDomain(host: string, domain: string): boolean {
  const d = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return host === d || host.endsWith(`.${d}`);
}

/**
 * Validate a widget license token (`wlt_…`) for the requesting embed:
 * token exists, is active, and the license's `allowed_domains` (when
 * set) matches the embedding page's host. Returns null on any failure —
 * including DB errors — and never throws.
 */
export async function validateWidgetLicense(
  token: string | null | undefined,
  request: NextRequest,
): Promise<WidgetLicenseIdentity | null> {
  if (!token || !token.startsWith("wlt_") || token.length < 12) return null;

  try {
    const hash = createHash("sha256").update(token).digest("hex");
    const supabase = createAdminClient();
    const { data: license, error } = await supabase
      .from("widget_licenses")
      .select("id, api_key_id, allowed_domains")
      .eq("token_hash", hash)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      log.error("widget_licenses lookup failed", { error: error.message });
      return null;
    }
    if (!license) return null;

    const allowedDomains = (license.allowed_domains as string[] | null) ?? [];
    if (allowedDomains.length > 0) {
      const host = embeddingHost(request);
      // Fail closed for domain-restricted licenses when the embedding
      // host cannot be determined (e.g. server-side scrapers).
      if (!host || !allowedDomains.some((d) => hostMatchesDomain(host, d))) {
        return null;
      }
    }

    return {
      licenseId: license.id as string,
      apiKeyId: license.api_key_id as string,
      allowedDomains,
    };
  } catch (err) {
    log.error("widget license validation threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Evaluate the embed gate for a widget request. Reads `?license=wlt_…`
 * (the credential the embed architecture already passes) and the
 * `embed_partner_gating` feature flag. Never throws.
 */
export async function evaluateEmbedGate(
  request: NextRequest,
): Promise<EmbedGateResult> {
  const token = request.nextUrl.searchParams.get("license");
  // Validate the license even when gating is off — it attributes the
  // load to a partner key for metering.
  const license = await validateWidgetLicense(token, request);

  let gatingActive = false;
  try {
    gatingActive = await isFlagEnabled(EMBED_PARTNER_GATING_FLAG);
  } catch (err) {
    // isFlagEnabled is already fail-open, but never let the gate throw
    // into a widget route: fall back to ungated (today's behaviour).
    log.error("embed gating flag read threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    authorised: !gatingActive || license !== null,
    gatingActive,
    license,
  };
}

/**
 * Meter one embed load against the license's parent API key. Reuses the
 * existing `api_request_log` metering table (key, endpoint, status,
 * timestamp → per-day counts). Fire-and-forget and fail-open: errors
 * are logged, never propagated, and the caller never awaits.
 */
export function meterEmbedLoad(opts: {
  license: WidgetLicenseIdentity | null;
  endpoint: string;
  request: NextRequest;
  statusCode: number;
  startedAt?: number;
}): void {
  if (!opts.license) return;
  try {
    void Promise.resolve(
      logApiRequest({
        apiKeyId: opts.license.apiKeyId,
        endpoint: opts.endpoint,
        method: "GET",
        statusCode: opts.statusCode,
        responseTimeMs: opts.startedAt ? Date.now() - opts.startedAt : 0,
        ipAddress:
          opts.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown",
        userAgent: opts.request.headers.get("user-agent") || "unknown",
      }),
    ).catch((err: unknown) => {
      log.error("embed metering failed (fail-open)", {
        endpoint: opts.endpoint,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } catch (err) {
    log.error("embed metering threw (fail-open)", {
      endpoint: opts.endpoint,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const EMBED_GATE_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cross-Origin-Resource-Policy": "cross-origin",
  Vary: "Origin",
} as const;

/**
 * The unauthorised state: a clean, branded "Powered by invest.com.au —
 * get access" card rendered in a Shadow DOM. Served as 200
 * application/javascript so the embedding page never sees a script
 * error — this is a conversion surface, not an error page.
 */
export function embedAccessRequiredResponse(widgetTitle: string): NextResponse {
  const js = `
(function() {
  "use strict";
  if (typeof document === "undefined") return;

  var TITLE = ${JSON.stringify(widgetTitle)};
  var BASE = "https://invest.com.au";
  var GET_ACCESS_URL = BASE + "/embed?utm_source=embed-gate&utm_medium=widget";

  var scripts = document.querySelectorAll("script[src*='/api/widget']");
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  var host = document.createElement("div");
  host.setAttribute("data-invest-widget-gate", "true");
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  var shadow = host.attachShadow({ mode: "open" });

  var styles = document.createElement("style");
  styles.textContent = [
    ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block; }",
    ".icg { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; max-width:720px; padding:24px; text-align:center; color:#0f172a; }",
    ".icg-brand { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#059669; margin-bottom:8px; }",
    ".icg-title { font-size:16px; font-weight:700; margin-bottom:6px; }",
    ".icg-copy { font-size:13px; color:#64748b; line-height:1.5; margin-bottom:14px; }",
    ".icg-cta { display:inline-block; padding:8px 18px; background:#059669; color:#ffffff; border-radius:8px; text-decoration:none; font-weight:600; font-size:13px; }",
    ".icg-cta:hover { opacity:.9; }",
    ".icg-footer { margin-top:14px; font-size:11px; color:#94a3b8; }",
    ".icg-footer a { color:#059669; text-decoration:none; font-weight:600; }",
  ].join("\\n");
  shadow.appendChild(styles);

  var card = document.createElement("div");
  card.className = "icg";
  card.innerHTML =
    '<div class="icg-brand">Powered by invest.com.au</div>' +
    '<div class="icg-title">' + TITLE + ' \\u2014 embed access required</div>' +
    '<div class="icg-copy">This widget now requires an embed partner key. Add your license token to the embed URL to restore it, or get access in minutes.</div>' +
    '<a class="icg-cta" href="' + GET_ACCESS_URL + '" target="_blank" rel="noopener noreferrer">Get access \\u2192</a>' +
    '<div class="icg-footer">Live Australian broker, advisor and rate data \\u00b7 <a href="' + BASE + '?utm_source=embed-gate" target="_blank" rel="noopener noreferrer">invest.com.au</a></div>';
  shadow.appendChild(card);
})();
`;

  return new NextResponse(js.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Short cache so flipping the flag (or fixing a license) propagates
      // quickly; still CDN-cacheable to absorb load.
      "Cache-Control": "public, max-age=300, s-maxage=300",
      ...EMBED_GATE_CORS,
    },
  });
}
