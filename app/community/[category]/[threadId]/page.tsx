import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ThreadClient from "./ThreadClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const revalidate = 60; // 1 min ISR

/* ─── Types ─── */

interface AuthorProfile {
  user_id: string;
  display_name: string;
  reputation: number;
  badge: string | null;
  is_moderator: boolean;
}

interface ForumThread {
  id: string;
  category_id: string;
  author_id: string;
  author_name: string;
  title: string;
  slug: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  view_count: number;
  vote_score: number;
  created_at: string;
  updated_at: string | null;
  author_profile: AuthorProfile | null;
}

interface ForumPost {
  id: string;
  thread_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  body: string;
  vote_score: number;
  is_removed: boolean;
  created_at: string;
  updated_at: string | null;
  author_profile: AuthorProfile | null;
}

interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
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

function badgeStyle(badge: string | null): string {
  switch (badge) {
    case "contributor":
      return "bg-blue-100 text-blue-700";
    case "expert":
      return "bg-amber-100 text-amber-700";
    case "moderator":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function badgeLabel(badge: string | null): string {
  switch (badge) {
    case "contributor":
      return "Contributor";
    case "expert":
      return "Expert";
    case "moderator":
      return "Moderator";
    default:
      return "Newcomer";
  }
}

/* ─── Dynamic Metadata ─── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; threadId: string }>;
}): Promise<Metadata> {
  const { threadId } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("title, author_name")
    .eq("id", threadId)
    .eq("is_removed", false)
    .single();

  if (!thread) return { title: "Thread Not Found" };

  return {
    title: `${thread.title} - Community Forum`,
    description: `Discussion started by ${thread.author_name} in the Invest.com.au community forum.`,
  };
}

/* ─── Page ─── */

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ category: string; threadId: string }>;
}) {
  const { category: categorySlug, threadId } = await params;
  const supabase = await createClient();

  // Fetch category
  const { data: catData } = await supabase
    .from("forum_categories")
    .select("id, slug, name, icon, color")
    .eq("slug", categorySlug)
    .eq("status", "active")
    .single();

  if (!catData) notFound();
  const category = catData as ForumCategory;

  // Fetch thread
  const { data: threadData } = await supabase
    .from("forum_threads")
    .select("*")
    .eq("id", threadId)
    .eq("is_removed", false)
    .single();

  if (!threadData) notFound();

  // Fetch posts
  const { data: postsData } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("thread_id", threadId)
    .eq("is_removed", false)
    .order("created_at", { ascending: true });

  // Fetch author profiles
  const authorIds = new Set<string>();
  authorIds.add(threadData.author_id);
  if (postsData) {
    for (const post of postsData) {
      authorIds.add(post.author_id);
    }
  }

  const { data: profiles } = await supabase
    .from("forum_user_profiles")
    .select("user_id, display_name, reputation, badge, is_moderator")
    .in("user_id", Array.from(authorIds));

  const profileMap: Record<string, AuthorProfile> = {};
  if (profiles) {
    for (const p of profiles) {
      profileMap[p.user_id] = p as AuthorProfile;
    }
  }

  const thread: ForumThread = {
    ...threadData,
    author_profile: profileMap[threadData.author_id] ?? null,
  };

  const posts: ForumPost[] = (postsData ?? []).map((post) => ({
    ...post,
    author_profile: profileMap[post.author_id] ?? null,
  }));

  // Increment view count (fire-and-forget)
  supabase
    .from("forum_threads")
    .update({ view_count: (thread.view_count ?? 0) + 1 })
    .eq("id", threadId)
    .then(() => {});

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Community", url: absoluteUrl("/community") },
    { name: category.name, url: absoluteUrl(`/community/${categorySlug}`) },
    { name: thread.title },
  ]);

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
            <li>
              <Link
                href={`/community/${categorySlug}`}
                className="hover:text-slate-700"
              >
                {category.name}
              </Link>
            </li>
            <li>
              <Icon name="chevron-right" size={14} className="text-slate-400" />
            </li>
            <li className="text-slate-900 font-medium truncate max-w-[200px]">
              {thread.title}
            </li>
          </ol>
        </nav>
      </div>

      {/* Thread Header */}
      <div className="container-custom max-w-4xl mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
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
          </div>

          <h1 className="text-xl md:text-2xl text-slate-900 font-extrabold mb-4">
            {thread.title}
          </h1>

          {/* Author + Meta */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <Icon name="user" size={16} className="text-slate-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {thread.author_name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeStyle(
                    thread.author_profile?.badge ?? null
                  )}`}
                >
                  {badgeLabel(thread.author_profile?.badge ?? null)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Icon name="clock" size={12} />
                  {timeAgo(thread.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="eye" size={12} />
                  {thread.view_count.toLocaleString()} views
                </span>
              </div>
            </div>
          </div>

          {/* Thread Body */}
          <div className="prose prose-sm max-w-none text-slate-700">
            {thread.body.split("\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Client Component */}
      <Suspense
        fallback={
          <div className="container-custom max-w-4xl pb-16">
            <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-20 bg-slate-100 rounded" />
            </div>
          </div>
        }
      >
        <ThreadClient
          thread={thread}
          posts={posts}
          categorySlug={categorySlug}
        />
      </Suspense>
    </div>
  );
}
