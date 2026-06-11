/**
 * Tests for CO-stream cutover scripts.
 *
 * Tests the transform logic directly — no HTTP calls, no file I/O, no live DB.
 * Covers:
 *   - redirect-map-generator.ts: generateRedirectMap() for known inputs
 *   - ranking-health-snapshot.ts: buildSnapshot() + diffSnapshots()
 */

import { describe, it, expect } from "vitest";

// ── Import the exported helpers under test ────────────────────────────────────
// Dynamic imports at test time to avoid pulling in node:fs at module scope.

import { generateRedirectMap } from "@/scripts/cutover/redirect-map-generator";
import {
  buildSnapshot,
  diffSnapshots,
} from "@/scripts/cutover/ranking-health-snapshot";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MINIMAL_MANIFEST = {
  generatedAt: "2026-06-11T00:00:00.000Z",
  totalUrls: 4,
  urls: [
    {
      path: "/",
      routeType: "isr" as const,
      revalidate: 3600,
      importance: "critical" as const,
      notes: "Homepage",
    },
    {
      path: "/about",
      routeType: "static" as const,
      revalidate: null,
      importance: "medium" as const,
      notes: "About",
    },
    {
      path: "/advisor/[slug]",
      routeType: "dynamic" as const,
      revalidate: null,
      importance: "high" as const,
      notes: "Dynamic advisor profile",
    },
    {
      path: "/api/og",
      routeType: "dynamic" as const,
      revalidate: null,
      importance: "high" as const,
      notes: "Technical surface",
    },
  ],
  byRouteType: { static: 1, isr: 1, dynamic: 2 },
  byImportance: { critical: 1, high: 2, medium: 1, low: 0 },
};

// ── redirect-map-generator tests ──────────────────────────────────────────────

describe("generateRedirectMap", () => {
  it("produces a redirect for every non-API, non-flagged URL", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    // /api/og is flagged and skipped; the other 3 + catch-all should be in Vercel
    const sources = result.vercel.redirects.map((r) => r.source);
    expect(sources).toContain("/");
    expect(sources).toContain("/about");
  });

  it("converts [slug] dynamic segment to Vercel :slug pattern", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    const advisorRedirect = result.vercel.redirects.find(
      (r) => r.source === "/advisor/:slug",
    );
    expect(advisorRedirect).toBeDefined();
    expect(advisorRedirect?.destination).toBe("https://invest.com.au/advisor/:slug");
  });

  it("marks all redirects as permanent (301)", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    const nonCatchAll = result.vercel.redirects.filter(
      (r) => r.source !== "/(.*)",
    );
    expect(nonCatchAll.every((r) => r.permanent === true)).toBe(true);
  });

  it("destination always points to invest.com.au", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    for (const r of result.vercel.redirects) {
      expect(r.destination).toMatch(/^https:\/\/invest\.com\.au/);
    }
  });

  it("flags /api/* paths as needing special handling", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    const apiFlag = result.flagged.find((f) => f.path === "/api/og");
    expect(apiFlag).toBeDefined();
    expect(apiFlag?.reason).toMatch(/API route/i);
  });

  it("appends a catch-all redirect as the last entry", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    const last = result.vercel.redirects[result.vercel.redirects.length - 1];
    expect(last?.source).toBe("/(.*)" );
    expect(last?.destination).toContain("invest.com.au");
  });

  it("produces htaccess output with RewriteEngine On", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    expect(result.htaccess).toContain("RewriteEngine On");
  });

  it("stats.clean + stats.flagged = total URL count", () => {
    const result = generateRedirectMap(MINIMAL_MANIFEST);
    expect(result.stats.clean + result.stats.flagged).toBe(
      MINIMAL_MANIFEST.totalUrls,
    );
  });
});

// ── ranking-health-snapshot tests ─────────────────────────────────────────────

