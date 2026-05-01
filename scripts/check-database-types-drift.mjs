#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Database types drift gate (I-02 / A-07).
 *
 * Fails the build if `lib/database.types.ts` declares a table under
 * `Database['public']['Tables']` that has no `CREATE TABLE` statement in any
 * `supabase/migrations/*.sql` file.
 *
 * Why this matters: types are regenerated from the live Supabase schema, so a
 * type-declared table that has no migration means a fresh environment built
 * only from the migration tree would not match what the app's TypeScript
 * expects.  That gap is how Stream A's 91-table backfill backlog
 * (docs/audits/drift-list.md, generated 2026-04-30) accumulated in the first
 * place — without a CI gate, drift silently re-grows the moment a teammate
 * forgets to add a migration alongside a table they created in the dashboard.
 *
 * Usage:
 *   npm run audit:drift-types               # local
 *   node scripts/check-database-types-drift.mjs   # direct
 *
 * Escape hatch — the allowlist file `.driftallowlist` at repo root carries one
 * table name per line.  Comments (`#`) and blank lines are ignored.  Each
 * entry should have a brief justification on the same line in a `# …` comment
 * so the file documents *why* the drift is tolerated.  The allowlist exists
 * so this gate can ship without first clearing the historical 86-table drift
 * backlog — it shrinks as Stream A items (A-02 .. A-14) ship.
 *
 * Parsing notes:
 *  - We do NOT import from `lib/database.types.ts`; it uses TS type-level
 *    features that aren't introspectable at runtime.  Instead we walk the
 *    file as text and pick out the top-level table names inside the
 *    `public: { Tables: { … } }` block by indent (6 spaces) and the trailing
 *    `: {` token.  This mirrors the methodology in
 *    `docs/audits/drift-list.md` §Methodology.
 *  - Migration extraction reuses the same regex shape as
 *    `scripts/check-rls-migrations.mjs` so the two gates agree on what
 *    counts as a CREATE TABLE.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const TYPES_FILE = "lib/database.types.ts";
const MIGRATIONS_DIR = "supabase/migrations";
const ALLOWLIST_FILE = ".driftallowlist";

// ---------------------------------------------------------------------------
// Core logic — exported so unit tests can call directly
// ---------------------------------------------------------------------------

/**
 * Extracts every table name declared under `Database['public']['Tables']`
 * from a Supabase-generated database.types.ts source string.
 *
 * The parser is indent-aware:
 *   export type Database = {            // col 0
 *     public: {                         // col 2
 *       Tables: {                       // col 4
 *         <table_name>: {               // col 6  ← what we collect
 *           Row: { … }                  // col 8
 *           …
 *         }
 *       }
 *       Views: { … }                    // col 4 (siblings of Tables)
 *     }
 *   }
 *
 * @param {string} source  full text of database.types.ts
 * @returns {string[]}     table names in declaration order, deduplicated
 */
export function extractTypesTables(source) {
  const lines = source.split("\n");
  let inPublic = false;
  let inTables = false;
  /** @type {string[]} */
  const names = [];
  const seen = new Set();

  for (const line of lines) {
    if (!inPublic) {
      // Top-level public schema opener.  The Supabase generator emits exactly
      // `  public: {` with two leading spaces.
      if (/^  public: \{$/.test(line)) {
        inPublic = true;
      }
      continue;
    }

    if (!inTables) {
      // Tables sub-block opens with four leading spaces.
      if (/^    Tables: \{$/.test(line)) {
        inTables = true;
        continue;
      }
      // Closing the public block (col 2) ends our search entirely.
      if (/^  \}$/.test(line)) {
        break;
      }
      continue;
    }

    // Inside Tables.  The closing `    }` at column 4 ends the block.
    if (/^    \}$/.test(line)) {
      break;
    }

    // A table entry is exactly `      <name>: {` at column 6.  Any deeper
    // indent is a nested `Row` / `Insert` / `Update` / `Relationships` key
    // and must not be matched.
    const m = /^      ([a-z_][a-z0-9_]*): \{$/.exec(line);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      names.push(m[1]);
    }
  }

  return names;
}

/**
 * Extracts every CREATE TABLE target from a SQL string.  Strips an optional
 * `public.` schema qualifier and lower-cases the result so casing differences
 * across migrations don't produce phantom drift.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function extractMigrationTables(sql) {
  const re =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi;
  const names = new Set();
  let m;
  while ((m = re.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return [...names];
}

/**
 * Parses a `.driftallowlist` file body.  Returns the set of allowed table
 * names.  Inline comments after the table name are stripped:
 *
 *   admin_audit_log   # A-04 backfill pending
 *   # whole-line comment
 *   advisor_articles  # A-03 backfill pending
 *
 * @param {string} body
 * @returns {Set<string>}
 */
