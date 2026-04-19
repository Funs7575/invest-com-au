import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Broker, PlatformType } from "@/lib/types";
import { PLATFORM_TYPE_LABELS_LOWER } from "@/lib/types";
import type { Metadata } from "next";
import VersusClient from "../VersusClient";
import { SITE_URL, CURRENT_YEAR, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import { getVersusEditorial } from "@/lib/cached-versus";
import { generateVersusPairs, getRelatedVersusPairs } from "@/lib/versus-pairs";
import Link from "next/link";

const PLATFORM_LABELS = PLATFORM_TYPE_LABELS_LOWER;

export const revalidate = 1800;

/**
 * SEO-friendly versus pages at /versus/stake-vs-commsec
 * Server-rendered with full metadata, JSON-LD, and sitemap entries.
 * Catches "slug1-vs-slug2" and "slug1-vs-slug2-vs-slug3" patterns.
 */

// Top comparison pairs to pre-render at build time
const POPULAR_PAIRS = [
  // Tier 1: highest search volume pairs
  "stake-vs-commsec",
  "cmc-markets-vs-commsec",
  "stake-vs-moomoo",
  "selfwealth-vs-commsec",
  "interactive-brokers-vs-commsec",
  "commsec-vs-nabtrade",
  "stake-vs-selfwealth",
  "moomoo-vs-commsec",
  "cmc-markets-vs-moomoo",
  "superhero-vs-stake",
  // Tier 2: popular direct competitors
  "interactive-brokers-vs-saxo",
  "selfwealth-vs-cmc-markets",
  "interactive-brokers-vs-cmc-markets",
  "webull-vs-stake",
  "superhero-vs-commsec",
  "saxo-vs-cmc-markets",
  "moomoo-vs-selfwealth",
  "tiger-brokers-vs-moomoo",
  "stake-vs-interactive-brokers",
  "nabtrade-vs-selfwealth",
  "cmc-markets-vs-selfwealth",
  // Tier 3: new pairs for long-tail SEO
  "moomoo-vs-tiger-brokers",
  "stake-vs-saxo",
  "commsec-vs-interactive-brokers",
  "selfwealth-vs-moomoo",
  "nabtrade-vs-stake",
  "superhero-vs-selfwealth",
  "ig-vs-cmc-markets",
  "ig-vs-interactive-brokers",
  "webull-vs-moomoo",
  "commsec-vs-cmc-markets",
  "tiger-brokers-vs-stake",
  "saxo-vs-interactive-brokers",
  "superhero-vs-moomoo",
  "nabtrade-vs-cmc-markets",
  "webull-vs-commsec",
  "selfwealth-vs-interactive-brokers",
  "ig-vs-saxo",
  "stake-vs-ig",
  // Crypto pairs
  "coinspot-vs-swyftx",
  "swyftx-vs-coinspot",
  "coinspot-vs-independent-reserve",
  "swyftx-vs-kraken",
  "coinjar-vs-coinspot",
  "coinjar-vs-swyftx",
  "kraken-vs-coinspot",
  "independent-reserve-vs-kraken",
  "digital-surge-vs-coinspot",
  "crypto-com-vs-coinspot",
  // Robo pairs
  "stockspot-vs-vanguard-personal-investor",
  "spaceship-vs-raiz",
  "raiz-vs-stockspot",
  "sixpark-vs-stockspot",
  "betashares-direct-vs-vanguard-personal-investor",
  "investsmart-vs-stockspot",
  "spaceship-vs-stockspot",
  "betashares-direct-vs-stockspot",
  "raiz-vs-spaceship",
  "commbank-pocket-vs-raiz",
  // New share broker pairs (Superhero, Pearler, eToro, Opentrader, Sharesies)
  "superhero-vs-pearler",
  "superhero-vs-cmc-markets",
  "etoro-vs-stake",
  "etoro-vs-commsec",
  "etoro-vs-moomoo",
  "pearler-vs-selfwealth",
  "pearler-vs-stake",
  "opentrader-vs-selfwealth",
  "opentrader-vs-stake",
  "sharesies-vs-stake",
  "sharesies-vs-superhero",
  "superhero-vs-etoro",
  "nabtrade-vs-superhero",
  "pearler-vs-commsec",
  // CFD/Forex pairs
  "ic-markets-vs-pepperstone",
  "fp-markets-vs-ic-markets",
  "fp-markets-vs-pepperstone",
  "axi-vs-pepperstone",
  "fusion-markets-vs-ic-markets",
  "eightcap-vs-ic-markets",
  "ig-markets-vs-pepperstone",
  "fusion-markets-vs-pepperstone",
  "thinkmarkets-vs-pepperstone",
  "axi-vs-ic-markets",
  // Savings account pairs
  "ing-savings-maximiser-vs-ubank-save",
  "ing-savings-maximiser-vs-macquarie-savings",
  "ubank-save-vs-macquarie-savings",
  "ing-savings-maximiser-vs-anz-plus-save",
  "westpac-life-vs-anz-plus-save",
  // Term deposit pairs
  "judo-bank-td-vs-ing-term-deposit",
  "judo-bank-td-vs-macquarie-term-deposit",
  "ing-term-deposit-vs-macquarie-term-deposit",
  // Super fund pairs
  "australiansuper-vs-hostplus",
  "australiansuper-vs-australian-retirement-trust",
  "hostplus-vs-aware-super",
  "unisuper-vs-australiansuper",
  "hesta-vs-australiansuper",
  "cbus-vs-hostplus",
];

function parseSlugs(slugs: string): string[] {
  return slugs.split("-vs-").filter(Boolean);
}

/**
 * Pre-render the top ~200 pairs at build time. Any other pair still
 * renders on-demand via the catch-all dynamic route.
 *
 * Pairs are generated programmatically from live broker inventory, so
 * adding a new broker auto-adds its pairings without a code change.
 * Falls back to the hand-curated POPULAR_PAIRS list if the build-time
 * DB query is unavailable.
 */
export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("brokers")
      .select("slug, name, rating, platform_type")
      .eq("status", "active");
    if (!rows || rows.length === 0) {
      return POPULAR_PAIRS.map((slugs) => ({ slugs }));
    }
    const pairs = generateVersusPairs(
      rows as { slug: string; name: string; rating: number | null; platform_type: PlatformType }[],
    );
    const topPairs = pairs.slice(0, 200).map((p) => p.slug);
    const merged = Array.from(new Set([...POPULAR_PAIRS, ...topPairs]));
    return merged.map((slugs) => ({ slugs }));
  } catch {
    return POPULAR_PAIRS.map((slugs) => ({ slugs }));
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slugs: string }>;
}): Promise<Metadata> {
  const { slugs } = await params;
  const brokerSlugs = parseSlugs(slugs);

  if (brokerSlugs.length < 2 || brokerSlugs.length > 4) return {};

  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("name, slug, rating, platform_type")
    .in("slug", brokerSlugs)
    .eq("status", "active");

  if (!brokers || brokers.length < 2) return {};

  // Preserve the order from the URL
  const ordered = brokerSlugs
    .map((s) => brokers.find((b) => b.slug === s))
    .filter(Boolean) as typeof brokers;

  const names = ordered.map((b) => b.name);
  const title = `${names.join(" vs ")} — Side-by-Side Comparison (${CURRENT_YEAR})`;
  const hasShareBrokers = ordered.some((b) => b.platform_type === 'share_broker');
  const description = `Compare ${names.join(" and ")} head to head. See fees, ${hasShareBrokers ? 'CHESS sponsorship, ' : ''}ratings, pros & cons, and our honest pick for Australian investors.`;
  const canonical = `/versus/${slugs}`;

  return {
    title,
    description,
    openGraph: {
      title: `${names.join(" vs ")}`,
      description,
      images: [
        {
          url: `/api/og/versus?slugs=${encodeURIComponent(slugs)}`,
          width: 1200,
          height: 630,
          alt: `${names.join(" vs ")} comparison`,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical },
  };
}

async function VersusData({ brokerSlugs, slugs }: { brokerSlugs: string[]; slugs: string }) {
  const supabase = await createClient();

  // Fetch all brokers for the selector dropdowns
  const { data: allBrokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .order("name");

  // Build JSON-LD structured data
  const orderedBrokers = brokerSlugs
    .map((s) => (allBrokers || []).find((b) => b.slug === s))
    .filter(Boolean) as Broker[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${orderedBrokers.map((b) => b.name).join(" vs ")} Comparison`,
    description: `Compare ${orderedBrokers.map((b) => b.name).join(" and ")} side by side`,
    url: `${SITE_URL}/versus/${slugs}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: orderedBrokers.length,
      itemListElement: orderedBrokers.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "FinancialProduct",
          name: b.name,
          description: b.tagline || `${b.name} ${PLATFORM_LABELS[b.platform_type as PlatformType] || 'platform'}`,
          ...(b.rating && (b as unknown as Record<string, unknown>).review_count
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: b.rating,
                  bestRating: 5,
                  worstRating: 1,
                  reviewCount: (b as unknown as Record<string, unknown>).review_count,
                },
              }
            : {}),
        },
      })),
    },
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Compare Platforms", url: absoluteUrl("/compare") },
    { name: `${orderedBrokers.map((b) => b.name).join(" vs ")}` },
  ]);

  // FAQ structured data from editorial content (now fetched from Supabase)
  const editorial = await getVersusEditorial(brokerSlugs);
  const faqLd = editorial?.faqs && editorial.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: editorial.faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <VersusClient brokers={(allBrokers as Broker[]) || []} serverEditorial={editorial} />
      {(() => {
        // Related-comparison cross-links — helps crawlers discover the
        // full versus graph and nudges readers toward adjacent matchups.
        if (orderedBrokers.length !== 2) return null;
        const all = generateVersusPairs(
          ((allBrokers as Broker[]) || []).map((b) => ({
            slug: b.slug,
            name: b.name,
            rating: b.rating ?? null,
            platform_type: b.platform_type,
          })),
        );
        const [first, second] = [brokerSlugs[0]!, brokerSlugs[1]!].sort();
        const canonicalSlug = `${first}-vs-${second}`;
        const thisPair = all.find((p) => p.slug === canonicalSlug);
        if (!thisPair) return null;
        const related = getRelatedVersusPairs(thisPair, all, 8);
        if (related.length === 0) return null;
        const brokerBySlug = new Map(
          ((allBrokers as Broker[]) || []).map((b) => [b.slug, b.name]),
        );
        return (
          <div className="container-custom max-w-5xl pb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3">
              Related comparisons
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((p) => {
                const [a, b] = p.slug.split("-vs-");
                const nameA = brokerBySlug.get(a!) || a;
                const nameB = brokerBySlug.get(b!) || b;
                return (
                  <Link
                    key={p.slug}
                    href={`/versus/${p.slug}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 hover:border-amber-200 transition-colors"
                  >
                    {nameA} vs {nameB}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}

export default async function VersusSlugPage({
  params,
}: {
  params: Promise<{ slugs: string }>;
}) {
  const { slugs } = await params;
  const brokerSlugs = parseSlugs(slugs);

  if (brokerSlugs.length < 2 || brokerSlugs.length > 4) {
    notFound();
  }

  const supabase = await createClient();

  // Validate all slugs exist (must happen before render for proper notFound/redirect)
  const { data: matchedBrokers } = await supabase
    .from("brokers")
    .select("slug")
    .in("slug", brokerSlugs)
    .eq("status", "active");

  if (!matchedBrokers || matchedBrokers.length < 2) {
    notFound();
  }

  // Check if requested slugs are all valid
  const validSlugs = new Set(matchedBrokers.map((b) => b.slug));
  const allValid = brokerSlugs.every((s) => validSlugs.has(s));

  if (!allValid) {
    // If some slugs are invalid, redirect to just the valid ones
    const validOnly = brokerSlugs.filter((s) => validSlugs.has(s));
    if (validOnly.length >= 2) {
      redirect(`/versus/${validOnly.join("-vs-")}`);
    }
    notFound();
  }

  return (
    <Suspense fallback={<VersusLoading />}>
      <VersusData brokerSlugs={brokerSlugs} slugs={slugs} />
    </Suspense>
  );
}

function VersusLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <div className="h-3 md:h-5 w-32 md:w-48 bg-slate-200 rounded animate-pulse mb-2 md:mb-6" />
        <div className="h-6 md:h-10 w-52 md:w-96 bg-slate-200 rounded animate-pulse mb-1 md:mb-2" />
        <div className="h-3 md:h-5 w-44 md:w-80 bg-slate-100 rounded animate-pulse mb-3 md:mb-8" />
        <div className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-8 animate-pulse">
          <div className="h-3 w-36 bg-slate-200 rounded mb-3" />
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <div className="flex-1 h-12 md:h-14 bg-slate-200 rounded-lg" />
            <div className="flex-1 h-12 md:h-14 bg-slate-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
