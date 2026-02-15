import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Article } from "@/lib/types";

export default async function ArticlesPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false });

  const categories = [...new Set((articles || []).map((a: Article) => a.category).filter(Boolean))];

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-4">Investing Guides & Articles</h1>
        <p className="text-lg text-slate-600 mb-8">
          Expert guides to help you make smarter investment decisions.
        </p>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-full">All</span>
          {categories.map((cat) => (
            <span key={cat} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-full hover:bg-slate-200 cursor-pointer">
              {cat}
            </span>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles?.map((article: Article) => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {article.category && (
                <span className="text-xs font-semibold text-amber uppercase tracking-wide">
                  {article.category}
                </span>
              )}
              <h2 className="text-lg font-bold mt-2 mb-2">{article.title}</h2>
              <p className="text-sm text-slate-600 mb-4 line-clamp-3">{article.excerpt}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {article.read_time && <span>{article.read_time} min read</span>}
                {article.published_at && (
                  <span>{new Date(article.published_at).toLocaleDateString('en-AU')}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