export function parseAllowlist(body) {
  const allowed = new Set();
  for (const raw of body.split("\n")) {
    const stripped = raw.replace(/#.*$/, "").trim();
    if (!stripped) continue;
    if (!/^[a-z_][a-z0-9_]*$/.test(stripped)) continue;
    allowed.add(stripped);
  }
  return allowed;
}

/**
 * Diffs the types-declared tables against the union of (migration-created
 * tables) ∪ (allowlist).  Returns the names that are declared in types but
 * neither created by a migration nor allow-listed.
 *
 * @param {string[]} typesTables
 * @param {string[]} migrationTables
 * @param {Set<string>} allowed
 * @returns {string[]}
 */
export function computeDrift(typesTables, migrationTables, allowed) {
  const migSet = new Set(migrationTables);
  return typesTables.filter((t) => !migSet.has(t) && !allowed.has(t));
}

/**
 * Returns allowlist entries that no longer correspond to a real drift.  These
 * are stale lines that should be removed from the file once Stream A finishes
 * the corresponding backfill.  We surface them as a warning (non-fatal) so
 * the allowlist shrinks in lockstep with remediation.
 *
 * @param {Set<string>} allowed
 * @param {string[]} typesTables
 * @param {string[]} migrationTables
 * @returns {string[]}
 */
export function findStaleAllowlistEntries(allowed, typesTables, migrationTables) {
  const typesSet = new Set(typesTables);
  const migSet = new Set(migrationTables);
  const stale = [];
  for (const name of allowed) {
    // Allowlist entry is stale if either:
    //   (a) the table no longer exists in types (likely retired), OR
    //   (b) the table now has a migration (drift cleared).
    if (!typesSet.has(name) || migSet.has(name)) {
      stale.push(name);
    }
  }
  return stale.sort();
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  const cwd = process.cwd();
  const typesPath = path.join(cwd, TYPES_FILE);
  const migrationsPath = path.join(cwd, MIGRATIONS_DIR);
  const allowlistPath = path.join(cwd, ALLOWLIST_FILE);

  let typesSource;
  try {
    typesSource = await fs.readFile(typesPath, "utf8");
  } catch (err) {
    console.error(`::error::Cannot read ${TYPES_FILE}: ${/** @type {Error} */ (err).message}`);
    process.exit(1);
  }

  const typesTables = extractTypesTables(typesSource);
  if (typesTables.length === 0) {
    console.error(
      `::error::No tables extracted from ${TYPES_FILE} — the parser may be out of sync with the file format.`
    );
    process.exit(1);
  }

  /** @type {string[]} */
  let migrationFiles;
  try {
    const entries = await fs.readdir(migrationsPath);
    migrationFiles = entries.filter((f) => f.endsWith(".sql")).sort();
  } catch (err) {
    console.error(
      `::error::Cannot read ${MIGRATIONS_DIR}: ${/** @type {Error} */ (err).message}`
    );
    process.exit(1);
  }

  const migrationTables = new Set();
  for (const file of migrationFiles) {
    const sql = await fs.readFile(path.join(migrationsPath, file), "utf8");
    for (const t of extractMigrationTables(sql)) {
      migrationTables.add(t);
    }
  }

  let allowed = new Set();
  try {
    const body = await fs.readFile(allowlistPath, "utf8");
    allowed = parseAllowlist(body);
  } catch {
    // No allowlist file is fine — clean state.
  }

  const drift = computeDrift(typesTables, [...migrationTables], allowed);
  const stale = findStaleAllowlistEntries(allowed, typesTables, [...migrationTables]);

  console.log(
    `Database types drift gate — ${typesTables.length} tables in types, ` +
      `${migrationTables.size} tables in migrations, ${allowed.size} allow-listed.`
  );

  if (stale.length > 0) {
    console.warn(
      `::warning::${stale.length} allowlist entry(ies) appear stale (table is no longer drifted):`
    );
    for (const name of stale) {
      console.warn(`  - ${name}`);
    }
    console.warn(`  → Remove from ${ALLOWLIST_FILE} to keep the allowlist honest.\n`);
  }

  if (drift.length === 0) {
    console.log("Database types drift gate passed — no drifted tables.");
    process.exit(0);
  }

  console.error(
    `\n::error::Database types drift gate failed — ${drift.length} table(s) declared in ${TYPES_FILE} have no CREATE TABLE in ${MIGRATIONS_DIR}/:\n`
  );
  for (const name of drift) {
    console.error(`  ✗  ${name}`);
  }
  console.error(
    `\nFix options:\n` +
      `  1. Add a forward-only migration that creates the table.  Mirror the\n` +
      `     prod schema; include RLS policies (the rls-migrations gate will\n` +
      `     check).  Example file: supabase/migrations/<YYYYMMDD>_${drift[0]}.sql\n` +
      `  2. If the table is genuinely retired, remove it from\n` +
      `     ${TYPES_FILE} (regenerate via \`npm run db:types\`).\n` +
      `  3. If the drift is tolerated transitionally (e.g. waiting on a\n` +
      `     Stream A iteration), add the table to ${ALLOWLIST_FILE} with a\n` +
      `     justification comment.\n\n` +
      `Background: docs/audits/drift-list.md classifies all known drift and\n` +
      `tracks the Stream A backfill plan (A-02 .. A-14).\n`
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-database-types-drift: unexpected error:", err);
    process.exit(1);
  });
}
