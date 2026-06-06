/**
 * Affiliate link integrity checker.
 *
 * Scans each visited page for /go/{slug} CTA hrefs and verifies:
 *   1. The slug matches a known active broker (unknown slug → high finding,
 *      because /go/[slug] silently falls back to /broker/{slug} with no revenue).
 *   2. The redirect resolves (sandbox-mode only: makes a real HEAD request via
 *      page.request, which is outside the safety net's browser-route handler.
 *      On protected targets only broker-list validation runs — no click records.)
 *
 * Call once per page visit from BotSession.audit(). Pass the same
 * `checkedSlugs` Set for the lifetime of a session so findings are
 * reported once per unique slug, not once per page.
 *
 * Safety: on protected targets (Netlify/prod) NO request is made to
 * /go/* — only the slug list from the public /api/brokers endpoint is
 * consulted. On sandbox targets a single HEAD request per unique slug
 * is made to verify the redirect chain end-to-end.
 */

import type { Page } from "@playwright/test";
import type { BotConfig } from "../config";
import type { FindingStore } from "../findings/store";
import { normalizeUrl } from "../findings/types";

/** Cached per worker process. Reuse across sessions in the same worker. */
let _activeSlugs: Set<string> | null = null;
let _slugFetchAttempted = false;

async function fetchActiveSlugs(
  request: Page["request"],
  baseUrl: string,
): Promise<Set<string>> {
  if (_activeSlugs !== null) return _activeSlugs;
  if (_slugFetchAttempted) return new Set();
  _slugFetchAttempted = true;

  try {
    // /api/brokers is a public endpoint — no auth needed.
    // We ask for 500 to cover all brokers; the route caps at whatever it returns.
    const res = await request.get(`${baseUrl}/api/brokers?status=active&limit=500`, {
      timeout: 10_000,
    });
    if (res.ok()) {
      const body = await res.json() as Record<string, unknown>;
      const rows = (body.brokers ?? body.data ?? []) as Array<{ slug?: string }>;
      _activeSlugs = new Set(rows.map((b) => b.slug).filter(Boolean) as string[]);
    }
  } catch {
    // Network or parse error — fail open (no slug validation this run)
  }

  _activeSlugs = _activeSlugs ?? new Set();
  return _activeSlugs;
}

export interface AffiliateLinkOptions {
  /** Shared across the session to avoid duplicate findings per slug. */
  checkedSlugs: Set<string>;
}

export async function checkAffiliateLinks(
  page: Page,
  config: BotConfig,
  store: FindingStore,
  persona: string,
  opts: AffiliateLinkOptions,
): Promise<void> {
  const pageUrl = page.url();
  let origin: string;
  try {
    origin = new URL(config.baseUrl).origin;
  } catch {
    return;
  }

  // ── 1. Extract all /go/* hrefs from the rendered DOM ──────────────────────
  let links: Array<{ href: string; text: string }>;
  try {
    links = await page.evaluate((): Array<{ href: string; text: string }> => {
      return Array.from(document.querySelectorAll('a[href*="/go/"]')).map((el) => ({
        href: (el as HTMLAnchorElement).href,
        text: (el.textContent ?? "").trim().slice(0, 120),
      }));
    });
  } catch {
    return; // page may have navigated away
  }

  if (links.length === 0) return;

  // ── 2. Validate each unique slug ──────────────────────────────────────────
  const activeSlugs = await fetchActiveSlugs(page.request, config.baseUrl);

  for (const link of links) {
    let slugPath: string;
    try {
      const u = new URL(link.href);
      if (u.origin !== origin) continue; // external link — not a /go/* we own
      const match = u.pathname.match(/^\/go\/([^/?#]+)/);
      if (!match?.[1]) continue;
      slugPath = match[1];
    } catch {
      continue;
    }

    const slug = slugPath;

    // ── 2a. Slug against known broker list ────────────────────────────────
    if (activeSlugs.size > 0 && !activeSlugs.has(slug) && !opts.checkedSlugs.has(slug)) {
      opts.checkedSlugs.add(slug);
      store.add({
        severity: "high",
        category: "broken-link",
        title: `Affiliate CTA /go/${slug} — unknown broker slug`,
        detail:
          `"${link.text}" on ${normalizeUrl(pageUrl)} links to /go/${slug} but no active ` +
          `broker with this slug was found. The /go/ route silently falls back to ` +
          `/broker/${slug} — the user never reaches an affiliate URL and no revenue is attributed.`,
        url: pageUrl,
        persona,
        signatureKey: `affiliate:unknown-slug:${slug}`,
        evidence: { slug, href: link.href, linkText: link.text },
      });
      continue; // no point probing a slug we already know is unknown
    }

    // ── 2b. Sandbox-only: probe the redirect chain via HEAD ───────────────
    // page.request bypasses the browser's safety net route handler, so this
    // goes to the real server. We use HEAD to minimise the chance the route
    // writes a click record (the route currently writes on GET; HEAD hits
    // the same route.ts but with method=HEAD which Playwright forwards as-is).
    if (config.targetClass === "sandbox" && !opts.checkedSlugs.has(slug)) {
      opts.checkedSlugs.add(slug);
      try {
        const res = await page.request.fetch(`${origin}/go/${slug}`, {
          method: "HEAD",
          maxRedirects: 5,
          timeout: 12_000,
          failOnStatusCode: false,
        });
        const status = res.status();

        // The /go/ route returns 302 on success. Any 4xx means the slug is
        // unconfigured or the route itself is broken.
        if (status >= 400) {
          store.add({
            severity: "high",
            category: "broken-link",
            title: `Affiliate redirect /go/${slug} returned ${status}`,
            detail: `HEAD /go/${slug} returned HTTP ${status}. The affiliate CTA will not redirect users to the broker's signup page.`,
            url: pageUrl,
            persona,
            signatureKey: `affiliate:redirect-error:${slug}`,
            evidence: { slug, status },
          });
        }
      } catch (err) {
        store.add({
          severity: "medium",
          category: "broken-link",
          title: `Affiliate redirect /go/${slug} unreachable`,
          detail: `HEAD /go/${slug} failed: ${(err as Error).message}`,
          url: pageUrl,
          persona,
          signatureKey: `affiliate:redirect-unreachable:${slug}`,
          evidence: { slug, error: (err as Error).message },
        });
      }
    } else if (!opts.checkedSlugs.has(slug)) {
      opts.checkedSlugs.add(slug);
    }
  }
}

/** Reset the module-level slug cache (call between test runs if needed). */
export function resetAffiliateLinkCache(): void {
  _activeSlugs = null;
  _slugFetchAttempted = false;
}
