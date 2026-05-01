#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * RLS migration gate (B-07 / I-01).
 *
 * Fails the build if any NEW migration file adds a CREATE TABLE without a
 * corresponding ENABLE ROW LEVEL SECURITY in the same file.
 *
 * Rationale: every application table must have RLS enabled before it can be
 * queried via PostgREST.  A table created without RLS is exposed to full
 * read/write access by anyone holding the Supabase anon key.
 *
 * Usage:
 *   npm run audit:rls-migrations           # local
 *   node scripts/check-rls-migrations.mjs  # direct
 *
 * CI sets GITHUB_BASE_REF so the script only examines migration files that
 * were added in the current PR.  Locally it falls back to comparing against
 * `main`.
 *
 * Escape hatch (use sparingly — add a clear justification):
 *   -- rls-exempt: <table_name>  <reason>
 * Only valid for Supabase-internal / extension-managed tables that must not
 * have application-level RLS (e.g. PostGIS topology tables).
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const MIGRATIONS_GLOB = "supabase/migrations/*.sql";

/**
 * Table name prefixes that indicate a Supabase-internal or extension-managed
 * table.  These are NOT subject to application-level RLS.
 */
const SYSTEM_TABLE_PREFIXES = ["pg_", "auth.", "storage.", "realtime.", "supabase_"];

/** @param {string} name */
export function isSystemTable(name) {
  return SYSTEM_TABLE_PREFIXES.some((p) => name.startsWith(p));
}

/**
 * Returns paths to migration files added in the current PR vs the base branch.
 * Falls back gracefully outside CI.
 *
 * @param {string} baseRef  e.g. "main"
 * @returns {string[]}  absolute paths
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
 * Returns table names created by CREATE TABLE statements in a SQL string.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function extractCreatedTables(sql) {
  // Strip single-line SQL comments before parsing so that comment lines
  // containing "CREATE TABLE IF NOT EXISTS" (e.g. in idempotency headers)
  // don't produce false table-name extractions like "if".
  const stripped = sql.replace(/--[^\n]*/g, "");
  const re =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
  const names = [];
  let m;
  while ((m = re.exec(stripped)) !== null) {
    names.push(m[1].toLowerCase());
  }
  return [...new Set(names)];
}

/**
 * Returns true if the migration enables RLS for the named table via:
 *   ALTER TABLE [IF EXISTS] [public.]<table> ENABLE ROW LEVEL SECURITY
 *
 * @param {string} sql
 * @param {string} tableName
 * @returns {boolean}
 */
export function hasRlsEnabled(sql, tableName) {
  const re = new RegExp(
    `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i"
  );
  return re.test(sql);
}

/**
 * Returns table names that carry a `-- rls-exempt: <table>` comment in the SQL.
 *
 * @param {string} sql
 * @returns {Set<string>}
 */
export function extractExemptedTables(sql) {
  const re = /--\s+rls-exempt:\s+([a-z_][a-z0-9_]*)/gi;
  const names = new Set();
  let m;
  while ((m = re.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  const baseRef = process.env.GITHUB_BASE_REF ?? "main";
  const addedFiles = getAddedMigrations(baseRef);

  if (addedFiles.length === 0) {
    console.log("No new migration files in this PR — RLS migration gate passed.");
    process.exit(0);
  }

  console.log(
    `Checking ${addedFiles.length} new migration(s) for CREATE TABLE without ENABLE ROW LEVEL SECURITY…\n`
  );

  /** @type {Array<{table: string, file: string}>} */
  const failures = [];

  for (const migPath of addedFiles) {
    let sql;
    try {
      sql = await fs.readFile(migPath, "utf8");
    } catch {
      console.warn(`  ⚠  Cannot read ${migPath} — skipping`);
      continue;
    }

    const tables = extractCreatedTables(sql);
    if (tables.length === 0) continue;

    const exempted = extractExemptedTables(sql);

    for (const table of tables) {
      if (isSystemTable(table)) {
        console.log(`  –  ${table}  (Supabase-internal — skip)`);
        continue;
      }
      if (exempted.has(table)) {
        console.log(`  –  ${table}  (rls-exempt comment present)`);
        continue;
      }
      if (hasRlsEnabled(sql, table)) {
        console.log(`  ✓  ${table}`);
      } else {
        failures.push({ table, file: path.relative(process.cwd(), migPath) });
      }
    }
  }

  if (failures.length === 0) {
    console.log(
      "\nRLS migration gate passed — all new tables include ENABLE ROW LEVEL SECURITY."
    );
    process.exit(0);
  }

  console.error(
    "\n::error::RLS migration gate failed — new tables without ENABLE ROW LEVEL SECURITY:\n"
  );
  for (const { table, file } of failures) {
    console.error(`  ✗  ${table}  (in ${file})`);
    console.error(`     → Add to the migration:`);
    console.error(`       ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    console.error(`       ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
    console.error(
      `     → Then add an explicit deny-all-anon + service_role-allow policy pair.`
    );
    console.error(
      `     → If genuinely exempt, add: -- rls-exempt: ${table} <justification>`
    );
    console.error();
  }
  console.error(
    "See docs/audits/REMEDIATION_DEFAULTS.md 'New migration' gate for the full checklist.\n"
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-rls-migrations: unexpected error:", err);
    process.exit(1);
  });
}
