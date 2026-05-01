import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  ORGANIZATION_JSONLD,
  SITE_NAME,
} from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import type { InvestCategory } from "@/lib/invest-categories";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import type { InvestmentListing } from "@/lib/types";
import { logger } from "@/lib/logger";
import { listingUrl } from "@/lib/listing-url";
import InvestListingsClient from "@/components/InvestListingsClient";
import ScrollReveal from "@/components/ScrollReveal";
import Icon from "@/components/Icon";

const log = logger("invest-marketplace");

export const revalidate = 3600;

// /invest is the canonical marketplace landing. The previous architecture
// split this surface in two — /invest was a category aggregator (cards),
// /invest/listings was the actual filterable grid. That two-step was the
// source of "I clicked browse listings, why am I looking at category cards"
// confusion. Pre-launch we collapsed it into one page: marketplace grid up
// top (visitors see deals immediately), sector discovery below as secondary
// browsing affordance. /invest/listings now redirects here (next.config.ts).
export const metadata: Metadata = {
  title: `Invest in Australia — Investment Marketplace (${CURRENT_YEAR}) | ${SITE_NAME}`,
  description:
    "Browse verified Australian investment opportunities — businesses for sale, mining tenements, farmland, commercial property, franchises, renewable energy projects, startups, alternatives and managed funds. Filterable in one place.",
  alternates: { canonical: "/invest" },
  openGraph: {
    title: `Invest in Australia — Investment Marketplace (${CURRENT_YEAR})`,
    description:
      "Browse verified Australian investment opportunities — businesses, farmland, mining, commercial property, startups, alternatives & funds. All in one filterable marketplace.",
    url: absoluteUrl("/invest"),
  },
  twitter: { card: "summary_large_image" },
};

async function fetchAllActiveListings(): Promise<InvestmentListing[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      log.warn("investment_listings marketplace fetch failed", {
        error: error.message,
        code: error.code,
      });
      return [];
    }
    return (data ?? []) as InvestmentListing[];
  } catch (err) {
    log.error("investment_listings marketplace fetch threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "buy-business": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  ),
  mining: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  ),
  farmland: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  "commercial-property": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
  ),
  franchise: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
  ),
  "renewable-energy": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  ),
  startups: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
  ),
  alternatives: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  ),
  "private-credit": (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  infrastructure: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  ),
  funds: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  ),
};

const ACCENT_COLORS: Record<string, { card: string; badge: string; hover: string }> = {
  "buy-business": { card: "border-blue-200 hover:border-blue-400", badge: "bg-blue-100 text-blue-700", hover: "group-hover:text-blue-700" },
  mining: { card: "border-amber-200 hover:border-amber-400", badge: "bg-amber-100 text-amber-700", hover: "group-hover:text-amber-700" },
  farmland: { card: "border-green-200 hover:border-green-400", badge: "bg-green-100 text-green-700", hover: "group-hover:text-green-700" },
  "commercial-property": { card: "border-slate-200 hover:border-slate-400", badge: "bg-slate-100 text-slate-700", hover: "group-hover:text-slate-700" },
  franchise: { card: "border-purple-200 hover:border-purple-400", badge: "bg-purple-100 text-purple-700", hover: "group-hover:text-purple-700" },
  "renewable-energy": { card: "border-emerald-200 hover:border-emerald-400", badge: "bg-emerald-100 text-emerald-700", hover: "group-hover:text-emerald-700" },
  startups: { card: "border-indigo-200 hover:border-indigo-400", badge: "bg-indigo-100 text-indigo-700", hover: "group-hover:text-indigo-700" },
  alternatives: { card: "border-rose-200 hover:border-rose-400", badge: "bg-rose-100 text-rose-700", hover: "group-hover:text-rose-700" },
  "private-credit": { card: "border-teal-200 hover:border-teal-400", badge: "bg-teal-100 text-teal-700", hover: "group-hover:text-teal-700" },
  infrastructure: { card: "border-cyan-200 hover:border-cyan-400", badge: "bg-cyan-100 text-cyan-700", hover: "group-hover:text-cyan-700" },
  funds: { card: "border-violet-200 hover:border-violet-400", badge: "bg-violet-100 text-violet-700", hover: "group-hover:text-violet-700" },
};

