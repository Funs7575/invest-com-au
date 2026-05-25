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
import { faqJsonLd } from "@/lib/schema-markup";
import { getOpportunityCategories } from "@/lib/invest-categories";
import type { InvestCategory } from "@/lib/invest-categories";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import type { InvestmentListing } from "@/lib/types";
import { logger } from "@/lib/logger";
import { listingUrl } from "@/lib/listing-url";
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

const investHubFaqLd = faqJsonLd([
  {
    q: "What are alternative investments in Australia?",
    a: "Alternative investments are assets outside traditional shares, bonds, and cash. In Australia these include commercial property, farmland, private equity (unlisted company shares), private credit (direct lending), infrastructure, commodities (gold, oil), and collectables (art, wine, classic cars). Alternative assets often provide diversification benefits — lower correlation to share markets — but typically have higher entry minimums ($50,000–$500,000+), lower liquidity, and less regulatory oversight than listed securities. In Australia, many alternative investments are accessible only to wholesale or sophisticated investors.",
  },
  {
    q: "What is private credit investing in Australia?",
    a: "Private credit (also called direct lending) involves lending money directly to businesses rather than through a bank or bond market. Investors earn interest income, typically 8–14% per annum for senior secured debt. In Australia, private credit funds have grown rapidly as banks have reduced business lending since Basel III capital requirements tightened. Access is generally restricted to wholesale investors (net assets over $2.5M or gross income over $250,000). Key risks include illiquidity (no secondary market), borrower default, and manager concentration.",
  },
  {
    q: "How do I invest in farmland in Australia?",
    a: "Australian farmland investment is accessible through three main channels: direct purchase of agricultural land (requires significant capital, usually $500k+), unlisted agricultural funds (managed exposure via fund managers, wholesale investor minimum typically $10,000–$50,000), and ASX-listed agricultural trusts or companies (more liquid but less direct). Australian farmland has historically delivered 8–10% total returns (capital growth + lease income) over the long run. Risks include drought, commodity price cycles, and poor liquidity on direct holdings.",
  },
  {
    q: "What is a pre-IPO investment and how do I access one?",
    a: "A pre-IPO investment involves buying shares in a private company before it lists on a public stock exchange. Returns can be substantial if the company IPOs at a higher valuation, but risks are high: many pre-IPO companies never successfully list, the investment is highly illiquid (locked up for 12–24+ months), and valuations are subjective. In Australia, pre-IPO opportunities are generally restricted to wholesale investors. Platforms like Equitise, Birchal (equity crowdfunding), and specialist share registries facilitate access.",
  },
]);

export default async function InvestMarketplacePage() {
  const listings = await fetchAllActiveListings();

  // Per-vertical + per-kind counts for hero pills and discovery cards.
  const verticalCounts: Record<string, number> = {};
  let firbCount = 0;
  let sivCount = 0;
  for (const l of listings) {
    const v = l.vertical as string;
    if (v) verticalCounts[v] = (verticalCounts[v] || 0) + 1;
    if (l.firb_eligible) firbCount++;
    if (l.siv_complying) sivCount++;
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

  function getCategoryCount(cat: InvestCategory): number {
    return cat.dbVerticals.reduce((sum, v) => sum + (verticalCounts[v] || 0), 0);
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(investHubFaqLd) }} />

      {/* ── Slim hero (was 40% of fold, now ~15%) ────────────────── */}
      <div className="container-custom max-w-6xl pt-5 md:pt-8 pb-3">
        <nav className="text-xs md:text-sm text-slate-500 mb-2">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700">Opportunities</span>
        </nav>

        <DirectoryBanners surface="invest" />

        <h1 className="text-2xl md:text-4xl font-extrabold mb-2 text-slate-900 tracking-tight">
          Australian Investment Opportunities
        </h1>
        <p className="text-sm md:text-base text-slate-600 mb-3 max-w-3xl">
          Businesses, property, projects, funds, syndicates & collectibles — all filterable in one place.
          To compare super funds or share-trading platforms,{" "}
          <Link href="/compare" className="text-amber-700 underline hover:no-underline">visit Compare</Link>.
        </p>

        {/* Trust pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[0.65rem] md:text-xs font-semibold text-slate-700 shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-bold text-slate-900">{listings.length}</span> live opportunities
          </span>
          {firbCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 rounded-full text-[0.65rem] md:text-xs font-semibold text-blue-700 shadow-sm">
              <Icon name="globe" size={11} />
              <span className="font-bold">{firbCount}</span> FIRB-eligible
            </span>
          )}
          {sivCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-full text-[0.65rem] md:text-xs font-semibold text-emerald-700 shadow-sm">
              <Icon name="shield-check" size={11} />
              <span className="font-bold">{sivCount}</span> SIV-complying
            </span>
          )}
          {ctx.isListingOwner && (
            <Link
              href="/account/my-listings"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[0.65rem] md:text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
            >
              <Icon name="user-check" size={11} />
              My listings →
            </Link>
          )}
        </div>
      </div>

      {/* ── Marketplace (primary — no two-step) ───────────────── */}
      <InvestListingsClient
        listings={listings}
        categories={categoryTabs}
        matchScores={matchScores}
        advisorOptInCounts={ctx.advisorOptInCounts}
        claimedSlugs={ctx.claimedSlugs}
      />

      {/* ── "Not sure?" CTA — moved BELOW results per UX rebuild.
            Wedging this between filters and results was an anti-pattern
            (browse intent hitting a "decide" CTA before any listing).
            Below-results it's a recovery prompt. ── */}
      <div className="container-custom max-w-5xl mb-10">
        <GetMatchedEmbed context="opportunity" />
      </div>

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
          <details className="text-xs text-slate-600">
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
