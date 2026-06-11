#!/usr/bin/env node
/**
 * WCAG AA contrast codemod: text-slate-400 (#94a3b8, 3.54:1 on white — fails
 * AA for body text) → text-slate-500 (#64748b, 5.37:1 — passes).
 *
 * Context-aware, conservative:
 *   KEEP (exempt) when the occurrence is…
 *   - a `dark:` variant (slate-400 on dark backgrounds passes ~7:1);
 *   - a `disabled:` variant (WCAG exempts disabled controls);
 *   - on a line that renders an icon (`<svg`, `<path`, `<Icon`, `aria-hidden`)
 *     — non-text UI contrast needs 3:1, which slate-400 meets;
 *   - inside a dark section: in files that contain dark backgrounds, each
 *     occurrence looks back up to WINDOW lines for the nearest background
 *     class — if the nearest is dark (bg-slate-800/900/950, bg-black,
 *     dark gradients), the instance is skipped.
 *
 *   UPGRADE everything else, including `hover:`/`group-hover:` and
 *   `placeholder:` variants (hover text and placeholders still need AA).
 *
 * Usage: node scripts/codemods/slate-400-contrast.mjs [--dry] [paths…]
 * Defaults to app/ and components/. Prints a per-bucket summary.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const roots = args.filter((a) => !a.startsWith("--"));
const targets = roots.length > 0 ? roots : ["app", "components"];

const WINDOW = 40;
const DARK_BG = /bg-(?:slate|gray|zinc|neutral|stone)-(?:8|9)\d\d|bg-black|from-(?:slate|gray)-9\d\d|bg-\[#0/;
const LIGHT_BG = /bg-white|bg-(?:slate|gray|zinc|neutral|stone|amber|emerald|teal|blue|indigo|violet|rose|red|orange|yellow|green|sky)-(?:50|100)\b/;
const ICON_LINE = /<svg|<path|<Icon|aria-hidden/;

const stats = { files: 0, changed: 0, upgraded: 0, keptDark: 0, keptIcon: 0, keptVariant: 0 };

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      yield* walk(p);
    } else if (entry.name.endsWith(".tsx")) {
      yield p;
    }
  }
}

/** Nearest background context above (and including) line i: "dark" | "light" | null. */
function nearestBg(lines, i) {
  for (let j = i; j >= Math.max(0, i - WINDOW); j--) {
    const line = lines[j];
    // Same-line tie: dark wins only if it appears; check dark first on j === i.
    if (DARK_BG.test(line)) return "dark";
    if (LIGHT_BG.test(line)) return "light";
  }
  return null;
}

for (const target of targets) {
  for (const file of walk(target)) {
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes("text-slate-400")) continue;
    stats.files++;
    const fileHasDark = DARK_BG.test(src);
    const lines = src.split("\n");
    let fileChanged = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("text-slate-400")) continue;

      if (ICON_LINE.test(line)) {
        stats.keptIcon += (line.match(/text-slate-400/g) ?? []).length;
        continue;
      }
      if (fileHasDark && nearestBg(lines, i) === "dark") {
        stats.keptDark += (line.match(/text-slate-400/g) ?? []).length;
        continue;
      }

      // Replace occurrences not behind dark:/disabled: variants.
      const next = line.replace(/(^|[^a-zA-Z0-9:-])((?:(?:group-)?hover:|placeholder:|focus:)?)text-slate-400/g, (m, pre, variant) => {
        stats.upgraded++;
        return `${pre}${variant}text-slate-500`;
      });
      // Count kept dark:/disabled: variants for the summary.
      stats.keptVariant += (next.match(/(?:dark:|disabled:)text-slate-400/g) ?? []).length;
      if (next !== line) {
        lines[i] = next;
        fileChanged = true;
      }
    }

    if (fileChanged) {
      stats.changed++;
      if (!dry) fs.writeFileSync(file, lines.join("\n"));
    }
  }
}

console.log(`${dry ? "[dry-run] " : ""}files-with-token=${stats.files} files-changed=${stats.changed} upgraded=${stats.upgraded} kept(icon-line)=${stats.keptIcon} kept(dark-section)=${stats.keptDark} kept(dark:/disabled: variant)=${stats.keptVariant}`);
