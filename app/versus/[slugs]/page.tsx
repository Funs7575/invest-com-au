import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import VersusClient from "../VersusClient";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

/**
 * SEO-friendly versus pages at /versus/stake-vs-commsec
 * Server-rendered with full metadata, JSON-LD, and sitemap entries.
 * Catches "slug1-vs-slug2" and "slug1-vs-slug2-vs-slug3" patterns.
 */

// Top comparison pairs to pre-render at build time
const POPULAR_PAIRS = [
  "stake-vs-commsec",
  "cmc-markets-vs-moomoo",
  "interactive-brokers-vs-saxo",
  "stake-vs-moomoo",
  "selfwealth-vs-cmc-markets",
  "commsec-vs-nabtrade",
  "stake-vs-selfwealth",
  "moomoo-vs-commsec",
  "interactive-brokers-vs-cmc-markets",
  "superhero-vs-stake",
  "cmc-markets-vs-commsec",
  "webull-vs-stake",
  "superhero-vs-commsec",
  "saxo-vs-cmc-markets",
  "moomoo-vs-selfwealth",
  "tiger-brokers-vs-moomoo",
  "stake-vs-interactive-brokers",
  "commsec-vs-selfwealth",
  "nabtrade-vs-selfwealth",
  "cmc-markets-vs-selfwealth",
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
    .select("name, slug, rating")
    .in("slug", brokerSlugs)
    .eq("status", "active");

  if (!brokers || brokers.length < 2) return {};

  // Preserve the order from the URL
  const ordered = brokerSlugs
    .map((s) => brokers.find((b) => b.slug === s))
    .filter(Boolean) as typeof brokers;

  const names = ordered.map((b) => b.name);
  const title = `${names.join(" vs ")} — Side-by-Side Comparison (2026)`;
  const description = `Compare ${names.join(" and ")} head to head. See fees, CHESS sponsorship, ratings, pros & cons, and our honest pick for Australian investors.`;
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
          description: b.tagline || `${b.name} broker`,
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
      { "@type": "ListItem", position: 2, name: "Compare Brokers", item: "https://invest.com.au/compare" },
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
