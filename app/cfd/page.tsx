import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker, Article } from "@/lib/types";
import { getVerticalBySlug } from "@/lib/verticals";
import { absoluteUrl } from "@/lib/seo";
import { boostFeaturedPartner } from "@/lib/sponsorship";
import VerticalPillarPage from "@/components/VerticalPillarPage";

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
    .or("category.in.(cfd-forex),tags.ov.{cfd,forex,trading,leverage,spreads}")
    .eq("status", "published")
    .limit(6);

  const relatedArticles = (articleData || []) as Pick<
    Article,
    "id" | "title" | "slug" | "category" | "read_time"
  >[];

  return (
    <VerticalPillarPage
      config={vertical}
      brokers={sorted}
      relatedArticles={relatedArticles}
    />
  );
}
