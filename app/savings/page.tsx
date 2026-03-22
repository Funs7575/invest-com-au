import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker, Article } from "@/lib/types";
import { getVerticalBySlug } from "@/lib/verticals";
import { absoluteUrl } from "@/lib/seo";
import { boostFeaturedPartner } from "@/lib/sponsorship";
import VerticalPillarPage from "@/components/VerticalPillarPage";
import ForeignInvestorCallout from "@/components/ForeignInvestorCallout";

const vertical = getVerticalBySlug("savings")!;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: vertical.title,
  description: vertical.metaDescription,
  alternates: { canonical: "/savings" },
  openGraph: {
    title: vertical.title,
    description: vertical.metaDescription,
    url: absoluteUrl("/savings"),
    images: [
      {
        url: "/api/og/vertical?slug=savings",
        width: 1200,
        height: 630,
        alt: vertical.h1,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default async function SavingsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .in("platform_type", vertical.platformTypes);

  const sorted = boostFeaturedPartner(
    [...(brokers as Broker[] || [])].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
    ),
    0
  );

  const { data: articleData } = await supabase
    .from("articles")
    .select("id, title, slug, category, read_time")
    .or("category.in.(savings),tags.ov.{savings,term-deposit,interest-rate,high-interest}")
    .eq("status", "published")
    .limit(6);

  const relatedArticles = (articleData || []) as Pick<
    Article,
    "id" | "title" | "slug" | "category" | "read_time"
  >[];

  // Fetch relevant advisors for this vertical
  const advisorTypes = vertical.advisorTypes?.map(a => a.type) || [];
  const { data: advisors } = advisorTypes.length > 0
    ? await supabase
        .from("professionals")
        .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
        .eq("status", "active")
        .in("type", advisorTypes)
        .order("verified", { ascending: false })
        .order("rating", { ascending: false })
        .limit(4)
    : { data: [] };

  const { data: expertArticles } = await supabase
    .from("advisor_articles")
    .select("id, title, slug, excerpt, category, author_name, author_photo_url, views, created_at")
    .eq("status", "published")
    .order("views", { ascending: false })
    .limit(3);

  return (
    <>
      <ForeignInvestorCallout
        href="/foreign-investment/savings"
        verticalName="Australian savings"
        keyRule="10% withholding tax on interest for non-residents · $250k government guarantee applies · most banks require Australian address"
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
