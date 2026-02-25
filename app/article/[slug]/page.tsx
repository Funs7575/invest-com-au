import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Article, Broker, TeamMember } from "@/lib/types";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ArticleDetailClient from "./ArticleDetailClient";
import IntlBrokersEnhanced from "@/components/IntlBrokersEnhanced";
import ArticleSidebar from "@/components/ArticleSidebar";
import SponsoredBrokerWidget from "@/components/SponsoredBrokerWidget";
import ComparisonTableSkeleton from "@/components/ComparisonTableSkeleton";
import AuthorByline from "@/components/AuthorByline";
import OnThisPage from "@/components/OnThisPage";
import { absoluteUrl, breadcrumbJsonLd, articleAuthorJsonLd, articleFaqJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { CATEGORY_COLORS, getBestPagesForArticle } from "@/lib/internal-links";
import Icon from "@/components/Icon";

export const revalidate = 3600; // ISR: revalidate every hour

const CALC_NAMES: Record<string, { name: string; iconName: string }> = {
  "calc-franking": { name: "Franking Credits Calculator", iconName: "coins" },
  "calc-switching": { name: "Switching Cost Simulator", iconName: "arrow-right-left" },
  "calc-fx": { name: "FX Fee Calculator", iconName: "globe" },
  "calc-cgt": { name: "CGT Estimator", iconName: "calendar" },
  "calc-chess": { name: "CHESS Lookup Tool", iconName: "shield-check" },
};

const ENHANCED_SLUGS = ["best-intl-brokers"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, category, published_at")
    .eq("slug", slug)
    .single();

  if (!article) return { title: "Article Not Found" };

  const title = article.title;
  const description = article.excerpt || "";
  const categoryLabel = article.category
    ? `${article.category.charAt(0).toUpperCase() + article.category.slice(1)} Guide`
    : "Investing Guide";
  const ogImageUrl = `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(categoryLabel)}&type=article`;

  return {
    title,
    description,
    openGraph: {
      type: "article" as const,
      title: `${title} — ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/article/${slug}`),
      publishedTime: article.published_at || undefined,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/article/${slug}`,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, author:team_members!author_id(*), reviewer:team_members!reviewer_id(*)")
    .eq("slug", slug)
    .single();

  if (!article) notFound();

  const a = article as Article;
  const articleAuthor = (a as any).author as TeamMember | null;
  const articleReviewer = (a as any).reviewer as TeamMember | null;
  const isEnhanced = ENHANCED_SLUGS.includes(slug);

  // Fetch related brokers
  let relatedBrokers: Broker[] = [];
  if (a.related_brokers && a.related_brokers.length > 0) {
    const { data: relatedBrokerData } = await supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .in("slug", a.related_brokers);
    relatedBrokers = (relatedBrokerData as Broker[]) || [];
  }

  // For enhanced articles: also fetch all brokers with FX data
  let allFxBrokers: Broker[] = [];
  let topPick: Broker | null = null;
  if (isEnhanced) {
    const { data: fxData } = await supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .not("fx_rate", "is", null)
      .order("fx_rate", { ascending: true });
    allFxBrokers = (fxData as Broker[]) || [];
    topPick =
      relatedBrokers.sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))[0] ||
      allFxBrokers[0] ||
      null;
  }

  // Fetch all active brokers for sponsored sidebar widget (used to look up campaign winners)
  const { data: allActiveBrokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(50);
  const allBrokersForWidget = (allActiveBrokers as Broker[]) || [];

  // Determine sidebar top pick for non-enhanced articles
  const sidebarTopPick = !isEnhanced
    ? (relatedBrokers.sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))[0] || allBrokersForWidget[0] || null)
    : null;

  // Fetch related articles
  let relatedArticles: Article[] = [];
  if (a.category) {
    const { data: related } = await supabase
      .from("articles")
      .select("*")
      .eq("category", a.category)
      .neq("slug", slug)
      .limit(3);
    relatedArticles = (related as Article[]) || [];
  }

  const categoryColor =
    CATEGORY_COLORS[a.category || ""] || "bg-slate-100 text-slate-700";
  const calcInfo = a.related_calc ? CALC_NAMES[a.related_calc] : null;
  const pagePath = `/article/${slug}`;

  // JSON-LD schema for all articles — prefer structured author over flat fields
  const authorBlock = articleAuthor
    ? articleAuthorJsonLd(articleAuthor)
    : a.author_name && a.author_name !== "Market Research Team"
      ? {
          "@type": "Person" as const,
          name: a.author_name,
          ...(a.author_linkedin ? { url: a.author_linkedin } : {}),
        }
      : {
          "@type": "Organization" as const,
          name: "Invest.com.au",
          url: absoluteUrl("/"),
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author: authorBlock,
    ...(articleReviewer
      ? {
          reviewedBy: {
            "@type": "Person",
            name: articleReviewer.full_name,
            url: absoluteUrl(`/reviewers/${articleReviewer.slug}`),
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Invest.com.au",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(pagePath),
    },
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Articles", url: absoluteUrl("/articles") },
    { name: a.title },
  ]);

  // FAQ JSON-LD — only generated if sections have question-style headings
  const faqLd = a.sections ? articleFaqJsonLd(a.sections) : null;

  return (
    <div>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Hero Section */}
      <section className="bg-white text-slate-900 pt-4 pb-5 md:pt-6 md:pb-8 border-b border-slate-200">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb — hide full title on mobile */}
            <div className="text-xs md:text-sm text-slate-500 mb-2 md:mb-3">
              <Link href="/" className="hover:text-slate-900 transition-colors">
                Home
              </Link>
              <span className="mx-1.5 md:mx-2">/</span>
              <Link
                href="/articles"
                className="hover:text-slate-900 transition-colors"
              >
                Articles
              </Link>
              <span className="hidden md:inline">
                <span className="mx-2">/</span>
                <span className="text-slate-900">{a.title}</span>
              </span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
              {a.category && (
                <span
                  className={`text-[0.69rem] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 rounded-full ${categoryColor}`}
                >
                  {a.category}
                </span>
              )}
              {a.read_time && (
                <span className="text-[0.69rem] md:text-xs text-slate-500">
                  {a.read_time} min read
                </span>
              )}
              {a.published_at && (
                <span className="text-[0.69rem] md:text-xs text-slate-500">
                  {new Date(a.published_at).toLocaleDateString("en-AU", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
              {isEnhanced && (
                <span className="text-[0.69rem] md:text-xs font-semibold bg-slate-700/20 text-slate-700 px-2 md:px-2.5 py-0.5 rounded-full">
                  Updated Feb 2026
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 md:mb-3 leading-tight">
              {a.title}
            </h1>

            {/* Excerpt — smaller on mobile */}
            {a.excerpt && (
              <p className="text-sm md:text-lg text-slate-600 leading-relaxed max-w-3xl">
                {a.excerpt}
              </p>
            )}

            {/* Cover Image */}
            {a.cover_image_url && (
              <div className="mt-4 mb-2 rounded-xl overflow-hidden aspect-[2/1] md:aspect-[5/2] bg-slate-100">
                <img
                  src={a.cover_image_url}
                  alt={a.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Author Byline */}
            <AuthorByline
              name={a.author_name}
              title={a.author_title}
              linkedinUrl={a.author_linkedin ?? undefined}
              twitterUrl={a.author_twitter ?? undefined}
              verifiedDate={
                a.updated_at
                  ? new Date(a.updated_at).toLocaleDateString("en-AU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : undefined
              }
              variant="light"
              author={articleAuthor ?? undefined}
              reviewer={articleReviewer ?? undefined}
              reviewedAt={a.reviewed_at ?? undefined}
              changelog={a.changelog ?? undefined}
              showMethodologyLink
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="py-6 md:py-12">
        <div className="container-custom">
          <div
            className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8"
          >
            {/* Article Column */}
            <div className="flex-1 min-w-0">
              {/* Sticky "On this page" jump nav */}
              {a.sections && a.sections.length > 1 && (
                <OnThisPage
                  items={a.sections.map(
                    (section: { heading: string; body: string }, i: number) => ({
                      id: `section-${i}`,
                      label: section.heading,
                    })
                  )}
                />
              )}

              {/* Inline Table of Contents — hidden on mobile where floating TOC serves the same purpose */}
              {a.sections && a.sections.length > 1 && (
                <nav className="hidden md:block border border-slate-200 rounded-xl p-6 mb-10 bg-slate-50">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Table of Contents
                  </h2>
                  <ol className="space-y-2">
                    {a.sections.map(
                      (
                        section: { heading: string; body: string },
                        i: number
                      ) => (
                        <li key={i}>
                          <a
                            href={`#section-${i}`}
                            className="text-sm text-slate-700 hover:text-slate-900 transition-colors flex items-start gap-2"
                          >
                            <span className="text-slate-700 font-semibold shrink-0">
                              {i + 1}.
                            </span>
                            {section.heading}
                          </a>
                        </li>
                      )
                    )}
                  </ol>
                </nav>
              )}

              {/* Enhanced: Inject comparison tools after first section */}
              {isEnhanced && a.sections && a.sections.length > 0 && (
                <div className="space-y-10">
                  {/* First section */}
                  <section id="section-0" className="scroll-mt-24">
                    <h2 className="text-2xl font-bold mb-4">
                      {a.sections[0].heading}
                    </h2>
                    <div className="max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                      {a.sections[0].body}
                    </div>
                  </section>

                  {/* Inject enhanced tools */}
                  <Suspense fallback={<ComparisonTableSkeleton />}>
                    <IntlBrokersEnhanced
                      brokers={allFxBrokers}
                      topPick={topPick}
                      pagePath={pagePath}
                    />
                  </Suspense>

                  {/* Remaining sections */}
                  {a.sections.slice(1).map(
                    (
                      section: { heading: string; body: string },
                      i: number
                    ) => (
                      <section
                        key={i + 1}
                        id={`section-${i + 1}`}
                        className="scroll-mt-24"
                      >
                        <h2 className="text-2xl font-bold mb-4">
                          {section.heading}
                        </h2>
                        <div className="max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                          {section.body}
                        </div>
                      </section>
                    )
                  )}
                </div>
              )}

              {/* Early CTA — surfaces broker comparison before users drop off */}
              {relatedBrokers.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-6 md:mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-0.5 md:mb-1 text-sm md:text-base">Ready to act?</h3>
                    <p className="text-xs md:text-sm text-slate-600">
                      Compare brokers from this article or use our quiz.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <Link
                      href="/compare"
                      className="flex-1 sm:flex-none text-center px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Compare &rarr;
                    </Link>
                    <Link
                      href="/quiz"
                      className="flex-1 sm:flex-none text-center px-4 py-2.5 border border-slate-700 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Quiz
                    </Link>
                  </div>
                </div>
              )}

              {/* Standard: Render all sections normally */}
              {!isEnhanced && a.sections && a.sections.length > 0 && (
                <div className="space-y-10">
                  {a.sections.map(
                    (
                      section: { heading: string; body: string },
                      i: number
                    ) => (
                      <section
                        key={i}
                        id={`section-${i}`}
                        className="scroll-mt-24"
                      >
                        <h2 className="text-2xl font-bold mb-4">
                          {section.heading}
                        </h2>
                        <div className="max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                          {section.body}
                        </div>
                      </section>
                    )
                  )}
                </div>
              )}

              {/* Brokers to Compare for This Topic */}
              {relatedBrokers.length > 0 && (
                <div className="mt-8 md:mt-12 border border-slate-200 rounded-xl p-4 md:p-6 bg-white">
                  <h3 className="text-base md:text-lg font-bold mb-0.5 md:mb-1">
                    Brokers for This Topic
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-5">
                    Platforms relevant to this guide. {ADVERTISER_DISCLOSURE_SHORT}
                  </p>
                  <div className="space-y-3 md:space-y-4">
                    {relatedBrokers.map((broker) => (
                      <ArticleDetailClient
                        key={broker.id}
                        broker={broker}
                        slug={slug}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Related Calculator CTA */}
              {calcInfo && a.related_calc && (
                <div className="mt-6 md:mt-8 border border-slate-200 rounded-xl p-4 md:p-6 bg-slate-50">
                  <div className="flex items-start gap-3 md:gap-4">
                    <Icon name={calcInfo.iconName} size={24} className="text-slate-700 shrink-0 mt-0.5 md:mt-1" />
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-bold mb-0.5 md:mb-1">
                        Related Calculator
                      </h3>
                      <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-3">
                        Run the numbers with our {calcInfo.name}.
                      </p>
                      <Link
                        href={`/calculators?calc=${a.related_calc}`}
                        className="inline-block px-4 md:px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Open Calculator &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="mt-8 md:mt-12">
                  <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-6">Related Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                    {relatedArticles.map((ra) => {
                      const raCategoryColor =
                        CATEGORY_COLORS[ra.category || ""] ||
                        "bg-slate-100 text-slate-700";
                      return (
                        <Link
                          key={ra.id}
                          href={`/article/${ra.slug}`}
                          className="border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-md transition-all bg-white flex flex-col"
                        >
                          {ra.category && (
                            <span
                              className={`text-[0.69rem] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 rounded-full self-start mb-1.5 md:mb-2 ${raCategoryColor}`}
                            >
                              {ra.category}
                            </span>
                          )}
                          <h4 className="text-sm font-bold mb-1 md:mb-2 line-clamp-2 flex-1">
                            {ra.title}
                          </h4>
                          {ra.read_time && (
                            <span className="text-[0.69rem] md:text-xs text-slate-400">
                              {ra.read_time} min read
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Best Broker Guide Links */}
              {(() => {
                const bestPages = getBestPagesForArticle(a.category, a.tags);
                if (bestPages.length === 0) return null;
                return (
                  <div className="mt-6 md:mt-8 bg-slate-50 rounded-xl p-4 md:p-5">
                    <h3 className="text-base md:text-lg font-bold mb-0.5 md:mb-1">Best Broker Guides</h3>
                    <p className="text-xs md:text-sm text-slate-500 mb-2 md:mb-3">
                      See which brokers top our rankings for these topics.
                    </p>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {bestPages.map((bp) => (
                        <Link
                          key={bp.slug}
                          href={bp.href}
                          className="px-3 py-2 md:py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-slate-700 hover:text-slate-900 transition-colors"
                        >
                          {bp.h1.replace(" in Australia", "")}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Bottom CTA */}
              <div className="mt-8 md:mt-12 bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-8 text-center">
                <h3 className="text-xl md:text-2xl font-extrabold mb-1.5 md:mb-2 text-slate-900">
                  Find the Right Broker
                </h3>
                <p className="text-sm md:text-base text-slate-600 mb-4 md:mb-6 max-w-lg mx-auto">
                  Compare fees and platforms — or filter in 60 seconds with our quiz.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3">
                  <Link
                    href="/compare"
                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Compare All Brokers
                  </Link>
                  <Link
                    href="/quiz"
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Take the Quiz
                  </Link>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 md:mt-10 border-t border-slate-200 pt-4 md:pt-6">
                <p className="text-[0.69rem] md:text-xs text-slate-400 leading-relaxed">
                  <strong>General Advice Warning:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}{" "}
                  <Link
                    href="/how-we-earn"
                    className="text-slate-700 hover:underline"
                  >
                    How we earn money
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Desktop Sidebar — campaign-driven for all articles, editorial fallback */}
            {isEnhanced && topPick ? (
              <ArticleSidebar broker={topPick} pagePath={pagePath} />
            ) : (
              <SponsoredBrokerWidget
                fallbackBroker={sidebarTopPick}
                allBrokers={allBrokersForWidget}
                pagePath={pagePath}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
