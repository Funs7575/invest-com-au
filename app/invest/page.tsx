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
import { listingUrl, categoryForListing, rawVerticalVariants } from "@/lib/listing-url";
import { categoryListingsHref } from "@/lib/invest-listing-routes";
import { faqJsonLd } from "@/lib/schema-markup";
import { loadInvestPageContext } from "@/lib/listing-page-context";
import { computeMatchBreakdown } from "@/lib/listing-match";
import HomeToolsStrip from "@/components/HomeToolsStrip";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import ScrollReveal from "@/components/ScrollReveal";
import Icon from "@/components/Icon";
import DirectoryHero from "@/components/directory/DirectoryHero";
import InvestListingsClient from "@/components/InvestListingsClient";

const log = logger("invest-marketplace");

const INVEST_FAQS = [
  {
    q: "What types of investment opportunities are listed on Invest.com.au?",
    a: "The marketplace lists private Australian investment opportunities across 15+ sectors: businesses for sale (cafes, agencies, e-commerce, practices), mining and exploration tenements (gold, lithium, copper, rare earths), farmland (cropping, dairy, viticulture), commercial property (office, industrial, retail, medical), franchises, renewable energy projects (solar, wind, battery, hydrogen), startups and pre-IPO equity, alternative assets (wine, art, classic cars), private credit, infrastructure, managed funds, royalty streams, income-producing assets (vending, ATMs, car washes), and wholesale-only private equity. Listings are direct from vendors, syndicates, and fund managers — not a secondary market.",
  },
  {
    q: "What does 'FIRB-eligible' mean on investment listings?",
    a: "FIRB-eligible flags that the listing has been identified by the vendor as suitable for foreign investors subject to Foreign Investment Review Board (FIRB) rules. Foreign persons must obtain FIRB approval to acquire certain Australian assets — including commercial property, agricultural land, and stakes in sensitive businesses above the applicable monetary threshold. Always confirm FIRB requirements with a specialist before investing.",
  },
  {
    q: "How do I list an investment opportunity on the Invest.com.au marketplace?",
    a: "Go to /invest/list to submit a listing. You can list businesses for sale, investment property, mining tenements, managed fund offers, syndicate placements, or any other private investment opportunity. Basic listings are free; featured placements (pinned position, larger card, more photos, FIRB/SIV badge) are available as paid upgrades. All listings are reviewed for compliance with general advice rules before going live.",
  },
  {
    q: "What is a SIV-complying investment on the marketplace?",
    a: "SIV-complying (Significant Investor Visa) means the listing has been flagged as potentially eligible as a complying investment under Australia's Significant Investor Visa program (subclass 188C), which requires AUD $5 million deployed into approved fund categories. Note: SIV eligibility must be confirmed with an immigration investment lawyer and the fund manager — Invest.com.au does not make eligibility determinations. The SIV visa class was officially closed to new applications in 2024; existing visa holders may continue to hold complying investments.",
  },
];

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
    "Australian investment marketplace: businesses for sale, mining tenements, farmland, franchises, startups, private credit and alternatives.",
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
  const matchReasons: Record<number, string[]> = {};
  if (ctx.investorProfile) {
    for (const l of listings) {
      const breakdown = computeMatchBreakdown(l, ctx.investorProfile);
      if (breakdown != null) {
        matchScores[l.id] = breakdown.score;
        if (breakdown.reasons.length > 0) matchReasons[l.id] = breakdown.reasons;
      }
    }
  }

  const categories = getOpportunityCategories();
  const categoryTabs = categories.map((c) => ({ slug: c.slug, label: c.label }));

  // Discovery-card counts must match what each sector's /listings page
  // actually shows. That page fetches by the category's vertical(s) and then
  // the client filters by categoryForListing — so a listing counts for a
  // sector only if it satisfies BOTH: categoryForListing(l) === slug AND
  // l.vertical is one of the category's (alias-expanded) verticals.
  // (categoryForListing alone over-counted "funds": cross-vertical listed
  // securities — uranium/hydrogen/oil-gas ASX stocks — fall to "funds" via
  // the categoryForListing fallback but aren't fetched by the funds page's
  // vertical query, so the badge said 55 while the page showed 11.)
  const categoryCounts: Record<string, number> = {};
  for (const cat of categories) {
    const verts = new Set(cat.dbVerticals.flatMap(rawVerticalVariants));
    // Kind-based categories (no dbVerticals — e.g. listed-securities) are
    // bucketed purely by categoryForListing; vertical-based ones additionally
    // require the listing's vertical to be one the sector page fetches.
    const kindBased = cat.dbVerticals.length === 0;
    categoryCounts[cat.slug] = listings.filter(
      (l) => categoryForListing(l) === cat.slug && (kindBased || verts.has(l.vertical as string)),
    ).length;
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

  const investFaqLd = faqJsonLd(INVEST_FAQS);

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
      { v: listings.length.toLocaleString("en-AU"), l: "Live opportunities" },
      aggregateAskCents > 0 ? { v: formatAudBig(aggregateAskCents), l: "Aggregate ask" } : null,
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
      {investFaqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(investFaqLd) }} />}

      {/* ── Compact light marketplace header. Replaces the dark gradient hero +
            standalone Get Matched card that together pushed the listings below
            the fold — stats now ride as small pills beside the title and the
            "build an action plan" CTA lives inline on the search row below. ── */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Opportunities"
        headlineLead="Investment marketplace"
        subtitle={
          <>
            Businesses, property, projects, funds, syndicates &amp; collectibles — all filterable in one place.
            To compare super funds or share-trading platforms,{" "}
            <Link href="/compare" className="text-coral-600 underline hover:no-underline">visit Compare</Link>.
          </>
        }
        stats={heroStats}
      >
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
      </DirectoryHero>

      {/* ── Marketplace (primary — no two-step). The Get Matched CTA now lives
            inline on the toolbar's search row via showActionPlanCta, rather
            than as a standalone card above the listings (ADV-126 → compact
            header rebuild). ── */}
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
          matchReasons={matchReasons}
          advisorOptInCounts={ctx.advisorOptInCounts}
          claimedSlugs={ctx.claimedSlugs}
          showActionPlanCta
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
                    href={categoryListingsHref(cat.slug)}
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
                        <span className="text-[0.62rem] md:text-xs font-semibold text-slate-500 tabular-nums">
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

      <HubAdvisorCTA
        heading="Not sure which investment is right for you?"
        subheading="Alternative assets, unlisted funds, syndicates, and business investments carry different risks and tax treatments. A licensed financial adviser can assess which opportunities suit your portfolio size, time horizon, and tax position."
        intent={{ need: "planning", context: ["alternative_investments", "portfolio_strategy"] }}
        source="invest_hub"
        ctaLabel="Find a financial adviser"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* FAQ accordion — GEO pivot: answer-first FAQ for AI citation */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {INVEST_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

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
