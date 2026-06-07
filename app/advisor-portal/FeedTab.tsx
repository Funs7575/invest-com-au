"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";

interface Post {
  id: number;
  body: string;
  post_type: string;
  link_url: string | null;
  image_url: string | null;
  status: string;
  reaction_count: number;
  created_at: string;
  professional: {
    id: number;
    name: string | null;
    firm_name: string | null;
    photo_url: string | null;
    slug: string | null;
  } | null;
}

type Props = {
  advisor: Advisor | null;
};

const POST_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  update: { label: "Update", color: "bg-slate-100 text-slate-600" },
  insight: { label: "Insight", color: "bg-blue-100 text-blue-700" },
  question: { label: "Question", color: "bg-amber-100 text-amber-700" },
  resource: { label: "Resource", color: "bg-green-100 text-green-700" },
};

const POST_TYPE_ICONS: Record<string, string> = {
  update: "activity",
  insight: "lightbulb",
  question: "help-circle",
  resource: "book-open",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PostCard({ post }: { post: Post }) {
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [reacting, setReacting] = useState(false);

  const handleReact = async (reactionType: "like" | "insightful" | "celebrate") => {
    if (reacting) return;
    setReacting(true);
    try {
      const res = await fetch(`/api/advisor-auth/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction_type: reactionType }),
      });
      if (res.ok) {
        const data = await res.json() as { reaction_count: number };
        setReactionCount(data.reaction_count);
      }
    } finally {
      setReacting(false);
    }
  };

  const typeStyle = POST_TYPE_STYLES[post.post_type] ?? POST_TYPE_STYLES["update"];
  const typeIcon = POST_TYPE_ICONS[post.post_type] ?? "activity";
  const pro = post.professional;
  const displayName = pro?.name ?? "Advisor";
  const initials = displayName.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0">
          {pro?.photo_url ? (
            <Image
              src={pro.photo_url}
              alt={displayName}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
              sizes="40px"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 truncate">{displayName}</span>
            {pro?.firm_name && (
              <span className="text-xs text-slate-400 truncate">{pro.firm_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 text-[0.58rem] font-semibold px-1.5 py-0.5 rounded-full ${typeStyle.color}`}>
              <Icon name={typeIcon} size={10} />
              {typeStyle.label}
            </span>
            <span className="text-[0.58rem] text-slate-400">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{post.body}</p>

      {/* Link preview */}
      {post.link_url && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-violet-600 hover:bg-slate-100 mb-3 truncate"
        >
          <Icon name="external-link" size={12} />
          <span className="truncate">{post.link_url}</span>
        </a>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <Image
            src={post.image_url}
            alt="Post image"
            width={600}
            height={300}
            className="w-full object-cover rounded-lg"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {/* Reaction bar */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
        {(["like", "insightful", "celebrate"] as const).map((rt) => {
          const emoji = rt === "like" ? "👍" : rt === "insightful" ? "💡" : "🎉";
          return (
            <button
              key={rt}
              type="button"
              onClick={() => handleReact(rt)}
              disabled={reacting}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={rt}
            >
              <span>{emoji}</span>
            </button>
          );
        })}
        {reactionCount > 0 && (
          <span className="ml-1 text-xs text-slate-400">{reactionCount}</span>
        )}
      </div>
    </div>
  );
}

export default function FeedTab({ advisor }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [composing, setComposing] = useState(false);
  const [newPost, setNewPost] = useState({ body: "", post_type: "update" });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/advisor-auth/feed");
      if (cancelled || !res.ok) return;
      const data = await res.json() as { posts: Post[] };
      if (cancelled) return;
      setPosts(data.posts);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePost = async () => {
    setPosting(true);
    const res = await fetch("/api/advisor-auth/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost),
    });
    if (res.ok) {
      const { post } = await res.json() as { post: Post };
      setPosts((prev) => [post, ...prev]);
      setNewPost({ body: "", post_type: "update" });
      setComposing(false);
    }
    setPosting(false);
  };

  const advisorInitials = (advisor?.name ?? "A")
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const POST_TYPES = [
    { key: "update", label: "Update", icon: "activity" },
    { key: "insight", label: "Insight", icon: "lightbulb" },
    { key: "question", label: "Question", icon: "help-circle" },
    { key: "resource", label: "Resource", icon: "book-open" },
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-slate-900">Advisor Feed</h2>
        <p className="text-xs text-slate-500 mt-0.5">Share insights and stay connected with advisors you follow.</p>
      </div>

      {/* Compose box */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {!composing ? (
          <div className="flex items-center gap-3">
            {advisor?.photo_url ? (
              <Image
                src={advisor.photo_url}
                alt={advisor.name ?? ""}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shrink-0"
                sizes="40px"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                {advisorInitials}
              </div>
            )}
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="flex-1 text-left px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Share an update, insight or resource…
            </button>
          </div>
        ) : (
          <div>
            <textarea
              value={newPost.body}
              onChange={(e) => setNewPost((p) => ({ ...p, body: e.target.value }))}
              maxLength={2000}
              rows={4}
              placeholder="What's on your mind?"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none mb-3"
            />

            {/* Post type selector */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {POST_TYPES.map((pt) => (
                <button
                  key={pt.key}
                  type="button"
                  onClick={() => setNewPost((p) => ({ ...p, post_type: pt.key }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    newPost.post_type === pt.key
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon name={pt.icon} size={12} />
                  {pt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[0.62rem] text-slate-400">{newPost.body.length}/2000</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setComposing(false); setNewPost({ body: "", post_type: "update" }); }}
                  className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={posting || !newPost.body.trim()}
                  className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-slate-100 animate-pulse rounded-xl h-24" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="activity" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Nothing in your feed yet</h3>
          <p className="text-sm text-slate-500 mb-4">Share an update, insight or resource to start building your presence.</p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Icon name="edit-3" size={13} aria-hidden />
            Write your first post
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
