import { Suspense } from "react";
import FeeMemoryTrigger from "@/components/FeeMemoryTrigger";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type { Broker, UserReview, BrokerReviewStats, SwitchStory, BrokerQuestion, BrokerAnswer } from "@/lib/types";
import { notFound } from "next/navigation";
import { getBrokerBySlug } from "@/lib/request-cache";
import { getActiveBrokersFull } from "@/lib/cached-data";
import BrokerReviewClient from "./BrokerReviewClient";
import TmdBadge from "@/components/TmdBadge";
import BrokerHistoryChart from "@/components/broker/BrokerHistoryChart";
import SavingsRateHistoryChart from "@/components/savings/SavingsRateHistoryChart";
import RateMemoryTracker from "@/components/savings/RateMemoryTracker";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  brokerReviewJsonLd,
  brokerProductJsonLd,
  reviewArticleJsonLd,
  qaPageJsonLd,
  REVIEW_AUTHOR,
  CURRENT_YEAR,
} from "@/lib/seo";
import { scoreBrokerSimilarity } from "@/lib/internal-links";
import { getRelatedForBroker } from "@/lib/related-content";
import { itemListJsonLd, faqJsonLd } from "@/lib/schema-markup";
import { SHOW_RATINGS } from "@/lib/compliance-config";
import RelatedRail from "@/components/RelatedRail";
import QASection from "@/components/QASection";
import AskQuestionForm from "@/components/AskQuestionForm";
import ComplianceFooter from "@/components/ComplianceFooter";
import ClaimListingButton from "@/components/claims/ClaimListingButton";
import FeeAlertCapture from "@/components/FeeAlertCapture";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase.from("brokers").select("slug").eq("status", "active");
  return (data || []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Shared cache() hit with the page body — single DB round-trip
  // per render instead of two. `.catch` because generateMetadata runs
  // *outside* the route error boundary: an unguarded DB throw here
  // (transient outage, or CI's placeholder creds) escalates to a bare
  // 500 with no <html lang>/<title>. Degrade to fallback metadata and
  // let the page body's error.tsx render the friendly retry surface.
  let fetchFailed = false;
  const broker = await getBrokerBySlug(slug).catch(() => {
    fetchFailed = true;
    return null;
  });

  if (!broker) {
    // Transient fetch failure → fall back, let the page error boundary run.
    if (fetchFailed) return { title: 'Broker Not Found' };
    // Confirmed-unknown slug → 404 HERE, before the segment's loading.tsx
    // streams a 200 shell. The page body's notFound() can't set the HTTP
    // status once streaming has begun (soft-404, DISC-20260610-B).
    notFound();
  }

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

  // Both reads are independent of each other. Previously serial — paid
  // two cross-region RTTs back-to-back. Now parallel via Promise.all,
  // and `allActiveBrokers` comes from the 24h unstable_cache helper so
  // subsequent broker pages share the same single Supabase read.
  const [broker, allActiveBrokers] = await Promise.all([
    getBrokerBySlug(slug),
    getActiveBrokersFull(),
  ]);

  if (!broker) notFound();

  const b = broker as Broker;
  const brokerReviewer = b.reviewer ?? null;

  // Filter the cached full set to exclude this broker (same as the prior
  // `.eq('status', 'active').neq('slug', slug)` query).
  const allOtherBrokers = allActiveBrokers.filter((other) => other.slug !== slug);

  const similar = allOtherBrokers
    .map((c) => ({ broker: c, score: scoreBrokerSimilarity(b, c) }))
    .filter(({ score }) => score >= 0)
    .sort((a, bItem) => bItem.score - a.score)
    .slice(0, 3)
    .map(({ broker: br }) => br);

  // Fetch articles, user reviews, switch stories, fee history, related deals (in parallel)
  // NOTE: Q&A is intentionally excluded from this batch and streamed separately via <Suspense> below.
  const [{ data: brokerArticles }, { data: expertArticlesRaw }, { data: userReviews }, { data: reviewStats }, { data: switchStoriesRaw }, { data: feeHistoryRaw }, { data: relatedDealsRaw }, { data: versusEditorialsRaw }, { data: screenshotsRaw }] = await Promise.all([
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
      .select('id, broker_id, broker_slug, display_name, rating, title, body, pros, cons, status, is_verified_client, verified_via, created_at')
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
    // Related deals: other platforms with active deals, same platform_type or is_crypto match
    supabase
      .from('brokers')
      .select('id, name, slug, color, icon, logo_url, rating, deal, deal_text, deal_expiry, deal_category, platform_type, affiliate_url, cta_text, benefit_cta, status')
      .eq('status', 'active')
      .eq('deal', true)
      .neq('slug', slug)
      .order('rating', { ascending: false })
      .limit(20),
    // Head-to-head editorials where this broker is on either side —
    // drives crawlers through versus pages and gives users direct
    // comparison entry points.
    supabase
      .from('versus_editorials')
      .select('slug, broker_a_slug, broker_b_slug, title')
      .or(`broker_a_slug.eq.${slug},broker_b_slug.eq.${slug}`)
      .limit(24),
    // App screenshots — shown as a gallery on the review page
    supabase
      .from('broker_creatives')
      .select('url, label')
      .eq('broker_slug', slug)
      .eq('type', 'screenshot')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(10),
  ]);

  // Fetch current savings/TD rate for rate-memory tracker (savings/TD products only)
  let currentSavingsRateBps: number | null = null;
  if (b.platform_type === "savings_account" || b.platform_type === "term_deposit") {
    const { data: rateSnap } = await supabase
      .from("savings_rate_snapshots")
      .select("rate_bps")
      .eq("broker_id", b.id)
      .eq("product_kind", b.platform_type)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    currentSavingsRateBps = rateSnap?.rate_bps ?? null;
  }

  // Filter related deals to same platform_type (or crypto match), take top 4
  const relatedDeals = ((relatedDealsRaw || []) as Broker[]).filter((d) => {
    if (b.platform_type && d.platform_type === b.platform_type) return true;
    if ((b.is_crypto || b.platform_type === 'crypto_exchange') && (d.platform_type === 'crypto_exchange')) return true;
    return false;
  }).slice(0, 4);

  // Shape versus editorials into { slug, otherName } for rendering.
  // Resolve the "other" broker name by looking up its active row —
  // this is a single extra query regardless of how many editorials
  // match.
  const versusEditorials = (versusEditorialsRaw ?? []) as {
    slug: string;
    broker_a_slug: string;
    broker_b_slug: string;
    title: string | null;
  }[];
  const otherSlugs = Array.from(
    new Set(
      versusEditorials.map((v) =>
        v.broker_a_slug === slug ? v.broker_b_slug : v.broker_a_slug,
      ),
    ),
  );
  const { data: otherBrokersRaw } = otherSlugs.length
    ? await supabase
        .from('brokers')
        .select('slug, name')
        .in('slug', otherSlugs)
    : { data: null };
  const otherBrokerNameBySlug = new Map<string, string>();
  for (const r of (otherBrokersRaw ?? []) as { slug: string; name: string }[]) {
    otherBrokerNameBySlug.set(r.slug, r.name);
  }
  const versusComparisons = versusEditorials.map((v) => {
    const otherSlug =
      v.broker_a_slug === slug ? v.broker_b_slug : v.broker_a_slug;
    return {
      slug: v.slug,
      otherSlug,
      otherName: otherBrokerNameBySlug.get(otherSlug) ?? otherSlug,
    };
  });

  // JSON-LD structured data — FinancialProduct + Review + Article + Breadcrumb
  const financialProductLd = brokerReviewJsonLd(b, brokerReviewer ?? undefined);
  const productLd = brokerProductJsonLd({
    name: b.name,
    slug: b.slug,
    tagline: b.tagline,
    rating: b.rating,
    review_count: reviewStats?.review_count,
    platform_type: b.platform_type,
    is_crypto: b.is_crypto,
    regulated_by: b.regulated_by,
    year_founded: b.year_founded,
  });
  const articleLd = reviewArticleJsonLd(b, brokerReviewer ?? undefined);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviews", url: absoluteUrl("/reviews") },
    { name: b.name },
  ]);

  // AggregateRating + individual Reviews JSON-LD for user reviews.
  // SoftwareApplication type keeps this entity distinct from the
  // editorial FinancialProduct review — Google honours both and shows
  // star-rating rich results on SERP when ≥1 user review exists.
  // We nest the top 5 most-recent approved reviews as individual
  // Review items so rich snippets can display review excerpts.
  const topUserReviews = ((userReviews ?? []) as UserReview[]).slice(0, 5);
  const aggregateRatingLd = SHOW_RATINGS && reviewStats && reviewStats.review_count > 0 && reviewStats.average_rating != null ? {
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
    ...(topUserReviews.length > 0
      ? {
          review: topUserReviews.map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.display_name || "Anonymous" },
            datePublished: r.created_at
              ? new Date(r.created_at).toISOString().split("T")[0]
              : undefined,
            name: r.title || `${b.name} review`,
            reviewBody: (r.body || "").slice(0, 500),
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
  } : null;

  // Dates for visible byline (must match structured data)
  const datePublished = b.created_at
    ? new Date(b.created_at).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const dateModified = b.updated_at
    ? new Date(b.updated_at).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const isSavings = b.platform_type === "savings_account" || b.platform_type === "term_deposit";
  const isCrypto = b.platform_type === "crypto_exchange";
  const reviewFaqs = [
    {
      q: `Is ${b.name} safe?`,
      a: `${b.name} is an ASIC-regulated financial services provider operating under an Australian Financial Services Licence (AFSL).${b.chess_sponsored && !isSavings && !isCrypto ? ` It is CHESS-sponsored, meaning your shares are held directly in your name on the ASX register (via a HIN) — not as a creditor of the broker.` : !b.chess_sponsored && !isSavings && !isCrypto ? ` It uses a custodial account model — your shares are held by the broker on your behalf. In the event of insolvency, client assets must be segregated under ASIC rules, but you do not hold a HIN.` : ""} Always review the Product Disclosure Statement (PDS) and Financial Services Guide (FSG) before investing. This review is general information only.`,
    },
    {
      q: isSavings ? `What interest rate does ${b.name} offer?` : `What are ${b.name}'s brokerage fees?`,
      a: isSavings
        ? `${b.name} publishes its current savings or term deposit rates on its website. Rates change regularly — check the live rate display above for the most current figure. This page tracks historical rate changes so you can see how ${b.name}'s rates have moved over time.`
        : b.asx_fee
          ? `${b.name} charges ${b.asx_fee} per ASX trade${b.us_fee ? `, ${b.us_fee} for US markets` : ""}${b.fx_rate != null ? `, and a ${(b.fx_rate * 100).toFixed(2)}% FX markup on foreign trades` : ""}. Fees may vary by order size or account type — always check the current PDS and product page. The fee history chart above shows how ${b.name}'s fees have changed over time.`
          : `${b.name}'s current fee schedule is shown on this page. Fee structures can vary by account type, order size, and market — always verify the latest rates on ${b.name}'s website and in the PDS before trading.`,
    },
    {
      q: `Is ${b.name} good for ${b.smsf_support ? "SMSF investing?" : "beginners?"}`,
      a: b.smsf_support
        ? `Yes, ${b.name} supports SMSF accounts.${b.chess_sponsored ? " CHESS sponsorship is particularly important for SMSF auditing, as it provides a clear HIN-based record of share ownership." : ""} When using any broker for an SMSF, consider tax-year reporting formats, corporate actions handling, and whether the platform generates statements your auditor can work with. Consult your SMSF auditor before choosing a broker.`
        : `${b.name}${b.rating != null && b.rating >= 4 ? " is well-rated overall" : "'s suitability for beginners depends on your needs"}. Beginners should look for a platform with low fees, a clear interface, good educational resources, and strong customer support. Compare ${b.name} with other platforms on the Compare page to find the best fit for your experience level and trading goals.`,
    },
    {
      q: `Who regulates ${b.name}?`,
      a: `${b.name} operates under the oversight of ASIC (Australian Securities and Investments Commission)${b.regulated_by && b.regulated_by !== "ASIC" ? ` and ${b.regulated_by}` : ""}. All Australian financial services providers must hold a valid AFSL to offer financial products. You can verify ${b.name}'s licence status on the ASIC Connect Professional Registers at connect.asic.gov.au. This review is general information only and is not financial advice.`,
    },
  ];
  const reviewFaqLd = faqJsonLd(reviewFaqs);

  return (
    <>
      {/* D10: remember the fee the visitor saw, so the homepage can
          factually report changes on their next visit. */}
      <FeeMemoryTrigger slug={b.slug} name={b.name} asxFee={b.asx_fee_value ?? null} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(financialProductLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
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
      {reviewFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewFaqLd) }}
        />
      )}
      <ArticleReadingProgress />

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
          screenshots={(screenshotsRaw || []) as { url: string; label?: string | null }[]}
        />
      </Suspense>
      {versusComparisons.length > 0 && (
        <section
          aria-labelledby="head-to-head-heading"
          className="container-custom max-w-4xl mt-8 md:mt-12"
        >
          <h2
            id="head-to-head-heading"
            className="text-lg md:text-xl font-extrabold text-slate-900 mb-1"
          >
            {b.name} head-to-head comparisons
          </h2>
          <p className="text-xs md:text-sm text-slate-600 mb-4">
            Side-by-side breakdowns against the platforms Australian
            investors most often cross-shop with {b.name}.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {versusComparisons.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/versus/${c.slug}`}
                  className="block bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 hover:border-amber-300 hover:text-amber-800 transition-colors"
                >
                  {b.name} vs {c.otherName}
                  <span aria-hidden="true" className="ml-1 text-amber-600">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Q&A Section — streamed independently so main review renders first */}
      <div id="questions" className="container-custom max-w-4xl scroll-mt-20">
        <Suspense fallback={<QASectionSkeleton />}>
          <BrokerQASection brokerSlug={b.slug} brokerName={b.name} pageUrl={absoluteUrl(`/broker/${slug}`)} />
        </Suspense>
        <AskQuestionForm
          brokerSlug={b.slug}
          brokerName={b.name}
          pageType="broker"
          pageSlug={b.slug}
        />
      </div>
      {/* Rate memory tracker — shows delta since last visit for savings/TD */}
      {(b.platform_type === "savings_account" || b.platform_type === "term_deposit") && currentSavingsRateBps !== null && (
        <div className="container-custom max-w-4xl mt-4">
          <RateMemoryTracker
            brokerId={b.id}
            productKind={b.platform_type}
            currentRateBps={currentSavingsRateBps}
            brokerName={b.name}
          />
        </div>
      )}

      {/* Fee/rate history chart. Savings and TD products show rate
          history; all others show fee history. Renders nothing if
          fewer than 2 snapshots exist. */}
      <div className="container-custom max-w-4xl mt-10">
        <Suspense fallback={null}>
          {b.platform_type === "savings_account" || b.platform_type === "term_deposit" ? (
            <SavingsRateHistoryChart
              brokerId={b.id}
              productKind={b.platform_type}
              brokerName={b.name}
              daysBack={90}
            />
          ) : (
            <BrokerHistoryChart slug={b.slug} metric="asx_fee_value" daysBack={30} />
          )}
        </Suspense>
      </div>

      {/* Fee-change alert capture — shown for share brokers, crypto, robo, and super */}
      {b.platform_type !== "savings_account" && b.platform_type !== "term_deposit" && (
        <div className="container-custom max-w-4xl mt-8">
          <FeeAlertCapture brokerSlug={b.slug} brokerName={b.name} />
        </div>
      )}

      {/* Related content rail — similar brokers + related articles. */}
      {(() => {
        const { brokers: relBrokers, articles: relArts, guides: relGuides } = getRelatedForBroker(
          b,
          allOtherBrokers,
          (brokerArticles || []) as { id: number; slug: string; title: string; category?: string; read_time?: number }[],
        );
        if (relBrokers.length === 0 && relArts.length === 0 && relGuides.length === 0) return null;
        const listItems = [
          ...relBrokers.map((item, i) => ({
            position: i + 1,
            name: item.title,
            url: item.href,
            description: item.badgeText,
          })),
        ];
        const jsonLd = listItems.length > 0
          ? itemListJsonLd(`Similar platforms to ${b.name}`, listItems)
          : null;
        return (
          <div className="container-custom max-w-4xl mt-8">
            {relBrokers.length > 0 && (
              <RelatedRail
                heading={`Similar to ${b.name}`}
                items={relBrokers}
                jsonLd={jsonLd}
              />
            )}
            {(relArts.length > 0 || relGuides.length > 0) && (
              <RelatedRail
                heading="Related Guides"
                items={relArts}
                secondaryItems={relGuides.length > 0 ? relGuides : undefined}
                secondaryHeading={relGuides.length > 0 ? "Helpful guide" : undefined}
                className="mt-6"
              />
            )}
          </div>
        );
      })()}

      {/* FAQ accordion — editorial FAQs for GEO citation */}
      <section className="container-custom max-w-4xl mt-8 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {reviewFaqs.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* DDO compliance — render the current TMD link prominently
          next to the product footer. DDO (Corporations Act s994A–C)
          requires a TMD link on every product page. The component
          returns null silently if no TMD is on file — the admin
          TMD page + nightly audit flag missing ones. */}
      <div className="container-custom max-w-4xl border-t border-slate-200 mt-8 pt-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 max-w-xl">
            Before acting on any information on this page, consider whether
            the product is right for you and read the issuer&rsquo;s Target
            Market Determination.
          </p>
          <TmdBadge productType="broker" productRef={b.slug} />
        </div>
      </div>
    </>
  );
}

function QASectionSkeleton() {
  return (
    <div className="py-6 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function BrokerQASection({ brokerSlug, brokerName, pageUrl }: { brokerSlug: string; brokerName: string; pageUrl: string }) {
  const supabase = await createClient();
  const { data: questionsRaw } = await supabase
    .from('broker_questions')
    .select('id, question, display_name, created_at, broker_answers(id, answer, answered_by, author_slug, display_name, is_accepted, created_at)')
    .eq('broker_slug', brokerSlug)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

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

  const qaLd = questions.length > 0 ? qaPageJsonLd(questions, `${brokerName} Q&A`, pageUrl) : null;

  return (
    <>
      {qaLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(qaLd) }}
        />
      )}
      <QASection
        questions={questions}
        brokerSlug={brokerSlug}
        brokerName={brokerName}
        pageType="broker"
        pageSlug={brokerSlug}
      />
      <ClaimListingButton
        claimType="broker"
        targetSlug={brokerSlug}
        targetName={brokerName}
      />
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
