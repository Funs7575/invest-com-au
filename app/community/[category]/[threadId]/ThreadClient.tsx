"use client";

import { useState, useCallback, useRef } from "react";
import { useUser } from "@/lib/hooks/useUser";
import Icon from "@/components/Icon";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

interface ThreadClientProps {
  thread: ForumThread;
  posts: ForumPost[];
  categorySlug: string;
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

/* ─── Vote Button ─── */

function VoteButtons({
  targetType,
  targetId,
  initialScore,
  userId,
}: {
  targetType: "thread" | "post";
  targetId: string;
  initialScore: number;
  userId: string | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleVote = async (direction: "up" | "down") => {
    if (!userId || submitting) return;

    const newVote = vote === direction ? null : direction;
    const oldScore = score;
    const oldVote = vote;

    // Optimistic update
    let delta = 0;
    if (oldVote === "up") delta -= 1;
    if (oldVote === "down") delta += 1;
    if (newVote === "up") delta += 1;
    if (newVote === "down") delta -= 1;

    setScore(score + delta);
    setVote(newVote);
    setSubmitting(true);

    try {
      const res = await fetch("/api/community/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          direction: newVote,
        }),
      });
      if (!res.ok) {
        // Revert
        setScore(oldScore);
        setVote(oldVote);
      }
    } catch {
      setScore(oldScore);
      setVote(oldVote);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote("up")}
        disabled={!userId || submitting}
        className={`p-1 rounded transition-colors ${
          vote === "up"
            ? "text-emerald-600"
            : "text-slate-400 hover:text-slate-600"
        } disabled:opacity-50`}
        aria-label="Upvote"
      >
        <Icon name="arrow-up" size={16} />
      </button>
      <span
        className={`text-xs font-semibold min-w-[20px] text-center ${
          vote === "up"
            ? "text-emerald-600"
            : vote === "down"
            ? "text-red-500"
            : "text-slate-500"
        }`}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote("down")}
        disabled={!userId || submitting}
        className={`p-1 rounded transition-colors ${
          vote === "down"
            ? "text-red-500"
            : "text-slate-400 hover:text-slate-600"
        } disabled:opacity-50`}
        aria-label="Downvote"
      >
        <Icon name="arrow-down" size={16} />
      </button>
    </div>
  );
}

/* ─── Post Card ─── */

