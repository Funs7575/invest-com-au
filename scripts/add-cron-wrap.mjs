#!/usr/bin/env node
/**
 * Programmatically wraps all cron route handlers that don't yet use
 * wrapCronHandler / withCronRunLog with wrapCronHandler from lib/cron-run-log.ts.
 *
 * Transform:
 *   export async function GET(req: NextRequest | Request) { ... }
 *   →
 *   async function handler(req: NextRequest): Promise<NextResponse> { ... }
 *   export const GET = wrapCronHandler("cron-name", handler);
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";

const CRON_DIR = "app/api/cron";
const dirs = readdirSync(CRON_DIR).filter(d =>
  statSync(join(CRON_DIR, d)).isDirectory()
);

let transformed = 0;
let skipped = 0;
const errors = [];

for (const cronName of dirs) {
  const routePath = join(CRON_DIR, cronName, "route.ts");
  let src;
  try {
    src = readFileSync(routePath, "utf8");
  } catch {
    continue; // no route.ts
  }

  if (src.includes("wrapCronHandler") || src.includes("withCronRunLog")) {
    skipped++;
    continue;
  }

  let out = src;

  // 1. Ensure NextRequest is imported from "next/server"
  // Pattern: import { ..., NextResponse } from "next/server"  (no NextRequest)
  if (!out.includes("NextRequest")) {
    // Try to add NextRequest to existing next/server import
    out = out.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']next\/server["']/,
      (match, inner) => {
        const imports = inner.split(",").map(s => s.trim()).filter(Boolean);
        if (!imports.includes("NextRequest")) imports.unshift("NextRequest");
        return `import { ${imports.join(", ")} } from "next/server"`;
      }
    );

    // If still no NextRequest (e.g., only NextResponse imported inline), force it
    if (!out.includes("NextRequest")) {
      out = `import { NextRequest } from "next/server";\n` + out;
    }
  }

  // 2. Add wrapCronHandler import from @/lib/cron-run-log
  // Insert after the last existing import from @/lib/cron-run-log, or after
  // the requireCronAuth import, or after the last import block.
  if (out.includes(`from "@/lib/cron-run-log"`)) {
    // already imported something from cron-run-log — add wrapCronHandler
    out = out.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/cron-run-log["']/,
      (match, inner) => {
        const imports = inner.split(",").map(s => s.trim()).filter(Boolean);
        if (!imports.includes("wrapCronHandler")) imports.push("wrapCronHandler");
        return `import { ${imports.join(", ")} } from "@/lib/cron-run-log"`;
      }
    );
  } else {
    // Find the last import line and insert after it
    const importRegex = /^import\s.+$/m;
    const lines = out.split("\n");
    let lastImportIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i] ?? "";
      if (/^import\s/.test(line) || /^\s+["'][^'"]+["']$/.test(line) || /^\}\s*from\s/.test(line)) {
        lastImportIdx = i;
        break;
      }
    }

    // Walk down to find the end of the last import statement (multi-line)
    if (lastImportIdx >= 0) {
      // Find the line with `from "..."` at or after lastImportIdx
      let insertAfter = lastImportIdx;
      // Walk forward from lastImportIdx to find the `from "..."` closer
      for (let i = lastImportIdx; i < Math.min(lastImportIdx + 10, lines.length); i++) {
        const l = lines[i] ?? "";
        if (/from\s+["']/.test(l)) {
          insertAfter = i;
        }
        if (i > lastImportIdx && /^(export|const|let|var|function|async|\/\*|\/\/)/.test(l)) break;
      }
      lines.splice(insertAfter + 1, 0, `import { wrapCronHandler } from "@/lib/cron-run-log";`);
      out = lines.join("\n");
    } else {
      // Fallback: prepend
      out = `import { wrapCronHandler } from "@/lib/cron-run-log";\n` + out;
    }
  }

  // 3. Change `export async function GET(req: ...) {` to `async function handler(req: NextRequest): Promise<NextResponse> {`
  //    and add `export const GET = wrapCronHandler(...)` at end.

  // Match export async function GET with any parameter name and optional type/return annotation
  // Groups: (paramName, paramType)
  const getPattern = /export\s+async\s+function\s+GET\s*\(\s*(\w+)\s*(?::\s*(?:NextRequest|Request))?\s*\)(?:\s*:\s*Promise<NextResponse>)?/;

  const m = getPattern.exec(out);
  if (m) {
    const paramName = m[1] ?? "req";
    // Replace the whole matched export signature
    out = out.replace(
      getPattern,
      "async function handler(req: NextRequest): Promise<NextResponse>"
    );
    // If the param was named something other than req, rename all occurrences
    // inside the function body. Simple heuristic: replace `paramName.` with `req.`
    // and standalone `paramName` usages.
    if (paramName !== "req") {
      // Replace `request.` → `req.` and `request)` → `req)` etc.
      out = out.replace(new RegExp(`\\b${paramName}\\b`, "g"), "req");
    }
  } else {
    errors.push({ cronName, reason: "Could not match GET export pattern" });
    continue;
  }

  // 4. Append export const GET at end
  out = out.trimEnd() + `\n\nexport const GET = wrapCronHandler("${cronName}", handler);\n`;

  writeFileSync(routePath, out, "utf8");
  transformed++;
}

console.log(`Transformed: ${transformed}, Skipped (already wrapped): ${skipped}`);
if (errors.length > 0) {
  console.log("Errors:", JSON.stringify(errors, null, 2));
}
