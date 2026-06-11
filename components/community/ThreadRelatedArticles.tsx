import Link from "next/link";
import Icon from "@/components/Icon";
import { getArticlesForThread } from "@/lib/community/cross-links";

/**
 * "Related guides" block for community thread pages (plan Phase 1.7) —
 * the reverse direction of <ArticleDiscussions />.
 *
 * Server component: renders nothing when no genuinely related article
 * exists (honest-empty — no container, no layout shift). Wrap in
 * <Suspense fallback={null}> so the thread page never waits on it.
 */
export default async function ThreadRelatedArticles({
  threadTitle,
  categorySlug,
}: {
  threadTitle: string;
  categorySlug: string;
}) {
  const articles = await getArticlesForThread({ title: threadTitle, categorySlug });
  if (articles.length === 0) return null;

  return (
    <div className="container-custom max-w-4xl mb-6">
      <section
        aria-label="Related guides from Invest.com.au"
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon name="book-open" size={16} className="text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">
            Related guides from Invest.com.au
          </h2>
        </div>
        <ul className="space-y-2">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={article.href}
                className="group flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 hover:border-slate-300 transition-colors"
              >
                <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900 leading-snug">
                  {article.title}
                </span>
                {article.readTime ? (
                  <span className="shrink-0 text-xs text-slate-400 mt-0.5">
                    {article.readTime} min read
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
