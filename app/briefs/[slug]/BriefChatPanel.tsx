"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  BRIEF_MESSAGE_MAX_BODY_LENGTH,
  type BriefMessageRow,
} from "@/lib/brief-messages";

interface Props {
  slug: string;
  briefId: number;
  initialMessages: BriefMessageRow[];
  /** "consumer" | "pro" — controls which read-state column we flip & label alignment. */
  viewerSide: "consumer" | "pro";
  /** Display name we show next to the viewer's own sent rows. */
  viewerName: string;
  /** Display name we show next to messages from the other side. */
  counterpartyName: string;
}

interface DisplayMessage extends BriefMessageRow {
  /** Optimistic-only id (negative); replaced when the server insert lands. */
  optimistic?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function senderIsViewer(
  msg: BriefMessageRow,
  viewerSide: "consumer" | "pro",
): boolean {
  if (viewerSide === "consumer") return msg.sender_kind === "consumer";
  return msg.sender_kind === "professional" || msg.sender_kind === "team";
}

export default function BriefChatPanel({
  slug,
  briefId,
  initialMessages,
  viewerSide,
  viewerName,
  counterpartyName,
}: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Stable ref for the mark-read fetch so the IntersectionObserver effect
  // doesn't need to re-create on every render.
  const markReadInflight = useRef(false);

  const markRead = useCallback(async () => {
    if (markReadInflight.current) return;
    markReadInflight.current = true;
    try {
      await fetch(`/api/briefs/${slug}/messages/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      /* fire-and-forget — UI is unaffected on failure */
    } finally {
      markReadInflight.current = false;
    }
  }, [slug]);

  // ── Realtime subscription ────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`brief-messages-${briefId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "brief_messages",
          filter: `brief_id=eq.${briefId}`,
        },
        (payload) => {
          const row = payload.new as BriefMessageRow;
          setMessages((prev) => {
            // De-dup: server may echo our own optimistic insert. Replace any
            // optimistic placeholder with matching body+sender_kind from this
            // viewer instead of appending a duplicate.
            const optimisticIdx = prev.findIndex(
              (m) =>
                m.optimistic === true &&
                m.body === row.body &&
                m.sender_kind === row.sender_kind,
            );
            if (optimisticIdx >= 0) {
              const next = prev.slice();
              next[optimisticIdx] = row;
              return next;
            }
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      // Critical: avoid Realtime channel leaks across remounts (Strict
      // Mode dev, route transitions, etc.). removeChannel awaits the
      // unsubscribe internally.
      void supabase.removeChannel(channel);
    };
  }, [briefId]);

  // ── Auto-scroll to bottom on new messages ───────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ── Mark-as-read when the panel is visible ──────────────────────────
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // Fallback: fire once on mount.
      void markRead();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void markRead();
          }
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [markRead, messages.length]);

  async function onSend(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length === 0 || sending) return;
    if (trimmed.length > BRIEF_MESSAGE_MAX_BODY_LENGTH) {
      setError(
        `Message must be ${BRIEF_MESSAGE_MAX_BODY_LENGTH} characters or fewer.`,
      );
      return;
    }
    setError(null);
    setSending(true);
    const optimisticId = -Date.now();
    const optimistic: DisplayMessage = {
      id: optimisticId,
      brief_id: briefId,
      sender_kind:
        viewerSide === "consumer"
          ? "consumer"
          : ("professional" as const),
      sender_user_id: null,
      sender_professional_id: null,
      sender_team_id: null,
      body: trimmed,
      read_by_consumer_at: null,
      read_by_pro_at: null,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch(`/api/briefs/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: BriefMessageRow;
      };
      if (!res.ok || !json.message) {
        throw new Error(json.error ?? "Could not send message.");
      }
      // Reconcile: replace the optimistic row with the server row.
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? json.message! : m)),
      );
    } catch (err) {
      // Roll the optimistic row back so the user can retry.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(trimmed);
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className="bg-white rounded-2xl border border-slate-200 p-6 mb-6"
    >
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
        Chat
      </p>

      <div
        ref={scrollRef}
        className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 mb-3 space-y-2"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">
            No messages yet. Send the first one below.
          </p>
        )}
        {messages.map((m) => {
          const mine = senderIsViewer(m, viewerSide);
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-amber-500 text-slate-900"
                    : "bg-white border border-slate-200 text-slate-800"
                } ${m.optimistic ? "opacity-70" : ""}`}
              >
                <p className="text-[10px] font-semibold mb-0.5 opacity-80">
                  {mine ? viewerName : counterpartyName}
                </p>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className="text-[10px] mt-1 opacity-60">
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={onSend} className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={BRIEF_MESSAGE_MAX_BODY_LENGTH}
          placeholder={`Message ${counterpartyName}…`}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          disabled={sending}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {draft.length}/{BRIEF_MESSAGE_MAX_BODY_LENGTH}
          </span>
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            className="rounded-xl bg-slate-900 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-rose-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
