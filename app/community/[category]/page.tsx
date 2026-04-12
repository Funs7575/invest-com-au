import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Metadata } from "next";

export const revalidate = 300; // 5 min ISR

/* ─── Static Params ─── */

export async function generateStaticParams() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("forum_categories")
    .select("slug")
    .eq("status", "active");

  return (data ?? []).map((c) => ({ category: c.slug }));
}

/* ─── Dynamic Metadata ─── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const supabase = await createClient();

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("name, description")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!cat) return { title: "Category Not Found" };

  return {
    title: `${cat.name} - Community Forum`,
    description: cat.description,
    alternates: { canonical: `/community/${slug}` },
  };
}

/* ─── Types ─── */

interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  thread_count: number;
  post_count: number;
}

interface ForumThread {
  id: string;
  category_id: string;
  author_id: string;
  author_name: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  view_count: number;
  vote_score: number;
  last_reply_at: string | null;
  created_at: string;
}

/* ─── Helpers ─── */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
  });
}

/* ─── Page ─── */

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { category: slug } = await params;
  const { sort = "recent", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const limit = 20;

  const supabase = await createClient();

  // Fetch category
  const { data: cat, error: catError } = await supabase
    .from("forum_categories")
    .select(
      "id, slug, name, description, icon, color, thread_count, post_count"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (catError || !cat) notFound();

  const category = cat as ForumCategory;

  // Fetch threads
  let query = supabase
    .from("forum_threads")
    .select(
      "id, category_id, author_id, author_name, title, slug, is_pinned, is_locked, reply_count, view_count, vote_score, last_reply_at, created_at",
      { count: "exact" }
    )
    .eq("category_id", category.id)
    .eq("is_removed", false)
    .order("is_pinned", { ascending: false });

  switch (sort) {
    case "popular":
      query = query.order("vote_score", { ascending: false });
      break;
    case "unanswered":
      query = query.eq("reply_count", 0).order("created_at", { ascending: false });
      break;
    case "recent":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range((page - 1) * limit, page * limit - 1);

  const { data: threadsData, count } = await query;
  const threads: ForumThread[] = threadsData ?? [];
  const totalThreads = count ?? 0;
  const hasMore = page * limit < totalThreads;

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Community", url: absoluteUrl("/community") },
    { name: category.name },
  ]);

  const sortTabs = [
    { key: "recent", label: "Recent" },
    { key: "popular", label: "Popular" },
    { key: "unanswered", label: "Unanswered" },
  ] as const;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Breadcrumbs */}
      <div className="container-custom max-w-4xl mt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
          <ol className="flex items-center gap-1 flex-wrap">
            <li>
              <Link href="/" className="hover:text-slate-700">
                Home
              </Link>
            </li>
            <li>
              <Icon name="chevron-right" size={14} className="text-slate-400" />
            </li>
            <li>
              <Link href="/community" className="hover:text-slate-700">
                Community
              </Link>
            </li>
            <li>
              <Icon name="chevron-right" size={14} className="text-slate-400" />
            </li>
            <li className="text-slate-900 font-medium">{category.name}</li>
          </ol>
        </nav>
      </div>

      {/* Category Header */}
      <div className="container-custom max-w-4xl mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: category.color + "18" }}
          >
            <span style={{ color: category.color }}>
              <Icon name={category.icon} size={24} className="shrink-0" />
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl text-slate-900 font-extrabold">
              {category.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {category.description}
            </p>
          </div>
          <Link
            href={`/community/new?category=${slug}`}
            className="hidden sm:inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shrink-0"
          >
            <Icon name="plus" size={16} />
            New Thread
          </Link>
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="container-custom max-w-4xl mb-4">
        <div className="flex items-center gap-1 border-b border-slate-200">
          {sortTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/community/${slug}?sort=${tab.key}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                sort === tab.key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <div className="container-custom max-w-4xl pb-16">
        {threads.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Icon
              name="message-circle"
              size={40}
              className="text-slate-300 mx-auto mb-3"
            />
            <p className="text-slate-500 mb-4">
              No threads yet. Be the first to start a discussion!
            </p>
            <Link
              href={`/community/new?category=${slug}`}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Icon name="plus" size={16} />
              New Thread
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/community/${slug}/${thread.id}`}
                className="block bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          <Icon name="pin" size={12} />
                          Pinned
                        </span>
                      )}
                      {thread.is_locked && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          <Icon name="lock" size={12} />
                          Locked
                        </span>
                      )}
                      <h3 className="text-slate-900 font-semibold group-hover:text-emerald-700 transition-colors truncate">
                        {thread.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Icon name="user" size={12} />
                        {thread.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="clock" size={12} />
                        {timeAgo(thread.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                    <span
                      className="flex items-center gap-1"
                      title="Replies"
                    >
                      <Icon name="message-circle" size={14} />
                      {thread.reply_count}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      title="Score"
                    >
                      <Icon name="arrow-up" size={14} />
                      {thread.vote_score}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      title="Views"
                    >
                      <Icon name="eye" size={14} />
                      {thread.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Link
              href={`/community/${slug}?sort=${sort}&page=${page + 1}`}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Load More
            </Link>
          </div>
        )}

        {/* Mobile New Thread CTA */}
        <div className="sm:hidden mt-6">
          <Link
            href={`/community/new?category=${slug}`}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors w-full"
          >
            <Icon name="plus" size={16} />
            New Thread
          </Link>
        </div>
      </div>
    </div>
  );
}