function PostCard({
  post,
  userId,
  isModerator,
  onReply,
  onEdit,
  onDelete,
}: {
  post: ForumPost;
  userId: string | null;
  isModerator: boolean;
  onReply: (post: ForumPost) => void;
  onEdit: (post: ForumPost) => void;
  onDelete: (postId: string) => void;
}) {
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const isAuthor = userId === post.author_id;
  const parentPost = post.parent_id ? true : false;

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 ${
        parentPost ? "ml-6 border-l-2 border-l-slate-300" : ""
      }`}
    >
      {/* Author Line */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
          <Icon name="user" size={14} className="text-slate-500" />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-semibold text-slate-900">
            {post.author_name}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeStyle(
              post.author_profile?.badge ?? null
            )}`}
          >
            {badgeLabel(post.author_profile?.badge ?? null)}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Icon name="clock" size={12} />
            {timeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="prose prose-sm max-w-none text-slate-700 mb-4">
        {post.body.split("\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {/* Actions Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <VoteButtons
          targetType="post"
          targetId={post.id}
          initialScore={post.vote_score}
          userId={userId}
        />

        {userId && (
          <button
            onClick={() => onReply(post)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <Icon name="message-circle" size={14} />
            Reply
          </button>
        )}

        {isAuthor && (
          <>
            <button
              onClick={() => onEdit(post)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <Icon name="edit-3" size={14} />
              Edit
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <Icon name="trash-2" size={14} />
              Delete
            </button>
          </>
        )}

        {!isAuthor && userId && (
          <button
            onClick={() => {
              if (reported) return;
              setShowReport(true);
            }}
            className={`text-xs flex items-center gap-1 transition-colors ${
              reported
                ? "text-slate-300 cursor-default"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon name="flag" size={14} />
            {reported ? "Reported" : "Report"}
          </button>
        )}

        {/* Moderator actions */}
        {isModerator && !isAuthor && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors ml-auto"
          >
            <Icon name="trash-2" size={14} />
            Remove
          </button>
        )}
      </div>

      {/* Report Confirmation */}
      {showReport && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600 mb-2">
            Report this post for violating community guidelines?
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setShowReport(false);
                setReported(true);
                // Fire report API (best-effort)
                try {
                  await fetch("/api/community/moderate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "report",
                      target_type: "post",
                      target_id: post.id,
                    }),
                  });
                } catch {
                  // Silently handle
                }
              }}
              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
            >
              Report
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Client Component ─── */

export default function ThreadClient({
  thread,
  posts: initialPosts,
  categorySlug,
}: ThreadClientProps) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState<ForumPost | null>(null);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editBody, setEditBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [showRemoveThread, setShowRemoveThread] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const userId = user?.id ?? null;

  // Check if the user is moderator from the thread's profile data
  const isModerator =
    posts.some(
      (p) =>
        p.author_id === userId && p.author_profile?.is_moderator === true
    ) ||
    (thread.author_id === userId &&
      thread.author_profile?.is_moderator === true);

  /* ─── Reply ─── */

  const handleReplyTo = useCallback((post: ForumPost) => {
    setReplyTo(post);
    setEditingPost(null);
    setReplyBody("");
    setTimeout(() => replyRef.current?.focus(), 100);
  }, []);

  const handleSubmitReply = async () => {
    if (!user || !replyBody.trim() || submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: thread.id,
          body: replyBody.trim(),
          parent_id: replyTo?.id ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to post reply");
        return;
      }

      const data = await res.json();
      const newPost: ForumPost = {
        ...data.post,
        vote_score: 0,
        is_removed: false,
        updated_at: null,
        author_profile: null,
      };
      setPosts((prev) => [...prev, newPost]);
      setReplyBody("");
      setReplyTo(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Edit ─── */

  const handleStartEdit = useCallback((post: ForumPost) => {
    setEditingPost(post);
    setEditBody(post.body);
    setReplyTo(null);
  }, []);

  const handleSaveEdit = async () => {
    if (!editingPost || !editBody.trim() || submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/community/posts/${editingPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update post");
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? { ...p, body: editBody.trim(), updated_at: new Date().toISOString() }
            : p
        )
      );
      setEditingPost(null);
      setEditBody("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Delete ─── */

  const handleDelete = (postId: string) => {
    setDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    const postId = deletePostId;
    setDeletePostId(null);
    if (!postId) return;
    setError(null);

    try {
      const res = await fetch(`/api/community/posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete post");
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  /* ─── Moderator Actions ─── */

  const handleModAction = async (
    action: "pin" | "lock" | "remove",
    value: boolean
  ) => {
    setError(null);
    try {
      const res = await fetch("/api/community/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          target_type: "thread",
          target_id: thread.id,
          value,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Moderation action failed");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="container-custom max-w-4xl pb-16">
      {/* Thread Vote + Mod Actions */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <VoteButtons
          targetType="thread"
          targetId={thread.id}
          initialScore={thread.vote_score}
          userId={userId}
        />

        {isModerator && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleModAction("pin", !thread.is_pinned)}
              className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                thread.is_pinned
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon name="pin" size={14} />
              {thread.is_pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={() => handleModAction("lock", !thread.is_locked)}
              className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                thread.is_locked
                  ? "bg-slate-100 border-slate-300 text-slate-600"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon name="lock" size={14} />
              {thread.is_locked ? "Unlock" : "Lock"}
            </button>
            <button
              onClick={() => setShowRemoveThread(true)}
              className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            >
              <Icon name="trash-2" size={14} />
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Replies Header */}
      <h2 className="text-lg text-slate-900 font-extrabold mb-4">
        {posts.length === 0
          ? "No replies yet"
          : `${posts.length} ${posts.length === 1 ? "Reply" : "Replies"}`}
      </h2>

      {/* Empty state CTA: Be the first to reply */}
      {posts.length === 0 && !thread.is_locked && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-emerald-200 flex items-center justify-center mx-auto mb-3">
            <Icon name="message-circle" size={22} className="text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">
            Be the first to reply!
          </p>
          <p className="text-xs text-slate-600 mb-4">
            Kick off the discussion and help {thread.author_name} out.
          </p>
          <button
            type="button"
            onClick={() => {
              replyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => replyRef.current?.focus(), 350);
            }}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            <Icon name="edit-3" size={14} />
            Write a reply
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Post List */}
      <div className="space-y-3 mb-8">
        {posts.map((post) =>
          editingPost?.id === post.id ? (
            <div
              key={post.id}
              className="bg-white border border-emerald-200 rounded-xl p-5"
            >
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Edit Post
              </p>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[100px] resize-y"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={submitting || !editBody.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingPost(null);
                    setEditBody("");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              isModerator={isModerator}
              onReply={handleReplyTo}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          )
        )}
      </div>

      {/* Reply Form or Locked/Auth Prompt */}
      {thread.is_locked ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <Icon
            name="lock"
            size={24}
            className="text-slate-400 mx-auto mb-2"
          />
          <p className="text-sm text-slate-600 font-medium">
            This thread is locked. No new replies can be posted.
          </p>
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
          <div className="h-24 bg-slate-100 rounded" />
        </div>
      ) : !user ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <Icon
            name="message-circle"
            size={24}
            className="text-slate-400 mx-auto mb-2"
          />
          <p className="text-sm text-slate-600 mb-3">
            Sign in to join the discussion.
          </p>
          <Link
            href={`/auth/login?next=/community/${categorySlug}/${thread.id}`}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          {replyTo && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">
                  Replying to{" "}
                  <span className="font-semibold text-slate-600">
                    {replyTo.author_name}
                  </span>
                </p>
                <p className="text-sm text-slate-500 truncate">
                  {replyTo.body.slice(0, 120)}
                  {replyTo.body.length > 120 ? "..." : ""}
                </p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}

          <label className="text-sm font-semibold text-slate-900 block mb-2">
            {replyTo ? "Your Reply" : "Add a Reply"}
          </label>
          <textarea
            ref={replyRef}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[120px] resize-y"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-400">
              {replyBody.length}/5000
            </span>
            <button
              onClick={handleSubmitReply}
              disabled={submitting || !replyBody.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletePostId != null}
        title="Delete this post?"
        message="Your post will be permanently removed from the discussion. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeletePost}
        onCancel={() => setDeletePostId(null)}
      />

      <ConfirmDialog
        open={showRemoveThread}
        title="Remove this thread?"
        message="The thread will be hidden from the forum. You can restore it later from moderation tools."
        confirmLabel="Remove thread"
        variant="danger"
        onConfirm={() => {
          setShowRemoveThread(false);
          handleModAction("remove", true);
        }}
        onCancel={() => setShowRemoveThread(false)}
      />
    </div>
  );
}
