// @ts-check
/**
 * Canonical migration-version parsing — shared by the filename gate
 * (`scripts/check-migration-filenames.mjs`) and the ledger-drift audit
 * (`scripts/audit/ledger-drift.mjs`) so the two can never drift apart.
 *
 * The Supabase CLI derives a migration's *version* (its primary key in
 * `supabase_migrations.schema_migrations`) from the **leading run of digits**
 * in the basename — everything up to the first non-digit. Only a full 14-digit
 * timestamp `YYYYMMDDHHMMSS` is a valid steady-state version; legacy 3-digit
 * (`001_*`), 8-digit date-only (`20260702_*`), zero-padded, or >14-digit forms
 * are non-conforming and flagged. Directory prefix and the `.sql` / `.up.sql` /
 * `.down.sql` suffix are ignored for version extraction.
 */

/**
 * @param {string} filename  e.g. "supabase/migrations/20260603120000_x.sql"
 * @returns {{ base: string, version: string, is14: boolean, hasDigits: boolean }}
 */
export function parseMigrationVersion(filename) {
  const base = String(filename)
    .replace(/^.*\//, "") // drop any directory prefix
    .replace(/\.sql$/i, "")
    .replace(/\.(up|down)$/i, ""); // tolerate split up/down migrations
  const m = /^(\d+)/.exec(base);
  const version = m ? m[1] : "";
  return {
    base,
    version,
    is14: /^\d{14}$/.test(version),
    hasDigits: version.length > 0,
  };
}

/**
 * Thin accessor: just the CLI-parsed version string ("" if none).
 * @param {string} filename
 * @returns {string}
 */
export function versionOf(filename) {
  return parseMigrationVersion(filename).version;
}
