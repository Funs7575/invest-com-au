/**
 * redirect-map-generator.ts — CO stream cutover script.
 *
 * Reads scripts/cutover/output/url-manifest.json and produces:
 *   1. scripts/cutover/output/redirect-map.vercel.json
 *      Vercel redirects format: source → destination (old domain → new).
 *      All 301 permanent.
 *
 *   2. scripts/cutover/output/redirect-map.htaccess
 *      Apache/nginx-compatible .htaccess format for fallback edge configs.
 *
 *   3. Flags on stdout any paths that need special handling.
 *
 * Convention: "old domain" = invest-com-au.vercel.app
 *             "new domain" = invest.com.au
 *
 * A redirect rule is a simple host-swap for most paths.  Dynamic segments
 * ([slug], [id]) and query params get flagged as needing manual review.
 *
 * Usage:
 *   npx tsx scripts/cutover/redirect-map-generator.ts
 *   # Optionally pass a custom manifest path:
 *   npx tsx scripts/cutover/redirect-map-generator.ts ./custom-manifest.json
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UrlEntry {
  path: string;
  routeType: "static" | "isr" | "dynamic";
  revalidate: number | null;
  importance: "critical" | "high" | "medium" | "low";
  notes: string;
}

interface UrlManifest {
  generatedAt: string;
  totalUrls: number;
  urls: UrlEntry[];
}

interface VercelRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

interface RedirectOutput {
  vercel: {
    redirects: VercelRedirect[];
  };
  htaccess: string;
  flagged: FlaggedPath[];
  stats: {
    total: number;
    clean: number;
    flagged: number;
  };
}

interface FlaggedPath {
  path: string;
  reason: string;
  routeType: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const OLD_DOMAIN = "invest-com-au.vercel.app";
const NEW_DOMAIN = "invest.com.au";

/**
 * Returns true if a path has Next.js dynamic segment brackets [param].
 * These need wildcard or catch-all redirect rules rather than exact matches.
 */
function hasDynamicSegment(p: string): boolean {
  return /\[.*?\]/.test(p);
}

/**
 * Converts a Next.js dynamic route like /broker/[slug] into a Vercel
 * redirect source pattern /broker/:slug.
 *
 * Only handles simple :param patterns — complex nested optionals or
 * catch-all [...slug] are flagged separately.
 */
function nextToVercelPattern(p: string): string {
  return p
    .replace(/\[\.\.\.(\w+)\]/g, ":$1*") // [...slug] → :slug*
    .replace(/\[(\w+)\]/g, ":$1"); // [slug] → :slug
}

/**
 * Converts a Vercel pattern to an Apache RewriteRule regex.
 * Very simplified — only handles simple :param and :param* placeholders.
 */
