"use client";

import { useState } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";

/**
 * Private squad-only comment thread on a brief, rendered inside the squad
 * inbox. Lazy: comments load on first expand. Never visible to consumers —
 * the API enforces active team membership on every read/write.
 */

interface CommentRow {
  id: number;
  author_professional_id: number;
  author_name: string | null;
  author_photo_url: string | null;
  body: string;
  created_at: string;
}

interface Props {
  teamId: number;
  briefId: number;
  callerName: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function TeamBriefComments({ teamId, briefId, callerName }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function loadComments() {
    setLoadError(null);
    try {
      const res = await fetch(`/api/advisor-auth/brief-comments?teamId=${teamId}&briefId=${briefId}`);
      const json = (await res.json()) as { comments?: CommentRow[]; error?: string };
      if (!res.ok) {
        setLoadError(json.error ?? "Couldn't load comments.");
        return;
      }
      setComments(json.comments ?? []);
    } catch {
      setLoadError("Couldn't load comments.");
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) void loadComments();
  }

  async function sendComment() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/advisor-auth/brief-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, briefId, body }),
      });
      const json = (await res.json()) as { comment?: CommentRow; error?: string };
      if (!res.ok || !json.comment) {
        setSendError(json.error ?? "Couldn't post the comment.");
        return;
      }
      setComments((prev) => [...(prev ?? []), json.comment as CommentRow]);
      setDraft("");
    } catch {
      setSendError("Couldn't post the comment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <Icon name="message-circle" size={13} />
        Squad notes
        {comments !== null && comments.length > 0 && (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
            {comments.length}
          </span>
        )}
        <Icon
          name="chevron-down"
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-[10px] text-slate-400 mb-2">
            Private to active squad members — the client never sees these notes.
          </p>

          {loadError ? (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">{loadError}</p>
          ) : comments === null ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : (
            <>
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 mb-2">
                  No notes yet — start the thread for {callerName === "You" ? "your" : "the"} squad.
                </p>
              ) : (
                <ul className="space-y-2.5 mb-3">
                  {comments.map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5">
                      {c.author_photo_url ? (
                        <Image
                          src={c.author_photo_url}
                          alt={c.author_name ?? "Squad member"}
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full object-cover shrink-0 bg-slate-100"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold uppercase shrink-0">
                          {(c.author_name ?? "?")
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <p className="text-[11px] font-bold text-slate-700 mb-0.5">
                          {c.author_name ?? "Squad member"}
                          <span className="font-normal text-slate-400 ml-2">{timeAgo(c.created_at)}</span>
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line break-words">
                          {c.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void sendComment();
                    }
                  }}
                  placeholder="Add a note for the squad…"
                  aria-label="Add a squad note"
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <button
                  type="button"
                  onClick={sendComment}
                  disabled={sending || draft.trim().length === 0}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0"
                >
                  {sending ? "Posting…" : "Post"}
                </button>
              </div>
              {sendError && <p className="text-[11px] text-red-600 mt-1.5">{sendError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
