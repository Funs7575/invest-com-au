import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { getArticleBySlug } from "@/lib/request-cache";
import LastUpdatedBadge from "@/components/LastUpdatedBadge";
import Link from "next/link";
import ArticleCover from "@/components/ArticleCover";
import type { Article, Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ArticleDetailClient from "./ArticleDetailClient";
import ArticleBrokerTable from "@/components/ArticleBrokerTable";
import IntlBrokersEnhanced from "@/components/IntlBrokersEnhanced";
import ArticleSidebar from "@/components/ArticleSidebar";
import SponsoredBrokerWidget from "@/components/SponsoredBrokerWidget";
import ComparisonTableSkeleton from "@/components/ComparisonTableSkeleton";
import AuthorByline from "@/components/AuthorByline";
import OnThisPage from "@/components/OnThisPage";
import { absoluteUrl, breadcrumbJsonLd, articleAuthorJsonLd, articleFaqJsonLd, CURRENT_MONTH_YEAR, ORGANIZATION_JSONLD } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { CATEGORY_COLORS, getBestPagesForArticle, getClusterLinksForArticle } from "@/lib/internal-links";
import ClusterNav from "@/components/ClusterNav";
import ArticleComments from "@/components/ArticleComments";
import Icon from "@/components/Icon";
import AdSlot from "@/components/AdSlot";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LinkifiedText from "@/components/LinkifiedText";

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase.from("articles").select("slug").eq("status", "published").limit(200);
  return (data || []).map((a) => ({ slug: a.slug }));
}

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
  // Shared cache() hit with the page body — single DB round-trip
  // per render instead of two.
  const article = await getArticleBySlug(slug);

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
      title,
      description,
      url: absoluteUrl(`/article/${slug}`),
      publishedTime: article.published_at || undefined,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
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

  const article = await getArticleBySlug(slug);

  if (!article) notFound();
  if ((article as Article).status !== "published") notFound();

  const a = article as Article;
  const articleAuthor = a.author ?? null;
  const articleReviewer = a.reviewer ?? null;
  const isEnhanced = ENHANCED_SLUGS.includes(slug);

  // Parallelize independent queries with Promise.all
  const relatedBrokersPromise = (a.related_brokers && a.related_brokers.length > 0)
    ? supabase.from("brokers").select("*").eq("status", "active").in("slug", a.related_brokers)
    : Promise.resolve({ data: null });

  const fxBrokersPromise = isEnhanced
    ? supabase.from("brokers").select("*").eq("status", "active").not("fx_rate", "is", null).order("fx_rate", { ascending: true })
    : Promise.resolve({ data: null });

  const allActiveBrokersPromise = supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(50);

  // Related articles: same category (3) + cross-category by matching tags (3)
  const relatedArticlesPromise = a.category
    ? supabase.from("articles").select("slug, title, category, read_time, id, tags").eq("status", "published").eq("category", a.category).neq("slug", slug).order("published_at", { ascending: false }).limit(3)
    : Promise.resolve({ data: null });

  const crossCategoryPromise = (a.tags && a.tags.length > 0)
    ? supabase.from("articles").select("slug, title, category, read_time, id, tags").eq("status", "published").neq("category", a.category || "").neq("slug", slug).overlaps("tags", a.tags).order("published_at", { ascending: false }).limit(3)
    : Promise.resolve({ data: null });

  const [relatedBrokersRes, fxBrokersRes, allActiveBrokersRes, relatedArticlesRes, crossCategoryRes] = await Promise.all([
    relatedBrokersPromise,
    fxBrokersPromise,
    allActiveBrokersPromise,
    relatedArticlesPromise,
    crossCategoryPromise,
  ]);

  const relatedBrokers = (relatedBrokersRes.data as Broker[]) || [];
  const allFxBrokers = (fxBrokersRes.data as Broker[]) || [];
  const allBrokersForWidget = (allActiveBrokersRes.data as Broker[]) || [];
  const relatedArticles = [
    ...((relatedArticlesRes.data || []) as Article[]),
    ...((crossCategoryRes.data || []) as Article[]).filter(
      (ca) => !(relatedArticlesRes.data || []).some((ra: { slug: string }) => ra.slug === ca.slug)
    ),
  ].slice(0, 6);

  let topPick: Broker | null = null;
  if (isEnhanced) {
    topPick =
      relatedBrokers.sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))[0] ||
      allFxBrokers[0] ||
      null;
  }

  // Determine sidebar top pick for non-enhanced articles
  const sidebarTopPick = !isEnhanced
    ? (relatedBrokers.sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))[0] || allBrokersForWidget[0] || null)
    : null;

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
    description: a.excerpt || undefined,
    url: absoluteUrl(pagePath),
    ...(a.published_at ? { datePublished: new Date(a.published_at).toISOString().split("T")[0] } : {}),
    ...(a.updated_at ? { dateModified: new Date(a.updated_at).toISOString().split("T")[0] } : {}),
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
    publisher: ORGANIZATION_JSONLD,
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
              <LastUpdatedBadge
                updatedAt={a.updated_at as string | null | undefined}
                lastReviewedAt={(a as unknown as { last_reviewed_at?: string | null }).last_reviewed_at}
                lastReviewedBy={(a as unknown as { last_reviewed_by?: string | null }).last_reviewed_by}
              />
              {isEnhanced && (
                <span className="text-[0.69rem] md:text-xs font-semibold bg-slate-700/20 text-slate-700 px-2 md:px-2.5 py-0.5 rounded-full">
                  Updated {CURRENT_MONTH_YEAR}
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

            {/* Cover — always renders. Real cover_image_url if present,
                otherwise a category-tinted gradient with the article
                title overlaid. Handled by <ArticleCover /> so the hub
                cards and detail pages stay visually consistent. */}
            <div className="mt-4 mb-2">
              <ArticleCover
                title={a.title}
                coverImageUrl={a.cover_image_url ?? null}
                category={a.category ?? null}
                variant="detail"
                priority
              />
            </div>

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

            {/* Top-of-article broker compare — every article becomes an
                affiliate revenue surface. Vertical comes from article
                category; falls back to '*' for generic articles. */}
            <div className="mt-6">
              <ArticleBrokerTable
                vertical={a.category ?? "*"}
                maxBrokers={3}
                heading="Top platforms for this topic"
              />
            </div>
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
                    <LinkifiedText
                      text={a.sections[0].body}
                      skipHrefs={[`/article/${a.slug}`]}
                    />
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
                        <LinkifiedText
                          text={section.body}
                          skipHrefs={[`/article/${a.slug}`]}
                        />
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
                      Compare platforms from this article or use our quiz.
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

              {/* Standard: Render all sections with in-content ad after 2nd section */}
              {!isEnhanced && a.sections && a.sections.length > 0 && (
                <div className="space-y-10">
                  {a.sections.map(
                    (
                      section: { heading: string; body: string },
                      i: number
                    ) => (
                      <div key={i}>
                        <section
                          id={`section-${i}`}
                          className="scroll-mt-24"
                        >
                          <h2 className="text-2xl font-bold mb-4">
                            {section.heading}
                          </h2>
                          <LinkifiedText
                            text={section.body}
                            skipHrefs={[`/article/${a.slug}`]}
                          />
                        </section>
                        {/* In-content ad after 2nd section (only if 4+ sections for density) */}
                        {i === 1 && a.sections!.length >= 4 && (
                          <>
                          <AdSlot
                            placement="display-incontent-article"
                            variant="in-content"
                            page={pagePath}
                            brokers={allBrokersForWidget}
                          />
                          {/* Mid-article advisor CTA — contextual to article topic */}
                          {(() => {
                            const cat2 = (a.category || "").toLowerCase();
                            const tagStr2 = (a.tags || []).join(" ").toLowerCase();
                            const slug2 = (a.slug || "").toLowerCase();
                            const cmb = `${cat2} ${tagStr2} ${slug2}`;
                            let midType = ""; let midLabel = ""; let midHref = ""; let midBg = "bg-violet-50"; let midBorder = "border-violet-200"; let midText = "text-violet-700"; let midBtn = "bg-violet-600 hover:bg-violet-700";
                            if (cmb.match(/mortgage|home.loan|refinanc|first.home.buyer|stamp.duty|offset|borrow/)) {
                              midType = "mortgage"; midLabel = "Compare rates from 30+ lenders through a free mortgage broker"; midHref = "/advisors/mortgage-brokers"; midBg = "bg-rose-50"; midBorder = "border-rose-200"; midText = "text-rose-700"; midBtn = "bg-rose-600 hover:bg-rose-700";
                            } else if (cmb.match(/buyer.*agent|property.invest|investment.property|negative.gear/)) {
                              midType = "buyer"; midLabel = "Find a buyer's agent to negotiate on your behalf"; midHref = "/advisors/buyers-agents"; midBg = "bg-teal-50"; midBorder = "border-teal-200"; midText = "text-teal-700"; midBtn = "bg-teal-600 hover:bg-teal-700";
                            } else if (cmb.match(/insurance|income.protection|life.cover|tpd|trauma|landlord/)) {
                              midType = "insurance"; midLabel = "Not sure if your cover is enough? Talk to an insurance broker — free"; midHref = "/advisors/insurance-brokers"; midBg = "bg-sky-50"; midBorder = "border-sky-200"; midText = "text-sky-700"; midBtn = "bg-sky-600 hover:bg-sky-700";
                            } else if (cmb.match(/smsf|self.managed/)) {
                              midType = "smsf"; midLabel = "Get expert SMSF advice from a verified accountant"; midHref = "/advisors/smsf-accountants"; midBg = "bg-blue-50"; midBorder = "border-blue-200"; midText = "text-blue-700"; midBtn = "bg-blue-600 hover:bg-blue-700";
                            } else if (cmb.match(/tax|eofy|capital.gain|deduction|franking/)) {
                              midType = "tax"; midLabel = "Maximise your deductions — talk to a tax agent"; midHref = "/advisors/tax-agents"; midBg = "bg-amber-50"; midBorder = "border-amber-200"; midText = "text-amber-700"; midBtn = "bg-amber-600 hover:bg-amber-700";
                            }
                            if (!midType) return null;
                            return (
                              <div className={`mt-4 ${midBg} border ${midBorder} rounded-lg p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4`}>
                                <p className={`text-xs md:text-sm ${midText} font-medium flex-1`}>{midLabel}</p>
                                <Link href={midHref} className={`shrink-0 px-4 py-2 ${midBtn} text-white text-xs font-bold rounded-lg transition-colors`}>
                                  Find one near you &rarr;
                                </Link>
                              </div>
                            );
                          })()}
                          </>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Brokers to Compare for This Topic */}
              {relatedBrokers.length > 0 && (
                <div className="mt-8 md:mt-12 border border-slate-200 rounded-xl p-4 md:p-6 bg-white">
                  <h3 className="text-base md:text-lg font-bold mb-0.5 md:mb-1">
                    Platforms for This Topic
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

              {/* Topic Cluster Navigation */}
              {(() => {
                const clusterLinks = getClusterLinksForArticle(slug);
                if (clusterLinks.length === 0) return null;
                return <ClusterNav links={clusterLinks} currentTitle={a.title} />;
              })()}

              {/* Advisor prompt — contextual based on article category */}
              {(a.category === "Super & SMSF" || a.category === "Property" || a.category === "Tax & Strategy") && (
                <div className="mt-6 md:mt-8">
                  <AdvisorPrompt
                    context={a.category === "Super & SMSF" ? "smsf" : a.category === "Property" ? "property" : "tax"}
                  />
                </div>
              )}

              {/* Comments + reactions */}
              <ArticleComments slug={slug} />

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
                    <h3 className="text-base md:text-lg font-bold mb-0.5 md:mb-1">Best Platform Guides</h3>
                    <p className="text-xs md:text-sm text-slate-500 mb-2 md:mb-3">
                      See which platforms top our rankings for these topics.
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

              {/* Find an Advisor CTA — contextual based on article topic */}
              {(() => {
                // Contextual advisor matching — route each article to the RIGHT advisor type
                const cat = (a.category || "").toLowerCase();
                const tagStr = (a.tags || []).join(" ").toLowerCase();
                const slugStr = (a.slug || "").toLowerCase();
                const combined = `${cat} ${tagStr} ${slugStr}`;
                
                let advisorType = "financial_planner";
                let advisorLabel = "financial planner";
                let advisorColor = "violet";
                
                if (combined.match(/mortgage|home.loan|refinanc|first.home.buyer|stamp.duty|offset.account|borrow/)) {
                  advisorType = "mortgage_broker"; advisorLabel = "mortgage broker"; advisorColor = "rose";
                } else if (combined.match(/buyer.*agent|property.invest|investment.property|negative.gear|first.investment/)) {
                  advisorType = "buyers_agent"; advisorLabel = "buyer's agent"; advisorColor = "teal";
                } else if (combined.match(/insurance|income.protection|life.cover|tpd|trauma|landlord.insurance|cyber.insurance/)) {
                  advisorType = "insurance_broker"; advisorLabel = "insurance broker"; advisorColor = "sky";
                } else if (combined.match(/smsf|self.managed/)) {
                  advisorType = "smsf_accountant"; advisorLabel = "SMSF accountant"; advisorColor = "blue";
                } else if (combined.match(/tax|eofy|capital.gain|deduction|franking|tax.loss/)) {
                  advisorType = "tax_agent"; advisorLabel = "tax agent"; advisorColor = "amber";
                } else if (combined.match(/crypto|bitcoin|defi|staking/)) {
                  advisorType = "crypto_advisor"; advisorLabel = "crypto advisor"; advisorColor = "orange";
                } else if (combined.match(/estate.plan|will|power.of.attorney|testamentary/)) {
                  advisorType = "estate_planner"; advisorLabel = "estate planner"; advisorColor = "slate";
                } else if (combined.match(/super|retirement|pension|preservation/)) {
                  advisorType = "financial_planner"; advisorLabel = "financial planner"; advisorColor = "violet";
                }
                
                const colorMap: Record<string, { bg: string; border: string; text: string; heading: string; btn: string; btnHover: string; outlineBorder: string; outlineText: string; outlineHover: string }> = {
                  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", heading: "text-rose-900", btn: "bg-rose-600", btnHover: "hover:bg-rose-700", outlineBorder: "border-rose-300", outlineText: "text-rose-700", outlineHover: "hover:bg-rose-100" },
                  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", heading: "text-teal-900", btn: "bg-teal-600", btnHover: "hover:bg-teal-700", outlineBorder: "border-teal-300", outlineText: "text-teal-700", outlineHover: "hover:bg-teal-100" },
                  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", heading: "text-sky-900", btn: "bg-sky-600", btnHover: "hover:bg-sky-700", outlineBorder: "border-sky-300", outlineText: "text-sky-700", outlineHover: "hover:bg-sky-100" },
                  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", heading: "text-blue-900", btn: "bg-blue-600", btnHover: "hover:bg-blue-700", outlineBorder: "border-blue-300", outlineText: "text-blue-700", outlineHover: "hover:bg-blue-100" },
                  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", heading: "text-amber-900", btn: "bg-amber-600", btnHover: "hover:bg-amber-700", outlineBorder: "border-amber-300", outlineText: "text-amber-700", outlineHover: "hover:bg-amber-100" },
                  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", heading: "text-orange-900", btn: "bg-orange-600", btnHover: "hover:bg-orange-700", outlineBorder: "border-orange-300", outlineText: "text-orange-700", outlineHover: "hover:bg-orange-100" },
                  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", heading: "text-slate-900", btn: "bg-slate-600", btnHover: "hover:bg-slate-700", outlineBorder: "border-slate-300", outlineText: "text-slate-700", outlineHover: "hover:bg-slate-100" },
                  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", heading: "text-violet-900", btn: "bg-violet-600", btnHover: "hover:bg-violet-700", outlineBorder: "border-violet-300", outlineText: "text-violet-700", outlineHover: "hover:bg-violet-100" },
                };
                const c = colorMap[advisorColor] || colorMap.violet;
                const dirSlug = advisorType.replace(/_/g, "-") + "s";
                
                return (
                  <div className={`mt-6 md:mt-8 ${c.bg} border ${c.border} rounded-xl p-4 md:p-5`}>
                    <h3 className={`text-base md:text-lg font-bold mb-0.5 md:mb-1 ${c.heading}`}>
                      {advisorType === "mortgage_broker" ? "Need a Home Loan?" 
                        : advisorType === "buyers_agent" ? "Buying Property?"
                        : advisorType === "insurance_broker" ? "Is Your Cover Enough?"
                        : "Need Professional Advice?"}
                    </h3>
                    <p className={`text-xs md:text-sm ${c.text} mb-3`}>
                      {advisorType === "mortgage_broker" 
                        ? "Compare rates from 30+ lenders through a verified mortgage broker — free, paid by the lender."
                        : advisorType === "buyers_agent"
                        ? "A buyer's agent negotiates on your behalf and finds off-market deals. Free initial consultation."
                        : advisorType === "insurance_broker"
                        ? "Most Australians are underinsured through super. A broker reviews your cover for free."
                        : `Connect with a verified Australian ${advisorLabel} for personalised guidance.`}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link href={`/advisors/${dirSlug}`} className={`px-4 py-2.5 ${c.btn} text-white text-sm font-bold rounded-lg ${c.btnHover} transition-colors text-center`}>
                        {advisorType === "mortgage_broker" ? "Find a Mortgage Broker"
                          : advisorType === "buyers_agent" ? "Find a Buyer's Agent"
                          : advisorType === "insurance_broker" ? "Find an Insurance Broker"
                          : `Find a ${advisorLabel.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}`}
                      </Link>
                      <Link href={`/advisor-guides/${advisorType.replace(/_/g, "-")}`} className={`px-4 py-2.5 border ${c.outlineBorder} ${c.outlineText} text-sm font-semibold rounded-lg ${c.outlineHover} transition-colors text-center`}>
                        How to Choose
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Bottom CTA */}
              <div className="mt-8 md:mt-12 bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-8 text-center">
                <h3 className="text-xl md:text-2xl font-extrabold mb-1.5 md:mb-2 text-slate-900">
                  Find the Right Platform
                </h3>
                <p className="text-sm md:text-base text-slate-600 mb-4 md:mb-6 max-w-lg mx-auto">
                  Compare fees and platforms — or filter in 60 seconds with our quiz.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3">
                  <Link
                    href="/compare"
                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Compare All Platforms
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
