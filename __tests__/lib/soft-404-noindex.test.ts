/**
 * Soft-404 noindex enforcement.
 *
 * Dynamic content routes whose `generateMetadata` short-circuits on a
 * missing entity (the same branch where the page component calls
 * `notFound()`) must return a `noindex` directive — otherwise Google
 * indexes the soft-404 "not found" shell with `index,follow` (the
 * Next.js default), causing SEO harm.
 *
 * The canonical pattern is in app/best-for/[slug]/page.tsx:
 *   if (!scenario) return { title: "Not found", robots: "noindex" };
 *
 * This is a static-analysis guard: a not-found metadata branch must not
 * be a bare `return {};` (which inherits the default indexable robots).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// The three routes flagged in the audit, plus a representative set of the
// other dynamic content routes whose generateMetadata previously returned
// bare `{}` on the not-found branch.
const ROUTES = [
  "app/best/[slug]/page.tsx",
  "app/etfs/[ticker]/page.tsx",
  "app/etfs/vs/[slugs]/page.tsx",
  "app/academy/[slug]/page.tsx",
  "app/advisor/[slug]/page.tsx",
  "app/articles/[category]/page.tsx",
  "app/firm/[slug]/page.tsx",
  "app/glossary/[term]/page.tsx",
  "app/help/[category]/page.tsx",
  "app/just/[event]/page.tsx",
  "app/learn/[path]/page.tsx",
  "app/questions/[slug]/page.tsx",
  "app/teams/[slug]/page.tsx",
  "app/versus/[slugs]/page.tsx",
];

describe("soft-404 metadata returns noindex", () => {
  for (const rel of ROUTES) {
    const src = readFileSync(join(ROOT, rel), "utf8");

    it(`${rel} never returns a bare {} from a generateMetadata guard`, () => {
      // `return {};` from a not-found guard inherits the default
      // index,follow robots — the regression we are guarding against.
      expect(
        /return\s*\{\s*\}\s*;/.test(src),
        `${rel} has a bare \`return {};\` metadata branch — add robots noindex (e.g. \`return { robots: { index: false } };\`).`,
      ).toBe(false);
    });

    it(`${rel} declares a noindex robots directive`, () => {
      expect(
        /robots:\s*("noindex"|'noindex'|\{\s*index:\s*false)/.test(src),
        `${rel} should set a noindex robots directive on its not-found metadata branch.`,
      ).toBe(true);
    });
  }
});
