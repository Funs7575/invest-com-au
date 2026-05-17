#!/usr/bin/env node
// @ts-check
/**
 * Unapplied-migration audit (#214).
 *
 * Reports tables that appear in `supabase/migrations/*.sql` (via
 * `CREATE TABLE [IF NOT EXISTS] public.<name>`) but are absent from
 * `lib/database.types.ts`. Because `lib/database.types.ts` is regenerated
 * from the live Supabase schema, a table that is in the repo migrations
 * but missing from the types file almost always means the migration was
 * authored, committed, but never applied to prod — the exact pattern
 * that bit the PMP foundation (`20260723_pmp01_*.sql` exists on main
 * but no rows in `advisor_auctions` until 2026-05-17 because the
 * migration was never applied) and `advisor_credit_ledger`
 * (`20260508130000_*.sql` exists but never applied).
 *
 * This is the inverse of `scripts/check-database-types-drift.mjs`,
 * which catches the more common "table exists in prod, not in repo
 * migrations" direction (Issue #214's headline number — 231 dashboard-
 * created tables).
 *
 * Output: human-readable markdown report on stdout.
 *
 * Usage:
 *   npm run audit:unapplied-migrations
 *   node scripts/audit/unapplied-migrations.mjs
 *   node scripts/audit/unapplied-migrations.mjs --json   # machine-readable
 *
 * The script does NOT exit non-zero on findings — it's an audit tool,
 * not a CI gate. Treat the output as a punch list for either
 * apply_migration via Supabase MCP or write-a-backfill-migration follow-
 * up work.
 *
 * Methodology notes:
 *  - We do not import from `lib/database.types.ts`; the same text-based
 *    extraction methodology as `check-database-types-drift.mjs` is used
 *    (6-space indent + trailing `: {`).
 *  - Migration extraction uses the same regex shape as
 *    `check-rls-migrations.mjs` for consistency.
 *  - Tables prefixed with Supabase-internal namespaces (`pg_`, `auth.`,
 *    `storage.`, `realtime.`, `supabase_`) are excluded — they're never
 *    in `Database['public']['Tables']` by design.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES_FILE = "lib/database.types.ts";
const MIGRATIONS_DIR = "supabase/migrations";

const SYSTEM_TABLE_PREFIXES = ["pg_", "auth.", "storage.", "realtime.", "supabase_"];

/** @param {string} name */
function isSystemTable(name) {
  return SYSTEM_TABLE_PREFIXES.some((p) => name.startsWith(p));
}

/**
 * Extract table names declared in `Database['public']['Tables']` by walking
 * the types file as text. Mirrors `check-database-types-drift.mjs`.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function extractTypesTables(source) {
  const lines = source.split(/\r?\n/);
  /** @type {string[]} */
  const tables = [];
  let inPublic = false;
  let inTables = false;
  let depth = 0;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.includes("public:") && line.endsWith("{")) {
      inPublic = true;
      depth = 1;
      continue;
    }
    if (inPublic) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      depth += opens - closes;
      if (depth <= 0) {
        inPublic = false;
        inTables = false;
      }
    }
    if (inPublic && /^ {4}Tables:\s*\{/.test(line)) {
      inTables = true;
      continue;
    }
    if (!inTables) continue;
    // Top-level table key: 6 spaces + name + ": {"
    const m = line.match(/^ {6}([a-z_][a-z0-9_]*): \{$/);
    if (m && m[1]) tables.push(m[1]);
  }
  return tables;
}

/**
 * Extract `public.<name>` CREATE TABLE statements from a migration file.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function extractMigrationTables(sql) {
  const stripped = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const re =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
  /** @type {string[]} */
  const out = [];
  let m;
  while ((m = re.exec(stripped)) !== null) {
    if (m[1]) out.push(m[1].toLowerCase());
  }
  return out;
}

/**
 * @param {string[]} typesTables
 * @param {Map<string, string[]>} migrationToFiles  table → list of migration files
 * @returns {{ table: string, files: string[] }[]}
 */
export function computeUnappliedDrift(typesTables, migrationToFiles) {
  const typesSet = new Set(typesTables);
  /** @type {{ table: string, files: string[] }[]} */
  const out = [];
  for (const [table, files] of migrationToFiles) {
    if (isSystemTable(table)) continue;
    if (!typesSet.has(table)) {
      out.push({ table, files: files.slice().sort() });
    }
  }
  return out.sort((a, b) => a.table.localeCompare(b.table));
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const cwd = process.cwd();

  const typesSource = await fs.readFile(path.join(cwd, TYPES_FILE), "utf8");
  const typesTables = extractTypesTables(typesSource);

  const entries = await fs.readdir(path.join(cwd, MIGRATIONS_DIR));
  const migrationFiles = entries.filter((f) => f.endsWith(".sql")).sort();

  /** @type {Map<string, string[]>} */
  const migrationToFiles = new Map();
  for (const file of migrationFiles) {
    const sql = await fs.readFile(path.join(cwd, MIGRATIONS_DIR, file), "utf8");
    const tables = extractMigrationTables(sql);
    for (const t of tables) {
      const list = migrationToFiles.get(t) ?? [];
      list.push(file);
      migrationToFiles.set(t, list);
    }
  }

  const drift = computeUnappliedDrift(typesTables, migrationToFiles);

  if (asJson) {
    console.log(JSON.stringify({ count: drift.length, tables: drift }, null, 2));
    return;
  }

  const totalMigrationTables = migrationToFiles.size;
  console.log(`# Unapplied-migration drift audit`);
  console.log("");
  console.log(`_Generated by \`scripts/audit/unapplied-migrations.mjs\`._`);
  console.log("");
  console.log(`- Tables declared across \`${MIGRATIONS_DIR}/*.sql\`: **${totalMigrationTables}**`);
  console.log(`- Tables present in \`${TYPES_FILE}\` (live DB): **${typesTables.length}**`);
  console.log(
    `- Repo-only (declared in migrations, absent from live DB): **${drift.length}**`,
  );
  console.log("");

  if (drift.length === 0) {
    console.log("✅ No repo-only tables — every CREATE TABLE in the migration tree is reflected in the live DB.");
    return;
  }

  console.log(
    "Each row below has a migration file in the repo whose `CREATE TABLE` never landed in prod. Either:",
  );
  console.log("");
  console.log("  1. Apply the migration via Supabase MCP `apply_migration` (preferred — tracks `schema_migrations`), or");
  console.log("  2. Author a backfill migration that brings the live DB to parity with what code expects, or");
  console.log("  3. Delete the migration file if the table was intentionally abandoned (rare — verify no code references it first).");
  console.log("");
  console.log("| Table | Defining migration file(s) |");
  console.log("|---|---|");
  for (const { table, files } of drift) {
    const fileList = files.map((f) => `\`${f}\``).join(", ");
    console.log(`| \`${table}\` | ${fileList} |`);
  }
}

const invokedAsScript = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (invokedAsScript) {
  main().catch((err) => {
    console.error(`unapplied-migrations audit failed: ${err.message}`);
    process.exit(1);
  });
}
