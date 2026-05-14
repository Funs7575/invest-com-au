"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface QuestionRow {
  id: number;
  slug: string;
  step: number;
  kind: string;
  prompt: string;
  subtitle: string | null;
  options: Record<string, unknown>[];
  shown_if: Record<string, unknown>;
  maps_to: string;
  risk_weight: number;
  mode: string;
  enabled: boolean;
  sort_order: number;
}

const KINDS = ["select", "multiselect", "text", "number", "contextual"] as const;
const MODES = ["fast", "guided", "both"] as const;

export default function AdminGmQuestionsPage() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<number, Partial<QuestionRow>>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/get-matched/questions");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setRows((json.questions ?? []) as QuestionRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: number) {
    setSaving(id);
    setError(null);
    try {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      const merged = { ...row, ...edited[id] };
      const res = await fetch("/api/admin/get-matched/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: merged.id,
          slug: merged.slug,
          step: merged.step,
          kind: merged.kind,
          prompt: merged.prompt,
          subtitle: merged.subtitle ?? undefined,
          options: merged.options,
          shown_if: merged.shown_if,
          maps_to: merged.maps_to,
          risk_weight: merged.risk_weight,
          mode: merged.mode,
          enabled: merged.enabled,
          sort_order: merged.sort_order,
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

  return (
    <AdminShell
      title="Get Matched · Questions"
      subtitle="Adaptive question registry. Edit prompts, options, and shown-if rules."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
          {error}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No questions.</p>
        ) : (
          rows.map((r) => {
            const draft = edited[r.id] ?? {};
            const merged = { ...r, ...draft };
            return (
              <article key={r.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase tracking-widest text-slate-500">
                    step {merged.step}
                  </span>
                  <span className="text-xs font-mono">{merged.slug}</span>
                  <span className="ml-auto text-xs">
                    <select
                      value={merged.kind}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          [r.id]: { ...draft, kind: e.target.value },
                        })
                      }
                      className="border border-slate-300 rounded-md px-1 py-0.5"
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="text-xs">
                    <select
                      value={merged.mode}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          [r.id]: { ...draft, mode: e.target.value },
                        })
                      }
                      className="border border-slate-300 rounded-md px-1 py-0.5"
                    >
                      {MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
                <input
                  type="text"
                  value={merged.prompt}
                  onChange={(e) =>
                    setEdited({
                      ...edited,
                      [r.id]: { ...draft, prompt: e.target.value },
                    })
                  }
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-semibold mb-2"
                />
                <input
                  type="text"
                  value={merged.subtitle ?? ""}
                  onChange={(e) =>
                    setEdited({
                      ...edited,
                      [r.id]: { ...draft, subtitle: e.target.value },
                    })
                  }
                  placeholder="Subtitle (optional)"
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs mb-2 text-slate-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      options (JSON)
                    </p>
                    <textarea
                      rows={4}
                      value={JSON.stringify(merged.options, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEdited({
                            ...edited,
                            [r.id]: { ...draft, options: parsed },
                          });
                        } catch {
                          /* keep typing */
                        }
                      }}
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      shown_if (JSON)
                    </p>
                    <textarea
                      rows={4}
                      value={JSON.stringify(merged.shown_if, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEdited({
                            ...edited,
                            [r.id]: { ...draft, shown_if: parsed },
                          });
                        } catch {
                          /* keep typing */
                        }
                      }}
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 items-center text-xs">
                  <label className="flex items-center gap-1">
                    maps_to
                    <input
                      type="text"
                      value={merged.maps_to}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          [r.id]: { ...draft, maps_to: e.target.value },
                        })
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 w-32"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    sort
                    <input
                      type="number"
                      value={merged.sort_order}
                      onChange={(e) =>
                        setEdited({
                          ...edited,
                          [r.id]: { ...draft, sort_order: Number(e.target.value) },
                        })
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 w-20"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    enabled
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
                  </label>
                  <button
                    type="button"
                    onClick={() => save(r.id)}
                    disabled={saving === r.id || Object.keys(draft).length === 0}
                    className="ml-auto text-xs bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-3 py-1.5 rounded-md"
                  >
                    {saving === r.id ? "Saving…" : "Save"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
