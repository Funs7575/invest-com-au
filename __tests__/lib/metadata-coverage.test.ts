/**
 * Metadata coverage enforcement.
 *
 * Every public server page OR its nearest parent layout.tsx MUST
 * export `metadata` or `generateMetadata`. Portal pages are allowed
 * to rely on the X-Robots-Tag noindex header set by proxy.ts — they
 * never need OG/canonical/title.
 *
 * Pure redirect pages are in ALLOWLIST.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = process.cwd();

// Skip trees — portal/gated pages are covered by the X-Robots-Tag
// noindex header applied in proxy.ts, and API routes never render HTML.
const SKIP_PREFIXES = [
  "app/api/",
  "app/admin/",
  "app/broker-portal/",
  "app/advisor-portal/",
  "app/dashboard/",
];

// Pages that are pure server redirects — metadata would never be
// rendered so skipping is correct.
const ALLOWLIST = new Set<string>([
  "app/broker/page.tsx",
  "app/course/page.tsx",
  "app/course/[slug]/page.tsx",
]);

const META_PATTERN = /export\s+(?:const|async\s+function)\s+(metadata|generateMetadata)/;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (name === "page.tsx") out.push(path);
  }
  return out;
}

/**
 * Walk up from the page file looking for metadata in the page itself
 * or any ancestor layout.tsx within the app/ tree. Returns true if
 * any layer exports metadata.
 */
function hasMetadataInSelfOrAncestor(pagePath: string): boolean {
  if (META_PATTERN.test(readFileSync(pagePath, "utf8"))) return true;
  let dir = dirname(pagePath);
  while (dir.length > ROOT.length + 4 /* keep us inside app/ */) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout) && META_PATTERN.test(readFileSync(layout, "utf8"))) {
      return true;
    }
    dir = dirname(dir);
  }
  return false;
}

describe("metadata coverage (public pages)", () => {
  const files = walk(join(ROOT, "app"));
  const public_ = files.filter((f) => {
    const rel = f.replace(ROOT + "/", "");
    if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) return false;
    if (ALLOWLIST.has(rel)) return false;
    return true;
  });

  it("has at least 50 public pages (sanity)", () => {
    expect(public_.length).toBeGreaterThan(50);
  });

  for (const file of public_) {
    const rel = file.replace(ROOT + "/", "");
    it(`${rel} exports metadata (self or ancestor layout)`, () => {
      expect(
        hasMetadataInSelfOrAncestor(file),
        `No metadata found for ${rel}. Add export const metadata or a generateMetadata() function to the page or any ancestor layout.tsx inside app/.`,
      ).toBe(true);
    });
  }
});
