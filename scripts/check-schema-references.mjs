#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import path from "node:path";
/**
 * Schema-reference sentinel — phantom-table / phantom-RPC gate.
 *
 * Fails if application code calls `.from("<table>")` or `.rpc("<fn>")` with a
 * string literal that does NOT exist in the LIVE database schema.
 *
 * Why this matters: a `.from("table_that_does_not_exist")` does not fail at
 * build or type-check time — PostgREST returns a runtime error and the route
 * 500s in production. That is exactly how the `versus_votes`/`weights`/
 * `booking_payments` outages happened: code shipped referencing relations that
 * weren't in the schema, and nothing caught it until the live endpoint threw.
 *
 * Source of truth = the LIVE schema, fetched from PostgREST's OpenAPI document
 * (`{SUPABASE_URL}/rest/v1/`). We deliberately do NOT use lib/database.types.ts
 * — in this repo it lags the live schema by hundreds of tables (the migration
 * drift backlog), so a types-based check is ~all false positives. The OpenAPI
 * doc enumerates every table/view (`definitions`) and RPC (`/rpc/*` paths)
 * actually exposed by the running database.
 *
 * Creds-gated: with no SUPABASE creds it SKIPS cleanly (exit 0) — same posture
 * as bots:idor / bots:data, so it never red-fails a fork/PR without secrets.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run audit:schema-refs
 *   SUPABASE_SCHEMA_JSON=path/to/openapi.json npm run audit:schema-refs   # offline
 *
 * Escape hatch — `.schemarefallowlist` at repo root, one entry per line:
 *   from:some_relation   # justification (runtime-created, other schema, …)
 *   rpc:some_fn          # justification
 * Bare names default to `from:`. Comments (`#`) and blanks ignored.
 *
 * Cost: $0 — one OpenAPI GET + static file scan, no LLM.
 * Exit: 0 clean / skipped · 1 a phantom reference · 2 setup error.
 */

