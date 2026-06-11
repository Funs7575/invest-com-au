/**
 * Cutover fingerprint diff — compares two fingerprint files produced by
 * scripts/cutover/fingerprint.ts and reports SEO-affecting drift.
 *
 * Part of the cutover-guardian suite (see docs/cutover/README.md). URLs are
 * keyed by path (pathname + search), so a baseline taken on the old host
 * diffs cleanly against a run on the new apex host.
 *
 * Hard failures (exit 1):
 *   - orphans: URLs present in the old run but missing from the new one
 *   - status regressions: previously <400 (incl. 200), now ≥400 / network error
 *   - canonical host drift: <link rel=canonical> moved to a different host
 *
 * Reported as warnings (do not change the exit code, by design — review them):
 *   - JSON-LD disappearance, noindex appearance, canonical lost,
 *     canonical path changes, other status changes, title changes
 *
 * Usage:
 *   npx tsx scripts/cutover/diff-fingerprints.ts <old.json> <new.json>
 *
 * Exit codes:
 *   0 — no orphans / status regressions / canonical drift
 *   1 — at least one hard failure found
 *   2 — usage / IO error
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { FingerprintFile, UrlFingerprint } from "./fingerprint";

// ── Diff computation ──────────────────────────────────────────────────────────

interface StatusChange {
  path: string;
  before: UrlFingerprint["finalStatus"];
  after: UrlFingerprint["finalStatus"];
}

interface CanonicalDrift {
  path: string;
  before: string;
  after: string;
}

export interface FingerprintDiff {
  orphans: string[];
  added: string[];
  statusRegressions: StatusChange[];
  otherStatusChanges: StatusChange[];
  canonicalHostDrift: CanonicalDrift[];
  canonicalPathChanges: CanonicalDrift[];
  canonicalLost: string[];
  jsonLdLost: string[];
  noindexAppeared: string[];
  titleChanges: Array<{ path: string; before: string | null; after: string | null }>;
}

function isHealthy(status: UrlFingerprint["finalStatus"]): boolean {
  return typeof status === "number" && status < 400;
}

function isBroken(status: UrlFingerprint["finalStatus"]): boolean {
  return typeof status !== "number" || status >= 400;
}

export function computeFingerprintDiff(
  oldFile: FingerprintFile,
  newFile: FingerprintFile,
): FingerprintDiff {
  const oldByPath = new Map(oldFile.fingerprints.map((f) => [f.path, f]));
  const newByPath = new Map(newFile.fingerprints.map((f) => [f.path, f]));

  const diff: FingerprintDiff = {
    orphans: [],
    added: [],
    statusRegressions: [],
    otherStatusChanges: [],
    canonicalHostDrift: [],
    canonicalPathChanges: [],
    canonicalLost: [],
    jsonLdLost: [],
    noindexAppeared: [],
    titleChanges: [],
  };

  for (const [p, oldFp] of oldByPath) {
    const newFp = newByPath.get(p);
    if (!newFp) {
      diff.orphans.push(p);
      continue;
    }

    if (oldFp.finalStatus !== newFp.finalStatus) {
      const change: StatusChange = {
        path: p,
        before: oldFp.finalStatus,
        after: newFp.finalStatus,
      };
      if (isHealthy(oldFp.finalStatus) && isBroken(newFp.finalStatus)) {
        diff.statusRegressions.push(change);
      } else {
        diff.otherStatusChanges.push(change);
      }
    }

    if (oldFp.canonicalHost && newFp.canonicalHost) {
      if (oldFp.canonicalHost !== newFp.canonicalHost) {
        diff.canonicalHostDrift.push({
          path: p,
          before: oldFp.canonicalHost,
          after: newFp.canonicalHost,
        });
      } else if (
        oldFp.canonical &&
        newFp.canonical &&
        oldFp.canonical !== newFp.canonical
      ) {
        diff.canonicalPathChanges.push({
          path: p,
          before: oldFp.canonical,
          after: newFp.canonical,
        });
      }
    } else if (oldFp.canonical && !newFp.canonical) {
      diff.canonicalLost.push(p);
    }

    if (oldFp.jsonLdValid && !newFp.jsonLdValid) diff.jsonLdLost.push(p);
    if (!oldFp.noindex && newFp.noindex) diff.noindexAppeared.push(p);

    if (
      oldFp.titleHash &&
      newFp.titleHash &&
      oldFp.titleHash !== newFp.titleHash
    ) {
      diff.titleChanges.push({ path: p, before: oldFp.title, after: newFp.title });
    }
  }

  for (const p of newByPath.keys()) {
    if (!oldByPath.has(p)) diff.added.push(p);
  }

  for (const list of [diff.orphans, diff.added, diff.canonicalLost, diff.jsonLdLost, diff.noindexAppeared]) {
    list.sort();
  }
  return diff;
}

// ── Report rendering ──────────────────────────────────────────────────────────

const LIST_CAP = 25;

function printList(items: string[]): void {
  for (const item of items.slice(0, LIST_CAP)) console.log(`    ${item}`);
  if (items.length > LIST_CAP) console.log(`    … and ${items.length - LIST_CAP} more`);
}

function printChanges(items: StatusChange[] | CanonicalDrift[]): void {
  for (const c of items.slice(0, LIST_CAP)) {
    console.log(`    ${c.path}  ${String(c.before)} → ${String(c.after)}`);
  }
  if (items.length > LIST_CAP) console.log(`    … and ${items.length - LIST_CAP} more`);
}

function describeRun(label: string, filePath: string, file: FingerprintFile): void {
  const m = file.meta;
  console.log(
    `  ${label} : ${path.basename(filePath)} — ${m.target}, ` +
      `${m.urlsFingerprinted} URL(s)${m.sample !== null ? ` (sample=${m.sample})` : ""}, ${m.generatedAt}`,
  );
}

async function loadFingerprintFile(filePath: string): Promise<FingerprintFile> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as FingerprintFile;
  if (parsed?.meta?.tool !== "cutover-fingerprint" || !Array.isArray(parsed.fingerprints)) {
    throw new Error(`${filePath} is not a cutover fingerprint file`);
  }
  return parsed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [oldArg, newArg] = process.argv.slice(2);
  if (!oldArg || !newArg) {
    console.error(
      "Usage: npx tsx scripts/cutover/diff-fingerprints.ts <old.json> <new.json>",
    );
    process.exit(2);
  }

  const oldPath = path.resolve(oldArg);
  const newPath = path.resolve(newArg);
  const [oldFile, newFile] = await Promise.all([
    loadFingerprintFile(oldPath),
    loadFingerprintFile(newPath),
  ]);

  const diff = computeFingerprintDiff(oldFile, newFile);

  console.log(`\n${"═".repeat(70)}`);
  console.log("  Cutover fingerprint diff");
  console.log(`${"═".repeat(70)}`);
  describeRun("Old", oldPath, oldFile);
  describeRun("New", newPath, newFile);
  if (oldFile.meta.sample !== newFile.meta.sample) {
    console.log(
      "  ⚠️  Sample sizes differ between runs — orphan/added counts will " +
        "include sampling noise. Re-run both with the same --sample for a clean diff.",
    );
  }
  console.log(`${"─".repeat(70)}\n`);

  if (diff.orphans.length > 0) {
    console.log(`🚨  ORPHANS (${diff.orphans.length}) — in old run, missing from new run:`);
    printList(diff.orphans);
    console.log();
  }
  if (diff.statusRegressions.length > 0) {
    console.log(`🚨  STATUS REGRESSIONS (${diff.statusRegressions.length}) — healthy → broken:`);
    printChanges(diff.statusRegressions);
    console.log();
  }
  if (diff.canonicalHostDrift.length > 0) {
    console.log(`🚨  CANONICAL HOST DRIFT (${diff.canonicalHostDrift.length}):`);
    printChanges(diff.canonicalHostDrift);
    console.log();
  }
  if (diff.noindexAppeared.length > 0) {
    console.log(`⚠️   NOINDEX APPEARED (${diff.noindexAppeared.length}) — newly excluded from indexing:`);
    printList(diff.noindexAppeared);
    console.log();
  }
  if (diff.jsonLdLost.length > 0) {
    console.log(`⚠️   JSON-LD DISAPPEARED (${diff.jsonLdLost.length}) — had ≥1 valid block, now none:`);
    printList(diff.jsonLdLost);
    console.log();
  }
  if (diff.canonicalLost.length > 0) {
    console.log(`⚠️   CANONICAL TAG LOST (${diff.canonicalLost.length}):`);
    printList(diff.canonicalLost);
    console.log();
  }
  if (diff.canonicalPathChanges.length > 0) {
    console.log(`⚠️   CANONICAL PATH CHANGED (${diff.canonicalPathChanges.length}) — same host, new path:`);
    printChanges(diff.canonicalPathChanges);
    console.log();
  }
  if (diff.otherStatusChanges.length > 0) {
    console.log(`ℹ️   OTHER STATUS CHANGES (${diff.otherStatusChanges.length}) — review, not failed:`);
    printChanges(diff.otherStatusChanges);
    console.log();
  }
  if (diff.titleChanges.length > 0) {
    console.log(`ℹ️   TITLE CHANGES (${diff.titleChanges.length}):`);
    for (const t of diff.titleChanges.slice(0, 10)) {
      console.log(`    ${t.path}`);
      console.log(`      − ${t.before ?? "(none)"}`);
      console.log(`      + ${t.after ?? "(none)"}`);
    }
    if (diff.titleChanges.length > 10) {
      console.log(`    … and ${diff.titleChanges.length - 10} more`);
    }
    console.log();
  }
  if (diff.added.length > 0) {
    console.log(`ℹ️   NEW URLS (${diff.added.length}) — in new run only:`);
    printList(diff.added);
    console.log();
  }

  const hardFailures =
    diff.orphans.length +
    diff.statusRegressions.length +
    diff.canonicalHostDrift.length;
  const warnings =
    diff.noindexAppeared.length +
    diff.jsonLdLost.length +
    diff.canonicalLost.length +
    diff.canonicalPathChanges.length +
    diff.otherStatusChanges.length;

  console.log(`${"─".repeat(70)}`);
  console.log(
    `  Orphans: ${diff.orphans.length}  |  Status regressions: ${diff.statusRegressions.length}  |  ` +
      `Canonical drift: ${diff.canonicalHostDrift.length}  |  Warnings: ${warnings}  |  New URLs: ${diff.added.length}`,
  );
  console.log(`${"═".repeat(70)}\n`);

  if (hardFailures > 0) {
    console.error(
      `[cutover-diff] ❌  ${hardFailures} hard failure(s) ` +
        "(orphans / status regressions / canonical host drift).",
    );
    process.exit(1);
  }
  console.log("[cutover-diff] ✅  No orphans, status regressions, or canonical drift.");
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error("[cutover-diff] Fatal error:", err instanceof Error ? err.message : err);
    process.exit(2);
  });
}
