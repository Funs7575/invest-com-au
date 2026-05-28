import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Investment Confessions — Community",
  description:
    "Anonymous investing confessions from real investors. Share your own mistakes, wins, and honest thoughts — no judgement.",
};

interface ConfessionThread {
  id: number;
  title: string;
  body: string;
  vote_score: number;
  reply_count: number;
  created_at: string;
  category_id: number;
  slug: string;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

export default async function ConfessionsPage() {
  const supabase = await createClient();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("id, title, body, vote_score, reply_count, created_at, category_id, slug")
    .eq("thread_type", "confessions")
    .eq("is_removed", false)
    .order("created_at", { ascending: false })
    .limit(40);

  const confessions: ConfessionThread[] = (threads ?? []).map((t) => ({
    id: t.id as number,
    title: t.title,
    body: t.body,
    vote_score: t.vote_score ?? 0,
    reply_count: t.reply_count ?? 0,
    created_at: t.created_at,
    category_id: t.category_id as number,
    slug: t.slug,
  }));

  // Resolve category slugs for thread links — fetch once.
  const categoryIds = [...new Set(confessions.map((c) => c.category_id))];
  const { data: cats } = await supabase
    .from("forum_categories")
    .select("id, slug")
    .in("id", categoryIds.length > 0 ? categoryIds : [-1]);

  const catMap: Record<number, string> = {};
  for (const c of cats ?? []) {
    catMap[c.id as number] = c.slug;
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Community", url: absoluteUrl("/community") },
    { name: "Confessions" },
  ]);

  return (
    <div className="container-custom max-w-4xl py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
        <ol className="flex items-center gap-1 flex-wrap">
          <li>
            <Link href="/" className="hover:text-slate-700">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/community" className="hover:text-slate-700">Community</Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-slate-900 font-medium">Confessions</li>
        </ol>
      </nav>

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              Investment Confessions
            </h1>
            <p className="text-slate-600 max-w-2xl">
              Anonymous stories from real investors. Mistakes, surprises, and honest thoughts — posted
              without names so you can share freely.
            </p>
          </div>
          <Link
            href="/community/new?thread_type=confessions"
            className="shrink-0 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Confess →
          </Link>
        </div>
      </header>

      {confessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3" aria-hidden>🤐</p>
          <p className="font-semibold text-slate-600">No confessions yet</p>
          <p className="text-sm mt-1">Be the first to share yours — anonymously.</p>
          <Link
            href="/community/new?thread_type=confessions"
            className="inline-block mt-4 text-sm font-medium text-violet-700 hover:underline"
          >
            Post a confession →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {confessions.map((c) => {
            const catSlug = catMap[c.category_id] ?? "general";
            const excerpt = c.body.slice(0, 180) + (c.body.length > 180 ? "…" : "");
            return (
              <article
                key={c.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-200 transition-colors"
              >
                <Link
                  href={`/community/${catSlug}/${c.id}`}
                  className="block group"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-lg" aria-hidden>
                      🤐
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-2">
                        {c.title}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{excerpt}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="font-medium text-slate-500 italic">Anonymous Investor</span>
                        <span>{timeAgo(c.created_at)}</span>
                        <span>{c.reply_count} {c.reply_count === 1 ? "reply" : "replies"}</span>
                        {c.vote_score !== 0 && (
                          <span className={c.vote_score > 0 ? "text-emerald-600" : "text-red-500"}>
                            {c.vote_score > 0 ? "+" : ""}{c.vote_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <footer className="mt-8 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Confessions are posted anonymously. Author identity is never revealed publicly — only
          moderation staff can access metadata in the event of a Terms of Service violation.
        </p>
      </footer>
    </div>
  );
}
