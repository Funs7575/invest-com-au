"use client";

import { useState, useEffect, useCallback } from "react";

interface Comment {
  id: number;
  author_name: string;
  body: string;
  parent_id: number | null;
  created_at: string;
  helpful_count: number;
}

type ReactionKind = "helpful" | "like" | "confused" | "disagree";

interface ReactionCounts {
  helpful: number;
  like: number;
  confused: number;
  disagree: number;
}

interface Props {
  slug: string;
  initialCounts?: ReactionCounts;
}

const REACTIONS: Array<{ kind: ReactionKind; emoji: string; label: string }> = [
  { kind: "helpful", emoji: "👍", label: "Helpful" },
  { kind: "like", emoji: "❤️", label: "Love it" },
  { kind: "confused", emoji: "🤔", label: "Confusing" },
  { kind: "disagree", emoji: "👎", label: "Disagree" },
];

/**
 * Comments + reactions widget, mounted at the bottom of every
 * article. The server-side /api/article-comments GET returns only
 * `published` rows so spam never leaks onto the page. New comments
 * go through classifyText — auto_publish rows render immediately
 * (with optimistic UI), pending rows show a "thanks, awaiting review"
 * confirmation.
 */
export default function ArticleComments({ slug, initialCounts }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<ReactionCounts>(
    initialCounts || { helpful: 0, like: 0, confused: 0, disagree: 0 },
  );
  const [reactionBusy, setReactionBusy] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/article-comments?slug=${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { items?: Comment[] };
      setComments(json.items || []);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const react = async (kind: ReactionKind) => {
    if (reactionBusy) return;
    setReactionBusy(true);
    // Optimistic bump
    setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }));
    try {
      const res = await fetch("/api/article-reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, reaction: kind }),
      });
      if (res.ok) {
        const json = (await res.json()) as { counts?: ReactionCounts };
        if (json.counts) setCounts(json.counts);
      }
    } finally {
      setReactionBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/article-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof json.error === "string"
            ? friendlyError(json.error)
            : "Couldn't post your comment. Try again?",
        );
        return;
      }
      if (json.pending) {
        setFormMsg(
          "Thanks — your comment is in our moderation queue and will appear once reviewed.",
        );
      } else {
        setFormMsg("Thanks — your comment is live below.");
        await loadComments();
      }
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="text-xl font-extrabold text-slate-900 mb-4">
        Reader discussion
      </h2>

      {/* Reactions bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {REACTIONS.map((r) => (
          <button
            key={r.kind}
            type="button"
            onClick={() => react(r.kind)}
            disabled={reactionBusy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
            aria-label={r.label}
          >
            <span aria-hidden>{r.emoji}</span>
            <span>{r.label}</span>
            <span className="text-[10px] font-bold text-slate-500">
              {counts[r.kind]}
            </span>
          </button>
        ))}
      </div>

      {/* Comment form */}
      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 mb-6"
      >
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Leave a comment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            maxLength={100}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (never shown)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            maxLength={254}
          />
        </div>
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts, questions or experience…"
          rows={4}
          maxLength={5000}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Comments are moderated. Be kind.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {submitting ? "Posting…" : "Post comment"}
          </button>
        </div>
        {formMsg && (
          <p
            role="status"
            className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2"
          >
            {formMsg}
          </p>
        )}
        {formError && (
          <p
            role="alert"
            className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
          >
            {formError}
          </p>
        )}
      </form>

      {/* Comment list */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No comments yet — be the first to share your take.
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const when = new Date(c.created_at).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">
                    {c.author_name}
                  </p>
                  <time
                    dateTime={c.created_at}
                    className="text-[11px] text-slate-500"
                  >
                    {when}
                  </time>
                </div>
                <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case "too_short":
      return "Comments need to be at least 10 characters.";
    case "too_long":
      return "Comments are capped at 5,000 characters.";
    case "missing_author":
      return "We need a name and email to post your comment.";
    case "Invalid email":
      return "That doesn't look like a valid email.";
    case "Too many requests":
      return "You're posting too quickly — take a short break and try again.";
    default:
      return "Couldn't post your comment. Try again?";
  }
}
