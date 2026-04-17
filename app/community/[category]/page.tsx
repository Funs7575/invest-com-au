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
  // maybeSingle returns null when zero rows without throwing; the
  // outer try/catch covers DB connection or RLS errors.
  try {
    const supabase = await createClient();
    const { data: cat } = await supabase
      .from("forum_categories")
      .select("name, description")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (!cat) return { title: "Category Not Found" };

    return {
      title: `${cat.name} - Community Forum`,
      description: cat.description,
      alternates: { canonical: `/community/${slug}` },
    };
  } catch {
    return { title: "Category Not Found" };
  }
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

  // Look up the category. maybeSingle() returns null for "not found"
  // without throwing — .single() was throwing when the category was
  // missing, which manifested as a 500 rather than a 404. Wrap in
  // try/catch so DB failures also fall through to notFound rather
  // than crashing the route.
  let category: ForumCategory | null = null;
  try {
    const supabase = await createClient();
    const { data: cat } = await supabase
      .from("forum_categories")
      .select(
        "id, slug, name, description, icon, color, thread_count, post_count"
      )
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (cat) category = cat as ForumCategory;
  } catch {
    // Fall through — category stays null, we notFound below.
  }

  if (!category) notFound();

  // Fetch threads — defensive: if the forum_threads table fails
  // we still render the category page with an empty thread list
  // rather than bubbling a 500.
  let threads: ForumThread[] = [];
  let totalThreads = 0;
  try {
    const supabase = await createClient();
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
    threads = threadsData ?? [];
    totalThreads = count ?? 0;
  } catch {
    // Empty thread list — category page still renders with its
    // hero and "Be the first to post" empty state below.
  }
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
          <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-12 text-center">
            <Icon
              name="message-circle"
              size={40}
              className="text-slate-300 mx-auto mb-3"
            />
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              No threads yet
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Be the first to start a discussion in {category.name}.
            </p>
            <Link
              href={`/community/new?category=${slug}`}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm mb-8"
            >
              <Icon name="plus" size={16} />
              Start the First Thread
            </Link>

            {/* Popular topics */}
            <div className="border-t border-slate-100 pt-6 max-w-md mx-auto">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Popular topics in this category
              </p>
              <div className="space-y-2 text-left">
                {[
                  `Which platform is best for ${category.name.toLowerCase()}?`,
                  `Beginner tips for ${category.name.toLowerCase()}`,
                  `Common mistakes to avoid in ${category.name.toLowerCase()}`,
                  `Best resources to learn about ${category.name.toLowerCase()}`,
                  `Tax & reporting questions for ${category.name.toLowerCase()}`,
                ].map((topic) => (
                  <Link
                    key={topic}
                    href={`/community/new?category=${slug}&title=${encodeURIComponent(topic)}`}
                    className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                  >
                    <Icon name="message-circle" size={14} className="text-slate-400 group-hover:text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">
                      {topic}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
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
