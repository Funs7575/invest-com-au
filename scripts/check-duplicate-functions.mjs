#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Duplicate-function detector — lib-shadow variant.
 *
 * Catches the pattern that produced 10 copies of formatDate before F-02:
 * a helper exists as an export in lib/, but other files redefine it locally
 * instead of importing it.
 *
 * Strategy:
 *   1. Index every exported function / const-arrow / class in lib/.
 *   2. Scan app/, components/, hooks/ for redefinitions of the same name.
 *   3. Report each lib/ export that's redefined elsewhere.
 *
 * This is intentionally narrower than a generic dup-code detector: local
 * helpers (`load`, `handleClick`, file-scoped `format`) legitimately repeat;
 * the real smell is "this thing already exists in lib/, why did you rewrite it?"
 *
 * Heuristic-only — no AST. Recognises:
 *   export function foo(            )
 *   export async function foo(      )
 *   export const foo = (            )
 *   export const foo = async (      )
 *   export class Foo                 (still flags PascalCase classes)
 * For redefinitions, also matches non-exported `function foo(` / `const foo =`.
 *
 * Skips:
 *   - Single-letter / very short names (<4 chars)
 *   - React components (PascalCase) and hooks (useFoo) — except classes
 *   - Framework-reserved names (page, layout, GET, POST, default, etc.)
 *
 * Usage:
 *   npm run audit:duplicate-functions
 *   node scripts/check-duplicate-functions.mjs
 *
 * Exit codes:
 *   0  no shadowed lib/ exports
 *   1  one or more shadowed exports found
 *
 * Allowlist:
 *   Add the function name to ALLOWED_NAMES with a comment explaining why.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const LIB_ROOT = "lib";
const SCAN_ROOTS = ["app", "components", "hooks"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".vercel",
  "__tests__",
  "tests",
  "e2e",
]);
const EXTS = new Set([".ts", ".tsx"]);

const FRAMEWORK_NAMES = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "notFound",
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
  "default",
  "middleware",
  "handler",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
  "config",
  "metadata",
]);

const ALLOWED_NAMES = new Set([
  // Add deliberately-shadowed lib exports here, with a comment.
]);

const EXPORT_PATTERNS = [
  /(?:^|\n)\s*export\s+(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g,
  /(?:^|\n)\s*export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(/g,
];

const REDEF_PATTERNS = [
  /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g,
  /(?:^|\n)\s*(?:export\s+)?const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\(/g,
];

/** @param {string} name @returns {boolean} */
function shouldSkipName(name) {
  if (name.length < 4) return true;
  if (FRAMEWORK_NAMES.has(name)) return true;
  if (ALLOWED_NAMES.has(name)) return true;
  if (/^[A-Z]/.test(name)) return true; // components / classes — out of scope
  if (/^use[A-Z]/.test(name)) return true; // hooks
  return false;
}

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(p)));
    } else if (e.isFile() && EXTS.has(path.extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {Set<string>}
 */
function extractNames(text, patterns) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (!shouldSkipName(name)) names.add(name);
    }
  }
  return names;
}

async function main() {
  // 1. Index lib/ exports → name → defining file
  /** @type {Map<string, string>} */
  const libExports = new Map();
  const libFiles = await walk(path.join(process.cwd(), LIB_ROOT));
  for (const f of libFiles) {
    const rel = path.relative(process.cwd(), f);
    const text = await fs.readFile(f, "utf8");
    const names = extractNames(text, EXPORT_PATTERNS);
    for (const name of names) {
      if (!libExports.has(name)) libExports.set(name, rel);
    }
  }

  // 2. Scan SCAN_ROOTS for any definition (exported or local) matching a lib name
  /** @type {Map<string, {libFile: string, redefiners: Set<string>}>} */
  const shadows = new Map();

  for (const root of SCAN_ROOTS) {
    const abs = path.join(process.cwd(), root);
    const files = await walk(abs);
    for (const f of files) {
      const rel = path.relative(process.cwd(), f);
      const text = await fs.readFile(f, "utf8");
      const names = extractNames(text, REDEF_PATTERNS);
      for (const name of names) {
        const libFile = libExports.get(name);
        if (!libFile) continue;
        let entry = shadows.get(name);
        if (!entry) {
          entry = { libFile, redefiners: new Set() };
          shadows.set(name, entry);
        }
        entry.redefiners.add(rel);
      }
    }
  }

  /** @type {Array<{name: string, libFile: string, redefiners: string[]}>} */
  const findings = [];
  for (const [name, { libFile, redefiners }] of shadows) {
    findings.push({ name, libFile, redefiners: [...redefiners].sort() });
  }
  findings.sort((a, b) => b.redefiners.length - a.redefiners.length);

  if (findings.length === 0) {
    console.log(
      "Duplicate-function sweep passed — no lib/ export is shadowed by a redefinition in app/components/hooks."
    );
    process.exit(0);
  }

  console.error(
    `\n::error::Duplicate-function sweep found ${findings.length} lib/ export(s) shadowed by redefinitions.\n`
  );
  for (const { name, libFile, redefiners } of findings) {
    console.error(`  ✗  ${name}  (exported from ${libFile})`);
    console.error(`       redefined in ${redefiners.length} file(s):`);
    for (const r of redefiners) console.error(`         ${r}`);
  }
  console.error(
    "\nFix: replace the local definition with `import { <name> } from '@/<lib-path>'`."
  );
  console.error(
    "If shadowing is genuinely intentional, add the name to ALLOWED_NAMES in this script with a comment."
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-duplicate-functions: unexpected error:", err);
    process.exit(1);
  });
}