const DEFAULT_ACCENT = { card: "border-slate-200 hover:border-slate-400", badge: "bg-slate-100 text-slate-700", hover: "group-hover:text-slate-700" };

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "buy-business": "Cafes, agencies, e-commerce, professional practices & more.",
  mining: "Gold, lithium, copper, rare earths & coal exploration opportunities.",
  farmland: "Cropping, dairy, viticulture & horticulture land across Australia.",
  "commercial-property": "Office, industrial, retail, medical & childcare properties.",
  franchise: "Food, fitness, automotive & service franchise opportunities.",
  "renewable-energy": "Solar, wind, battery storage & hydrogen projects.",
  startups: "Fintech, healthtech, proptech & cleantech equity deals.",
  alternatives: "Wine, art, classic cars, watches, coins & whisky investments.",
  "private-credit": "Private lending, mezzanine debt & structured credit.",
  infrastructure: "Toll roads, airports, utilities & public-private partnerships.",
  funds: "Hedge funds, private credit funds, REITs & SIV-complying funds.",
};

// Energy + commodity sector hubs. These are EDUCATIONAL pillar pages
// (`/invest/{slug}` not `/invest/{slug}/listings`) — visitors learn about
// the sector then click through to filtered marketplace if available.
// Surfaced below the marketplace grid as secondary discovery.
const SECTOR_HUBS = [
  { slug: "oil-gas", label: "Oil & Gas", description: "LNG, exploration, refineries and energy infrastructure", icon: "fuel", accentCard: "border-amber-200 hover:border-amber-400", accentBadge: "bg-amber-100 text-amber-700", accentHover: "group-hover:text-amber-700" },
  { slug: "uranium", label: "Uranium", description: "ASX uranium producers, explorers and sector ETFs", icon: "atom", accentCard: "border-yellow-200 hover:border-yellow-400", accentBadge: "bg-yellow-100 text-yellow-700", accentHover: "group-hover:text-yellow-700" },
  { slug: "hydrogen", label: "Hydrogen", description: "Green hydrogen, fuel cells and H2 infrastructure", icon: "droplets", accentCard: "border-sky-200 hover:border-sky-400", accentBadge: "bg-sky-100 text-sky-700", accentHover: "group-hover:text-sky-700" },
  { slug: "lithium", label: "Lithium", description: "Pilbara producers, downstream processing and battery metals", icon: "zap", accentCard: "border-emerald-200 hover:border-emerald-400", accentBadge: "bg-emerald-100 text-emerald-700", accentHover: "group-hover:text-emerald-700" },
  { slug: "gold", label: "Gold & Precious Metals", description: "Perth Mint, gold ETFs and ASX gold miners", icon: "coins", accentCard: "border-amber-200 hover:border-amber-400", accentBadge: "bg-amber-100 text-amber-700", accentHover: "group-hover:text-amber-700" },
];

