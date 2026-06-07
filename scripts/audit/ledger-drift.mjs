#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Migration-ledger drift audit.
 *
 * Quantifies the divergence between the local migration tree
 * (`supabase/migrations/*.sql`, by CLI-parsed version) and the production
 * `supabase_migrations.schema_migrations` ledger. This is the *history* drift
 * that the table-level gates (check-database-types-drift / schema-references)
 * cannot see: prod was built by hundreds of out-of-band `apply_migration`
 * calls with regenerated timestamps, so the local versions and the prod ledger
 * are almost completely disjoint and `supabase db push` can no longer be run.
 *
 * The prod ledger is NOT exposed via PostgREST (it lives in the
 * `supabase_migrations` schema, not `public`), so this tool reads a dump rather
 * than hitting the network. Produce one during reconciliation with:
 *
 *   -- as service-role SQL (Supabase MCP execute_sql or psql):
 *   SELECT json_agg(json_build_object('version', version, 'name', name)
 *                   ORDER BY version)
 *   FROM supabase_migrations.schema_migrations;
 *
 * and save it to a file, then:
 *
 *   SUPABASE_MIGRATIONS_JSON=path/to/ledger.json npm run audit:ledger-drift
 *   node scripts/audit/ledger-drift.mjs --ledger path/to/ledger.json --json
 *
 * Exit code is always 0 — this is an audit/observability tool, not a CI gate.
 * Its purpose during reconciliation is to prove the job is done: after the
 * baseline-squash + `migration repair`, `local_only` and `ledger_only` should
 * both collapse to ~0.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";

// ---------------------------------------------------------------------------
// Core logic — exported for unit tests (pure, no I/O)
// ---------------------------------------------------------------------------

/**
 * CLI-parsed version (leading digits before first `_`) from a filename.
 * @param {string} filename
 * @returns {string}
 */
export function versionOf(filename) {
  const base = filename.replace(/^.*\//, "").replace(/\.sql$/i, "");
  const m = /^(\d+)/.exec(base);
  return m ? m[1] : "";
}

/**
 * Parse a ledger dump into the set of versions. Accepts either the raw
 * `json_agg` array (`[{version,name}, …]`), or `{ ledger: [...] }`, or a plain
 * array of version strings.
 *
 * @param {unknown} doc
 * @returns {Set<string>}
 */
export function parseLedger(doc) {
  const arr = Array.isArray(doc)
    ? doc
    : doc && typeof doc === "object" && Array.isArray(/** @type {any} */ (doc).ledger)
      ? /** @type {any} */ (doc).ledger
      : [];
  const versions = new Set();
  for (const row of arr) {
    if (typeof row === "string") versions.add(row);
    else if (row && typeof row === "object" && typeof row.version === "string") versions.add(row.version);
  }
  return versions;
}

/**
 * Compute the two-way set difference between local file versions and the prod
 * ledger versions.
 *
 * @param {string[]} localVersions   distinct CLI versions from the tree
 * @param {Set<string>} ledgerVersions
 */
export function computeLedgerDrift(localVersions, ledgerVersions) {
  const local = new Set(localVersions);
  const both = [];
  const localOnly = [];
  for (const v of local) {
    if (ledgerVersions.has(v)) both.push(v);
    else localOnly.push(v);
  }
  const ledgerOnly = [];
  for (const v of ledgerVersions) {
    if (!local.has(v)) ledgerOnly.push(v);
  }
  return {
    localDistinct: local.size,
    ledgerDistinct: ledgerVersions.size,
    both: both.sort(),
    localOnly: localOnly.sort(), // a `db push` would attempt these
    ledgerOnly: ledgerOnly.sort(), // applied out-of-band; no local file
  };
}

/**
 * Count files-per-version to surface collisions (multiple files → one version).
 * @param {string[]} basenames
 * @returns {Map<string, string[]>}
 */
export function versionToFiles(basenames) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  for (const name of basenames) {
    const v = versionOf(name);
    const list = map.get(v) ?? [];
    list.push(name);
    map.set(v, list);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function readLedger() {
  const argIdx = process.argv.indexOf("--ledger");
  const fromArg = argIdx >= 0 ? process.argv[argIdx + 1] : undefined;
  const file = fromArg || process.env.SUPABASE_MIGRATIONS_JSON;
  if (!file) return null;
  const doc = JSON.parse(await fs.readFile(file, "utf8"));
  return parseLedger(doc);
}

async function main() {
  const asJson = process.argv.includes("--json");

  let basenames;
  try {
    const entries = await fs.readdir(path.join(process.cwd(), MIGRATIONS_DIR));
    basenames = entries.filter((f) => f.endsWith(".sql"));
  } catch (err) {
    console.error(`[ledger-drift] cannot read ${MIGRATIONS_DIR}: ${/** @type {Error} */ (err).message}`);
    process.exit(0);
  }

  const v2f = versionToFiles(basenames);
  const collisions = [...v2f.entries()].filter(([, files]) => files.length > 1);
  const localVersions = [...v2f.keys()].filter(Boolean);

  const ledger = await readLedger();
  if (!ledger) {
    console.log(
      `[ledger-drift] no ledger dump supplied — skipping divergence diff.\n` +
        `  Local tree: ${basenames.length} files, ${localVersions.length} distinct versions, ` +
        `${collisions.length} colliding version(s).\n` +
        `  To diff against prod, pass --ledger <file> or set SUPABASE_MIGRATIONS_JSON ` +
        `(see the header of this script for the SQL to dump it).`,
    );
    process.exit(0);
  }

  const drift = computeLedgerDrift(localVersions, ledger);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          files: basenames.length,
          collisions: collisions.map(([v, files]) => ({ version: v, files })),
          ...drift,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.log(`# Migration-ledger drift audit\n`);
  console.log(`- Local migration files: **${basenames.length}**`);
  console.log(`- Distinct local versions: **${drift.localDistinct}**`);
  console.log(`- Colliding versions (>1 file → same version): **${collisions.length}**`);
  console.log(`- Prod ledger rows: **${drift.ledgerDistinct}**`);
  console.log(`- Local ∩ ledger (tracked): **${drift.both.length}**`);
  console.log(`- Local only (a \`db push\` would attempt these): **${drift.localOnly.length}**`);
  console.log(`- Ledger only (applied out-of-band, no local file): **${drift.ledgerOnly.length}**`);
  console.log("");
  if (drift.localOnly.length === 0 && drift.ledgerOnly.length === 0) {
    console.log("✅ Tree and ledger are fully reconciled.");
  } else {
    console.log(
      "⚠️  Tree and ledger have diverged — do NOT run `supabase db push`. " +
        "See docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md.",
    );
  }
  if (collisions.length > 0) {
    console.log(`\n## Colliding versions (first 20)\n`);
    for (const [v, files] of collisions.slice(0, 20)) {
      console.log(`- \`${v}\` → ${files.map((f) => `\`${f}\``).join(", ")}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("[ledger-drift] unexpected error:", err);
    process.exit(0);
  });
}
