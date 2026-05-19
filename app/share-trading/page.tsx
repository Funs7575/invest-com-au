import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBrokersFull } from "@/lib/cached-data";
import type { Article } from "@/lib/types";
import { getVerticalBySlug } from "@/lib/verticals";
import { absoluteUrl } from "@/lib/seo";
import { boostFeaturedPartner } from "@/lib/sponsorship";
import VerticalPillarPage from "@/components/VerticalPillarPage";
import ForeignInvestorCallout from "@/components/ForeignInvestorCallout";
import NonResidentFilterBanner from "@/components/NonResidentFilterBanner";

const vertical = getVerticalBySlug("share-trading")!;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: vertical.title,
  description: vertical.metaDescription,
  alternates: { canonical: "/share-trading" },
  openGraph: {
    title: vertical.title,
    description: vertical.metaDescription,
    url: absoluteUrl("/share-trading"),
    images: [
      {
        url: "/api/og/vertical?slug=share-trading",
        width: 1200,
        height: 630,
        alt: vertical.h1,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default async function ShareTradingPage() {
  const supabase = await createClient();
  const advisorTypes = vertical.advisorTypes?.map(a => a.type) || [];

  // Parallelise the 4 independent reads (previously serial = 4× cross-region
  // RTT on cold cache). Brokers come from the shared 24h unstable_cache
  // helper in lib/cached-data.ts — same query as 4 other pillars + the
  // homepage, so subsequent renders hit the L2 cache instead of Supabase.
  const [allActiveBrokers, articleRes, advisorsRes, expertArticlesRes] =
    await Promise.all([
      getActiveBrokersFull(),
      supabase
        .from("articles")
        .select("id, title, slug, category, read_time")
        .or("category.in.(beginners,strategy,reviews),tags.ov.{share-trading,asx,brokerage}")
        .eq("status", "published")
        .limit(6),
      (advisorTypes.length > 0
        ? supabase
            .from("professionals")
            .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
            .eq("status", "active")
            .in("type", advisorTypes)
            .order("verified", { ascending: false })
            .order("rating", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: null })) as Promise<{
        data: Array<{
          slug: string;
          name: string;
          firm_name: string;
          type: string;
          location_display: string;
          rating: number;
          review_count: number;
          photo_url: string;
          verified: boolean;
        }> | null;
      }>,
      supabase
        .from("advisor_articles")
        .select("id, title, slug, excerpt, category, author_name, author_photo_url, views, created_at")
        .eq("status", "published")
        .order("views", { ascending: false })
        .limit(3),
    ]);

  // Filter the cached full broker set to this vertical's platform types
  // in memory — same shape as the prior `.in("platform_type", ...)` filter.
  const brokers = allActiveBrokers.filter((b) =>
    vertical.platformTypes.includes(b.platform_type as (typeof vertical.platformTypes)[number]),
  );

  const sorted = boostFeaturedPartner(
    [...brokers].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    0,
  );

  const relatedArticles = (articleRes.data || []) as Pick<
    Article,
    "id" | "title" | "slug" | "category" | "read_time"
  >[];
  const advisors = advisorsRes.data || [];
  const expertArticles = expertArticlesRes.data || [];

  const nonResidentCount = sorted.filter(b => b.accepts_non_residents === true).length;

  return (
    <>
      <ForeignInvestorCallout
        href="/foreign-investment/shares"
        verticalName="Australian shares"
        keyRule="30% WHT on unfranked dividends (reduced by DTA) · CGT exempt for non-residents on most listed shares · limited broker access without Australian address"
      />
      <NonResidentFilterBanner
        total={sorted.length}
        nonResidentCount={nonResidentCount}
        vertical="shares"
      />
      <VerticalPillarPage
        config={vertical}
        brokers={sorted}
        relatedArticles={relatedArticles}
        advisors={advisors || []}
        expertArticles={expertArticles || []}
      />
    </>
  );
}
