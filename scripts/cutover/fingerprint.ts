/**
 * Cutover fingerprint — crawls a target host's sitemap shards and records an
 * SEO-critical fingerprint for every URL (or a deterministic sample).
 *
 * Part of the cutover-guardian suite for the Oct–Dec 2026 apex domain
 * migration (see docs/cutover/README.md and docs/runbooks/cutover.md).
 * Take a baseline on the old host at T−7d, re-run on the apex at T=0+, then
 * compare with scripts/cutover/diff-fingerprints.ts.
 *
 * Per URL it records:
 *   - first-response status (no-follow) + full redirect chain + final status
 *   - <link rel="canonical"> href and its host
 *   - whether ≥1 <script type="application/ld+json"> block parses as JSON
 *   - robots meta noindex presence
 *   - <title> text (truncated) + sha256 hash
 *
 * Sitemap shards are discovered from /robots.txt `Sitemap:` lines (falling
 * back to /sitemap.xml + /sitemap/{0..8}.xml). Sitemap <loc> values point at
 * the canonical site host (NEXT_PUBLIC_SITE_URL), so every URL is re-hosted
 * onto --target before fetching. Sampling is deterministic (paths ranked by
 * sha256) so two runs with the same --sample pick the same URLs and stay
 * diffable run-over-run; the homepage is always included.
 *
 * Usage:
 *   npx tsx scripts/cutover/fingerprint.ts --target=https://lambent-sawine-17c3dd.netlify.app
 *   npx tsx scripts/cutover/fingerprint.ts --target=https://invest.com.au --sample=300
 *
 * Output: docs/cutover/fingerprints/<host>-<yyyymmdd-hhmm>.json (+ a 10-line
 * console summary). Each URL is retried up to 2x on network error / 5xx.
 *
 * Exit codes:
 *   0 — fingerprint written
 *   1 — no URLs could be discovered from the target's sitemaps
 *   2 — usage / IO error
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// ── Config ────────────────────────────────────────────────────────────────────

const CONCURRENCY = 8;
const TIMEOUT_MS = 20_000; // per request
const MAX_ATTEMPTS = 3; // 1 initial + up to 2 retries on network error / 5xx
const RETRY_DELAY_MS = 750;
const MAX_REDIRECT_HOPS = 10;
const MAX_SITEMAP_FETCHES = 64;
const TITLE_STORE_MAX = 160;

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "User-Agent": "invest-com-au/cutover-fingerprint",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type FinalStatus = number | "timeout" | "error";

interface RedirectHop {
  url: string;
  status: number;
  location: string;
}

export interface UrlFingerprint {
  /** pathname + search — the stable diff key across hosts */
  path: string;
  /** URL actually fetched (target origin + path) */
  requestUrl: string;
  /** the <loc> exactly as listed in the sitemap */
  sitemapLoc: string;
  /** status of the very first response, before following any redirect */
  noFollowStatus: FinalStatus;
  redirectChain: RedirectHop[];
  finalUrl: string;
  finalStatus: FinalStatus;
  canonical: string | null;
  canonicalHost: string | null;
  jsonLdCount: number;
  jsonLdValid: boolean;
  noindex: boolean;
  title: string | null;
  titleHash: string | null;
  contentType: string | null;
  attempts: number;
  durationMs: number;
  error?: string;
}

export interface FingerprintFile {
  meta: {
    tool: "cutover-fingerprint";
    version: 1;
    target: string;
    generatedAt: string;
    sitemaps: string[];
    sitemapFailures: string[];
    urlsDiscovered: number;
    urlsFingerprinted: number;
    sample: number | null;
    concurrency: number;
    timeoutMs: number;
  };
  fingerprints: UrlFingerprint[];
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'");
}

function sha256Short(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function utcStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
  );
}

function isTimeoutError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  return name === "TimeoutError" || name === "AbortError";
}

async function drain(res: Response): Promise<void> {
  try {
    await res.arrayBuffer();
  } catch {
    // body already consumed or connection dropped — nothing to do
  }
}

async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, next));
}

// ── HTML extraction ───────────────────────────────────────────────────────────

export function extractCanonical(html: string): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel\s*=\s*["']?canonical["'\s>]/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (href?.[1]) return decodeXmlEntities(href[1]);
  }
  return null;
}

export function countValidJsonLd(html: string): number {
  const re =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let count = 0;
  for (const m of html.matchAll(re)) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      JSON.parse(raw);
      count++;
    } catch {
      // present but unparseable — not counted as valid
    }
  }
  return count;
}