const ALLOWLIST_FILE = ".schemarefallowlist";
const SCAN_DIRS = ["app", "lib", "components"];
const SCAN_EXT = new Set([".ts", ".tsx"]);
// Don't scan generated types, the audit scripts (they hold table names in
// strings/regex), or tests (mock builders, fixture strings).
const SKIP = [/^lib\/database\.types\.ts$/, /(^|\/)__tests__\//, /\.test\.[tj]sx?$/, /(^|\/)scripts\//];

// ---------------------------------------------------------------------------
// Core logic — exported for unit tests (pure, no I/O)
// ---------------------------------------------------------------------------

/**
 * Parse a PostgREST OpenAPI/Swagger document into the set of relation names
 * (tables + views, the valid `.from()` targets) and function names (valid
 * `.rpc()` targets). Handles Swagger 2 (`definitions`) and OpenAPI 3
 * (`components.schemas`); RPCs are the `/rpc/<fn>` paths.
 *
 * @param {any} doc  parsed OpenAPI JSON
 * @returns {{ relations: Set<string>, functions: Set<string> }}
 */
export function parseOpenApiSchema(doc) {
  const relations = new Set();
  const functions = new Set();
  const defs = doc?.definitions ?? doc?.components?.schemas ?? {};
  for (const name of Object.keys(defs)) {
    // PostgREST exposes a synthetic `(rpc args)` definition per function and a
    // root entry; only real relations are bare identifiers.
    if (/^[a-z_][a-z0-9_]*$/.test(name)) relations.add(name);
  }
  for (const p of Object.keys(doc?.paths ?? {})) {
    const m = /^\/rpc\/([a-z_][a-z0-9_]*)$/.exec(p);
    if (m) functions.add(m[1]);
  }
  return { relations, functions };
}

/**
 * Find `.from("x")` and `.rpc("x")` string-literal references in a source
 * string. Skips dynamic args (variables, template interpolation) and JS
 * builtins like `Array.from(...)` / `Buffer.from(...)` (PascalCase receiver).
 *
 * @param {string} code
 * @returns {{ kind: "from"|"rpc", name: string, line: number }[]}
 */
export function findSchemaRefs(code) {
  /** @type {{ kind: "from"|"rpc", name: string, line: number }[]} */
  const refs = [];
  const re = /([A-Za-z_$][\w$]*)?\s*\.(from|rpc)\(\s*(["'`])((?:public\.)?[a-z_][a-z0-9_]*)\3\s*\)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const receiver = m[1];
    if (receiver && /^[A-Z]/.test(receiver)) continue; // Array.from / Buffer.from
    const kind = /** @type {"from"|"rpc"} */ (m[2]);
    const name = m[4].replace(/^public\./, "");
    if (name === "public") continue; // `.from("public")` is never a relation
    const line = code.slice(0, m.index).split("\n").length;
    refs.push({ kind, name, line });
  }
  return refs;
}

/**
 * @param {string} text
 * @returns {Set<string>} keys like `from:name` / `rpc:name`
 */
export function parseAllowlist(text) {
  const out = new Set();
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    out.add(/^(from|rpc):/.test(line) ? line : `from:${line}`);
  }
  return out;
}

/**
 * @param {{ kind: "from"|"rpc", name: string }} ref
 * @param {{ relations: Set<string>, functions: Set<string> }} schema
 */
export function isKnown(ref, schema) {
  return ref.kind === "from" ? schema.relations.has(ref.name) : schema.functions.has(ref.name);
}

// ---------------------------------------------------------------------------
// Schema acquisition + file walking
// ---------------------------------------------------------------------------

async function loadLiveSchema() {
  // Offline path for local verification / tests.
  if (process.env.SUPABASE_SCHEMA_JSON) {
    const doc = JSON.parse(await fs.readFile(process.env.SUPABASE_SCHEMA_JSON, "utf8"));
    return parseOpenApiSchema(doc);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null; // creds-gated skip
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenAPI fetch ${res.status} ${res.statusText}`);
  return parseOpenApiSchema(await res.json());
}

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      out.push(...(await walk(full)));
    } else if (SCAN_EXT.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const root = process.cwd();

  let schema;
  try { schema = await loadLiveSchema(); }
  catch (e) { console.error("[schema-refs] could not load live schema:", e instanceof Error ? e.message : e); process.exit(2); }
  if (!schema) {
    console.log("[schema-refs] no SUPABASE creds — skipping (set NEXT_PUBLIC_SUPABASE_URL + a key to enable).");
    process.exit(0);
  }
  if (schema.relations.size === 0) {
    console.error("[schema-refs] live schema returned 0 relations — refusing to run (would false-flag everything).");
    process.exit(2);
  }

  let allowlist = new Set();
  try { allowlist = parseAllowlist(await fs.readFile(path.join(root, ALLOWLIST_FILE), "utf8")); }
  catch { /* optional */ }

  const files = (await Promise.all(SCAN_DIRS.map((d) => walk(d)))).flat();
  /** @type {{ file: string, line: number, kind: string, name: string }[]} */
  const violations = [];
  let scanned = 0, refCount = 0;
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (SKIP.some((re) => re.test(rel))) continue;
    scanned++;
    const code = await fs.readFile(file, "utf8");
    for (const ref of findSchemaRefs(code)) {
      refCount++;
      if (isKnown(ref, schema)) continue;
      if (allowlist.has(`${ref.kind}:${ref.name}`)) continue;
      violations.push({ file: rel, line: ref.line, kind: ref.kind, name: ref.name });
    }
  }

  if (violations.length === 0) {
    console.log(`[schema-refs] ✅ ${refCount} references across ${scanned} files all resolve against the live schema (${schema.relations.size} relations, ${schema.functions.size} functions, ${allowlist.size} allowlisted).`);
    process.exit(0);
  }

  console.error(`[schema-refs] 🔴 ${violations.length} reference(s) to relations/functions absent from the LIVE schema:\n`);
  for (const v of violations) console.error(`  ${v.file}:${v.line}  .${v.kind}("${v.name}")  — not in live schema`);
  console.error(`\nFix: correct the name / ship the migration, or allowlist in \`${ALLOWLIST_FILE}\` with a reason.`);
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error("[schema-refs] fatal:", err); process.exit(2); });
}
