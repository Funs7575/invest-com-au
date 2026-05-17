"use client";

import { useState } from "react";

import {
  DISPUTE_REASON_MAX,
  DISPUTE_REASON_MIN,
  type DisputeMessageRow,
  type DisputeRow,
  type DisputeStatus,
} from "@/lib/disputes";

interface Props {
  slug: string;
  briefId: number;
  /** Existing dispute + thread; null when no dispute has been opened yet. */
  initialDispute: DisputeRow | null;
  initialMessages: DisputeMessageRow[];
  /** Whether the viewer can see / open a dispute (consumer or accepted pro). */
  canViewerOpen: boolean;
  /** Display name for the viewer side. */
  viewerName: string;
}

const STATUS_LABEL: Record<DisputeStatus, string> = {
  open: "Open",
  admin_reviewing: "Admin reviewing",
  resolved_for_consumer: "Resolved — in consumer's favour",
  resolved_for_provider: "Resolved — in provider's favour",
  withdrawn: "Withdrawn",
};

export default function DisputePanel({
  slug,
  briefId,
  initialDispute,
  initialMessages,
  canViewerOpen,
  viewerName,
}: Props) {
  void briefId;
  const [dispute, setDispute] = useState<DisputeRow | null>(initialDispute);
  const [messages, setMessages] = useState<DisputeMessageRow[]>(initialMessages);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onOpen(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    if (reason.trim().length < DISPUTE_REASON_MIN) {
      setError(`Reason must be at least ${DISPUTE_REASON_MIN} characters.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/briefs/${slug}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = (await res.json()) as {
        error?: string;
        dispute?: DisputeRow;
      };
      if (!res.ok || !json.dispute) {
        throw new Error(json.error ?? "Could not open dispute.");
      }
      setDispute(json.dispute);
      setMessages([]);
      setShowForm(false);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open dispute.");
    } finally {
      setBusy(false);
    }
  }

  async function onPost(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (busy || !dispute) return;
    const body = draft.trim();
    if (body.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/disputes/${dispute.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: DisputeMessageRow;
      };
      if (!res.ok || !json.message) {
        throw new Error(json.error ?? "Could not send message.");
      }
      setMessages((prev) => [...prev, json.message!]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  // No dispute yet — show the "Open dispute" affordance.
  if (!dispute) {
    if (!canViewerOpen) return null;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          Not what you expected?
        </p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            Open dispute
          </button>
        )}
        {showForm && (
          <form onSubmit={onOpen} className="space-y-3 mt-2">
            <p className="text-xs text-slate-600">
              Walk us through what happened. Admins use this and the chat / booking history
              to make a call. Min {DISPUTE_REASON_MIN} chars so we have context.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              minLength={DISPUTE_REASON_MIN}
              maxLength={DISPUTE_REASON_MAX}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="Describe the issue in detail. Include dates, what was promised vs delivered, and anything else admins should see."
              disabled={busy}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {reason.length}/{DISPUTE_REASON_MAX}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setReason("");
                    setError(null);
                  }}
                  className="text-xs text-slate-500 px-3 py-2 hover:underline"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || reason.trim().length < DISPUTE_REASON_MIN}
                  className="rounded-xl bg-rose-600 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50"
                >
                  {busy ? "Submitting…" : "Open dispute"}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-xs text-rose-600" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    );
  }

  // Existing dispute — show the discussion thread.
  const isTerminal =
    dispute.status === "resolved_for_consumer" ||
    dispute.status === "resolved_for_provider" ||
    dispute.status === "withdrawn";

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-6">
      <p className="text-xs uppercase tracking-widest text-rose-700 mb-1">
        Dispute — {STATUS_LABEL[dispute.status]}
      </p>
      <p className="text-xs text-slate-600 mb-3">
        Opened {new Date(dispute.created_at).toLocaleDateString()} ·{" "}
        Admins are reviewing the chat history, bookings and tracker events.
      </p>

      <details className="text-xs text-slate-700 mb-3">
        <summary className="cursor-pointer font-semibold">
          Original reason
        </summary>
        <p className="whitespace-pre-line mt-2">{dispute.reason}</p>
      </details>

      <div
        className="max-h-72 overflow-y-auto rounded-xl border border-rose-100 bg-white p-3 mb-3 space-y-2"
        aria-live="polite"
        aria-label="Dispute discussion"
      >
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">
            No replies yet.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <p className="text-[10px] font-semibold text-slate-600 mb-0.5">
              {m.sender_kind === "admin"
                ? "Admin"
                : m.sender_kind === "consumer"
                  ? "Consumer"
                  : "Provider"}
              <span className="text-slate-400 ml-2 font-normal">
                {new Date(m.created_at).toLocaleString()}
              </span>
            </p>
            <p className="whitespace-pre-line text-slate-800">{m.body}</p>
          </div>
        ))}
      </div>

      {!isTerminal && (
        <form onSubmit={onPost} className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={DISPUTE_REASON_MAX}
            placeholder={`Reply as ${viewerName}…`}
            className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            disabled={busy}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {draft.length}/{DISPUTE_REASON_MAX}
            </span>
            <button
              type="submit"
              disabled={busy || draft.trim().length === 0}
              className="rounded-xl bg-slate-900 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-600" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {isTerminal && dispute.resolution_notes && (
        <div className="text-xs text-slate-700 bg-white rounded-xl border border-rose-100 p-3">
          <p className="font-semibold mb-1">Admin notes</p>
          <p className="whitespace-pre-line">{dispute.resolution_notes}</p>
        </div>
      )}
    </div>
  );
}