export function hasNoindexMeta(html: string): boolean {
  return (html.match(/<meta\b[^>]*>/gi) ?? []).some(
    (tag) =>
      /name\s*=\s*["']?robots["'\s/>]/i.test(tag) &&
      /content\s*=\s*["'][^"']*noindex[^"']*["']/i.test(tag),
  );
}

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  const title = decodeXmlEntities(m[1]).replace(/\s+/g, " ").trim();
  return title || null;
}

// ── Fetching ──────────────────────────────────────────────────────────────────

interface ChainResult {
  noFollowStatus: number;
  chain: RedirectHop[];
  finalUrl: string;
  finalStatus: number;
  contentType: string | null;
  body: string | null;
}

/** Fetch with redirect:"manual", following 3xx hops by hand so the full chain
 *  (including the no-follow first status) is captured in one pass. */
async function followChain(startUrl: string): Promise<ChainResult> {
  const chain: RedirectHop[] = [];
  let current = startUrl;
  let noFollowStatus: number | null = null;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (noFollowStatus === null) noFollowStatus = res.status;

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, current).toString();
      chain.push({ url: current, status: res.status, location: next });
      await drain(res);
      current = next;
      continue;
    }

    const contentType = res.headers.get("content-type");
    let body: string | null = null;
    if (res.ok && contentType?.includes("text/html")) {
      body = await res.text();
    } else {
      await drain(res);
    }
    return {
      noFollowStatus,
      chain,
      finalUrl: current,
      finalStatus: res.status,
      contentType,
      body,
    };
  }
  throw new Error(`redirect chain exceeded ${MAX_REDIRECT_HOPS} hops`);
}

