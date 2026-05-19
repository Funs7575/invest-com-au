#!/usr/bin/env node
// @ts-check
/**
 * Account-kind registry consistency gate.
 *
 * Fails the build when the 5+ account kinds drift across the registry sites
 * that need to agree about them. The current registry sites are:
 *
 *   1. lib/account-types.ts                    — AccountKind union + ACTIVE_ACCOUNT_KINDS
 *   2. lib/account-kinds.ts                    — KNOWN_WORKSPACE_KINDS set + portalForKind switch
 *   3. lib/portal-gate.ts                      — currentPortalPath switch
 *   4. app/account/select-workspace/SelectWorkspaceClient.tsx
 *                                              — KIND_META map (chooser UI)
 *
 * Why this exists (Phase 0.2 of the account-architecture master plan):
 * adding a 6th account kind today is an 8-file manual job with a prose
 * checklist that nobody runs. This gate enforces the lib-side invariants
 * automatically — if you add `'wholesale_operator'` to ACTIVE_ACCOUNT_KINDS
 * but forget to add it to portalForKind, CI fails.
 *
 * Usage:
 *   node scripts/check-entity-registry.mjs
 *
 * No skip token — this is static file analysis. If a check is wrong for a
 * legitimate reason, fix the check, don't bypass it.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Sites that must contain each account kind, with an extractor function that
 * pulls the set of kinds the site declares.
 *
 * @type {{
 *   path: string;
 *   label: string;
 *   extract: (source: string) => Set<string>;
 * }[]}
 */
const REGISTRY_SITES = [
  {
    path: "lib/account-types.ts",
    label: "ACTIVE_ACCOUNT_KINDS",
    extract: (src) => {
      const m = src.match(/ACTIVE_ACCOUNT_KINDS:\s*readonly\s+AccountKind\[\]\s*=\s*\[([\s\S]*?)\]/);
      if (!m) return new Set();
      return collectStringLiterals(m[1]);
    },
  },
  {
    path: "lib/account-kinds.ts",
    label: "KNOWN_WORKSPACE_KINDS",
    extract: (src) => {
      const m = src.match(/KNOWN_WORKSPACE_KINDS\s*=\s*new\s+Set<WorkspaceKind>\(\[([\s\S]*?)\]\)/);
      if (!m) return new Set();
      return collectStringLiterals(m[1]);
    },
  },
  {
    path: "lib/account-kinds.ts",
    label: "portalForKind switch",
    extract: (src) => {
      const m = src.match(/export function portalForKind[\s\S]*?\{([\s\S]*?)^\}/m);
      if (!m) return new Set();
      return collectCaseLabels(m[1]);
    },
  },
  {
    path: "lib/portal-gate.ts",
    label: "currentPortalPath switch",
    extract: (src) => {
      const m = src.match(/function currentPortalPath[\s\S]*?\{([\s\S]*?)^\}/m);
      if (!m) return new Set();
      return collectCaseLabels(m[1]);
    },
  },
];

/**
 * Source of truth: ACTIVE_ACCOUNT_KINDS from lib/account-types.ts.
 * Every other site must declare exactly this set.
 */
const SOURCE_OF_TRUTH = "ACTIVE_ACCOUNT_KINDS";

/** @param {string} block */
function collectStringLiterals(block) {
  const out = new Set();
  const re = /['"]([a-z_]+)['"]/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[1]) out.add(m[1]);
  }
  return out;
}

/** @param {string} block */
function collectCaseLabels(block) {
  const out = new Set();
  const re = /case\s+['"]([a-z_]+)['"]\s*:/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[1]) out.add(m[1]);
  }
  return out;
}

/** @param {Set<string>} a @param {Set<string>} b */
function diff(a, b) {
  return [...a].filter((x) => !b.has(x));
}

async function main() {
  /** @type {{ label: string; path: string; kinds: Set<string> }[]} */
  const observed = [];
  for (const site of REGISTRY_SITES) {
    const absPath = path.join(REPO_ROOT, site.path);
    let src;
    try {
      src = await fs.readFile(absPath, "utf8");
    } catch (err) {
      console.error(`✘ Could not read ${site.path}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
    const kinds = site.extract(src);
    if (kinds.size === 0) {
      console.error(
        `✘ Could not extract any kinds from ${site.path} (${site.label}). ` +
          `Either the file format changed or the extractor regex is stale — fix ` +
          `scripts/check-entity-registry.mjs.`,
      );
      process.exit(1);
    }
    observed.push({ label: site.label, path: site.path, kinds });
  }

  const source = observed.find((o) => o.label === SOURCE_OF_TRUTH);
  if (!source) {
    console.error(`✘ Source of truth ${SOURCE_OF_TRUTH} not found in observed sites.`);
    process.exit(1);
  }

  let failed = false;
  for (const site of observed) {
    if (site.label === SOURCE_OF_TRUTH) continue;
    const missing = diff(source.kinds, site.kinds);
    const extra = diff(site.kinds, source.kinds);
    if (missing.length > 0) {
      console.error(
        `✘ ${site.path} (${site.label}) is missing kinds: ${missing.join(", ")}\n` +
          `  Add them so the registry stays consistent with ${SOURCE_OF_TRUTH}.`,
      );
      failed = true;
    }
    if (extra.length > 0) {
      console.error(
        `✘ ${site.path} (${site.label}) declares extra kinds: ${extra.join(", ")}\n` +
          `  Remove them or add to ${SOURCE_OF_TRUTH} if intentional.`,
      );
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log(
    `✔ Account-kind registry consistent across ${observed.length} sites ` +
      `(${source.kinds.size} kinds: ${[...source.kinds].sort().join(", ")}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
