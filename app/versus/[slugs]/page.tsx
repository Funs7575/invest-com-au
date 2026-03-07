import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Broker, PlatformType } from "@/lib/types";
import type { Metadata } from "next";
import VersusClient from "../VersusClient";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";

const PLATFORM_LABELS: Record<PlatformType, string> = {
  share_broker: "broker",
  crypto_exchange: "crypto exchange",
  robo_advisor: "robo-advisor",
  research_tool: "research tool",
  super_fund: "super fund",
  property_platform: "property platform",
  cfd_forex: "CFD broker",
  savings_account: "savings account",
  term_deposit: "term deposit",
};

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

export async function generateStaticParams() {
  return POPULAR_PAIRS.map((slugs) => ({ slugs }));
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
      title: `${names.join(" vs ")} — Invest.com.au`,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(names.join(" vs "))}&subtitle=Side-by-Side+Comparison&type=default`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical },
  };
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

  // Validate all slugs exist
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
          aggregateRating: b.rating
            ? {
                "@type": "AggregateRating",
                ratingValue: b.rating,
                bestRating: 5,
                worstRating: 1,
              }
            : undefined,
        },
      })),
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
      { "@type": "ListItem", position: 2, name: "Compare Platforms", item: "https://invest.com.au/compare" },
      { "@type": "ListItem", position: 3, name: `${orderedBrokers.map((b) => b.name).join(" vs ")}` },
    ],
  };

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
      <Suspense fallback={<VersusLoading />}>
        <VersusClient brokers={(allBrokers as Broker[]) || []} />
      </Suspense>
    </>
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
