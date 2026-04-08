import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker, TeamMember, UserReview, BrokerReviewStats, SwitchStory, BrokerQuestion, BrokerAnswer } from "@/lib/types";
import { notFound } from "next/navigation";
import BrokerReviewClient from "./BrokerReviewClient";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  brokerReviewJsonLd,
  reviewArticleJsonLd,
  qaPageJsonLd,
  SITE_NAME,
  REVIEW_AUTHOR,
  CURRENT_YEAR,
} from "@/lib/seo";
import { scoreBrokerSimilarity } from "@/lib/internal-links";
import QASection from "@/components/QASection";
import AskQuestionForm from "@/components/AskQuestionForm";

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateStaticParams() {
  const supabase = await createClient();
  const { data } = await supabase.from("brokers").select("slug").eq("status", "active");
  return (data || []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: broker } = await supabase
    .from('brokers')
    .select('name, tagline, rating')
    .eq('slug', slug)
    .single();

  if (!broker) return { title: 'Broker Not Found' };

  const title = `${broker.name} Review (${CURRENT_YEAR})`;
  const description = broker.tagline || `Honest review of ${broker.name}. Fees, pros, cons, and our verdict.`;
  const ogImageUrl = `/api/og/broker?slug=${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/broker/${slug}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${broker.name} Review` }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
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
  const brokerReviewer = b.reviewer ?? null;

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

  // Fetch articles, user reviews, switch stories, fee history, related deals (in parallel)
  const [{ data: brokerArticles }, { data: expertArticlesRaw }, { data: userReviews }, { data: reviewStats }, { data: switchStoriesRaw }, { data: feeHistoryRaw }, { data: questionsRaw }, { data: relatedDealsRaw }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, slug, category, read_time')
      .contains('related_brokers', [slug])
      .limit(4),
    supabase
      .from('advisor_articles')
      .select('id, title, slug, author_name, category, read_time, professionals!advisor_articles_professional_id_fkey(name, slug, photo_url, verified)')
      .eq('status', 'published')
      .contains('related_brokers', [slug])
      .order('featured', { ascending: false })
      .limit(3),
    supabase
      .from('user_reviews')
      .select('id, broker_id, broker_slug, display_name, rating, title, body, pros, cons, status, created_at')
      .eq('broker_slug', slug)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('broker_review_stats')
      .select('broker_id, review_count, average_rating, avg_fees_rating, avg_platform_rating, avg_support_rating, avg_reliability_rating')
      .eq('broker_id', b.id)
      .single(),
    supabase
      .from('switch_stories')
      .select('id, source_broker_id, source_broker_slug, dest_broker_id, dest_broker_slug, display_name, title, body, reason, source_rating, dest_rating, estimated_savings, time_with_source, status, created_at')
      .or(`source_broker_slug.eq.${slug},dest_broker_slug.eq.${slug}`)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('broker_data_changes')
      .select('id, field_name, old_value, new_value, change_type, changed_at')
      .eq('broker_slug', slug)
      .order('changed_at', { ascending: false })
      .limit(20),
    supabase
      .from('broker_questions')
      .select('id, question, display_name, created_at, broker_answers(id, answer, answered_by, author_slug, display_name, is_accepted, created_at)')
      .eq('broker_slug', slug)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10),
    // Related deals: other platforms with active deals, same platform_type or is_crypto match
    supabase
      .from('brokers')
      .select('id, name, slug, color, icon, logo_url, rating, deal, deal_text, deal_expiry, deal_category, platform_type, affiliate_url, cta_text, benefit_cta, status')
      .eq('status', 'active')
      .eq('deal', true)
      .neq('slug', slug)
      .order('rating', { ascending: false })
      .limit(20),
  ]);

  // Filter related deals to same platform_type (or crypto match), take top 4
  const relatedDeals = ((relatedDealsRaw || []) as Broker[]).filter((d) => {
    if (b.platform_type && d.platform_type === b.platform_type) return true;
    if ((b.is_crypto || b.platform_type === 'crypto_exchange') && (d.platform_type === 'crypto_exchange')) return true;
    return false;
  }).slice(0, 4);

  // JSON-LD structured data — FinancialProduct + Review + Article + Breadcrumb
  const financialProductLd = brokerReviewJsonLd(b, brokerReviewer ?? undefined);
  const articleLd = reviewArticleJsonLd(b, brokerReviewer ?? undefined);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviews", url: absoluteUrl("/reviews") },
    { name: b.name },
  ]);

  // AggregateRating JSON-LD for user reviews (star ratings in Google results)
  // Uses SoftwareApplication type to distinguish user ratings from editorial review on FinancialProduct
  const aggregateRatingLd = reviewStats && reviewStats.review_count > 0 && reviewStats.average_rating != null ? {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${b.name}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: parseFloat(reviewStats.average_rating.toFixed(1)),
      bestRating: 5,
      worstRating: 1,
      ratingCount: reviewStats.review_count,
    },
  } : null;

  // Format Q&A data for QASection component
  const questions = ((questionsRaw || []) as BrokerQuestion[]).map((q) => ({
    id: q.id,
    question: q.question,
    display_name: q.display_name ?? "",
    created_at: q.created_at,
    answers: (q.broker_answers || [])
      .filter((a: BrokerAnswer) => a.status === undefined || a.status === 'approved')
      .map((a: BrokerAnswer) => ({
        id: a.id,
        answer: a.answer,
        answered_by: a.answered_by ?? "",
        author_slug: a.author_slug,
        display_name: a.display_name,
        is_accepted: a.is_accepted ?? false,
        created_at: a.created_at,
      })),
  }));

  // Q&A JSON-LD
  const qaLd = questions.length > 0 ? qaPageJsonLd(questions, `${b.name} Q&A`, absoluteUrl(`/broker/${slug}`)) : null;

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
      {qaLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(qaLd) }}
        />
      )}
      <Suspense fallback={null}>
        <BrokerReviewClient
          broker={b}
          similar={similar}
          relatedArticles={(brokerArticles || []) as { id: number; title: string; slug: string; category?: string; read_time?: number }[]}
          expertArticles={(expertArticlesRaw || []).map((a: Record<string, unknown>) => ({ id: a.id as number, title: a.title as string, slug: a.slug as string, author_name: a.author_name as string, category: a.category as string, professionals: a.professionals }))}
          authorName={brokerReviewer?.full_name || REVIEW_AUTHOR.name}
          authorTitle={REVIEW_AUTHOR.jobTitle}
          authorUrl={brokerReviewer ? `/reviewers/${brokerReviewer.slug}` : REVIEW_AUTHOR.url}
          authorAvatarUrl={brokerReviewer?.avatar_url || undefined}
          datePublished={datePublished}
          dateModified={dateModified}
          userReviews={(userReviews || []) as UserReview[]}
          userReviewStats={(reviewStats as BrokerReviewStats) || null}
          switchStories={(switchStoriesRaw || []) as SwitchStory[]}
          feeHistory={(feeHistoryRaw || []) as { id: number; field_name: string; old_value: string | null; new_value: string | null; change_type: string; changed_at: string }[]}
          relatedDeals={relatedDeals}
        />
      </Suspense>
      {/* Q&A Section */}
      <div id="questions" className="container-custom max-w-4xl scroll-mt-20">
        <QASection
          questions={questions}
          brokerSlug={b.slug}
          brokerName={b.name}
          pageType="broker"
          pageSlug={b.slug}
        />
        <AskQuestionForm
          brokerSlug={b.slug}
          brokerName={b.name}
          pageType="broker"
          pageSlug={b.slug}
        />
      </div>
    </>
  );
}
