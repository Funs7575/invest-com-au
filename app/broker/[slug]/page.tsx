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

  // Fetch similar brokers (same crypto/non-crypto type, closest by rating)
  const { data: similar } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .eq('is_crypto', b.is_crypto)
    .neq('slug', slug)
    .order('rating', { ascending: false })
    .limit(3);

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
        similar={(similar as Broker[]) || []}
        authorName={brokerReviewer?.full_name || REVIEW_AUTHOR.name}
        authorTitle={REVIEW_AUTHOR.jobTitle}
        authorUrl={brokerReviewer ? `/reviewers/${brokerReviewer.slug}` : REVIEW_AUTHOR.url}
        datePublished={datePublished}
        dateModified={dateModified}
      />
    </>
  );
}
