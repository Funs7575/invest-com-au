import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Article, Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ArticleDetailClient from "./ArticleDetailClient";
import IntlBrokersEnhanced from "@/components/IntlBrokersEnhanced";
import ArticleSidebar from "@/components/ArticleSidebar";
import ComparisonTableSkeleton from "@/components/ComparisonTableSkeleton";
import AuthorByline from "@/components/AuthorByline";

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
  reviews: "bg-teal-100 text-teal-700",
};

const CALC_NAMES: Record<string, { name: string; icon: string }> = {
  "calc-franking": { name: "Franking Credits Calculator", icon: "💰" },
  "calc-switching": { name: "Switching Cost Simulator", icon: "🔄" },
  "calc-fx": { name: "FX Fee Calculator", icon: "🇺🇸" },
  "calc-cgt": { name: "CGT Estimator", icon: "📅" },
  "calc-chess": { name: "CHESS Lookup Tool", icon: "🔒" },
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
    .select("title, excerpt")
    .eq("slug", slug)
    .single();

  if (!article) return { title: "Article Not Found" };

  return {
    title: `${article.title} — Invest.com.au`,
    description: article.excerpt || "",
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
    .select("*")
    .eq("slug", slug)
    .single();

  if (!article) notFound();

  const a = article as Article;
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

  // JSON-LD schema for all articles
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    author:
      a.author_name && a.author_name !== "Market Research Team"
        ? {
            "@type": "Person",
            name: a.author_name,
            ...(a.author_linkedin ? { url: a.author_linkedin } : {}),
          }
        : {
            "@type": "Organization",
            name: "Invest.com.au",
            url: "https://invest-com-au.vercel.app",
          },
    publisher: {
      "@type": "Organization",
      name: "Invest.com.au",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://invest-com-au.vercel.app${pagePath}`,
    },
  };

  return (
    <div>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Dark Hero Section */}
      <section className="bg-brand text-white py-16">
        <div className="container-custom">
          <div className={isEnhanced ? "max-w-5xl mx-auto" : "max-w-3xl mx-auto"}>
            {/* Breadcrumb */}
            <div className="text-sm text-slate-400 mb-6">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link
                href="/articles"
                className="hover:text-white transition-colors"
              >
                Articles
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-300">{a.title}</span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-3 mb-4">
              {a.category && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${categoryColor}`}
                >
                  {a.category}
                </span>
              )}
              {a.read_time && (
                <span className="text-xs text-slate-400">
                  {a.read_time} min read
                </span>
              )}
              {a.published_at && (
                <span className="text-xs text-slate-400">
                  {new Date(a.published_at).toLocaleDateString("en-AU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
              {isEnhanced && (
                <span className="text-xs font-semibold bg-amber/20 text-amber px-2.5 py-0.5 rounded-full">
                  Updated Feb 2026
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
              {a.title}
            </h1>

            {/* Excerpt */}
            {a.excerpt && (
              <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">
                {a.excerpt}
              </p>
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
              variant="dark"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="py-12">
        <div className="container-custom">
          <div
            className={
              isEnhanced
                ? "max-w-5xl mx-auto flex gap-8"
                : "max-w-3xl mx-auto"
            }
          >
            {/* Article Column */}
            <div className={isEnhanced ? "flex-1 min-w-0" : ""}>
              {/* Table of Contents */}
              {a.sections && a.sections.length > 1 && (
                <nav className="border border-slate-200 rounded-xl p-6 mb-10 bg-slate-50">
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
                            className="text-sm text-slate-700 hover:text-amber transition-colors flex items-start gap-2"
                          >
                            <span className="text-amber font-semibold shrink-0">
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
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-green-900 mb-1">Ready to act?</h3>
                    <p className="text-sm text-slate-600">
                      Compare the brokers mentioned in this article, or let our quiz match you in 60 seconds.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href="/compare"
                      className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                    >
                      Compare Brokers &rarr;
                    </Link>
                    <Link
                      href="/quiz"
                      className="px-4 py-2 border border-green-700 text-green-700 text-sm font-semibold rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Take the Quiz
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
                <div className="mt-12 border border-slate-200 rounded-xl p-6 bg-white">
                  <h3 className="text-lg font-bold mb-1">
                    Brokers to Compare for This Topic
                  </h3>
                  <p className="text-sm text-slate-500 mb-5">
                    Platforms relevant to this guide. We may earn a commission via these links.
                  </p>
                  <div className="space-y-4">
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
                <div className="mt-8 border border-amber-200 rounded-xl p-6 bg-amber-50">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{calcInfo.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">
                        Related Calculator
                      </h3>
                      <p className="text-sm text-slate-600 mb-3">
                        Run the numbers yourself with our {calcInfo.name}.
                      </p>
                      <Link
                        href={`/calculators?calc=${a.related_calc}`}
                        className="inline-block px-5 py-2.5 bg-amber text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Open {calcInfo.name} &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold mb-6">Related Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {relatedArticles.map((ra) => {
                      const raCategoryColor =
                        CATEGORY_COLORS[ra.category || ""] ||
                        "bg-slate-100 text-slate-700";
                      return (
                        <Link
                          key={ra.id}
                          href={`/article/${ra.slug}`}
                          className="border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:scale-[1.02] transition-all bg-white flex flex-col"
                        >
                          {ra.category && (
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start mb-2 ${raCategoryColor}`}
                            >
                              {ra.category}
                            </span>
                          )}
                          <h4 className="text-sm font-bold mb-2 line-clamp-2 flex-1">
                            {ra.title}
                          </h4>
                          {ra.read_time && (
                            <span className="text-xs text-slate-400">
                              {ra.read_time} min read
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom CTA */}
              <div className="mt-12 bg-brand rounded-xl p-8 text-center text-white">
                <h3 className="text-2xl font-extrabold mb-2">
                  Find the Right Broker
                </h3>
                <p className="text-slate-300 mb-6 max-w-lg mx-auto">
                  Compare fees, features, and platforms across every major
                  Australian broker — or let our quiz match you in 60 seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/compare"
                    className="px-6 py-3 bg-white text-brand text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Compare All Brokers
                  </Link>
                  <Link
                    href="/quiz"
                    className="px-6 py-3 bg-amber text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Take the Quiz
                  </Link>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-10 border-t border-slate-200 pt-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>General Advice Warning:</strong> The information on
                  this page is general in nature and does not constitute
                  financial advice. We are not licensed financial advisers under
                  the Corporations Act 2001 (Cth). Consider your own
                  circumstances and seek professional advice before making
                  investment decisions. Invest.com.au may receive a commission
                  from partners featured on this page, but this does not
                  influence our editorial opinions or rankings.{" "}
                  <Link
                    href="/how-we-earn"
                    className="text-amber hover:underline"
                  >
                    How we earn money
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Desktop Sidebar (enhanced articles only) */}
            {isEnhanced && topPick && (
              <ArticleSidebar broker={topPick} pagePath={pagePath} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
