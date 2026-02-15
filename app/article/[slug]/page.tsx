import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Article, Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import ArticleDetailClient from "./ArticleDetailClient";

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
};

const CALC_NAMES: Record<string, { name: string; icon: string }> = {
  "calc-franking": { name: "Franking Credits Calculator", icon: "💰" },
  "calc-switching": { name: "Switching Cost Simulator", icon: "🔄" },
  "calc-fx": { name: "FX Fee Calculator", icon: "🇺🇸" },
  "calc-cgt": { name: "CGT Estimator", icon: "📅" },
  "calc-chess": { name: "CHESS Lookup Tool", icon: "🔒" },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
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

  // Fetch the article
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!article) notFound();

  const a = article as Article;

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

  // Fetch related articles (same category, different slug)
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

  return (
    <div>
      {/* Dark Hero Section */}
      <section className="bg-brand text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="text-sm text-slate-400 mb-6">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/articles" className="hover:text-white transition-colors">
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
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
              {a.title}
            </h1>

            {/* Excerpt */}
            {a.excerpt && (
              <p className="text-lg text-slate-300 leading-relaxed">
                {a.excerpt}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Table of Contents */}
            {a.sections && a.sections.length > 1 && (
              <nav className="border border-slate-200 rounded-xl p-6 mb-10 bg-slate-50">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Table of Contents
                </h2>
                <ol className="space-y-2">
                  {a.sections.map(
                    (section: { heading: string; body: string }, i: number) => (
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

            {/* Article Sections */}
            {a.sections && a.sections.length > 0 && (
              <div className="space-y-10">
                {a.sections.map(
                  (section: { heading: string; body: string }, i: number) => (
                    <section key={i} id={`section-${i}`} className="scroll-mt-24">
                      <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
                      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                        {section.body}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}

            {/* Best Brokers for This Topic */}
            {relatedBrokers.length > 0 && (
              <div className="mt-12 border border-slate-200 rounded-xl p-6 bg-white">
                <h3 className="text-lg font-bold mb-1">
                  Best Brokers for This Topic
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  Top-rated platforms relevant to this guide.
                </p>
                <div className="space-y-4">
                  {relatedBrokers.map((broker) => (
                    <ArticleDetailClient key={broker.id} broker={broker} slug={slug} />
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
                    <h3 className="text-lg font-bold mb-1">Related Calculator</h3>
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
                        className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow bg-white flex flex-col"
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
                <strong>Disclaimer:</strong> The information on this page is
                general in nature and does not constitute financial advice. We
                are not licensed financial advisers. Consider your own
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
        </div>
      </div>
    </div>
  );
}
