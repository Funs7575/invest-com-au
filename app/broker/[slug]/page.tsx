import { createClient } from "@/lib/supabase/server";
import type { Broker, TeamMember } from "@/lib/types";
import { notFound } from "next/navigation";
import BrokerReviewClient from "./BrokerReviewClient";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  brokerReviewJsonLd,
  reviewArticleJsonLd,
  SITE_NAME,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import { scoreBrokerSimilarity } from "@/lib/internal-links";

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: broker } = await supabase
    .from('brokers')
    .select('name, tagline, rating')
    .eq('slug', slug)
    .single();

  if (!broker) return { title: 'Broker Not Found' };

  const title = `${broker.name} Review (2026)`;
  const description = broker.tagline || `Honest review of ${broker.name}. Fees, pros, cons, and our verdict.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(`${broker.name} Review`)}&subtitle=${encodeURIComponent(broker.rating ? `${broker.rating}/5 Rating — Fees, Pros & Cons` : 'Honest Review — Fees, Pros & Cons')}&type=broker`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/broker/${slug}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${broker.name} Review` }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/broker/${slug}`,
    },
  };
}

export default async function BrokerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: broker } = await supabase
    .from('brokers')
    .select('*, reviewer:team_members!reviewer_id(*)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!broker) notFound();

  const b = broker as Broker;
  const brokerReviewer = (b as any).reviewer as TeamMember | null;

  // Fetch similar brokers using multi-attribute similarity scoring
  const { data: allOtherBrokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .neq('slug', slug);

  const similar = ((allOtherBrokers as Broker[]) || [])
    .map((c) => ({ broker: c, score: scoreBrokerSimilarity(b, c) }))
    .filter(({ score }) => score >= 0)
    .sort((a, bItem) => bItem.score - a.score)
    .slice(0, 3)
    .map(({ broker: br }) => br);

  // Fetch articles that mention this broker
  const { data: brokerArticles } = await supabase
    .from('articles')
    .select('id, title, slug, category, read_time')
    .contains('related_brokers', [slug])
    .limit(4);

  // JSON-LD structured data — FinancialProduct + Review + Article + Breadcrumb
  const financialProductLd = brokerReviewJsonLd(b, brokerReviewer ?? undefined);
  const articleLd = reviewArticleJsonLd(b, brokerReviewer ?? undefined);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviews", url: absoluteUrl("/reviews") },
    { name: b.name },
  ]);

  // Dates for visible byline (must match structured data)
  const datePublished = b.created_at
    ? new Date(b.created_at).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const dateModified = b.updated_at
    ? new Date(b.updated_at).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(financialProductLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <BrokerReviewClient
        broker={b}
        similar={similar}
        relatedArticles={(brokerArticles || []) as { id: number; title: string; slug: string; category?: string; read_time?: number }[]}
        authorName={brokerReviewer?.full_name || REVIEW_AUTHOR.name}
        authorTitle={REVIEW_AUTHOR.jobTitle}
        authorUrl={brokerReviewer ? `/reviewers/${brokerReviewer.slug}` : REVIEW_AUTHOR.url}
        datePublished={datePublished}
        dateModified={dateModified}
      />
    </>
  );
}
