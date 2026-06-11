"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { logger } from "@/lib/logger";

const log = logger("admin-community-page");

type QueueItem = {
  report_id: number;
  target_type: "thread" | "post";
  target_id: number;
  reason: string | null;
  is_auto_hold: boolean;
  reported_at: string;
  title: string | null;
  body_excerpt: string | null;
  author_name: string | null;
  is_removed: boolean | null;
  thread_id: number | null;
  category_slug: string | null;
};

type RowState = { busy: boolean; done: string | null; error: string | null };

export default function AdminCommunityPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<number, RowState>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/community");
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as { items: QueueItem[] };
      setItems(json.items);
      const initial: Record<number, RowState> = {};
      for (const item of json.items) {
        initial[item.report_id] = { busy: false, done: null, error: null };
      }
      setStates(initial);
    } catch (err) {
      log.error("queue load failed", { err: err instanceof Error ? err.message : String(err) });
      setLoadError("Failed to load the moderation queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const act = useCallback(
    async (
      item: QueueItem,
      action: "approve" | "remove" | "dismiss_report",
    ) => {
      setStates((prev) => ({
        ...prev,
        [item.report_id]: { busy: true, done: null, error: null },
      }));
      try {
        const payload: Record<string, unknown> = { action };
        if (action === "dismiss_report") {
          payload.target_type = item.target_type;
          payload.target_id = item.target_id;
        } else if (item.target_type === "thread") {
          payload.thread_id = item.target_id;
        } else {
          payload.post_id = item.target_id;
        }
        const res = await fetch("/api/community/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(json?.error ?? `${res.status}`);
        }
        const label =
          action === "approve" ? "Approved" : action === "remove" ? "Removed" : "Dismissed";
        setStates((prev) => ({
          ...prev,
          [item.report_id]: { busy: false, done: label, error: null },
        }));
      } catch (err) {
        setStates((prev) => ({
          ...prev,
          [item.report_id]: {
            busy: false,
            done: null,
            error: err instanceof Error ? err.message : "Action failed",
          },
        }));
      }
    },
    [],
  );

  const pending = items.filter((i) => !states[i.report_id]?.done);

  return (
    <AdminShell title="Community moderation">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-slate-600 max-w-2xl">
          Open queue items: classifier holds (content hidden until approved) and
          user reports (content still live unless removed). Approve restores
          visibility, Remove hides it, Dismiss closes the report without
          touching the content. Counters recount automatically.
        </p>
        <button
          onClick={() => void loadQueue()}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading queue…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {!loading && !loadError && pending.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-900 font-semibold mb-1">Queue is clear</p>
          <p className="text-sm text-slate-500">
            No open holds or reports. New items appear here automatically.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const state = states[item.report_id] ?? { busy: false, done: null, error: null };
          const threadHref =
            item.category_slug && item.thread_id
              ? `/community/${item.category_slug}/${item.thread_id}`
              : null;
          return (
            <div
              key={item.report_id}
              className={`bg-white border rounded-xl p-5 ${
                state.done ? "border-slate-100 opacity-60" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.is_auto_hold
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.is_auto_hold ? "Held by classifier" : "User report"}
                </span>
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {item.target_type}
                </span>
                {item.is_removed ? (
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    Hidden
                  </span>
                ) : (
                  <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {new Date(item.reported_at).toLocaleString("en-AU")}
                </span>
              </div>

              {item.title && (
                <p className="font-bold text-slate-900 text-sm mb-1">{item.title}</p>
              )}
              <p className="text-sm text-slate-600 mb-2 whitespace-pre-line">
                {item.body_excerpt ?? "(content unavailable)"}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                By {item.author_name ?? "unknown"}
                {item.reason && (
                  <>
                    {" · "}
                    <span className="font-mono">{item.reason}</span>
                  </>
                )}
                {threadHref && (
                  <>
                    {" · "}
                    <Link href={threadHref} className="text-emerald-700 hover:underline" target="_blank">
                      View thread
                    </Link>
                  </>
                )}
              </p>

              {state.done ? (
                <p className="text-sm font-semibold text-slate-500">{state.done}</p>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={state.busy}
                    onClick={() => void act(item, "approve")}
                    className="text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={state.busy}
                    onClick={() => void act(item, "remove")}
                    className="text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                  <button
                    disabled={state.busy}
                    onClick={() => void act(item, "dismiss_report")}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    Dismiss report
                  </button>
                  {state.error && <span className="text-xs text-red-600">{state.error}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
