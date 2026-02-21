import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker, TeamMember, UserReview, BrokerReviewStats, SwitchStory } from "@/lib/types";
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

  // Fetch articles that mention this broker + user reviews + switch stories (in parallel)
  const [{ data: brokerArticles }, { data: userReviews }, { data: reviewStats }, { data: switchStoriesRaw }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, slug, category, read_time')
      .contains('related_brokers', [slug])
      .limit(4),
    supabase
      .from('user_reviews')
      .select('id, broker_id, broker_slug, display_name, rating, title, body, pros, cons, status, created_at')
      .eq('broker_slug', slug)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('broker_review_stats')
      .select('broker_id, review_count, average_rating')
      .eq('broker_id', b.id)
      .single(),
    supabase
      .from('switch_stories')
      .select('id, source_broker_id, source_broker_slug, dest_broker_id, dest_broker_slug, display_name, title, body, reason, source_rating, dest_rating, estimated_savings, time_with_source, status, created_at')
      .or(`source_broker_slug.eq.${slug},dest_broker_slug.eq.${slug}`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // JSON-LD structured data — FinancialProduct + Review + Article + Breadcrumb
  const financialProductLd = brokerReviewJsonLd(b, brokerReviewer ?? undefined);
  const articleLd = reviewArticleJsonLd(b, brokerReviewer ?? undefined);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviews", url: absoluteUrl("/reviews") },
    { name: b.name },
  ]);

  // AggregateRating JSON-LD for user reviews (star ratings in Google results)
  const aggregateRatingLd = reviewStats && reviewStats.review_count > 0 ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${b.name} Trading Platform`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": reviewStats.average_rating.toFixed(1),
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": reviewStats.review_count,
    },
  } : null;

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
      {aggregateRatingLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingLd) }}
        />
      )}
      <Suspense fallback={null}>
        <BrokerReviewClient
          broker={b}
          similar={similar}
          relatedArticles={(brokerArticles || []) as { id: number; title: string; slug: string; category?: string; read_time?: number }[]}
          authorName={brokerReviewer?.full_name || REVIEW_AUTHOR.name}
          authorTitle={REVIEW_AUTHOR.jobTitle}
          authorUrl={brokerReviewer ? `/reviewers/${brokerReviewer.slug}` : REVIEW_AUTHOR.url}
          datePublished={datePublished}
          dateModified={dateModified}
          userReviews={(userReviews || []) as UserReview[]}
          userReviewStats={(reviewStats as BrokerReviewStats) || null}
          switchStories={(switchStoriesRaw || []) as SwitchStory[]}
        />
      </Suspense>
    </>
  );
}
