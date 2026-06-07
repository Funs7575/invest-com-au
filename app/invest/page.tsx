import { Suspense } from "react";
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
import { getOpportunityCategories } from "@/lib/invest-categories";
import type { InvestCategory } from "@/lib/invest-categories";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import type { InvestmentListing } from "@/lib/types";
import { logger } from "@/lib/logger";
import { listingUrl, categoryForListing } from "@/lib/listing-url";
import InvestListingsClient from "@/components/InvestListingsClient";
import GetMatchedEmbed from "@/components/get-matched/GetMatchedEmbed";
import { loadInvestPageContext } from "@/lib/listing-page-context";
import { computeMatchScore } from "@/lib/listing-match";
import HomeToolsStrip from "@/components/HomeToolsStrip";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";
import ScrollReveal from "@/components/ScrollReveal";
import Icon from "@/components/Icon";

const log = logger("invest-marketplace");

export const revalidate = 3600;

// /invest is the canonical marketplace landing. Wave 1 of the rebuild
// (2026-05) slimmed the hero, consolidated the two sticky filter bars
// into one toolbar, deleted the redundant "Active listings by vertical"
// chip strip (it duplicated the category tab bar with worse labels),
// moved the GetMatched CTA to a "Can't find the right deal?" prompt
// BELOW results, and moved compliance text to a bottom band so it
// doesn't eat 40% of the fold on first paint. Per-listing card layouts
// now branch on listing_kind (see lib/listing-kind.ts).
export const metadata: Metadata = {
  title: `Australian Investment Opportunities — Marketplace (${CURRENT_YEAR}) | ${SITE_NAME}`,
  description:
    "Browse Australian investment opportunities — businesses for sale, mining tenements, farmland, commercial property, franchises, renewable energy projects, startups, alternatives, private credit and managed funds. To compare super funds, share-trading platforms or savings accounts, visit Compare.",
  alternates: { canonical: "/invest" },
  openGraph: {
    title: `Australian Investment Opportunities — Marketplace (${CURRENT_YEAR})`,
    description:
      "Browse Australian investment opportunities — businesses, farmland, mining, commercial property, startups, alternatives, private credit & funds. All filterable in one place.",
    url: absoluteUrl("/invest"),
    images: [{ url: `/api/og?title=${encodeURIComponent("How to Invest in Australia")}&sub=${encodeURIComponent("Shares · ETFs · Property · Super · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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
  "buy-business": <Icon name="store" size={20} />,
  mining: <Icon name="pickaxe" size={20} />,
  farmland: <Icon name="sprout" size={20} />,
  "commercial-property": <Icon name="building" size={20} />,
  franchise: <Icon name="store" size={20} />,
  "renewable-energy": <Icon name="zap" size={20} />,
  startups: <Icon name="rocket" size={20} />,
  alternatives: <Icon name="gem" size={20} />,
  "private-credit": <Icon name="dollar-sign" size={20} />,
  infrastructure: <Icon name="factory" size={20} />,
  funds: <Icon name="trending-up" size={20} />,
  royalties: <Icon name="percent" size={20} />,
  "income-assets": <Icon name="coins" size={20} />,
  "pre-ipo": <Icon name="rocket" size={20} />,
  "private-equity": <Icon name="trending-up" size={20} />,
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
  royalties: { card: "border-rose-200 hover:border-rose-400", badge: "bg-rose-100 text-rose-700", hover: "group-hover:text-rose-700" },
  "income-assets": { card: "border-emerald-200 hover:border-emerald-400", badge: "bg-emerald-100 text-emerald-700", hover: "group-hover:text-emerald-700" },
  "pre-ipo": { card: "border-red-200 hover:border-red-400", badge: "bg-red-100 text-red-700", hover: "group-hover:text-red-700" },
  "private-equity": { card: "border-purple-200 hover:border-purple-400", badge: "bg-purple-100 text-purple-700", hover: "group-hover:text-purple-700" },
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
  royalties: "Mining royalties (DRR), music catalogue, IP & oil-gas royalty streams.",
  "income-assets": "Vending, ATMs, car washes, laundromats, self-storage & billboards.",
  "pre-ipo": "Wholesale-only late-stage private placements before IPO.",
  "private-equity": "Listed PE structures, wholesale s708 access, 7–10 year lockups.",
};

export default async function InvestMarketplacePage() {
  const listings = await fetchAllActiveListings();

  // Per-vertical + per-kind counts for hero pills and discovery cards.
  const verticalCounts: Record<string, number> = {};
  let firbCount = 0;
  let sivCount = 0;
  let aggregateAskCents = 0;
  for (const l of listings) {
    const v = l.vertical as string;
    if (v) verticalCounts[v] = (verticalCounts[v] || 0) + 1;
    if (l.firb_eligible) firbCount++;
    if (l.siv_complying) sivCount++;
    if (l.asking_price_cents) aggregateAskCents += l.asking_price_cents;
  }

  // Wave 3 — load page-side context (advisor opt-in counts, claimed
  // slugs, investor profile, owner status). One round trip on SSR,
  // fail-tolerant — page renders even when these fetches fail.
  const ctx = await loadInvestPageContext(
    listings.map((l) => l.id),
    listings.map((l) => l.slug),
  );

  // Pre-compute match scores so the client doesn't pay the cost
  // per-card. Sparse map — only listings that beat the score floor
  // (50) end up keyed.
  const matchScores: Record<number, number> = {};
  if (ctx.investorProfile) {
    for (const l of listings) {
      const score = computeMatchScore(l, ctx.investorProfile);
      if (score != null) matchScores[l.id] = score;
    }
  }

  const categories = getOpportunityCategories();
  const categoryTabs = categories.map((c) => ({ slug: c.slug, label: c.label }));

  // Discovery-card counts must match what the client filter actually shows
  // when a card is clicked, so we bucket each listing the same way the
  // client does — via categoryForListing — rather than summing raw
  // dbVerticals (which misses drifted vertical strings like
  // "renewable-energy"/"startups" and double-counts fund sub-categories
  // that belong to other categories).
  const categoryCounts: Record<string, number> = {};
  for (const l of listings) {
    const slug = categoryForListing(l);
    categoryCounts[slug] = (categoryCounts[slug] || 0) + 1;
  }

  function getCategoryCount(cat: InvestCategory): number {
    return categoryCounts[cat.slug] || 0;
  }

  // ── JSON-LD ──
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Australian Investment Opportunities",
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 50).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.title,
      url: absoluteUrl(listingUrl(l)),
    })),
  };

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Opportunities" },
  ]);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Australian Investment Opportunities",
    description: metadata.description,
    url: absoluteUrl("/invest"),
    publisher: ORGANIZATION_JSONLD,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
  };

  // Hero stat tiles — all derived from the live listing set (no invented
  // figures). Compact billions-aware AUD formatter for the aggregate ask.
  const sectorCount = Object.keys(verticalCounts).length;
  const formatAudBig = (cents: number): string => {
    const d = cents / 100;
    if (d >= 1e9) return `$${(d / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
    if (d >= 1e6) return `$${Math.round(d / 1e6)}M`;
    if (d >= 1e3) return `$${Math.round(d / 1e3)}k`;
    return `$${Math.round(d)}`;
  };
  const heroStats = (
    [
      aggregateAskCents > 0 ? { v: formatAudBig(aggregateAskCents), l: "Aggregate ask" } : null,
      { v: listings.length.toLocaleString("en-AU"), l: "Live opportunities" },
      { v: String(sectorCount), l: "Sectors" },
      firbCount > 0 ? { v: String(firbCount), l: "FIRB-eligible" } : null,
      sivCount > 0 ? { v: String(sivCount), l: "SIV-complying" } : null,
    ].filter(Boolean) as { v: string; l: string }[]
  ).slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />

      {/* ── Dark marketplace hero (v2 confident-fintech) ─────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ink-900 to-ink-800 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(242,88,34,.18), transparent 65%)" }}
        />
        <div className="container-custom max-w-6xl relative py-8 md:py-12">
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-white/55 mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">Opportunities</span>
          </nav>
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <span className="iv2-pill border border-coral-500/30 bg-coral-500/15 text-coral-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-400" />
                Live marketplace
              </span>
              <h1 className="mt-4 text-3xl font-extrabold leading-[1.04] tracking-tight md:text-5xl">
                {listings.length.toLocaleString("en-AU")} live opportunities.
                {aggregateAskCents > 0 && (
                  <>
                    <br />
                    <span className="text-coral-400">{formatAudBig(aggregateAskCents)} in aggregate ask.</span>
                  </>
                )}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
                Businesses, property, projects, funds, syndicates &amp; collectibles — all filterable in one place.
                To compare super funds or share-trading platforms,{" "}
                <Link href="/compare" className="text-coral-300 underline hover:no-underline">visit Compare</Link>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {heroStats.map((s) => (
                <div key={s.l} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="iv2-bignum text-2xl text-white md:text-3xl">{s.v}</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/55 md:text-xs">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Country/FIRB notices + owner link on the light band below the hero */}
      <div className="container-custom max-w-6xl pt-4">
        <DirectoryBanners surface="invest" />
        {ctx.isListingOwner && (
          <Link
            href="/account/my-listings"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-[0.65rem] font-semibold text-coral-700 shadow-sm transition-colors hover:bg-coral-100 md:text-xs"
          >
            <Icon name="user-check" size={11} />
            My listings →
          </Link>
        )}
      </div>

      {/* ── GetMatched CTA — above listings so it's visible before users
            scroll through options. Moved from below results (ADV-126). ── */}
      <div className="container-custom max-w-5xl mt-4 mb-2">
        <GetMatchedEmbed context="opportunity" />
      </div>

      {/* ── Marketplace (primary — no two-step) ───────────────── */}
      {/* Suspense required: InvestListingsClient calls useSearchParams(), which
          causes Next.js to bail out of SSR for the whole page when unwrapped.
          The fallback keeps the listings area visible while the client hydrates. */}
      <Suspense
        fallback={
          <div className="container-custom max-w-6xl py-6 animate-pulse">
            <div className="flex gap-2 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-slate-100 rounded-full" />
              ))}
            </div>
            <div className="h-10 bg-slate-100 rounded-xl mb-4" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-white border-b border-slate-100 rounded mb-1" />
            ))}
          </div>
        }
      >
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          matchScores={matchScores}
          advisorOptInCounts={ctx.advisorOptInCounts}
          claimedSlugs={ctx.claimedSlugs}
        />
      </Suspense>

      {/* ── Discovery: browse by category (single grid; sector hubs
            merged in as commodity entries rather than a separate row). ── */}
      <div className="container-custom max-w-6xl">
        <div className="border-t border-slate-200 pt-8 md:pt-10 mb-10 md:mb-12">
          <h2 className="text-lg md:text-2xl font-bold mb-1 text-slate-900">
            Browse by sector
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-5">
            Narrow the marketplace by what you&apos;re looking to invest in.
          </p>
          <ScrollReveal animation="scroll-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {categories.map((cat) => {
                const accent = ACCENT_COLORS[cat.slug] || DEFAULT_ACCENT;
                const count = getCategoryCount(cat);
                const description = CATEGORY_DESCRIPTIONS[cat.slug] || cat.intro.slice(0, 80);
                const icon = CATEGORY_ICONS[cat.slug] ?? <Icon name="circle" size={20} />;

                return (
                  <Link
                    key={cat.slug}
                    href={`/invest?category=${cat.slug}`}
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
                        <span className="text-[0.62rem] md:text-xs font-semibold text-slate-400 tabular-nums">
                          {count} {count === 1 ? "listing" : "listings"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[0.62rem] md:text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {description}
                    </p>
                    <span className={`text-[0.62rem] md:text-xs font-semibold mt-2 block ${accent.hover}`}>
                      Browse {cat.label} →
                    </span>
                  </Link>
                );
              })}
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* ── Supply-side CTAs (compact at page bottom). ── */}
      <div className="container-custom max-w-6xl">
        <div className="border-t border-slate-200 pt-8 md:pt-10 pb-10 md:pb-12">
          <h2 className="text-base md:text-lg font-bold mb-1 text-slate-900">Have an opportunity to promote?</h2>
          <p className="text-xs text-slate-500 mb-3 md:mb-4 max-w-3xl">
            Get your deal in front of Australian and foreign-investor traffic.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/invest/list" className="group block rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200 hover:shadow-md hover:border-amber-300">
              <div className="flex items-center gap-2">
                <span className="shrink-0 p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Icon name="plus-circle" size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-700">List an opportunity</h3>
                  <p className="text-[0.6rem] text-slate-500 leading-snug">Business, fund, syndicate or asset.</p>
                </div>
              </div>
            </Link>
            <Link href="/advertise" className="group block rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200 hover:shadow-md hover:border-amber-300">
              <div className="flex items-center gap-2">
                <span className="shrink-0 p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Icon name="star" size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-700">Featured placement</h3>
                  <p className="text-[0.6rem] text-slate-500 leading-snug">Pinned in search, larger card, more photos.</p>
                </div>
              </div>
            </Link>
            <Link href="/contact?topic=promote-overseas" className="group block rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200 hover:shadow-md hover:border-amber-300">
              <div className="flex items-center gap-2">
                <span className="shrink-0 p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Icon name="globe" size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-700">Reach overseas investors</h3>
                  <p className="text-[0.6rem] text-slate-500 leading-snug">SIV & FIRB-targeted country placement.</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <HomeToolsStrip />

      {/* ── Compliance band (page bottom; was above-the-fold before
            the rebuild, eating 4 lines of small print before any
            listing). Mandatory copy preserved verbatim. ── */}
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="container-custom max-w-6xl py-5 md:py-6 space-y-2">
          <details open className="text-xs text-slate-600">
            <summary className="font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
              <Icon name="shield-check" size={13} className="text-amber-500" />
              General Advice Warning &amp; Advertiser Disclosure
            </summary>
            <div className="mt-2.5 space-y-2 leading-relaxed">
              <p>
                <strong className="text-slate-700">General Advice Warning:</strong>{" "}
                {GENERAL_ADVICE_WARNING}
              </p>
              <p>
                <strong className="text-slate-700">Advertiser Disclosure:</strong>{" "}
                {ADVERTISER_DISCLOSURE_SHORT}
              </p>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