describe("buildSnapshot", () => {
  it("counts URLs by route type", () => {
    const snap = buildSnapshot(MINIMAL_MANIFEST, "test");
    expect(snap.byRouteType.static).toBe(1);
    expect(snap.byRouteType.isr).toBe(1);
    expect(snap.byRouteType.dynamic).toBe(2);
  });

  it("counts URLs by importance", () => {
    const snap = buildSnapshot(MINIMAL_MANIFEST, "test");
    expect(snap.byImportance.critical).toBe(1);
    expect(snap.byImportance.high).toBe(2);
    expect(snap.byImportance.medium).toBe(1);
    expect(snap.byImportance.low).toBe(0);
  });

  it("sets totalUrls from the manifest", () => {
    const snap = buildSnapshot(MINIMAL_MANIFEST, "test");
    expect(snap.totalUrls).toBe(4);
  });

  it("collects criticalPaths list", () => {
    const snap = buildSnapshot(MINIMAL_MANIFEST, "test");
    expect(snap.criticalPaths).toContain("/");
    expect(snap.criticalPaths).not.toContain("/about");
  });

  it("buckets ISR revalidate=3600s into 31min-2h bucket", () => {
    // 3600s = 1 hour, which is in the [31min, 2h] window
    const snap = buildSnapshot(MINIMAL_MANIFEST, "test");
    expect(snap.revalidateDistribution["31min–2h"]).toBeGreaterThan(0);
  });

  it("buckets dynamic pages into dynamic (force-dynamic)", () => {
    const snap = buildSnapshot(MINIMAL_MANIFEST, "test");
    expect(snap.revalidateDistribution["dynamic (force-dynamic)"]).toBe(2);
  });
});

describe("diffSnapshots", () => {
  const baseline = buildSnapshot(MINIMAL_MANIFEST, "pre-migration");

  it("returns ok=true when snapshots are identical", () => {
    const current = buildSnapshot(MINIMAL_MANIFEST, "post-migration");
    const diff = diffSnapshots(baseline, current);
    expect(diff.ok).toBe(true);
    expect(diff.regressions).toHaveLength(0);
  });

  it("detects missing critical paths as a regression", () => {
    const reducedManifest = {
      ...MINIMAL_MANIFEST,
      totalUrls: 3,
      urls: MINIMAL_MANIFEST.urls.filter((u) => u.path !== "/"),
    };
    const current = buildSnapshot(reducedManifest, "post-migration");
    const diff = diffSnapshots(baseline, current);
    expect(diff.ok).toBe(false);
    expect(diff.missingCriticalPaths).toContain("/");
    expect(diff.regressions.length).toBeGreaterThan(0);
  });

  it("detects large URL count drop as a regression", () => {
    // Drop >5% of URLs (3/4 = 75% drop — definitely a regression)
    const tinyManifest = {
      ...MINIMAL_MANIFEST,
      totalUrls: 1,
      urls: MINIMAL_MANIFEST.urls.slice(0, 1),
    };
    const current = buildSnapshot(tinyManifest, "post-migration");
    const diff = diffSnapshots(baseline, current);
    expect(diff.ok).toBe(false);
  });

  it("allows new paths without flagging regression", () => {
    const expandedManifest = {
      ...MINIMAL_MANIFEST,
      totalUrls: 5,
      urls: [
        ...MINIMAL_MANIFEST.urls,
        {
          path: "/new-page",
          routeType: "static" as const,
          revalidate: null,
          importance: "critical" as const,
          notes: "New critical page",
        },
      ],
    };
    const current = buildSnapshot(expandedManifest, "post-migration");
    const diff = diffSnapshots(baseline, current);
    // Adding new critical paths is fine; regression is about LOSING them
    expect(diff.newPaths).toContain("/new-page");
    // No regression from adding pages
    expect(diff.regressions.filter((r) => r.includes("drop"))).toHaveLength(0);
  });

  it("reports urlCountDelta correctly", () => {
    const current = buildSnapshot(MINIMAL_MANIFEST, "post-migration");
    const diff = diffSnapshots(baseline, current);
    expect(diff.urlCountDelta).toBe(0);
  });
});
