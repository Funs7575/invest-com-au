#!/usr/bin/env node
/**
 * Image-optimisation audit.
 *
 * Scans `app/**\/*.tsx` + `components/**\/*.tsx` for raw `<img>` tags
 * that should be Next.js `<Image>` components. The Next image pipeline
 * gets:
 *   - automatic AVIF/WebP serving
 *   - responsive `srcset` based on the layout
 *   - `loading="lazy"` by default below the fold
 *   - dimension-known layout shift prevention
 *
 * Every `<img>` outside the standard exceptions is a missed perf win.
 *
 * Exceptions (allow-listed paths) where `<img>` is legitimate:
 *   - email templates rendered to HTML (Resend doesn't run JS)
 *   - components that wrap third-party rich-text that we can't control
 *   - inline SVG fallbacks
 *
 * Soft check today; ratchet to hard once raw-img count is at zero.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["app", "components"];

// Files where raw <img> is legitimate.
const ALLOW_PATTERNS = [
  /email[-/]/i,        // anything email-template-shaped
  /SiteFooter\.tsx$/,  // brand wordmark + payment-method icons (small)
  /Logo\.tsx$/,
  /ChatWidget\.tsx$/,  // third-party rich text wrappers
];

function listFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      listFiles(full, acc);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      acc.push(full);
    }
  }
  return acc;
}

const files = SCAN_DIRS.flatMap((d) => listFiles(join(ROOT, d)));
const offenders = [];

for (const file of files) {
  if (ALLOW_PATTERNS.some((re) => re.test(file))) continue;
  const body = readFileSync(file, "utf8");

  // Skip files that legitimately use raw <img> inside dangerouslySetInnerHTML
  // (e.g. AI-generated HTML, RSS rendering).
  if (/dangerouslySetInnerHTML/.test(body) && !/<img[^>]+>/.test(body.replace(/dangerouslySetInnerHTML[^}]+}/g, ""))) {
    continue;
  }

  // Match raw <img> JSX (not HTML-encoded comments + not in strings).
  const matches = body.match(/<img\s[^>]+\/?>/g) ?? [];
  if (matches.length === 0) continue;

  // Drop matches that are inside a comment block.
  const real = matches.filter((m) => {
    const idx = body.indexOf(m);
    if (idx < 0) return true;
    const beforeLine = body.slice(0, idx).split("\n").pop() ?? "";
    return !/^\s*\*|^\s*\/\//.test(beforeLine);
  });

  if (real.length > 0) {
    offenders.push({ file: file.slice(ROOT.length + 1), count: real.length });
  }
}

offenders.sort((a, b) => b.count - a.count);

console.log(
  `Image-optimisation audit — ${files.length} .ts/.tsx files in app/ + components/ scanned.`,
);
if (offenders.length === 0) {
  console.log("✓ No raw <img> tags found outside the allow-list.");
  process.exit(0);
}

console.log(`⚠ ${offenders.length} file(s) with raw <img> tags (total ${offenders.reduce((s, o) => s + o.count, 0)} occurrences):`);
for (const o of offenders.slice(0, 30)) {
  console.log(`  ${o.count.toString().padStart(3)} × ${o.file}`);
}
if (offenders.length > 30) {
  console.log(`  …and ${offenders.length - 30} more`);
}
console.log(
  "\nFix options:\n" +
    "  1. Replace `<img src=…>` with `<Image src=… width=… height=… alt=… />`\n" +
    "     from `next/image`. Provide explicit width/height to prevent CLS.\n" +
    "  2. If the image is decorative or a static logo with no responsive needs,\n" +
    "     leave as `<img>` and add the file path to ALLOW_PATTERNS at the top of\n" +
    "     this script.\n",
);
process.exit(0);
