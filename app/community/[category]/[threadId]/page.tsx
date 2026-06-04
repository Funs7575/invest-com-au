import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { resolveAdvisorBadges } from "@/lib/forum-author-badges";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ThreadClient from "./ThreadClient";
import VerifiedAdvisorBadge from "@/components/VerifiedAdvisorBadge";
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
  verified_advisor?: { slug: string; type: string } | null;
}

interface ForumThread {
  id: string;
  category_id: string;
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
  // Server-computed ownership flag — replaces shipping the raw author_id
  // (a Supabase auth.uid) to the browser. See finding "Forum thread-detail
  // page serializes author_id to the client".
  is_own: boolean;
}

interface ForumPost {
  id: string;
  thread_id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  vote_score: number;
  is_removed: boolean;
  created_at: string;
  updated_at: string | null;
  author_profile: AuthorProfile | null;
  // Server-computed ownership flag (see ForumThread.is_own).
  is_own: boolean;
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
  const { category: categorySlug, threadId } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("title, author_name")
    .eq("id", threadId)
    .eq("is_removed", false)
    .single();

  if (!thread) return { title: "Thread Not Found" };

  const title = `${thread.title} - Community Forum`;
  const description = `Discussion started by ${thread.author_name} in the Invest.com.au community forum.`;
  const canonicalPath = `/community/${categorySlug}/${threadId}`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(thread.title)}&subtitle=${encodeURIComponent("Community Forum · Invest.com.au")}&type=community`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(canonicalPath) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
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

  // Resolve the viewer once, server-side. author_id (a Supabase auth.uid) is
  // never serialized to the client; ownership/moderator state is computed here
  // and only booleans cross the RSC boundary.
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerId = viewer?.id ?? null;

  // Fetch thread — explicit columns (no select("*")). author_id stays
  // server-side only, long enough to build profileMap and ownership flags.
  const { data: threadData } = await supabase
    .from("forum_threads")
    .select(
      "id, category_id, author_id, author_name, title, slug, body, is_pinned, is_locked, reply_count, view_count, vote_score, created_at, updated_at"
    )
    .eq("id", threadId)
    .eq("is_removed", false)
    .single();

  if (!threadData) notFound();

  // Fetch posts — explicit columns (no select("*")), author_id server-side only.
  const { data: postsData } = await supabase
    .from("forum_posts")
    .select(
      "id, thread_id, parent_id, author_id, author_name, body, vote_score, is_removed, created_at, updated_at"
    )
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
  // Include the viewer so their own moderator flag is available even when they
  // have not authored anything in this thread (matches the intent of the prior
  // client-side mod check, without shipping author_ids to the browser).
  if (viewerId != null) {
    authorIds.add(viewerId);
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

  // Overlay verified advisor data where professionals have linked their auth account.
  // Uses the dedicated cross-user helper which holds the admin client behind the
  // documented service-role exception (see lib/forum-author-badges.ts for rationale).
  const authorIdList = Array.from(authorIds);
  const advisorBadges = await resolveAdvisorBadges(authorIdList);
  for (const [uid, badge] of advisorBadges) {
    if (profileMap[uid]) {
      profileMap[uid].verified_advisor = badge;
    }
  }

  // Strip author_id before crossing the client boundary — keep only a
  // per-row ownership boolean so the browser never receives raw auth UUIDs.
  const { author_id: threadAuthorId, ...threadRest } = threadData;
  const thread: ForumThread = {
    ...threadRest,
    author_profile: profileMap[threadAuthorId] ?? null,
    is_own: viewerId != null && threadAuthorId === viewerId,
  };

  const posts: ForumPost[] = (postsData ?? []).map((post) => {
    const { author_id: postAuthorId, ...postRest } = post;
    return {
      ...postRest,
      author_profile: profileMap[postAuthorId] ?? null,
      is_own: viewerId != null && postAuthorId === viewerId,
    };
  });

  // Moderator state for the viewer is the authoritative server-side flag from
  // their own forum profile — computed here, never inferred client-side from
  // other users' author_ids. Defaults to false for anonymous/non-mod viewers.
  const isViewerModerator =
    viewerId != null && profileMap[viewerId]?.is_moderator === true;

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
            <li className="text-slate-900 font-medium truncate max-w-50">
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-900">
                  {thread.author_name}
                </span>
                {thread.author_profile?.verified_advisor ? (
                  <VerifiedAdvisorBadge
                    advisorSlug={thread.author_profile.verified_advisor.slug}
                    advisorType={thread.author_profile.verified_advisor.type}
                  />
                ) : (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeStyle(
                      thread.author_profile?.badge ?? null
                    )}`}
                  >
                    {badgeLabel(thread.author_profile?.badge ?? null)}
                  </span>
                )}
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
          isModerator={isViewerModerator}
        />
      </Suspense>
      <div className="container-custom max-w-4xl pb-8">
        <p className="text-xs text-slate-500 border-t pt-4 leading-relaxed">
          <strong>General advice warning:</strong> {GENERAL_ADVICE_WARNING}
        </p>
      </div>
    </div>
  );
}
