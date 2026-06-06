/**
 * Lightweight screenshot-based visual change detector.
 *
 * Uses SHA-256 hash comparison to detect page changes between bot runs —
 * no external image-diff library required. Baselines are stored in
 * `bots/.baselines/` (gitignored) and persist across runs.
 *
 * Workflow:
 *   First run  → baseline PNG + hash file are written; an "info" finding is
 *                emitted to acknowledge the capture.
 *   Later runs → current screenshot hash is compared to the stored hash.
 *                - Match: no finding (page unchanged).
 *                - Mismatch: "low" finding + new screenshot saved to runDir.
 *                  The stored hash is updated so subsequent runs compare
 *                  against the latest state (avoids perpetual re-firing on an
 *                  accepted change).
 *
 * The entire function is wrapped in a try/catch: visual regression failures
 * must never abort a bot session.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";
import type { FindingStore } from "../findings/store";

/** Persistent baseline storage directory. Add bots/.baselines/ to .gitignore. */
const BASELINES_DIR = path.resolve(process.cwd(), "bots/.baselines");

/**
 * Derive a stable file-system key from a persona + URL.
 *
 * @param persona   - Bot persona name (e.g. "buyer", "anon")
 * @param url       - Absolute URL of the current page
 */
function buildKey(persona: string, url: string): string {
  let routeSlug: string;
  try {
    routeSlug = new URL(url).pathname;
  } catch {
    routeSlug = url;
  }
  // Replace all non-alphanumeric characters with hyphens; strip leading/trailing.
  routeSlug = routeSlug.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Cap at 60 chars to stay within reasonable file-name limits.
  if (routeSlug.length > 60) routeSlug = routeSlug.slice(0, 60);
  return `${persona}-${routeSlug}`;
}

/** SHA-256 hash of a buffer, truncated to 16 hex chars for readability. */
function hashBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

export interface VisualBaselineOptions {
  /** Absolute path to the current run's artifact directory. */
  runDir: string;
}

/**
 * Capture a screenshot of the current page and compare it against a stored
 * baseline hash. Emits a finding if the page has changed since the last
 * baseline was captured.
 *
 * All file I/O is synchronous (baselines are small PNGs). Any error is
 * silently swallowed so the caller's bot session is never interrupted.
 *
 * @param page    - Playwright Page to screenshot
 * @param store   - Finding store to append results to
 * @param persona - Persona name for attribution and baseline keying
 * @param opts    - Options including the current run's artifact directory
 */
export async function captureVisualBaseline(
  page: Page,
  store: FindingStore,
  persona: string,
  opts: VisualBaselineOptions,
): Promise<void> {
  try {
    const url = page.url();
    const key = buildKey(persona, url);

    // Extract a human-readable route label for finding titles.
    let route: string;
    try {
      route = new URL(url).pathname || "/";
    } catch {
      route = url;
    }

    // Take a viewport (non-full-page) screenshot as a Buffer.
    const screenshotBuf: Buffer = await page.screenshot({
      fullPage: false,
      type: "png",
    });

    const currentHash = hashBuffer(screenshotBuf);

    // Ensure the baselines directory exists.
    fs.mkdirSync(BASELINES_DIR, { recursive: true });

    const baselinePng = path.join(BASELINES_DIR, `${key}.png`);
    const baselineHash = path.join(BASELINES_DIR, `${key}.sha256`);

    if (!fs.existsSync(baselinePng) || !fs.existsSync(baselineHash)) {
      // ── First capture: write baseline ───────────────────────────────────
      fs.writeFileSync(baselinePng, screenshotBuf);
      fs.writeFileSync(baselineHash, currentHash, "utf8");

      store.add({
        severity: "info",
        // "ux" is the closest valid FindingCategory for visual observations.
        category: "ux",
        title: `visual: baseline captured for ${route}`,
        detail: `First-run baseline screenshot and hash written to ${baselinePng}.`,
        url,
        persona,
        signatureKey: `visual:baseline:${key}`,
      });
    } else {
      // ── Subsequent runs: compare against stored hash ─────────────────────
      const storedHash = fs.readFileSync(baselineHash, "utf8").trim();

      if (storedHash === currentHash) {
        // Page unchanged — no finding emitted.
        return;
      }

      // Page has changed: save the new screenshot to the run directory for
      // manual inspection, then update the stored hash so the next run
      // compares against the current state.
      try {
        fs.mkdirSync(opts.runDir, { recursive: true });
        const newScreenshotPath = path.join(opts.runDir, `visual-diff-${key}-new.png`);
        fs.writeFileSync(newScreenshotPath, screenshotBuf);
      } catch {
        // Run-dir write failure is non-fatal.
      }

      // Update stored hash so we don't keep re-firing on an accepted change.
      fs.writeFileSync(baselineHash, currentHash, "utf8");

      store.add({
        severity: "low",
        category: "ux",
        title: `visual: page changed since baseline: ${route}`,
        detail:
          `Previous hash: ${storedHash}, Current hash: ${currentHash}. ` +
          `New screenshot saved to run dir. Run with --update-baselines to accept.`,
        url,
        persona,
        signatureKey: `visual:diff:${key}`,
      });
    }
  } catch {
    // Any failure (screenshot error, FS error, etc.) must not break the
    // calling bot session — silently return.
  }
}