function vercelPatternToApacheRegex(pattern: string): string {
  return pattern
    .replace(/:(\w+)\*/g, "(.+)") // :slug* → (.+)
    .replace(/:(\w+)/g, "([^/]+)") // :slug → ([^/]+)
    .replace(/\./g, "\\.") // escape dots
    .replace(/^\//, ""); // remove leading slash for RewriteRule
}

/**
 * Generates a Vercel destination string, preserving :param placeholders.
 */
function toNewDomainDestination(pattern: string): string {
  return `https://${NEW_DOMAIN}${pattern}`;
}

// ── Core generator ────────────────────────────────────────────────────────────

export function generateRedirectMap(manifest: UrlManifest): RedirectOutput {
  const vercelRedirects: VercelRedirect[] = [];
  const htaccessLines: string[] = [
    "# Auto-generated redirect map — invest-com-au.vercel.app → invest.com.au",
    `# Generated: ${new Date().toISOString()}`,
    "# All redirects are 301 Permanent.",
    "",
    "RewriteEngine On",
    `RewriteCond %{HTTP_HOST} ^${OLD_DOMAIN.replace(/\./g, "\\.")}$ [NC]`,
    "",
  ];
  const flagged: FlaggedPath[] = [];

  for (const entry of manifest.urls) {
    const p = entry.path;
    const isDynamic = hasDynamicSegment(p);
    const vercelSource = nextToVercelPattern(p);

    // Flag catch-all segments — they need custom logic
    if (/\[\.\.\.\w+\]/.test(p)) {
      flagged.push({
        path: p,
        reason: "Catch-all segment ([...slug]) — requires custom wildcard redirect rule",
        routeType: entry.routeType,
      });
    }

    // Flag query-param patterns (edge case — none expected from manifest)
    if (p.includes("?")) {
      flagged.push({
        path: p,
        reason: "Query parameter in path — needs RewriteCond %{QUERY_STRING}",
        routeType: entry.routeType,
      });
      continue;
    }

    // Flag technical surfaces that need config-level handling (not page redirects)
    if (
      p.startsWith("/api/") ||
      p === "/sitemap.xml" ||
      p === "/robots.txt" ||
      p === "/feed.xml"
    ) {
      flagged.push({
        path: p,
        reason:
          "Technical surface — ensure DNS/CDN passes through correctly; " +
          "do NOT add a page-level redirect for API routes",
        routeType: entry.routeType,
      });
      continue;
    }

    // Standard redirect
    const destination = toNewDomainDestination(vercelSource);

    vercelRedirects.push({
      source: vercelSource,
      destination,
      permanent: true,
    });

    // Apache htaccess rule
    const apacheFrom = vercelPatternToApacheRegex(vercelSource);
    if (isDynamic) {
      htaccessLines.push(
        `# Dynamic: ${p}`,
        `RewriteRule ^${apacheFrom}$ https://${NEW_DOMAIN}${vercelSource.replace(/:\w+\*/g, "%1").replace(/:\w+/g, "%1")} [R=301,L]`,
        "",
      );
    } else {
      htaccessLines.push(
        `RewriteRule ^${apacheFrom}$ https://${NEW_DOMAIN}${p} [R=301,L]`,
      );
    }
  }

  // Add a catch-all at the end to redirect anything not matched above
  htaccessLines.push(
    "",
    "# Catch-all — redirect any unmatched path on old domain to new domain",
    `RewriteRule ^(.*)$ https://${NEW_DOMAIN}/$1 [R=301,L]`,
  );

  // Vercel also needs a catch-all
  vercelRedirects.push({
    source: "/(.*)",
    destination: `https://${NEW_DOMAIN}/:path*`,
    permanent: true,
  });

  return {
    vercel: { redirects: vercelRedirects },
    htaccess: htaccessLines.join("\n"),
    flagged,
    stats: {
      total: manifest.urls.length,
      clean: manifest.urls.length - flagged.length,
      flagged: flagged.length,
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const manifestArg = process.argv[2];
  const manifestPath = manifestArg
    ? path.resolve(manifestArg)
    : path.join(scriptDir, "output", "url-manifest.json");

  process.stdout.write(`Reading manifest from: ${manifestPath}\n`);

  let manifestRaw: string;
  try {
    manifestRaw = await fs.readFile(manifestPath, "utf8");
  } catch {
    process.stderr.write(
      `Manifest not found at ${manifestPath}.\n` +
        `Run: npx tsx scripts/cutover/url-inventory.ts  first.\n`,
    );
    process.exit(1);
  }

  const manifest = JSON.parse(manifestRaw) as UrlManifest;
  process.stdout.write(
    `Loaded ${manifest.totalUrls} URL entries from manifest.\n`,
  );

  const result = generateRedirectMap(manifest);

  const outputDir = path.join(scriptDir, "output");
  await fs.mkdir(outputDir, { recursive: true });

  // Write Vercel redirect map
  const vercelPath = path.join(outputDir, "redirect-map.vercel.json");
  await fs.writeFile(
    vercelPath,
    JSON.stringify(result.vercel, null, 2),
  );
  process.stdout.write(`\nVercel redirect map written to: ${vercelPath}\n`);

  // Write htaccess
  const htaccessPath = path.join(outputDir, "redirect-map.htaccess");
  await fs.writeFile(htaccessPath, result.htaccess);
  process.stdout.write(`Apache .htaccess written to: ${htaccessPath}\n`);

  // Write flagged paths report
  const flaggedPath = path.join(outputDir, "redirect-flags.json");
  await fs.writeFile(
    flaggedPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: result.flagged.length,
        items: result.flagged,
      },
      null,
      2,
    ),
  );
  process.stdout.write(`Flagged paths written to: ${flaggedPath}\n`);

  // Summary
  process.stdout.write("\n── Summary ──────────────────────────\n");
  process.stdout.write(`Total URLs:       ${result.stats.total}\n`);
  process.stdout.write(`Clean redirects:  ${result.stats.clean}\n`);
  process.stdout.write(`Flagged (review): ${result.stats.flagged}\n`);

  if (result.flagged.length > 0) {
    process.stdout.write("\nFlagged paths needing manual review:\n");
    for (const f of result.flagged) {
      process.stdout.write(`  ${f.path}\n    → ${f.reason}\n`);
    }
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
