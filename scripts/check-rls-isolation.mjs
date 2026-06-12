#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * RLS isolation gate (V-NEW-04).
 *
 * Detects any new `CREATE TABLE` migration in the current PR that defines a
 * user-scoped column (`user_id` or `owner_id`) and fails the build if no
 * corresponding RLS isolation test exists.
 *
 * An isolation test proves that user A cannot read or mutate user B's rows —
 * the minimum bar for user-data tables before they go to production.
 *
 * Convention for isolation test location (either is accepted):
 *   __tests__/lib/<table-name>.rls.test.ts
 *   Any file under __tests__/ that contains the marker:
 *     // rls-isolation: <table-name>
 *
 * Usage:
 *   npm run audit:rls-isolation           # local
 *   node scripts/check-rls-isolation.mjs  # direct
 *
 * CI sets GITHUB_BASE_REF so the script only examines migration files that
 * were added in the current PR.  Locally it falls back to comparing against
 * `main` so you can preview failures before pushing.
 *
 * To skip a table that genuinely needs no per-user isolation (e.g. a public
 * lookup table that happens to store a creator `user_id` for audit purposes):
 *   Add the table name to ISOLATION_EXEMPT below with a clear reason.
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const TESTS_ROOT = path.join(process.cwd(), "__tests__");
const MIGRATIONS_GLOB = "supabase/migrations/*.sql";

/**
 * Tables that store a user_id for audit / FK purposes but don't require
 * per-user row isolation (e.g. completely public read, service-role-only write).
 * Add entries here with a justification; they're flagged in CI output so the
 * decision stays visible.
 */
const ISOLATION_EXEMPT = [
  // admin_audit_log: service-role-only write; no user-owned rows
  { table: "admin_audit_log", reason: "service-role-only; write-only for users" },
  // csp_violations: write-only via /api/csp-report; no user rows
  { table: "csp_violations", reason: "write-only report endpoint; no user ownership" },
  // retention_rules: service-role-only config table
  { table: "retention_rules", reason: "service-role config; no per-user rows" },
  // startup_sessions (SP-02): service-role-only, no authenticated policy (mirrors advisor_sessions)
  { table: "startup_sessions", reason: "service-role-only; no authenticated policy / no user-readable rows" },
  // challenges: public-read marketing/landing table (anon+authenticated SELECT),
  // service-role-only writes; has NO user_id/owner_id column of its own — it is
  // only flagged because the file-level scan sees challenge_enrolments.user_id in
  // the same migration. Per-user isolation lives on challenge_enrolments and
  // challenge_task_completions (each has its own .rls.test.ts).
  { table: "challenges", reason: "public-read marketing table; service-role-only writes; no user-owned rows (no user_id column)" },
];

const EXEMPT_NAMES = new Set(ISOLATION_EXEMPT.map((e) => e.table));

// ---------------------------------------------------------------------------
// Core logic — exported so unit tests can call directly
// ---------------------------------------------------------------------------

/**
 * Returns migration files added in the current PR vs the base branch.
 * Falls back gracefully when not in a git repo or git is unavailable.
 *
 * @param {string} baseRef  e.g. "main" or "origin/main"
 * @returns {string[]}  absolute paths to added .sql files
 */
export function getAddedMigrations(baseRef) {
  try {
    const raw = execSync(
      `git diff --name-only --diff-filter=A origin/${baseRef}...HEAD -- ${MIGRATIONS_GLOB}`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => path.join(process.cwd(), f));
  } catch {
    return [];
  }
}

/**
 * Extracts table names from CREATE TABLE statements in a SQL string.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function extractTableNames(sql) {
  // Strip single-line SQL comments before matching so comment lines containing
  // "CREATE TABLE IF NOT EXISTS" (e.g. idempotency notes in migration headers)
  // don't produce spurious table names like "if".
  const stripped = sql.replace(/--[^\n]*/g, "");
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
  const names = [];
  let m;
  while ((m = re.exec(stripped)) !== null) {
    names.push(m[1].toLowerCase());
  }
  return [...new Set(names)];
}