export default async function InvestMarketplacePage() {
  const [listings, supabase] = await Promise.all([
    fetchAllActiveListings(),
    createClient(),
  ]);

  // Per-vertical counts for the active-listings strip + the category cards.
  const verticalCounts: Record<string, number> = {};
  for (const l of listings) {
    const v = l.vertical as string;
    if (!v) continue;
    verticalCounts[v] = (verticalCounts[v] || 0) + 1;
  }
  const sortedCounts = Object.entries(verticalCounts).sort(
    ([, a], [, b]) => b - a,
  );

  const categories = getAllInvestCategories();
  const categoryTabs = categories.map((c) => ({
    slug: c.slug,
    label: c.label,
  }));

  function getCategoryCount(cat: InvestCategory): number {
    return cat.dbVerticals.reduce((sum, v) => sum + (verticalCounts[v] || 0), 0);
  }

  // Secondary fetch is unused but kept for parity with old hub page if we
  // need a separate "category aggregate" count later. Currently the
  // marketplace listings already drive the per-category counts above.
  void supabase;

  // ── JSON-LD: ItemList ──
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Australian Investment Marketplace",
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 50).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.title,
      url: absoluteUrl(listingUrl(l)),
    })),
  };

  // ── JSON-LD: BreadcrumbList ──
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest" },
  ]);

  // ── JSON-LD: WebPage ──
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Australian Investment Marketplace",
    description: metadata.description,
    url: absoluteUrl("/invest"),
    publisher: ORGANIZATION_JSONLD,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-6xl">
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Invest</span>
          </nav>

          {/* Header */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              Australian Investment Marketplace
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              Browse verified investment opportunities across Australia &mdash; businesses for sale,
              mining tenements, farmland, commercial property, franchises, renewable energy
              projects, startups, alternatives and managed funds.
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* General Advice Warning */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                General advice only &mdash; not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </details>
          </div>
        </div>

        {/* Per-vertical count strip */}
        {sortedCounts.length > 0 && (
          <div className="container-custom max-w-6xl mb-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-3">
                Active listings by vertical
              </p>
              <div className="flex flex-wrap gap-2">
                {sortedCounts.map(([slug, count]) => (
                  <Link
                    key={slug}
                    href={`/invest/${slug}/listings`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-colors text-xs"
                  >
                    <span className="font-semibold text-slate-700 capitalize">
                      {slug.replace(/-/g, " ")}
                    </span>
                    <span className="font-extrabold text-amber-700 tabular-nums">{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Marketplace grid (PRIMARY content — no two-step) ── */}
        <InvestListingsClient listings={listings} categories={categoryTabs} />

        {/* ── Secondary discovery: browse by category ── */}
        <div className="container-custom max-w-6xl mt-12 md:mt-16">
          <div className="border-t border-slate-200 pt-8 md:pt-10">
            <h2 className="text-lg md:text-2xl font-bold mb-1 text-slate-900">
              Browse by category
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-5">
              Filter the marketplace by what you&apos;re looking to buy or invest in.
            </p>
            <ScrollReveal animation="scroll-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10 md:mb-12">
                {categories.map((cat) => {
                  const accent = ACCENT_COLORS[cat.slug] || DEFAULT_ACCENT;
                  const count = getCategoryCount(cat);
                  const description = CATEGORY_DESCRIPTIONS[cat.slug] || cat.intro.slice(0, 80);
                  const icon = CATEGORY_ICONS[cat.slug];

                  return (
                    <Link
                      key={cat.slug}
                      href={`/invest/${cat.slug}/listings`}
                      className={`group relative block rounded-xl border bg-white p-3 md:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ${accent.card}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`shrink-0 p-1.5 rounded-lg ${accent.badge}`}>
                          {icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-sm md:text-base text-slate-900 transition-colors ${accent.hover}`}>
                            {cat.label}
                          </h3>
                          <span className="text-[0.62rem] md:text-xs font-semibold text-slate-400">
                            {count} {count === 1 ? "listing" : "listings"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[0.62rem] md:text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* ── Sector hubs (educational pillars, not marketplaces) ── */}
        <div className="container-custom max-w-6xl">
          <div className="border-t border-slate-200 pt-8 md:pt-10">
            <h2 className="text-lg md:text-2xl font-bold mb-1 text-slate-900">
              Energy &amp; commodity sector hubs
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-5 max-w-3xl">
              ASX stocks, ETFs, and project-equity context across the commodities that move
              Australian markets. These are sector guides &mdash; click through to learn the space
              before browsing deals.
            </p>
            <ScrollReveal animation="scroll-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {SECTOR_HUBS.map((s) => {
                  const count = verticalCounts[s.slug] || 0;
                  return (
                    <Link
                      key={s.slug}
                      href={`/invest/${s.slug}`}
                      className={`group relative block rounded-xl border bg-white p-3 md:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ${s.accentCard}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`shrink-0 p-1.5 rounded-lg ${s.accentBadge}`}>
                          <Icon name={s.icon} size={18} className="" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-sm md:text-base text-slate-900 transition-colors ${s.accentHover}`}>
                            {s.label}
                          </h3>
                          <span className="text-[0.62rem] md:text-xs font-semibold text-slate-400">
                            {count > 0
                              ? `${count} ${count === 1 ? "listing" : "listings"} · Sector hub`
                              : "Sector hub"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[0.62rem] md:text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {s.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </>
  );
}
