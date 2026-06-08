#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Migration filename / version-hygiene gate.
 *
 * Fails the build if a NEW migration file's name does not begin with a unique
 * 14-digit timestamp version (`YYYYMMDDHHMMSS_description.sql`), or if its
 * version collides with one already present in the tree.
 *
 * Why this exists: the Supabase CLI derives a migration's *version* (its primary
 * key in `supabase_migrations.schema_migrations`) from the leading digits of the
 * filename. The legacy tree accumulated THREE incompatible version formats —
 * 3-digit (`001_*.sql`), 8-digit date-only (`20260702_*.sql`), and 14-digit
 * timestamp (`20260603120000_*.sql`) — and **50 distinct date-only prefixes that
 * map more than one file to the same version**. Colliding/short versions break
 * `supabase db push` ordering and make `migration repair` ambiguous, which is a
 * load-bearing reason the local tree can no longer be replayed against prod
 * (see docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md).
 *
 * This gate stops the rot from growing: every migration added from here on must
 * carry a unique full timestamp. It is the filename counterpart to the
 * RLS-migration gate and runs the same PR-scoped diff so it never red-fails on
 * the pre-existing legacy files (those are retired by the baseline-squash, not
 * by this gate).
 *
 * Usage:
 *   npm run audit:migration-filenames            # PR-scoped (CI)
 *   node scripts/check-migration-filenames.mjs --all   # audit the whole tree
 *
 * CI sets GITHUB_BASE_REF so only files ADDED in the current PR are checked.
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseMigrationVersion } from "./lib/migration-version.mjs";

const MIGRATIONS_DIR = "supabase/migrations";

// Re-export so existing unit tests importing from this module keep working,
// while the parsing logic lives in one shared place (scripts/lib).
export { parseMigrationVersion };

// ---------------------------------------------------------------------------
// Core logic — exported so unit tests can call directly (pure, no I/O)
// ---------------------------------------------------------------------------

/**
 * Given the basenames of newly-added migration files and the set of versions
 * already present in the tree (everything except the added files), return the
 * list of hygiene violations.
 *
 * A violation is one of:
 *   - "format"            : version is not a 14-digit timestamp
 *   - "collision-existing": 14-digit version already used by another tree file
 *   - "collision-added"   : two added files share the same 14-digit version
 *
 * @param {string[]} addedBasenames
 * @param {Set<string>} existingVersions  versions already in the tree
 * @returns {{ file: string, version: string, kind: "format"|"collision-existing"|"collision-added" }[]}
 */
export function computeFilenameViolations(addedBasenames, existingVersions) {
  /** @type {{ file: string, version: string, kind: "format"|"collision-existing"|"collision-added" }[]} */
  const violations = [];
  const seenInAdded = new Set();
  for (const name of addedBasenames) {
    const { version, is14, hasDigits } = parseMigrationVersion(name);
    if (!is14) {
      violations.push({ file: name, version: hasDigits ? version : "(none)", kind: "format" });
      continue;
    }
    if (existingVersions.has(version)) {
      violations.push({ file: name, version, kind: "collision-existing" });
    } else if (seenInAdded.has(version)) {
      violations.push({ file: name, version, kind: "collision-added" });
    }
    seenInAdded.add(version);
  }
  return violations;
}

// ---------------------------------------------------------------------------
// File / git acquisition
// ---------------------------------------------------------------------------

/**
 * Resolve the base ref to diff against: prefer `origin/<ref>` (CI), fall back to
 * a local `<ref>` (developer machines without the remote). Returns null when
 * neither resolves, so the caller can warn loudly instead of false-passing.
 *
 * @param {string} baseRef
 * @returns {string | null}
 */
