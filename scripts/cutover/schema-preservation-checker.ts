/**
 * schema-preservation-checker.ts — CO stream cutover script.
 *
 * Scans the entire codebase for:
 *
 * 1. Hardcoded old-domain strings in TypeScript/TSX files:
 *    - "vercel.app" or "invest-com-au" in any TS/TSX source file
 *    - These should use lib/seo.ts helpers (SITE_URL, absoluteUrl)
 *
 * 2. Hardcoded domains in JSON-LD (dangerouslySetInnerHTML blocks):
 *    - Any `invest-com-au.vercel.app` string in rendered JSON-LD
 *
 * 3. absoluteUrl / SITE_URL usage that correctly uses the helpers
 *    (counts for the positive signal in the report)
 *
 * Outputs a report to scripts/cutover/output/schema-preservation-report.json
 * and prints a human-readable summary.
 *
 * Usage:
 *   npx tsx scripts/cutover/schema-preservation-checker.ts
 *   # Scan a specific directory:
 *   npx tsx scripts/cutover/schema-preservation-checker.ts ./app
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  file: string;
  line: number;
  content: string;
  kind: "hardcoded_old_domain" | "hardcoded_domain_in_jsonld" | "missing_seo_helper";
  severity: "error" | "warning";
}

interface UsageStats {
  absoluteUrlUsages: number;
  siteUrlUsages: number;
  filesWithHardcodedDomains: string[];
  filesWithJsonLdIssues: string[];
}

interface SchemaPreservationReport {
  generatedAt: string;
  scannedDir: string;
  totalFilesScanned: number;
  findings: Finding[];
  stats: UsageStats;
  summary: {
    errors: number;
    warnings: number;
    filesAffected: number;
    passRate: string;
  };
}

// ── Patterns ──────────────────────────────────────────────────────────────────

// Old domain patterns to flag
const OLD_DOMAIN_PATTERNS = [
  /invest-com-au\.vercel\.app/,
  /invest-com-au\.vercel\.com/,
];

// JSON-LD context strings that would expose the old domain
const JSONLD_OLD_DOMAIN_PATTERNS = [
  /["']https?:\/\/invest-com-au\.vercel\.app/,
  /"@id":\s*["']https?:\/\/invest-com-au/,
];

// SEO helper patterns (positive usage)
const SEO_HELPER_PATTERNS = [
  /absoluteUrl\s*\(/,
  /SITE_URL/,
  /breadcrumbJsonLd\s*\(/,
  /from\s+["']@\/lib\/seo["']/,
];

// Files/dirs to skip
const SKIP_PATHS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "out",
  ".turbo",
  "coverage",
  "scripts/cutover/output",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  return parts.some((p) => SKIP_PATHS.has(p));
}

async function scanFile(
  filePath: string,
  stats: UsageStats,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split("\n");

  let hasOldDomain = false;
  let hasJsonLdIssue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;

    // Check for old domain hardcodes
    for (const pat of OLD_DOMAIN_PATTERNS) {
      if (pat.test(line)) {
        // Skip if it's inside a comment
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          continue;
        }
        findings.push({
          file: filePath,
          line: lineNo,
          content: line.trim().slice(0, 120),
          kind: "hardcoded_old_domain",
          severity: "error",
        });
        hasOldDomain = true;
      }
    }

    // Check for old domain in JSON-LD context (dangerouslySetInnerHTML)
    if (
      line.includes("dangerouslySetInnerHTML") ||
      line.includes("application/ld+json")
    ) {
      for (const pat of JSONLD_OLD_DOMAIN_PATTERNS) {
        if (pat.test(line)) {
          findings.push({
            file: filePath,
            line: lineNo,
            content: line.trim().slice(0, 120),
            kind: "hardcoded_domain_in_jsonld",
            severity: "error",
          });
          hasJsonLdIssue = true;
        }
      }
    }
  }

  // Count positive SEO helper usages
  for (const pat of SEO_HELPER_PATTERNS) {
    if (pat.test(content)) {
      if (pat === SEO_HELPER_PATTERNS[0]) stats.absoluteUrlUsages++;
      if (pat === SEO_HELPER_PATTERNS[1]) stats.siteUrlUsages++;
    }
  }

  if (hasOldDomain) stats.filesWithHardcodedDomains.push(filePath);
  if (hasJsonLdIssue) stats.filesWithJsonLdIssues.push(filePath);

  return findings;
}

async function walkDir(
  dir: string,
  stats: UsageStats,
  findings: Finding[],
): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkip(fullPath) || shouldSkip(entry.name)) continue;

    if (entry.isDirectory()) {
      count += await walkDir(fullPath, stats, findings);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      const newFindings = await scanFile(fullPath, stats);
      findings.push(...newFindings);
      count++;
    }
  }

  return count;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runSchemaPreservationCheck(
  rootDir: string,
): Promise<SchemaPreservationReport> {
  const findings: Finding[] = [];
  const stats: UsageStats = {
    absoluteUrlUsages: 0,
    siteUrlUsages: 0,
    filesWithHardcodedDomains: [],
    filesWithJsonLdIssues: [],
  };

  const totalFilesScanned = await walkDir(rootDir, stats, findings);

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const filesAffected = new Set(findings.map((f) => f.file)).size;

  const passRate =
    totalFilesScanned > 0
      ? `${(((totalFilesScanned - filesAffected) / totalFilesScanned) * 100).toFixed(1)}%`
      : "100%";

  return {
    generatedAt: new Date().toISOString(),
    scannedDir: rootDir,
    totalFilesScanned,
    findings,
    stats,
    summary: {
      errors,
      warnings,
      filesAffected,
      passRate,
    },
  };
}

async function main() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const projectRoot = path.resolve(scriptDir, "../..");

  const scanDirArg = process.argv[2];
  const scanDir = scanDirArg
    ? path.resolve(scanDirArg)
    : projectRoot;

  process.stdout.write(`Scanning: ${scanDir}\n`);
  process.stdout.write(
    "Looking for hardcoded old-domain strings (invest-com-au.vercel.app)…\n\n",
  );

  const report = await runSchemaPreservationCheck(scanDir);

  const outputDir = path.join(scriptDir, "output");
  await fs.mkdir(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "schema-preservation-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(`Report written to: ${reportPath}\n\n`);

  process.stdout.write("── Results ──────────────────────────────────────\n");
  process.stdout.write(`Files scanned:     ${report.totalFilesScanned}\n`);
  process.stdout.write(`Files affected:    ${report.summary.filesAffected}\n`);
  process.stdout.write(`Pass rate:         ${report.summary.passRate}\n`);
  process.stdout.write(`Errors:            ${report.summary.errors}\n`);
  process.stdout.write(`Warnings:          ${report.summary.warnings}\n`);
  process.stdout.write(
    `\nPositive signals:\n` +
      `  absoluteUrl() usages: ${report.stats.absoluteUrlUsages}\n` +
      `  SITE_URL usages:      ${report.stats.siteUrlUsages}\n`,
  );

  if (report.findings.length > 0) {
    process.stdout.write("\n── Findings requiring remediation ───────────────\n");
    for (const f of report.findings) {
      process.stdout.write(
        `[${f.severity.toUpperCase()}] ${f.file}:${f.line}\n` +
          `  Kind: ${f.kind}\n` +
          `  Line: ${f.content}\n\n`,
      );
    }
    process.exit(1);
  } else {
    process.stdout.write("\nAll clear — no hardcoded old-domain strings found.\n");
  }
}

// Only run main() when executed directly (not when imported by tests).
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url.includes(process.argv[1].replace(/^\//, ""));

if (isMain) {
  main().catch((err: unknown) => {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
