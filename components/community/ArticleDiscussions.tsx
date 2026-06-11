import Link from "next/link";
import Icon from "@/components/Icon";
import { getThreadsForArticle } from "@/lib/community/cross-links";

/**
 * "Discussed in the community" block for article pages (plan Phase 1.7).
 *
 * Server component: renders nothing at all when no genuinely related
 * thread exists (honest-empty — no container, no layout shift). Wrap in
 * <Suspense fallback={null}> at the call site so the article body never
 * waits on the forum query.
 */
export default async function ArticleDiscussions({
  title,
  category,
  tags,
}: {
  title: string;
  category: string | null | undefined;
  tags?: string[] | null;
}) {
  const threads = await getThreadsForArticle({ title, category, tags });
  if (threads.length === 0) return null;

  return (
    <section
      aria-label="Community discussions about this topic"
      className="mt-6 md:mt-8 border border-slate-200 rounded-xl p-4 md:p-6 bg-white"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon name="message-circle" size={18} className="text-emerald-700" />
        <h3 className="text-base md:text-lg font-bold text-slate-900">
          Discussed in the community
        </h3>
      </div>
      <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
        Real questions from the Invest.com.au community on this topic.
      </p>
      <ul className="space-y-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              href={thread.href}
              className="group flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900 leading-snug">
                {thread.title}
              </span>
              <span className="shrink-0 text-xs text-slate-400 mt-0.5">
                {thread.replyCount === 1
                  ? "1 reply"
                  : `${thread.replyCount} replies`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/community"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          Browse the community forum &rarr;
        </Link>
        <p className="text-[0.69rem] text-slate-400">
          Community posts are general information, not financial advice.
        </p>
      </div>
    </section>
  );
}
