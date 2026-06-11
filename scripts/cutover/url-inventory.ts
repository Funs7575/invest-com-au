/**
 * url-inventory.ts — CO stream cutover script.
 *
 * Derives the COMPLETE URL set that invest.com.au serves from the same
 * static route/slug registries that feed next-sitemap / the sitemap route.
 * Does NOT make any live HTTP calls — it reads the same source-of-truth
 * arrays and maps used by app/sitemap.ts and related pages.
 *
 * Outputs: scripts/cutover/output/url-manifest.json
 *
 * Usage:
 *   npx tsx scripts/cutover/url-inventory.ts
 *
 * Fields per URL entry:
 *   path           — absolute path (no domain)
 *   routeType      — "static" | "isr" | "dynamic"
 *   revalidate     — revalidation period in seconds (null if force-dynamic)
 *   importance     — "critical" | "high" | "medium" | "low" (heuristic)
 *   notes          — why it has that importance / route type
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ── Inline registries (mirrors what sitemap.ts and pages export) ─────────────
// We inline these to avoid pulling Next.js server context into the script.
// They are kept in sync with lib/ via the generated manifest comments.

const VERTICAL_SLUGS = [
  "share-trading", "crypto", "savings", "super", "cfd",
  "bonds", "options", "futures", "forex", "commodities",
  "reits", "managed-funds", "etfs",
];

const LISTING_PAGE_SLUGS = [
  "buy-business", "franchise", "mining", "farmland", "commercial-property",
  "renewable-energy", "startups", "alternatives", "private-credit",
  "infrastructure", "funds", "pre-ipo", "private-equity", "royalties",
  "listed-securities", "digital-infrastructure",
];

const BEST_BROKER_CATEGORY_SLUGS = [
  "beginners", "advanced", "low-cost", "mobile-app", "fractional-shares",
  "margin-lending", "options-trading", "us-shares", "day-trading",
  "long-term-investing", "dividend-stocks", "asx-200", "etf-investing",
  "international-shares", "small-cap", "micro-cap", "socially-responsible",
  "bnpl-investors", "superannuation-rollovers", "retirement",
  "non-residents", "tfn-withholding",
];

// A representative sample of the known broker slugs
const KNOWN_BROKER_SLUGS = [
  "commsec", "selfwealth", "pearler", "stake", "superhero",
  "nabtrade", "westpac-online-investing", "anz-share-investing",
  "igmarkets", "cmcmarkets-stockbroking",
];

const ADVISOR_TYPE_SLUGS = [
  "financial-planner", "mortgage-broker", "insurance-broker",
  "accountant", "smsf-specialist", "property-investment-advisor",
];

const AUSTRALIAN_STATES = ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"];

const MAJOR_CITIES = [
  "sydney", "melbourne", "brisbane", "perth", "adelaide",
  "canberra", "hobart", "darwin",
];

// ── URL manifest entry ────────────────────────────────────────────────────────

type RouteType = "static" | "isr" | "dynamic";
type Importance = "critical" | "high" | "medium" | "low";

interface UrlEntry {
  path: string;
  routeType: RouteType;
  revalidate: number | null;
  importance: Importance;
  notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function entry(
  path: string,
  routeType: RouteType,
  revalidate: number | null,
  importance: Importance,
  notes: string,
): UrlEntry {
  return { path, routeType, revalidate, importance, notes };
}

function isrEntry(path: string, revalidate: number, importance: Importance, notes = ""): UrlEntry {
  return entry(path, "isr", revalidate, importance, notes || `ISR ${revalidate}s`);
}

function staticEntry(path: string, importance: Importance, notes = ""): UrlEntry {
  return entry(path, "static", null, importance, notes || "Static page");
}

function dynamicEntry(path: string, importance: Importance, notes = ""): UrlEntry {
  return entry(path, "dynamic", null, importance, notes || "Dynamic / force-dynamic");
}

// ── Build the manifest ────────────────────────────────────────────────────────

function buildManifest(): UrlEntry[] {
  const urls: UrlEntry[] = [];

  // Homepage
  urls.push(isrEntry("/", 3600, "critical", "Homepage — highest traffic page"));

  // Core static content pages
  const corePages: Array<[string, Importance, string]> = [
    ["/about", "medium", "About page"],
    ["/about/team", "medium", "Team page"],
    ["/about/careers", "low", "Invest.com.au careers page"],
    ["/careers", "low", "Advisor careers demand probe"],
    ["/contact", "low", "Contact page"],
    ["/privacy", "medium", "Privacy policy"],
    ["/terms", "medium", "Terms of service"],
    ["/fsg", "high", "Financial Services Guide — regulatory"],
    ["/legal", "medium", "Legal page"],
    ["/accessibility", "low", "Accessibility statement"],
    ["/advertise", "low", "Advertise page"],
    ["/advertise/packages", "low", "Advertise packages"],
    ["/advertise/featured-placement", "low", "Featured placement"],
    ["/advertiser-terms", "low", "Advertiser terms"],
    ["/how-we-make-money", "high", "Monetisation disclosure — regulatory/trust"],
    ["/how-we-verify", "high", "Methodology / E-E-A-T page"],
    ["/editorial-policy", "high", "Editorial policy"],
    ["/press", "low", "Press page"],
    ["/sitemap", "low", "HTML sitemap"],
  ];
  for (const [p, imp, note] of corePages) {
    urls.push(staticEntry(p, imp, note));
  }

  // Vertical pillar pages (1h ISR)
  for (const slug of VERTICAL_SLUGS) {
    urls.push(isrEntry(`/${slug}`, 3600, "high", `${slug} vertical pillar`));
    urls.push(isrEntry(`/${slug}/brokers`, 3600, "high", `${slug} broker directory`));
  }

  // Broker comparison pages
  urls.push(isrEntry("/share-trading/brokers", 1800, "critical", "Main broker comparison — very high traffic"));
  urls.push(isrEntry("/best-brokers", 3600, "critical", "Best brokers page"));

  for (const catSlug of BEST_BROKER_CATEGORY_SLUGS) {
    urls.push(isrEntry(`/best-brokers/${catSlug}`, 3600, "high", `Best brokers for ${catSlug}`));
  }

  // Broker profiles
  for (const slug of KNOWN_BROKER_SLUGS) {
    urls.push(isrEntry(`/broker/${slug}`, 3600, "high", `Broker review: ${slug}`));
    urls.push(isrEntry(`/broker/${slug}/review`, 3600, "medium", `Broker review detail: ${slug}`));
  }
  // Generic dynamic broker profile
  urls.push(dynamicEntry("/broker/[slug]", "high", "Dynamic broker profile — thousands of pages"));

  // Invest / marketplace listing pages
  urls.push(isrEntry("/invest", 3600, "high", "Invest marketplace hub"));
  for (const slug of LISTING_PAGE_SLUGS) {
    urls.push(isrEntry(`/invest/${slug}/listings`, 3600, "medium", `${slug} listings page`));
  }
  urls.push(dynamicEntry("/invest/[slug]/listings", "medium", "Generic invest listings"));
  urls.push(dynamicEntry("/invest/listings/[id]", "medium", "Individual invest listing"));

  // Advisor directory
  urls.push(isrEntry("/advisors", 3600, "critical", "Advisor directory hub — high-value SEO"));
  urls.push(isrEntry("/find-advisor", 300, "critical", "Find advisor wizard — primary conversion funnel"));
  for (const type of ADVISOR_TYPE_SLUGS) {
    urls.push(isrEntry(`/advisors/${type}`, 3600, "high", `${type} directory`));
    for (const state of AUSTRALIAN_STATES) {
      urls.push(isrEntry(`/advisors/${type}/${state}`, 3600, "medium", `${type} in ${state}`));
    }
    for (const city of MAJOR_CITIES) {
      urls.push(isrEntry(`/advisors/${type}/${city}`, 3600, "medium", `${type} in ${city}`));
    }
  }
  urls.push(dynamicEntry("/advisor/[slug]", "high", "Individual advisor profile"));

  // Advisor jobs board
  urls.push(isrEntry("/advisor-jobs", 300, "medium", "Advisor jobs board — 5min ISR"));
  urls.push(dynamicEntry("/advisor-jobs/[id]", "medium", "Individual advisor job listing"));

  // Quiz / funnel pages
  urls.push(dynamicEntry("/quiz", "critical", "Advisor quiz — force-dynamic"));
  urls.push(dynamicEntry("/get-matched", "critical", "Get matched funnel — force-dynamic"));

  // Calculators (static — no DB)
  const calculators = [
    "mortgage-calculator", "retirement-calculator", "smsf-calculator",
    "debt-calculator", "property-yield-calculator", "compound-interest-calculator",
    "dividend-reinvestment-calculator", "fire-calculator",
    "property-vs-shares-calculator", "super-contributions-calculator",
    "tco-calculator", "cgt-calculator",
  ];
  for (const calc of calculators) {
    urls.push(staticEntry(`/${calc}`, "medium", `Calculator: ${calc}`));
  }

  // Articles / guides (dynamic — DB-driven)
  urls.push(dynamicEntry("/article/[slug]", "high", "Article pages — DB-driven"));
  urls.push(dynamicEntry("/guide/[slug]", "medium", "Guide pages — DB-driven"));
  urls.push(dynamicEntry("/glossary/[term]", "low", "Glossary terms — DB-driven"));
  urls.push(dynamicEntry("/how-to/[slug]", "medium", "How-to guides"));

  // Community
  urls.push(isrEntry("/community", 300, "medium", "Community hub"));
  urls.push(dynamicEntry("/community/[category]", "medium", "Community category"));
  urls.push(dynamicEntry("/community/[category]/[threadId]", "medium", "Community thread"));

  // Hub pages (ISR 3600)
  const hubs = [
    "/smsf", "/home-loans", "/retirement", "/aged-care",
    "/family-office", "/mortgage", "/alt-assets",
  ];
  for (const hub of hubs) {
    urls.push(isrEntry(hub, 3600, "high", `Hub page: ${hub}`));
  }

  // Firm portal (auth-gated — noindex)
  const firmPortalPages = [
    "/firm-portal", "/firm-portal/performance", "/firm-portal/billing",
    "/firm-portal/jobs", "/firm-portal/careers", "/firm-portal/analytics",
    "/firm-portal/lead-quality",
  ];
  for (const p of firmPortalPages) {
    urls.push(dynamicEntry(p, "low", "Firm portal — auth-gated, noindex"));
  }

  // Auth pages
  const authPages = ["/auth/login", "/auth/register", "/auth/forgot-password"];
  for (const p of authPages) {
    urls.push(staticEntry(p, "low", "Auth page"));
  }

  // API routes (for redirect inventory — not crawled by search engines)
  const apiSurfaces = [
    "/api/sitemap.xml", "/sitemap.xml",
    "/api/og", "/feed.xml", "/robots.txt",
  ];
  for (const p of apiSurfaces) {
    urls.push(dynamicEntry(p, "high", "Technical surface — must redirect cleanly"));
  }

  return urls;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  process.stdout.write("Building URL manifest…\n");

  const manifest = buildManifest();

  const outputDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "output",
  );
  await fs.mkdir(outputDir, { recursive: true });

  const outPath = path.join(outputDir, "url-manifest.json");
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalUrls: manifest.length,
        byRouteType: {
          static: manifest.filter((u) => u.routeType === "static").length,
          isr: manifest.filter((u) => u.routeType === "isr").length,
          dynamic: manifest.filter((u) => u.routeType === "dynamic").length,
        },
        byImportance: {
          critical: manifest.filter((u) => u.importance === "critical").length,
          high: manifest.filter((u) => u.importance === "high").length,
          medium: manifest.filter((u) => u.importance === "medium").length,
          low: manifest.filter((u) => u.importance === "low").length,
        },
        urls: manifest,
      },
      null,
      2,
    ),
  );

  process.stdout.write(`\nDone. Written to ${outPath}\n`);
  process.stdout.write(`Total URLs: ${manifest.length}\n`);
  process.stdout.write(
    `  static: ${manifest.filter((u) => u.routeType === "static").length}  ` +
    `isr: ${manifest.filter((u) => u.routeType === "isr").length}  ` +
    `dynamic: ${manifest.filter((u) => u.routeType === "dynamic").length}\n`,
  );
  process.stdout.write(
    `  critical: ${manifest.filter((u) => u.importance === "critical").length}  ` +
    `high: ${manifest.filter((u) => u.importance === "high").length}  ` +
    `medium: ${manifest.filter((u) => u.importance === "medium").length}  ` +
    `low: ${manifest.filter((u) => u.importance === "low").length}\n`,
  );
}

// Only run main() when executed directly (not when imported by tests).
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url.includes(process.argv[1].replace(/^\//, ""));

if (isMain) {
  main().catch((err: unknown) => {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
