import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * DISC-B (audit DISC-20260610): unknown entity slugs must return a real HTTP
 * 404, not a soft-404 (HTTP 200 + streamed React #419).
 *
 * Empirically confirmed mechanism (Next 16 App Router, no PPR):
 *   - A `loading.tsx` at a route segment — or at ANY ancestor segment — is an
 *     implicit <Suspense> boundary. The moment the page below it suspends
 *     (which it always does, because `params` is async), Next streams the
 *     shell with HTTP 200. A `notFound()` thrown afterwards can no longer
 *     change the status, so it renders the not-found UI client-side with the
 *     React #419 hydration signal under a 200 — the soft-404.
 *   - The two reliable ways to get a real 404 under these conditions:
 *       (a) `export const dynamicParams = false` with a `generateStaticParams`
 *           that enumerates the full valid set — the router rejects any other
 *           slug BEFORE render, immune to loading boundaries; or
 *       (b) no enclosing `loading.tsx` boundary above the route (other than
 *           one scoped away via a route group), so `notFound()` commits a 404.
 *
 * This test locks both invariants in:
 *   1. There is no root `app/loading.tsx` — it would re-break EVERY dynamic
 *      route at once (a root boundary wraps all children).
 *   2. The entity routes fixed for DISC-B each satisfy (a) or (b).
 */

const APP_DIR = path.resolve(process.cwd(), "app");

/** The nearest ancestor `loading.tsx` above `routeDir` (exclusive of itself),
 *  or null. Walks up to (but not including) `app/`. A `loading.tsx` inside a
 *  route group like `(home)` does NOT wrap siblings outside that group, so a
 *  boundary only counts if it sits on this route's own segment chain. */
function nearestLoadingBoundary(routeRelDir: string): string | null {
  const segments = routeRelDir.split("/").filter(Boolean);
  // Check the route's own segment first, then each ancestor up the chain.
  for (let i = segments.length; i >= 1; i--) {
    const dir = path.join(APP_DIR, ...segments.slice(0, i));
    const loading = path.join(dir, "loading.tsx");
    if (fs.existsSync(loading)) return path.relative(APP_DIR, loading);
  }
  return null;
}

function pageSource(routeRelDir: string): string {
  const file = path.join(APP_DIR, routeRelDir, "page.tsx");
  return fs.readFileSync(file, "utf8");
}

function exportsDynamicParamsFalse(routeRelDir: string): boolean {
  // Matches `export const dynamicParams = false` (with any spacing).
  return /export\s+const\s+dynamicParams\s*=\s*false/.test(
    pageSource(routeRelDir),
  );
}

function callsNotFound(routeRelDir: string): boolean {
  return /\bnotFound\(\)/.test(pageSource(routeRelDir));
}

describe("DISC-B — dynamic entity routes return real 404s for unknown slugs", () => {
  it("has no root app/loading.tsx (it would soft-404 every dynamic route)", () => {
    // The homepage skeleton lives in the (home) route group instead, scoped
    // so it cannot wrap sibling routes.
    expect(fs.existsSync(path.join(APP_DIR, "loading.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(APP_DIR, "(home)", "loading.tsx"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(APP_DIR, "(home)", "page.tsx"))).toBe(true);
  });

  // Routes whose full valid slug set is enumerated at build time: they must
  // declare dynamicParams=false so unknown slugs 404 at the router (immune to
  // any loading boundary above them).
  const STATIC_ENUMERABLE_ROUTES = [
    "advisors/[type]",
    "advisors/[type]/[state]",
    "best/[slug]",
    "switch/[type]",
  ];

  it.each(STATIC_ENUMERABLE_ROUTES)(
    "%s exports dynamicParams = false (router-level 404 for unknown slugs)",
    (route) => {
      expect(exportsDynamicParamsFalse(route)).toBe(true);
      // Sanity: the page still guards with notFound() as defence in depth.
      expect(callsNotFound(route)).toBe(true);
    },
  );

  // DB-driven entity-detail routes (slugs added continuously, so they can't
  // use dynamicParams=false). They must have NO enclosing loading.tsx so the
  // page's top-level notFound() yields a real 404.
  const DB_DRIVEN_DETAIL_ROUTES = [
    "broker/[slug]",
    "article/[slug]",
    "advisor/[slug]",
    "firm/[slug]",
    "versus/[slugs]",
  ];

  it.each(DB_DRIVEN_DETAIL_ROUTES)(
    "%s has no enclosing loading.tsx boundary (so notFound() returns 404)",
    (route) => {
      expect(nearestLoadingBoundary(route)).toBeNull();
      // These routes resolve the entity then notFound() on a miss.
      expect(callsNotFound(route)).toBe(true);
    },
  );

  it("the invest listings family has no loading boundary above it", () => {
    // These were named in the audit (the [subcategory]/listings pages). They
    // rely on the absence of any invest-level or root loading.tsx; the (home)
    // group move is what restores their 404s.
    for (const route of [
      "invest/[slug]",
      "invest/[slug]/listings",
      "invest/[slug]/listings/[subcategory]",
    ]) {
      expect(nearestLoadingBoundary(route)).toBeNull();
    }
  });
});
