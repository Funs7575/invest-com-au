import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveBrokersFull } from "@/lib/cached-data";
import type { Article } from "@/lib/types";
import { getVerticalBySlug } from "@/lib/verticals";
import { absoluteUrl } from "@/lib/seo";
import { boostFeaturedPartner } from "@/lib/sponsorship";
import VerticalPillarPage from "@/components/VerticalPillarPage";
import ForeignInvestorCallout from "@/components/ForeignInvestorCallout";
import ComplianceFooter from "@/components/ComplianceFooter";

const vertical = getVerticalBySlug("cfd")!;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: vertical.title,
  description: vertical.metaDescription,
  alternates: { canonical: "/cfd" },
  openGraph: {
    title: vertical.title,
    description: vertical.metaDescription,
    url: absoluteUrl("/cfd"),
    images: [
      {
        url: "/api/og/vertical?slug=cfd",
        width: 1200,
        height: 630,
        alt: vertical.h1,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default async function CfdPage() {
  const supabase = await createClient();
  const advisorTypes = vertical.advisorTypes?.map(a => a.type) || [];

  // Parallelised — see app/share-trading/page.tsx for full rationale.
  const [allActiveBrokers, articleRes, advisorsRes, expertArticlesRes] =
    await Promise.all([
      getActiveBrokersFull(),
      supabase
        .from("articles")
        .select("id, title, slug, category, read_time")
        .or("category.in.(cfd-forex),tags.ov.{cfd,forex,trading,leverage,spreads}")
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

  return (
    <>
      <ForeignInvestorCallout
        href="/foreign-investment"
        verticalName="CFD & Forex"
        keyRule="Most ASIC-regulated CFD brokers accept non-residents · ASIC leverage limits apply to all retail clients · CFD profits may be taxable Australian income"
      />
      <VerticalPillarPage
        config={vertical}
        brokers={sorted}
        relatedArticles={relatedArticles}
        advisors={advisors || []}
        expertArticles={expertArticles || []}
      />
      <div className="container-custom pb-8">
        <ComplianceFooter variant="cfd" />
      </div>
    </>
  );
}
