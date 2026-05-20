"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

interface ActionRow {
  id: number;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  acted_at: string;
}

interface ThreadRow {
  id: number;
  title: string;
  author_name: string | null;
  is_locked: boolean;
  is_removed: boolean;
  created_at: string;
}

export default function AdminForumModerationPage() {
  const supabase = createClient();
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: acts }, { data: thr }] = await Promise.all([
      supabase
        .from("forum_moderation_actions")
        .select("id, action, target_type, target_id, reason, acted_at")
        .order("acted_at", { ascending: false })
        .limit(50),
      supabase
        .from("forum_threads")
        .select("id, title, author_name, is_locked, is_removed, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setActions((acts as ActionRow[] | null) ?? []);
    setThreads((thr as ThreadRow[] | null) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, targetId: number) => {
    setBusy(targetId);
    setError(null);
    try {
      const res = await fetch("/api/admin/forum-moderation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, target_id: targetId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Action failed.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell title="Forum moderation">
      {error && (
        <p className="text-sm text-red-700 mb-4" role="alert">{error}</p>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent threads</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Thread</th>
                  <th className="text-left px-4 py-2 font-semibold">State</th>
                  <th className="text-right px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {threads.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-800">{t.title}</span>
                      {t.author_name && (
                        <span className="block text-xs text-slate-400">{t.author_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {t.is_removed ? (
                        <span className="text-red-600 font-semibold">Hidden</span>
                      ) : t.is_locked ? (
                        <span className="text-amber-600 font-semibold">Locked</span>
                      ) : (
                        <span className="text-emerald-600">Open</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => act(t.is_locked ? "unlock_thread" : "lock_thread", t.id)}
                        disabled={busy === t.id}
                        className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50"
                      >
                        {t.is_locked ? "Unlock" : "Lock"}
                      </button>
                      <button
                        onClick={() => act(t.is_removed ? "unhide_thread" : "hide_thread", t.id)}
                        disabled={busy === t.id}
                        className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                      >
                        {t.is_removed ? "Unhide" : "Hide"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Recent moderation actions
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">No actions logged yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {actions.map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-slate-600">
                <span className="font-mono text-xs text-slate-400">
                  {new Date(a.acted_at).toLocaleString("en-AU")}
                </span>
                <span className="font-semibold capitalize">
                  {a.action.replace(/_/g, " ")}
                </span>
                <span className="text-slate-400">
                  {a.target_type} #{a.target_id}
                </span>
                {a.reason && <span className="text-xs italic">— {a.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
