import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Article } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!article) notFound();

  const a = article as Article;

  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/articles" className="hover:text-brand">Articles</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">{a.title}</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            {a.category && (
              <span className="text-sm font-semibold text-amber uppercase tracking-wide">
                {a.category}
              </span>
            )}
            <h1 className="text-4xl font-bold mt-2 mb-4">{a.title}</h1>
            {a.excerpt && (
              <p className="text-lg text-slate-600">{a.excerpt}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
              {a.read_time && <span>{a.read_time} min read</span>}
              {a.published_at && (
                <span>{new Date(a.published_at).toLocaleDateString('en-AU')}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {a.tags && a.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {a.tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sections */}
          {a.sections && a.sections.length > 0 && (
            <div className="space-y-8">
              {a.sections.map((section: { heading: string; body: string }, i: number) => (
                <section key={i}>
                  <h2 className="text-2xl font-bold mb-3">{section.heading}</h2>
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Related Brokers */}
          {a.related_brokers && a.related_brokers.length > 0 && (
            <div className="mt-12 border-t border-slate-200 pt-8">
              <h3 className="text-lg font-bold mb-4">Related Brokers</h3>
              <div className="flex flex-wrap gap-2">
                {a.related_brokers.map((slug: string) => (
                  <Link
                    key={slug}
                    href={`/broker/${slug}`}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    {slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-12">
            <Link href="/articles" className="text-amber font-semibold hover:underline">
              &larr; Back to Articles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