async function fingerprintUrl(
  pathKey: string,
  sitemapLoc: string,
  target: URL,
): Promise<UrlFingerprint> {
  const requestUrl = new URL(pathKey, target.origin).toString();
  const start = Date.now();
  let lastError = "unknown error";
  let timedOut = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await followChain(requestUrl);
      // Retry transient 5xx (the sandbox/CDN throws sporadic 502/503s).
      if (res.finalStatus >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      const html = res.body;
      const canonical = html ? extractCanonical(html) : null;
      let canonicalHost: string | null = null;
      if (canonical) {
        try {
          canonicalHost = new URL(canonical, res.finalUrl).hostname;
        } catch {
          canonicalHost = null;
        }
      }
      const jsonLdCount = html ? countValidJsonLd(html) : 0;
      const title = html ? extractTitle(html) : null;
      return {
        path: pathKey,
        requestUrl,
        sitemapLoc,
        noFollowStatus: res.noFollowStatus,
        redirectChain: res.chain,
        finalUrl: res.finalUrl,
        finalStatus: res.finalStatus,
        canonical,
        canonicalHost,
        jsonLdCount,
        jsonLdValid: jsonLdCount > 0,
        noindex: html ? hasNoindexMeta(html) : false,
        title: title ? title.slice(0, TITLE_STORE_MAX) : null,
        titleHash: title ? sha256Short(title) : null,
        contentType: res.contentType,
        attempts: attempt,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      timedOut = isTimeoutError(err);
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const failStatus: FinalStatus = timedOut ? "timeout" : "error";
  return {
    path: pathKey,
    requestUrl,
    sitemapLoc,
    noFollowStatus: failStatus,
    redirectChain: [],
    finalUrl: requestUrl,
    finalStatus: failStatus,
    canonical: null,
    canonicalHost: null,
    jsonLdCount: 0,
    jsonLdValid: false,
    noindex: false,
    title: null,
    titleHash: null,
    contentType: null,
    attempts: MAX_ATTEMPTS,
    durationMs: Date.now() - start,
    error: lastError,
  };
}

// ── Sitemap discovery ─────────────────────────────────────────────────────────

async function fetchTextWithRetry(
  url: string,
): Promise<{ status: number; text: string } | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...REQUEST_HEADERS, Accept: "application/xml,text/plain,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await drain(res);
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return { status: res.status, text: await res.text() };
    } catch {
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return null;
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  for (const m of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
    const loc = m[1] ? decodeXmlEntities(m[1].trim()) : "";
    if (loc) locs.push(loc);
  }
  return locs;
}

/** Re-host any absolute URL onto the target origin, keeping path + query.
 *  Sitemap locs point at NEXT_PUBLIC_SITE_URL (the apex), not the mirror. */
function rehost(loc: string, target: URL): { pathKey: string; url: string } | null {
  try {
    const u = new URL(loc, target.origin);
    const pathKey = `${u.pathname}${u.search}`;
    return { pathKey, url: new URL(pathKey, target.origin).toString() };
  } catch {
    return null;
  }
}

async function discoverUrls(target: URL): Promise<{
  sitemaps: string[];
  sitemapFailures: string[];
  /** pathKey → sitemap loc (first occurrence wins) */
  paths: Map<string, string>;
}> {
  // 1. Shard list from robots.txt `Sitemap:` lines.
  let candidates: string[] = [];
  const robots = await fetchTextWithRetry(new URL("/robots.txt", target.origin).toString());
  if (robots?.status === 200) {
    for (const line of robots.text.split("\n")) {
      const m = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (m?.[1]) candidates.push(m[1]);
    }
  }
  // 2. Fallback: index + numbered shards (robots.ts currently lists 0–7;
  //    sitemap.ts has grown a shard 8 — probe a little past both).
  if (candidates.length === 0) {
    candidates = [
      "/sitemap.xml",
      ...Array.from({ length: 10 }, (_, i) => `/sitemap/${i}.xml`),
    ];
  }

  const queue = candidates
    .map((c) => rehost(c, target)?.url)
    .filter((u): u is string => Boolean(u));
  const visited = new Set<string>();
  const sitemaps: string[] = [];
  const sitemapFailures: string[] = [];
  const paths = new Map<string, string>();
  let fetches = 0;

  while (queue.length > 0 && fetches < MAX_SITEMAP_FETCHES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    fetches++;

    const res = await fetchTextWithRetry(url);
    if (!res || res.status !== 200) {
      sitemapFailures.push(`${url} (${res ? res.status : "network error"})`);
      continue;
    }
    const locs = extractLocs(res.text);
    if (/<sitemapindex/i.test(res.text)) {
      // Sitemap index — enqueue child shards (re-hosted onto the target).
      for (const loc of locs) {
        const child = rehost(loc, target);
        if (child && !visited.has(child.url)) queue.push(child.url);
      }
      sitemaps.push(url);
    } else {
      for (const loc of locs) {
        const page = rehost(loc, target);
        if (page && !paths.has(page.pathKey)) paths.set(page.pathKey, loc);
      }
      sitemaps.push(url);
    }
  }

  return { sitemaps, sitemapFailures, paths };
}

/** Deterministic sample: rank paths by sha256(path) and take the first N, so
 *  two runs (even on different hosts) sample the same URLs. "/" is always kept. */
export function samplePaths(allPaths: string[], sample: number | null): string[] {
  const sorted = [...allPaths].sort();
  if (sample === null || sample >= sorted.length) return sorted;
  const ranked = sorted
    .map((p) => ({ p, rank: createHash("sha256").update(p).digest("hex") }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));
  const selected = new Set(ranked.slice(0, sample).map((r) => r.p));
  if (sorted.includes("/")) selected.add("/");
  return [...selected].sort();
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { target: URL; sample: number | null } {
  let target: string | null = null;
  let sample: number | null = null;
  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else if (arg.startsWith("--sample=")) {
      const n = parseInt(arg.slice("--sample=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`--sample must be a positive integer (got "${arg}")`);
      }
      sample = n;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!target) {
    throw new Error(
      "Usage: npx tsx scripts/cutover/fingerprint.ts --target=https://host [--sample=N]",
    );
  }
  return { target: new URL(target), sample };
}

async function main(): Promise<void> {
  const { target, sample } = parseArgs(process.argv.slice(2));

  console.log(`[cutover-fingerprint] Target: ${target.origin}`);
  console.log("[cutover-fingerprint] Discovering sitemap shards …");
  const { sitemaps, sitemapFailures, paths } = await discoverUrls(target);
  console.log(
    `[cutover-fingerprint] ${sitemaps.length} sitemap(s) parsed, ` +
      `${sitemapFailures.length} failed, ${paths.size} unique URL path(s).`,
  );
  if (paths.size === 0) {
    console.error(
      "[cutover-fingerprint] ❌  No URLs discovered — checked robots.txt " +
        "Sitemap: lines and /sitemap/{0..9}.xml. Is the target serving sitemaps?",
    );
    process.exit(1);
  }

  const selected = samplePaths([...paths.keys()], sample);
  console.log(
    `[cutover-fingerprint] Fingerprinting ${selected.length} URL(s)` +
      `${sample !== null ? ` (deterministic sample=${sample})` : " (full crawl)"} ` +
      `at concurrency ${CONCURRENCY} …`,
  );

  const results: UrlFingerprint[] = [];
  let done = 0;
  await runPool(
    selected,
    async (pathKey) => {
      const fp = await fingerprintUrl(pathKey, paths.get(pathKey) ?? pathKey, target);
      results.push(fp);
      done++;
      const bad =
        typeof fp.finalStatus !== "number" || fp.finalStatus >= 400;
      if (bad) {
        process.stdout.write(
          `\r  ⚠️  [${done}/${selected.length}] ${String(fp.finalStatus)} ${fp.path.slice(0, 70)}\n`,
        );
      } else if (done % 10 === 0 || done === selected.length) {
        process.stdout.write(`\r  [${done}/${selected.length}] fingerprinting…`);
      }
    },
    CONCURRENCY,
  );
  process.stdout.write("\n");

  results.sort((a, b) => a.path.localeCompare(b.path));

  const file: FingerprintFile = {
    meta: {
      tool: "cutover-fingerprint",
      version: 1,
      target: target.origin,
      generatedAt: new Date().toISOString(),
      sitemaps,
      sitemapFailures,
      urlsDiscovered: paths.size,
      urlsFingerprinted: results.length,
      sample,
      concurrency: CONCURRENCY,
      timeoutMs: TIMEOUT_MS,
    },
    fingerprints: results,
  };

  const outDir = path.join(process.cwd(), "docs", "cutover", "fingerprints");
  await fs.mkdir(outDir, { recursive: true });
  const hostSlug = target.hostname.replace(/[^a-zA-Z0-9.-]/g, "-");
  const outPath = path.join(outDir, `${hostSlug}-${utcStamp(new Date())}.json`);
  await fs.writeFile(outPath, JSON.stringify(file, null, 2) + "\n");

  // ── 10-line summary ─────────────────────────────────────────────────────────
  const num = results.filter((r) => typeof r.finalStatus === "number");
  const ok = num.filter((r) => (r.finalStatus as number) < 300).length;
  const c3xx = num.filter((r) => (r.finalStatus as number) >= 300 && (r.finalStatus as number) < 400).length;
  const c4xx = num.filter((r) => (r.finalStatus as number) >= 400 && (r.finalStatus as number) < 500).length;
  const c5xx = num.filter((r) => (r.finalStatus as number) >= 500).length;
  const netErr = results.length - num.length;
  const redirected = results.filter((r) => r.redirectChain.length > 0).length;
  const withCanonical = results.filter((r) => r.canonical !== null).length;
  const hostCounts = new Map<string, number>();
  for (const r of results) {
    if (r.canonicalHost) hostCounts.set(r.canonicalHost, (hostCounts.get(r.canonicalHost) ?? 0) + 1);
  }
  const topHosts = [...hostCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h, n]) => `${h} ×${n}`)
    .join(", ") || "none";
  const jsonLd = results.filter((r) => r.jsonLdValid).length;
  const noindex = results.filter((r) => r.noindex).length;

  console.log(`${"═".repeat(70)}`);
  console.log("  Cutover fingerprint — summary");
  console.log(`  Target        : ${target.origin}`);
  console.log(`  Sitemaps      : ${sitemaps.length} parsed, ${sitemapFailures.length} failed`);
  console.log(`  URLs          : ${paths.size} discovered, ${results.length} fingerprinted${sample !== null ? ` (sample=${sample})` : ""}`);
  console.log(`  Final status  : ${ok} ok · ${c3xx} 3xx · ${c4xx} 4xx · ${c5xx} 5xx · ${netErr} network-error (${redirected} arrived via redirects)`);
  console.log(`  Canonical     : ${withCanonical}/${results.length} present — hosts: ${topHosts}`);
  console.log(`  JSON-LD       : ${jsonLd}/${results.length} pages with ≥1 valid block`);
  console.log(`  noindex       : ${noindex} page(s)`);
  console.log(`  Output        : ${path.relative(process.cwd(), outPath)}`);
  console.log(`${"═".repeat(70)}`);
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error(
      "[cutover-fingerprint] Fatal error:",
      err instanceof Error ? err.message : err,
    );
    process.exit(2);
  });
}
