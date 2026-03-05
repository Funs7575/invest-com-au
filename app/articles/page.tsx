import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ArticleSearchInput from "@/components/ArticleSearchInput";
import ArticleCategoryFilter from "@/components/ArticleCategoryFilter";
import LeadMagnet from "@/components/LeadMagnet";

export const metadata = {
  title: "Investing Guides & Articles",
  description:
    "Expert guides on shares, crypto, super funds, robo-advisors, property investing, ETFs, tax, SMSF & strategy. Independent Australian investing research.",
  openGraph: {
    title: "Investing Guides & Articles — Invest.com.au",
    description:
      "Expert guides on shares, crypto, super, robo-advisors, property, ETFs, tax & SMSF. Independent Australian research.",
    images: [
      {
        url: "/api/og?title=Investing+Guides&subtitle=Shares,+crypto,+super,+property+%26+more&type=article",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/articles" },
};

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-emerald-100 text-emerald-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
  reviews: "bg-teal-100 text-teal-700",
  crypto: "bg-orange-100 text-orange-700",
  etfs: "bg-indigo-100 text-indigo-700",
  "robo-advisors": "bg-violet-100 text-violet-700",
  "research-tools": "bg-cyan-100 text-cyan-700",
  super: "bg-emerald-100 text-emerald-700",
  property: "bg-lime-100 text-lime-700",
  "cfd-forex": "bg-rose-100 text-rose-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  tax: "Tax",
  beginners: "Beginners",
  smsf: "SMSF",
  strategy: "Strategy",
  news: "News",
  reviews: "Reviews",
  crypto: "Crypto",
  etfs: "ETFs",
  "robo-advisors": "Robo-Advisors",
  "research-tools": "Research Tools",
  super: "Super",
  property: "Property",
  "cfd-forex": "CFD & Forex",
};

/* ─── Topic Cluster Definitions ─── */

interface ClusterDef {
  id: string;
  name: string;
  description: string;
  pillarSlug: string;
  spokesSlugs: string[];
  /** Category filter values that map to this cluster */
  filterCategories: string[];
}

const ARTICLE_CLUSTERS: ClusterDef[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    description: "New to investing? Start here.",
    pillarSlug: "investing-for-beginners-australia",
    spokesSlugs: [
      "how-to-invest-australia",
      "how-to-buy-shares",
      "how-to-invest-1000-dollars",
      "brokerage-account-explained",
      "how-to-choose-a-broker",
      "chess-vs-custodial",
      "dca-asx",
      "investing-mistakes-beginners",
      "investing-kids",
      "read-annual-report",
      "smsf-guide",
      "shares-vs-etfs",
      "stake-fees-2026",
    ],
    filterCategories: ["beginners"],
  },
  {
    id: "share-trading",
    name: "Share Trading & Brokers",
    description: "Compare platforms and find the right platform.",
    pillarSlug: "best-share-trading-platforms-australia",
    spokesSlugs: [
      "best-investing-app-australia",
      "best-intl-brokers",
    ],
    filterCategories: ["reviews"],
  },
  {
    id: "etfs",
    name: "ETFs",
    description: "Build a diversified portfolio with exchange-traded funds.",
    pillarSlug: "best-etfs-australia",
    spokesSlugs: [
      "what-is-an-etf",
      "how-to-buy-etfs",
      "best-asx-etfs",
      "best-international-etfs",
      "vanguard-etfs-australia",
      "betashares-etfs",
      "high-dividend-etfs-australia",
      "etf-vs-managed-funds",
    ],
    filterCategories: ["etfs"],
  },
  {
    id: "crypto",
    name: "Cryptocurrency",
    description: "Buy, trade, and understand crypto in Australia.",
    pillarSlug: "best-crypto-exchanges-australia",
    spokesSlugs: [
      "how-to-buy-bitcoin-australia",
      "how-to-buy-ethereum-australia",
      "crypto-trading-australia",
      "crypto-wallet-australia",
      "crypto-vs-shares",
      "crypto-tax-australia",
    ],
    filterCategories: ["crypto"],
  },
  {
    id: "tax-super",
    name: "Tax & Super",
    description: "Minimise tax and manage your super.",
    pillarSlug: "tax-guide-australian-investors",
    spokesSlugs: [
      "cgt-discount",
      "franking-credits",
      "tax-loss-harvesting",
      "tax-return-shares",
    ],
    filterCategories: ["tax", "smsf"],
  },
  {
    id: "robo-advisors",
    name: "Robo-Advisors",
    description: "Automated investing for hands-off portfolios.",
    pillarSlug: "robo-advisors-australia",
    spokesSlugs: [
      "robo-advisor-vs-diy",
      "stockspot-review",
      "raiz-review",
      "spaceship-review",
    ],
    filterCategories: ["robo-advisors"],
  },
  {
    id: "research-tools",
    name: "Research Tools",
    description: "Analyse stocks and build conviction before you buy.",
    pillarSlug: "investment-research-tools-australia",
    spokesSlugs: [
      "simply-wall-st-review",
      "tradingview-australia",
      "morningstar-australia",
      "how-to-research-stocks",
    ],
    filterCategories: ["research-tools"],
  },
  {
    id: "super",
    name: "Superannuation",
    description: "Choose the right super fund and grow your retirement savings.",
    pillarSlug: "superannuation-guide-australia",
    spokesSlugs: [
      "smsf-guide",
      "industry-vs-retail-super",
      "super-contribution-strategies",
      "how-to-consolidate-super",
      "super-vs-investing-outside-super",
    ],
    filterCategories: ["super"],
  },
  {
    id: "property",
    name: "Property Investing",
    description: "REITs, fractional property, and direct investment compared.",
    pillarSlug: "property-investing-australia",
    spokesSlugs: [
      "reits-australia",
      "fractional-property-investing",
      "property-vs-shares",
      "negative-gearing-explained",
      "investment-property-loans",
    ],
    filterCategories: ["property"],
  },
  {
    id: "cfd-forex",
    name: "CFD & Forex",
    description: "Understand leveraged trading and manage the risks.",
    pillarSlug: "cfd-forex-trading-australia",
    spokesSlugs: [
      "what-is-cfd-trading",
      "forex-trading-australia",
      "cfd-vs-share-trading",
      "cfd-risk-management",
    ],
    filterCategories: ["cfd-forex"],
  },
];

/** All slugs used by clusters, for identifying "unclustered" articles */
const ALL_CLUSTER_SLUGS = new Set(
  ARTICLE_CLUSTERS.flatMap((c) => [c.pillarSlug, ...c.spokesSlugs])
);

/** Maps filter category to cluster IDs */
const CATEGORY_TO_CLUSTER: Record<string, string[]> = {};
for (const cluster of ARTICLE_CLUSTERS) {
  for (const cat of cluster.filterCategories) {
    if (!CATEGORY_TO_CLUSTER[cat]) CATEGORY_TO_CLUSTER[cat] = [];
    CATEGORY_TO_CLUSTER[cat].push(cluster.id);
  }
}

export const revalidate = 3600; // ISR: revalidate every hour

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false });

  const allArticles = (articles as Article[]) || [];

  // Build a slug→article lookup for cluster rendering
  const articleBySlug = new Map<string, Article>();
  for (const a of allArticles) {
    articleBySlug.set(a.slug, a);
  }

  const isSearching = !!(q && q.trim());
  const isFiltering = !!(category && category !== "all");
  const showClustered = !isSearching && (!isFiltering || !!CATEGORY_TO_CLUSTER[category!]);

  // For search/non-cluster-filter: flat filtered list
  let flatFiltered: Article[] = [];
  if (!showClustered) {
    flatFiltered = allArticles;
    if (isFiltering) {
      flatFiltered = flatFiltered.filter((a) => a.category === category);
    }
    if (isSearching) {
      const query = q!.trim().toLowerCase();
      flatFiltered = flatFiltered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.excerpt && a.excerpt.toLowerCase().includes(query)) ||
          (a.category && a.category.toLowerCase().includes(query))
      );
    }
  }

  // Determine which clusters to show
  const visibleClusters = showClustered
    ? isFiltering
      ? ARTICLE_CLUSTERS.filter((c) => CATEGORY_TO_CLUSTER[category!]?.includes(c.id))
      : ARTICLE_CLUSTERS
    : [];

  // Collect unclustered articles (only shown when "all" + no search)
  const unclusteredArticles = !isFiltering && !isSearching
    ? allArticles.filter((a) => !ALL_CLUSTER_SLUGS.has(a.slug))
    : [];

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        {/* Page Header */}
        <div className="mb-2.5 md:mb-10">
          <h1 className="text-lg md:text-4xl font-extrabold mb-0.5 md:mb-3">
            Guides &amp; Articles
          </h1>
          <p className="text-[0.69rem] md:text-lg text-slate-600 max-w-2xl">
            Expert guides on shares, crypto, super, property, ETFs, tax &amp; more
          </p>
        </div>

        {/* Search + Category Filter */}
        <Suspense fallback={<div className="h-10 mb-2 md:mb-4" />}>
          <ArticleSearchInput />
        </Suspense>

        <Suspense fallback={<div className="h-8 mb-3 md:mb-8" />}>
          <ArticleCategoryFilter />
        </Suspense>

        {/* ─── Clustered Layout (default view + category filter) ─── */}
        {showClustered && visibleClusters.length > 0 && (
          <div>
            {visibleClusters.map((cluster, ci) => {
              const pillar = articleBySlug.get(cluster.pillarSlug);
              const spokes = cluster.spokesSlugs
                .map((slug) => articleBySlug.get(slug))
                .filter((a): a is Article => !!a);

              // Skip cluster if no articles found at all
              if (!pillar && spokes.length === 0) return null;

              return (
                <section
                  key={cluster.id}
                  id={`cluster-${cluster.id}`}
                  className={ci > 0 ? "border-t border-slate-200 pt-6 md:pt-10 mt-6 md:mt-10" : ""}
                >
                  {/* Section Header */}
                  <div className="mb-4 md:mb-6">
                    <h2 className="text-base md:text-2xl font-extrabold text-slate-900">
                      {cluster.name}
                    </h2>
                    <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5">
                      {cluster.description}
                    </p>
                  </div>

                  {/* Pillar Card — full-width hero */}
                  {pillar && (
                    <PillarCard article={pillar} />
                  )}

                  {/* Spoke Cards — grid */}
                  {spokes.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6 mt-3 md:mt-5">
                      {spokes.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  )}

                  {/* Lead magnet after 2nd and 4th clusters */}
                  {(ci === 1 || ci === 3) && (
                    <div className="mt-5 md:mt-8">
                      <LeadMagnet />
                    </div>
                  )}
                </section>
              );
            })}

            {/* Unclustered articles (articles not in any cluster) */}
            {unclusteredArticles.length > 0 && (
              <section className="border-t border-slate-200 pt-6 md:pt-10 mt-6 md:mt-10">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-base md:text-2xl font-extrabold text-slate-900">
                    More Articles
                  </h2>
                  <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5">
                    Additional guides, news, and analysis.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
                  {unclusteredArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── Flat Layout (search results or non-cluster category filter) ─── */}
        {!showClustered && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
              {flatFiltered.map((article, idx) => (
                <ArticleCard key={article.id} article={article} priority={idx < 3} />
              ))}
            </div>

            {flatFiltered.length === 0 && (
              <div className="text-center py-8 md:py-16 text-slate-500">
                <p className="text-sm md:text-lg font-medium mb-1 md:mb-2">No articles found</p>
                <p className="text-xs md:text-sm">
                  {q
                    ? "Try a different search or category."
                    : "Try selecting a different category."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Pillar Card Component ─── */

function PillarCard({ article }: { article: Article }) {
  const categoryColor =
    CATEGORY_COLORS[article.category || ""] || "bg-slate-100 text-slate-700";

  return (
    <Link
      href={`/article/${article.slug}`}
      className="block border border-slate-200 rounded-lg md:rounded-xl bg-slate-50 hover:shadow-lg hover:scale-[1.005] transition-all overflow-hidden group"
    >
      <div className="md:flex md:items-stretch">
        {/* Cover Image */}
        {article.cover_image_url && (
          <div className="aspect-[16/9] md:aspect-auto md:w-2/5 overflow-hidden bg-slate-100 relative shrink-0">
            <Image
              src={article.cover_image_url}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
            />
          </div>
        )}
        <div className="p-3 md:p-6 flex flex-col flex-1">
          {/* Badges Row */}
          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-3">
            <span className="text-[0.6rem] md:text-[0.69rem] font-bold px-1.5 md:px-2.5 py-0.5 rounded-full bg-blue-600 text-white">
              Start Here
            </span>
            {article.category && (
              <span
                className={`text-[0.6rem] md:text-xs font-semibold px-1.5 md:px-2.5 py-px md:py-0.5 rounded-full ${categoryColor}`}
              >
                {CATEGORY_LABELS[article.category || ""] || article.category}
              </span>
            )}
            {article.read_time && (
              <span className="text-[0.6rem] md:text-xs text-slate-400 ml-auto">
                {article.read_time} min read
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm md:text-xl font-bold mb-1 md:mb-2 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
            {article.title}
          </h3>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="hidden md:block text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
              {article.excerpt}
            </p>
          )}

          {/* CTA */}
          <span className="text-[0.62rem] md:text-sm font-semibold text-blue-700 group-hover:text-blue-800 transition-colors mt-auto">
            Read the complete guide →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Standard Article Card Component ─── */

function ArticleCard({ article, priority = false }: { article: Article; priority?: boolean }) {
  const categoryColor =
    CATEGORY_COLORS[article.category || ""] || "bg-slate-100 text-slate-700";

  return (
    <Link
      href={`/article/${article.slug}`}
      className="border border-slate-200 rounded-lg md:rounded-xl bg-white hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col overflow-hidden group"
    >
      {/* Cover Image */}
      {article.cover_image_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            {...(priority ? { priority: true } : {})}
          />
        </div>
      ) : null}
      <div className="p-2.5 md:p-6 flex flex-col flex-1">
        {/* Badges Row */}
        <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-3">
          {article.category && (
            <span
              className={`text-[0.62rem] md:text-xs font-semibold px-1.5 md:px-2.5 py-px md:py-0.5 rounded-full ${categoryColor}`}
            >
              {CATEGORY_LABELS[article.category || ""] || article.category}
            </span>
          )}
          <span
            className={`hidden md:inline text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              article.evergreen
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
            }`}
          >
            {article.evergreen ? "Evergreen" : "News"}
          </span>
          {article.read_time && (
            <span className="text-[0.62rem] md:text-xs text-slate-400 ml-auto">
              {article.read_time} min
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xs md:text-lg font-bold mb-1 md:mb-2 line-clamp-2 leading-snug">
          {article.title}
        </h2>

        {/* Excerpt — hidden on mobile to save space */}
        {article.excerpt && (
          <p className="hidden md:block text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
            {article.excerpt}
          </p>
        )}

        {/* CTA */}
        <span className="text-[0.62rem] md:text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors mt-auto">
          Read →
        </span>
      </div>
    </Link>
  );
}
