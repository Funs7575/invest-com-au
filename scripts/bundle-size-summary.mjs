#!/usr/bin/env node
// @ts-check
/**
 * Summarise Next.js 16 production bundle sizes into a JSON object
 * suitable for diffing between base branch and PR head.
 *
 * Emits to stdout:
 *   {
 *     "sharedChunksKb": 123.4,    // total .next/static/chunks
 *     "totalServerKb":  456.7,    // total .next/server/app
 *     "totalAppKb":     580.1,    // shared + server
 *     "routes": {
 *       "/": { "serverKb": 12.3 },
 *       "/compare": { ... },
 *       ...
 *     }
 *   }
 *
 * "firstLoadKb" style metrics aren't exposed directly in Next 16's
 * Turbopack output, so we approximate: each route's delta is its
 * per-route server chunk. Cross-route regressions show up in the
 * totals. This is coarser than the Next 14 app-build-manifest
 * approach but reliable against the current build.
 *
 * Used by .github/workflows/bundle-size.yml — run after `npm run
 * build` on both base and head, diff the two summaries, post the
 * delta as a sticky PR comment.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const NEXT_DIR = path.join(process.cwd(), ".next");

async function dirSizeKb(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let total = 0;
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        total += await dirSizeKb(p);
      } else if (e.isFile()) {
        const stat = await fs.stat(p);
        total += stat.size / 1024;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function fileSizeKb(filepath) {
  try {
    const stat = await fs.stat(filepath);
    return stat.size / 1024;
  } catch {
    return 0;
  }
}

async function readManifest(filename) {
  const p = path.join(NEXT_DIR, filename);
  try {
    const txt = await fs.readFile(p, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function main() {
  // Next 16 / Turbopack:
  //   - .next/static/chunks/…          shared JS for all routes
  //   - .next/server/app/<route>/…     per-route server bundle
  //   - .next/server/app-paths-manifest.json  route → server JS path

  const appPaths = await readManifest("server/app-paths-manifest.json");

  if (!appPaths) {
    console.error(
      "[bundle-size] .next/server/app-paths-manifest.json not found.",
      "Did `npm run build` complete? (Next 16 writes this file under",
      ".next/server/, not .next/.)",
    );
    process.exit(1);
  }

  const sharedChunksKb = await dirSizeKb(path.join(NEXT_DIR, "static", "chunks"));
  const serverAppKb = await dirSizeKb(path.join(NEXT_DIR, "server", "app"));

  /** @type {Record<string, { serverKb: number }>} */
  const routes = {};
  for (const [routeKey, serverPath] of Object.entries(appPaths)) {
    // Strip the "/page" suffix that app-paths-manifest appends.
    const cleanRoute = routeKey.replace(/\/(page|route|layout|loading)$/, "") || "/";
    const abs = path.join(NEXT_DIR, "server", serverPath);
    const kb = await fileSizeKb(abs);
    // Accumulate — multiple route entries can resolve to the same
    // path root (e.g. /page + /layout).
    if (!routes[cleanRoute]) routes[cleanRoute] = { serverKb: 0 };
    routes[cleanRoute].serverKb += kb;
  }

  // Round for stable diff output
  for (const r of Object.values(routes)) {
    r.serverKb = Number(r.serverKb.toFixed(2));
  }

  const summary = {
    sharedChunksKb: Number(sharedChunksKb.toFixed(2)),
    totalServerKb: Number(serverAppKb.toFixed(2)),
    totalAppKb: Number((sharedChunksKb + serverAppKb).toFixed(2)),
    routes,
  };

  process.stdout.write(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("[bundle-size] Failed:", err);
  process.exit(1);
});