function resolveBaseRef(baseRef) {
  for (const cand of [`origin/${baseRef}`, baseRef]) {
    try {
      execSync(`git rev-parse --verify --quiet ${cand}^{commit}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      return cand;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/**
 * Basenames of migration files added in the current PR vs the base branch.
 *
 * Note on scoping: we pass the *directory* pathspec `supabase/migrations` (git
 * pathspecs match recursively, unlike a shell glob), then filter to direct
 * children with the `path.dirname` check below — that filter is **load-bearing**:
 * it is the only thing excluding archived legacy files under
 * `supabase/migrations/archive/**`. `diff.renames=false` is forced so a
 * rename-to-a-bad-name is reported as an Add (and thus caught) regardless of the
 * caller's git config.
 *
 * Returns [] when there genuinely are no new files; warns and returns [] when
 * the base ref can't be resolved (so a misconfigured local run is visible rather
 * than a silent green).
 *
 * @param {string} baseRef
 * @returns {string[]}
 */
export function getAddedMigrationBasenames(baseRef) {
  const ref = resolveBaseRef(baseRef);
  if (!ref) {
    console.warn(
      `[migration-filenames] base ref "${baseRef}" is not resolvable ` +
        `(no origin/${baseRef} and no local ${baseRef}); skipping the PR-scoped ` +
        `check. Use --all to audit the whole tree.`,
    );
    return [];
  }
  try {
    const raw = execSync(
      `git -c diff.renames=false diff --name-only --diff-filter=A ${ref}...HEAD -- ${MIGRATIONS_DIR}`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      // Load-bearing: the directory pathspec matches archive/** too, so this is
      // what keeps archived legacy files out of the active set.
      .filter((f) => path.dirname(f) === MIGRATIONS_DIR)
      .map((f) => path.basename(f));
  } catch (err) {
    console.warn(
      `[migration-filenames] git diff failed (${/** @type {Error} */ (err).message}); ` +
        `skipping the PR-scoped check.`,
    );
    return [];
  }
}

/** @returns {Promise<string[]>} basenames of every active migration file */
async function readAllMigrationBasenames() {
  try {
    const entries = await fs.readdir(path.join(process.cwd(), MIGRATIONS_DIR));
    return entries.filter((f) => f.endsWith(".sql"));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  const auditAll = process.argv.includes("--all");
  const allBasenames = await readAllMigrationBasenames();

  let targets;
  if (auditAll) {
    targets = allBasenames;
  } else {
    const baseRef = process.env.GITHUB_BASE_REF ?? "main";
    targets = getAddedMigrationBasenames(baseRef);
    if (targets.length === 0) {
      console.log("No new migration files in this PR — migration-filename gate passed.");
      process.exit(0);
    }
  }

  // Existing versions = the tree minus the files we're checking, so an added
  // file is never compared against itself.
  const targetSet = new Set(targets);
  const existingVersions = new Set();
  for (const name of allBasenames) {
    if (targetSet.has(name)) continue;
    const { version, is14 } = parseMigrationVersion(name);
    if (is14) existingVersions.add(version);
  }

  const violations = computeFilenameViolations(targets, existingVersions);

  if (auditAll) {
    // Whole-tree mode is an audit, not a gate: report the legacy-format spread
    // so the reconciliation can see how much it is collapsing.
    const fmt = { d3: 0, d8: 0, d14: 0, other: 0 };
    for (const name of allBasenames) {
      const { version, is14 } = parseMigrationVersion(name);
      if (is14) fmt.d14++;
      else if (/^\d{8}$/.test(version)) fmt.d8++;
      else if (/^\d{3}$/.test(version)) fmt.d3++;
      else fmt.other++; // no digits, or any other non-conforming length
    }
    console.log(
      `Migration filename audit — ${allBasenames.length} files: ` +
        `${fmt.d14} timestamped(14), ${fmt.d8} date-only(8), ${fmt.d3} numbered(3), ${fmt.other} other.`,
    );
    // --all is an audit, not a gate: report the legacy non-conforming files but
    // never exit non-zero (the legacy spread is retired by the baseline-squash).
    const nonConforming = violations.filter((v) => v.kind === "format").length;
    console.log(
      `${nonConforming} legacy file(s) do not use a 14-digit timestamp version ` +
        `(expected pre-reconciliation; collapsed by the baseline-squash).`,
    );
    process.exit(0);
  }

  if (violations.length === 0) {
    console.log(
      `Migration-filename gate passed — ${targets.length} file(s) carry a unique 14-digit timestamp version.`,
    );
    process.exit(0);
  }

  console.error(
    `\n::error::Migration-filename gate failed — ${violations.length} file(s) violate version hygiene:\n`,
  );
  for (const v of violations) {
    if (v.kind === "format") {
      console.error(`  ✗  ${v.file}`);
      console.error(`     → version "${v.version}" is not a 14-digit timestamp.`);
    } else if (v.kind === "collision-existing") {
      console.error(`  ✗  ${v.file}  — version ${v.version} already used by another migration`);
    } else {
      console.error(`  ✗  ${v.file}  — version ${v.version} duplicated by another added migration`);
    }
  }
  console.error(
    `\nFix: rename to a unique full timestamp, e.g.\n` +
      `  ${MIGRATIONS_DIR}/${nowStamp()}_<short_description>.sql\n` +
      `Generate one with: date -u +%Y%m%d%H%M%S\n` +
      `Background: docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md\n`,
  );
  process.exit(1);
}

/** @returns {string} a fresh UTC 14-digit stamp, for the fix hint */
function nowStamp() {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-migration-filenames: unexpected error:", err);
    process.exit(1);
  });
}
