"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface RoutingRule {
  id: number;
  name: string;
  priority: number;
  enabled: boolean;
  match_conditions: Record<string, unknown>;
  route_to: Record<string, unknown>;
  notes: string | null;
}

export default function AdminRoutingRulesPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<number, Partial<RoutingRule>>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/routing-rules");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setRules((json.rules ?? []) as RoutingRule[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRow(id: number) {
    setSaving(id);
    setError(null);
    try {
      const row = rules.find((r) => r.id === id);
      if (!row) return;
      const merged = { ...row, ...edited[id] };
      const res = await fetch("/api/admin/routing-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: merged.id,
          name: merged.name,
          priority: merged.priority,
          enabled: merged.enabled,
          match_conditions: merged.match_conditions,
          route_to: merged.route_to,
          notes: merged.notes ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setEdited((e) => {
        const next = { ...e };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  async function deleteRule(id: number) {
    if (!confirm("Delete this routing rule?")) return;
    setSaving(id);
    try {
      await fetch(`/api/admin/routing-rules?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminShell title="Brief routing rules" subtitle="Admin-managed JSON rules for matching providers to briefs.">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-slate-500">No routing rules.</p>
        ) : (
          <div className="space-y-3">
            {rules.map((r) => {
              const draft = edited[r.id] ?? {};
              const merged = { ...r, ...draft };
              return (
                <article key={r.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={merged.name}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          [r.id]: { ...draft, name: e.target.value },
                        })
                      }
                      className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm font-bold"
                    />
                    <input
                      type="number"
                      value={merged.priority}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          [r.id]: { ...draft, priority: Number(e.target.value) },
                        })
                      }
                      className="w-20 border border-slate-300 rounded-md px-2 py-1 text-sm"
                    />
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={merged.enabled}
                        onChange={(e) =>
                          setEdited({
                            ...edited,
                            [r.id]: { ...draft, enabled: e.target.checked },
                          })
                        }
                      />
                      enabled
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        match_conditions (JSON)
                      </p>
                      <textarea
                        rows={3}
                        value={JSON.stringify(merged.match_conditions, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEdited({
                              ...edited,
                              [r.id]: { ...draft, match_conditions: parsed },
                            });
                          } catch {
                            /* keep typing */
                          }
                        }}
                        className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        route_to (JSON)
                      </p>
                      <textarea
                        rows={3}
                        value={JSON.stringify(merged.route_to, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setEdited({
                              ...edited,
                              [r.id]: { ...draft, route_to: parsed },
                            });
                          } catch {
                            /* keep typing */
                          }
                        }}
                        className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveRow(r.id)}
                      disabled={saving === r.id || Object.keys(draft).length === 0}
                      className="text-xs bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-3 py-1.5 rounded-md"
                    >
                      {saving === r.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRule(r.id)}
                      disabled={saving === r.id}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-md"
                    >
                      Delete
                    </button>
                    {r.notes && (
                      <span className="text-xs text-slate-500 italic self-center">{r.notes}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