/**
 * Returns true if the SQL block that defines `tableName` contains a
 * user_id or owner_id column.  Uses a conservative file-level check
 * when per-table scoping is ambiguous (multi-table migration files).
 *
 * @param {string} sql     full migration file contents
 * @param {string} _tableName  (reserved for future per-table scoping)
 * @returns {boolean}
 */
export function isUserDataTable(sql, _tableName) {
  return /\buser_id\b/.test(sql) || /\bowner_id\b/.test(sql);
}

/**
 * Checks whether an RLS isolation test exists for `tableName`.
 *
 * Accepts either:
 *   __tests__/lib/<tableName>.rls.test.ts         (naming convention)
 *   Any file under __tests__/ with the line:
 *     // rls-isolation: <tableName>
 *
 * @param {string} tableName
 * @param {string} testsRoot  path to __tests__/ directory
 * @returns {Promise<boolean>}
 */
export async function hasIsolationTest(tableName, testsRoot) {
  // Convention-based location
  const canonical = path.join(testsRoot, "lib", `${tableName}.rls.test.ts`);
  try {
    await fs.access(canonical);
    return true;
  } catch {
    // fall through to marker scan
  }

  // Marker scan — any test file containing `// rls-isolation: <table>`
  const marker = `rls-isolation: ${tableName}`;
  const found = await scanForMarker(testsRoot, marker);
  return found;
}

/**
 * Recursively scans `dir` for files containing `marker`.
 *
 * @param {string} dir
 * @param {string} marker
 * @returns {Promise<boolean>}
 */
async function scanForMarker(dir, marker) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (await scanForMarker(full, marker)) return true;
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      const contents = await fs.readFile(full, "utf8").catch(() => "");
      if (contents.includes(marker)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  const baseRef = process.env.GITHUB_BASE_REF ?? "main";
  const addedFiles = getAddedMigrations(baseRef);

  if (addedFiles.length === 0) {
    console.log("No new migration files in this PR — RLS isolation gate passed.");
    process.exit(0);
  }

  console.log(`Checking ${addedFiles.length} new migration(s) for user-data tables…\n`);

  /** @type {Array<{table: string, file: string}>} */
  const failures = [];
  /** @type {Array<{table: string, reason: string}>} */
  const exempted = [];

  for (const migPath of addedFiles) {
    let sql;
    try {
      sql = await fs.readFile(migPath, "utf8");
    } catch {
      console.warn(`  ⚠  Cannot read ${migPath} — skipping`);
      continue;
    }

    const tables = extractTableNames(sql);
    for (const table of tables) {
      if (!isUserDataTable(sql, table)) continue;

      if (EXEMPT_NAMES.has(table)) {
        const ex = ISOLATION_EXEMPT.find((e) => e.table === table);
        exempted.push({ table, reason: ex?.reason ?? "listed in ISOLATION_EXEMPT" });
        continue;
      }

      const ok = await hasIsolationTest(table, TESTS_ROOT);
      if (!ok) {
        failures.push({ table, file: path.relative(process.cwd(), migPath) });
      } else {
        console.log(`  ✓  ${table}`);
      }
    }
  }

  if (exempted.length > 0) {
    console.log("\nExempted (ISOLATION_EXEMPT):");
    for (const { table, reason } of exempted) {
      console.log(`  –  ${table}  (${reason})`);
    }
  }

  if (failures.length === 0) {
    console.log("\nRLS isolation gate passed — all new user-data tables have isolation tests.");
    process.exit(0);
  }

  console.error("\n::error::RLS isolation gate failed — new user-data tables without isolation tests:\n");
  for (const { table, file } of failures) {
    console.error(`  ✗  ${table}  (in ${file})`);
    console.error(
      `     → Create __tests__/lib/${table}.rls.test.ts using the template at`
    );
    console.error(
      `       __tests__/templates/rls-isolation.template.ts`
    );
    console.error();
  }
  console.error(
    "Each isolation test must assert that user A cannot SELECT/UPDATE/DELETE"
  );
  console.error("user B's rows (two-user fixture against a mock Supabase client).\n");
  process.exit(1);
}

// Only run main() when executed directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-rls-isolation: unexpected error:", err);
    process.exit(1);
  });
}
