import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { PLATFORM_TYPE_LABELS } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
  CURRENT_YEAR,
  ORGANIZATION_JSONLD,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import BrokerLogo from "@/components/BrokerLogo";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import Icon from "@/components/Icon";
import VersusHubSearch from "./VersusHubSearch";

export const revalidate = 3600;

const pageTitle = `Compare Platforms Head-to-Head (${CURRENT_YEAR})`;
const pageDescription =
  "Compare any two Australian brokers side by side. See fees, features, ratings, and our honest pick. Popular share broker and crypto exchange comparisons.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/versus" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/versus",
    images: [
      {
        url: "/api/og?title=Compare+Brokers+Head-to-Head&subtitle=Side-by-side+fees%2C+features+%26+ratings&type=default",
        width: 1200,
        height: 630,
        alt: "Compare Brokers Head-to-Head",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

/** Generate all pairs for a given set of brokers */
function generatePairs(brokers: Broker[]): { a: Broker; b: Broker; slug: string }[] {
  const pairs: { a: Broker; b: Broker; slug: string }[] = [];
  for (let i = 0; i < brokers.length; i++) {
    for (let j = i + 1; j < brokers.length; j++) {
      const [first, second] = [brokers[i], brokers[j]].sort((x, y) =>
        x.slug.localeCompare(y.slug)
      );
      pairs.push({
        a: first,
        b: second,
        slug: `${first.slug}-vs-${second.slug}`,
      });
    }
  }
  return pairs;
}

export default async function VersusHubPage() {
  // Defensive fetch: any DB failure now degrades to an empty hub
  // rather than throwing an uncaught 503. Both queries are independent
  // — wrap each individually so a broken analytics_events read doesn't
  // wipe out the broker list.
  let allBrokers: Broker[] = [];
  let popularEvents: { page: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { data: brokers } = await supabase
      .from("brokers")
      .select(
        "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, platform_type, status"
      )
      .eq("status", "active")
      .order("rating", { ascending: false });
    allBrokers = (brokers as Broker[]) || [];

    const { data: events } = await supabase
      .from("analytics_events")
      .select("page")
      .eq("event_type", "page_view")
      .like("page", "/versus/%")
      .order("created_at", { ascending: false })
      .limit(5000);
    popularEvents = (events as { page: string | null }[]) || [];
  } catch {
    // Fall through with empty arrays — the page renders all sections
    // but with empty state, never 503s.
  }

  // Separate by type
  const shareBrokers = allBrokers.filter(
    (b) => b.platform_type === "share_broker"
  );
  const cryptoExchanges = allBrokers.filter(
    (b) => b.platform_type === "crypto_exchange"
  );

  // Count occurrences of each versus page
  const pageCounts = new Map<string, number>();
  for (const event of popularEvents) {
    if (!event.page) continue;
    const path = event.page as string;
    // Only count pages with "-vs-" pattern (not the hub page)
    if (!path.includes("-vs-")) continue;
    pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
  }

  // Sort by count and take top 20
  const topPaths = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path]) => path);

  // Resolve top paths into broker pairs
  const brokerBySlug = new Map(allBrokers.map((b) => [b.slug, b]));
  const popularPairs: { a: Broker; b: Broker; slug: string; views: number }[] = [];
  for (const path of topPaths) {
    const slug = path.replace("/versus/", "");
    const parts = slug.split("-vs-");
    if (parts.length < 2) continue;
    // For compound slugs like "cmc-markets-vs-commsec", find the right split
    let foundA: Broker | undefined;
    let foundB: Broker | undefined;
    for (let i = 1; i < parts.length; i++) {
      const slugA = parts.slice(0, i).join("-vs-");
      const slugB = parts.slice(i).join("-vs-");
      // Try both as direct slugs
      const brokerA = brokerBySlug.get(slugA);
      const brokerB = brokerBySlug.get(slugB);
      if (brokerA && brokerB) {
        foundA = brokerA;
        foundB = brokerB;
        break;
      }
    }
    // Also try splitting on the last "-vs-" occurrence
    if (!foundA || !foundB) {
      const vsIdx = slug.lastIndexOf("-vs-");
      if (vsIdx > 0) {
        const sa = slug.substring(0, vsIdx);
        const sb = slug.substring(vsIdx + 4);
        if (brokerBySlug.has(sa) && brokerBySlug.has(sb)) {
          foundA = brokerBySlug.get(sa);
          foundB = brokerBySlug.get(sb);
        }
      }
    }
    if (foundA && foundB) {
      popularPairs.push({
        a: foundA,
        b: foundB,
        slug,
        views: pageCounts.get(path) || 0,
      });
    }
  }

  // Generate share broker pairs (top brokers only to keep grid manageable)
  const topShareBrokers = shareBrokers.slice(0, 12);
  const sharePairs = generatePairs(topShareBrokers);

  // Generate crypto pairs
  const cryptoPairs = generatePairs(cryptoExchanges);

  // JSON-LD
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Compare Brokers" },
  ]);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Compare Brokers Head-to-Head (${CURRENT_YEAR})`,
    description: pageDescription,
    url: absoluteUrl("/versus"),
    publisher: ORGANIZATION_JSONLD,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Popular Broker Comparisons",
    numberOfItems: popularPairs.length,
    itemListElement: popularPairs.map((pair, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${pair.a.name} vs ${pair.b.name}`,
      url: absoluteUrl(`/versus/${pair.slug}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbs, webPageJsonLd, itemListJsonLd]),
        }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Compare Brokers</span>
          </nav>

          {/* Hero */}
          <h1 className="text-xl md:text-4xl font-extrabold mb-1.5 md:mb-3">
            Compare Brokers Head-to-Head
          </h1>
          <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-8 max-w-2xl">
            <span className="hidden md:inline">
              Choose any two Australian platforms and see a detailed side-by-side
              comparison of fees, features, ratings, and our honest editorial
              verdict.
            </span>
            <span className="md:hidden">
              Side-by-side comparisons of fees, features, and our honest pick.
            </span>
          </p>

          {/* Disclosure */}
          <p className="text-[0.6rem] md:text-xs text-slate-400 mb-6 md:mb-10">
            {ADVERTISER_DISCLOSURE_SHORT}
          </p>

          {/* Search/filter */}
          <Suspense fallback={null}>
            <VersusHubSearch brokers={allBrokers} />
          </Suspense>

          {/* Most Popular Comparisons */}
          {popularPairs.length > 0 && (
            <section className="mb-8 md:mb-14">
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-5 flex items-center gap-2">
                <Icon name="trending-up" size={20} className="text-slate-500" />
                Most Popular Comparisons
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {popularPairs.map((pair) => (
                  <ComparisonCard
                    key={pair.slug}
                    a={pair.a}
                    b={pair.b}
                    slug={pair.slug}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Share Broker Comparisons */}
          {sharePairs.length > 0 && (
            <section className="mb-8 md:mb-14">
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-5 flex items-center gap-2">
                <Icon name="bar-chart" size={20} className="text-slate-500" />
                Share Broker Comparisons
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {sharePairs.slice(0, 30).map((pair) => (
                  <ComparisonCard
                    key={pair.slug}
                    a={pair.a}
                    b={pair.b}
                    slug={pair.slug}
                  />
                ))}
              </div>
              {sharePairs.length > 30 && (
                <p className="text-xs text-slate-400 mt-3 text-center">
                  + {sharePairs.length - 30} more comparisons available via
                  search above
                </p>
              )}
            </section>
          )}

          {/* Crypto Exchange Comparisons */}
          {cryptoPairs.length > 0 && (
            <section className="mb-8 md:mb-14">
              <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-5 flex items-center gap-2">
                <Icon name="bitcoin" size={20} className="text-slate-500" />
                Crypto Exchange Comparisons
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {cryptoPairs.map((pair) => (
                  <ComparisonCard
                    key={pair.slug}
                    a={pair.a}
                    b={pair.b}
                    slug={pair.slug}
                  />
                ))}
              </div>
            </section>
          )}

          {/* CTA to custom comparison */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 text-center mb-6">
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">
              Can&apos;t find your comparison?
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">
              Use the search above to compare any two platforms, or take our quiz
              to find the best platform for you.
            </p>
            <Link
              href="/quiz"
              className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Take the 60-Second Quiz
            </Link>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-5 md:mt-8 text-[0.62rem] md:text-xs text-slate-400 text-center">
            <p>
              All comparisons reviewed by{" "}
              <a
                href={REVIEW_AUTHOR.url}
                className="underline hover:text-slate-900"
              >
                {REVIEW_AUTHOR.name}
              </a>
              . Fees verified against official platform pricing pages.{" "}
              <Link
                href="/how-we-verify"
                className="underline hover:text-slate-900"
              >
                Our methodology
              </Link>
            </p>
          </div>

          <CompactDisclaimerLine />
        </div>
      </div>
    </>
  );
}

/** Comparison card component */
function ComparisonCard({
  a,
  b,
  slug,
}: {
  a: Broker;
  b: Broker;
  slug: string;
}) {
  return (
    <Link
      href={`/versus/${slug}`}
      className="group flex items-center gap-2.5 md:gap-3 p-2.5 md:p-3.5 border border-slate-200 rounded-lg md:rounded-xl bg-white hover:border-slate-400 hover:shadow-sm transition-all"
    >
      <BrokerLogo broker={a} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-semibold text-slate-900 truncate">
          {a.name} vs {b.name}
        </p>
        <p className="text-[0.6rem] md:text-xs text-slate-400 truncate">
          {a.asx_fee || PLATFORM_TYPE_LABELS[a.platform_type]} vs{" "}
          {b.asx_fee || PLATFORM_TYPE_LABELS[b.platform_type]}
        </p>
      </div>
      <BrokerLogo broker={b} size="sm" />
      <span className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
        <Icon name="chevron-right" size={16} />
      </span>
    </Link>
  );
}

function VersusLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <div className="h-3 md:h-5 w-32 md:w-48 bg-slate-200 rounded animate-pulse mb-2 md:mb-6" />
        <div className="h-6 md:h-10 w-52 md:w-96 bg-slate-200 rounded animate-pulse mb-1 md:mb-2" />
        <div className="h-3 md:h-5 w-44 md:w-80 bg-slate-100 rounded animate-pulse mb-3 md:mb-8" />
      </div>
    </div>
  );
}
