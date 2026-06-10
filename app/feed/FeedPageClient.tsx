"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

type PostType = "update" | "insight" | "question" | "resource";

interface PostRow {
  id: number;
  body: string;
  post_type: PostType;
  link_url: string | null;
  link_title: string | null;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  professional: {
    name: string;
    slug: string;
    photo_url: string | null;
    type: string;
  } | null;
}

const POST_TYPE_CONFIG: Record<PostType, { label: string; bg: string; color: string }> = {
  insight:  { label: "Insight",  bg: "#f0fdfa", color: "#0f766e" },
  update:   { label: "Update",   bg: "#eff6ff", color: "#1d4ed8" },
  question: { label: "Question", bg: "#fffbeb", color: "#b45309" },
  resource: { label: "Resource", bg: "#faf5ff", color: "#7e22ce" },
};

function getInitials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

const REACTION_OPTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
];

type ReactionType = "like" | "insightful" | "celebrate";

function PostCard({ post }: { post: PostRow }) {
  const pro = post.professional;
  const typeConfig = POST_TYPE_CONFIG[post.post_type] ?? POST_TYPE_CONFIG.update;
  const initials = pro?.name ? getInitials(pro.name) : "?";
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [reactPending, setReactPending] = useState(false);

  async function handleReact(type: ReactionType) {
    if (reactPending) return;
    setReactPending(true);
    // Optimistic: toggling the same reaction removes it; switching keeps count.
    const prev = { count: reactionCount, mine: myReaction };
    if (myReaction === type) {
      setMyReaction(null);
      setReactionCount((c) => Math.max(0, c - 1));
    } else {
      if (myReaction === null) setReactionCount((c) => c + 1);
      setMyReaction(type);
    }
    try {
      const res = await fetch("/api/feed/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, reaction_type: type }),
      });
      if (res.status === 401) {
        setReactionCount(prev.count);
        setMyReaction(prev.mine);
        window.location.href = `/auth/login?next=${encodeURIComponent("/feed")}`;
        return;
      }
      if (!res.ok) throw new Error("react failed");
      const data = (await res.json()) as { reaction_count: number; reaction_type: ReactionType | null };
      setReactionCount(data.reaction_count);
      setMyReaction(data.reaction_type);
    } catch {
      setReactionCount(prev.count);
      setMyReaction(prev.mine);
    } finally {
      setReactPending(false);
    }
  }

  return (
    <article className="iv2-card iv2-card-hover" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 99, overflow: "hidden", flexShrink: 0, background: "var(--color-ink-700)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, position: "relative" }}>
          {pro?.photo_url ? (
            <Image src={pro.photo_url} alt={pro.name} fill sizes="44px" style={{ objectFit: "cover" }} />
          ) : (
            initials
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {pro?.slug ? (
              <Link href={`/advisor/${pro.slug}`} style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", textDecoration: "none" }}>{pro.name}</Link>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)" }}>{pro?.name ?? "Advisor"}</span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: typeConfig.bg, color: typeConfig.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {typeConfig.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-ink-400)", marginTop: 2 }}>{formatDate(post.created_at)}</div>
        </div>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-ink-700)", margin: 0, whiteSpace: "pre-line" }}>{post.body}</p>

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 12, padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "var(--color-ink-50)", fontSize: 13, fontWeight: 500, color: "var(--color-blue-700)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {post.link_title ?? post.link_url}
        </a>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f3f5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {REACTION_OPTIONS.map((opt) => {
            const active = myReaction === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleReact(opt.type)}
                disabled={reactPending}
                aria-pressed={active}
                aria-label={`${opt.label} this post`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: active ? "1px solid var(--color-ink-700)" : "1px solid #e5e7eb",
                  background: active ? "var(--color-ink-900)" : "white",
                  color: active ? "white" : "var(--color-ink-500)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: reactPending ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span aria-hidden="true">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
          {reactionCount > 0 && (
            <span style={{ fontSize: 12, color: "var(--color-ink-400)", marginLeft: 4 }}>
              {reactionCount} {reactionCount === 1 ? "reaction" : "reactions"}
            </span>
          )}
        </div>
        {pro?.slug && (
          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/advisor/${pro.slug}/insights/${post.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--color-blue-700)", textDecoration: "none" }}>
              Read more →
            </Link>
            <Link href={`/advisor/${pro.slug}`} style={{ fontSize: 12, color: "var(--color-ink-400)", textDecoration: "none" }}>
              Profile
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({ tab }: { tab: "all" | "following" }) {
  if (tab === "following") {
    return (
      <div className="iv2-card" style={{ padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink-900)", marginBottom: 8 }}>No posts from your followed advisors yet</p>
        <p style={{ fontSize: 14, color: "var(--color-ink-500)", marginBottom: 24 }}>
          Follow advisors you trust to see their updates here.
        </p>
        <Link href="/advisors" style={{ display: "inline-block", padding: "10px 22px", borderRadius: 8, background: "var(--color-ink-900)", color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Browse advisors
        </Link>
      </div>
    );
  }
  return (
    <div className="iv2-card" style={{ padding: "48px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>📭</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink-900)", marginBottom: 8 }}>No posts yet — check back soon</p>
      <p style={{ fontSize: 14, color: "var(--color-ink-500)", marginBottom: 24 }}>Our advisors are getting set up.</p>
      <Link href="/advisors" style={{ display: "inline-block", padding: "10px 22px", borderRadius: 8, background: "var(--color-ink-900)", color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
        Browse advisors
      </Link>
    </div>
  );
}

interface Props {
  initialPosts: PostRow[];
}

const PAGE_SIZE = 20;

export default function FeedPageClient({ initialPosts }: Props) {
  const [activeTab, setActiveTab] = useState<"all" | "following">("all");
  const [followingPosts, setFollowingPosts] = useState<PostRow[] | null>(null);
  const [followingError, setFollowingError] = useState<"unauthenticated" | "error" | null>(null);
  const fetchedFollowing = useRef(false);
  const [allPosts, setAllPosts] = useState<PostRow[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  async function loadMore() {
    if (loadingMore) return;
    const last = allPosts[allPosts.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const res = await fetch(`/api/feed/posts?before=${last.id}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { posts: PostRow[]; hasMore: boolean };
      setAllPosts((prev) => {
        // Defend against duplicates if the cursor raced a cache refresh.
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
      });
      setHasMore(data.hasMore);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  // Loading state derived: "following" tab selected, not yet fetched (null) and no error
  const loadingFollowing = activeTab === "following" && followingPosts === null && followingError === null;

  useEffect(() => {
    if (activeTab !== "following" || fetchedFollowing.current) return;
    fetchedFollowing.current = true;

    fetch("/api/follows/advisor/feed")
      .then(async (res) => {
        if (res.status === 401) {
          setFollowingError("unauthenticated");
          return;
        }
        if (!res.ok) {
          setFollowingError("error");
          return;
        }
        const data = await res.json() as { posts: PostRow[] };
        setFollowingPosts(data.posts);
      })
      .catch(() => setFollowingError("error"));
  }, [activeTab]);

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    background: "none",
    color: active ? "var(--color-ink-900)" : "var(--color-ink-400)",
    borderBottom: active ? "2px solid var(--color-ink-900)" : "2px solid transparent",
    marginBottom: -1,
    fontFamily: "inherit",
  });

  return (
    <>
      {/* Tab strip */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        <button type="button" style={tabBtnStyle(activeTab === "all")} onClick={() => setActiveTab("all")}>
          All posts
        </button>
        <button type="button" style={tabBtnStyle(activeTab === "following")} onClick={() => setActiveTab("following")}>
          Following
        </button>
      </div>

      {/* All tab */}
      {activeTab === "all" && (
        allPosts.length === 0 ? (
          <EmptyState tab="all" />
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {allPosts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{ padding: "10px 26px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "var(--color-ink-700)", fontSize: 13, fontWeight: 700, cursor: loadingMore ? "wait" : "pointer", fontFamily: "inherit" }}
                >
                  {loadingMore ? "Loading…" : "Load more posts"}
                </button>
                {loadMoreError && (
                  <p style={{ fontSize: 12, color: "var(--color-ink-500)", marginTop: 8 }}>
                    Couldn&rsquo;t load more right now — try again.
                  </p>
                )}
              </div>
            )}
          </>
        )
      )}

      {/* Following tab */}
      {activeTab === "following" && (
        loadingFollowing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="iv2-card" style={{ padding: 20, opacity: 0.5 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 99, background: "#e5e7eb" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, width: "40%", background: "#e5e7eb", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 10, width: "25%", background: "#f1f5f9", borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ height: 12, background: "#f1f5f9", borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 12, width: "75%", background: "#f1f5f9", borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : followingError === "unauthenticated" ? (
          <div className="iv2-card" style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink-900)", marginBottom: 8 }}>Sign in to see your following feed</p>
            <p style={{ fontSize: 14, color: "var(--color-ink-500)", marginBottom: 24 }}>Create a free account to follow advisors and get a personalised feed.</p>
            <Link href="/auth/login?next=/feed" style={{ display: "inline-block", padding: "10px 22px", borderRadius: 8, background: "var(--color-ink-900)", color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        ) : followingError === "error" ? (
          <div className="iv2-card" style={{ padding: "32px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--color-ink-500)" }}>Could not load your feed right now — try again shortly.</p>
          </div>
        ) : followingPosts !== null && followingPosts.length === 0 ? (
          <EmptyState tab="following" />
        ) : followingPosts !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {followingPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : null
      )}
    </>
  );
}
