"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Pattern {
  id: number;
  pattern: string;
  category: string;
  severity: "warn" | "review" | "block";
  enabled: boolean;
  notes: string | null;
}

const SEVERITIES = ["warn", "review", "block"] as const;

export default function AdminRiskFlagsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftNew, setDraftNew] = useState({
    pattern: "",
    category: "",
    severity: "warn" as Pattern["severity"],
    notes: "",
  });
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/risk-patterns");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setPatterns((json.patterns ?? []) as Pattern[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(p: Pattern) {
    setBusy(p.id);
    try {
      await fetch("/api/admin/risk-patterns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          pattern: p.pattern,
          category: p.category,
          severity: p.severity,
          enabled: p.enabled,
          notes: p.notes ?? undefined,
        }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function deletePattern(id: number) {
    if (!confirm("Delete this pattern?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/risk-patterns?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function addNew() {
    setError(null);
    try {
      const res = await fetch("/api/admin/risk-patterns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: draftNew.pattern,
          category: draftNew.category,
          severity: draftNew.severity,
          enabled: true,
          notes: draftNew.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setDraftNew({ pattern: "", category: "", severity: "warn", notes: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <AdminShell title="Brief risk flags" subtitle="Pattern → category → severity. Used by /api/briefs to flag or block submissions.">
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Add pattern
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
          <input
            type="text"
            placeholder="pattern (substring)"
            value={draftNew.pattern}
            onChange={(e) => setDraftNew({ ...draftNew, pattern: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm sm:col-span-2"
          />
          <input
            type="text"
            placeholder="category"
            value={draftNew.category}
            onChange={(e) => setDraftNew({ ...draftNew, category: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm"
          />
          <select
            value={draftNew.severity}
            onChange={(e) =>
              setDraftNew({ ...draftNew, severity: e.target.value as Pattern["severity"] })
            }
            className="border border-slate-300 rounded-md px-2 py-1 text-sm"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addNew}
            disabled={!draftNew.pattern || !draftNew.category}
            className="text-xs bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-3 py-2 rounded-md"
          >
            Add
          </button>
        </div>
        <input
          type="text"
          placeholder="optional notes"
          value={draftNew.notes}
          onChange={(e) => setDraftNew({ ...draftNew, notes: e.target.value })}
          className="border border-slate-300 rounded-md px-2 py-1 text-sm w-full mt-2"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left py-2 pr-3">Pattern</th>
                <th className="text-left py-2 pr-3">Category</th>
                <th className="text-left py-2 pr-3">Severity</th>
                <th className="text-left py-2 pr-3">Enabled</th>
                <th className="text-left py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-mono">{p.pattern}</td>
                  <td className="py-2 pr-3">{p.category}</td>
                  <td className="py-2 pr-3">
                    <select
                      value={p.severity}
                      onChange={(e) =>
                        setPatterns((rows) =>
                          rows.map((r) =>
                            r.id === p.id ? { ...r, severity: e.target.value as Pattern["severity"] } : r,
                          ),
                        )
                      }
                      className="border border-slate-300 rounded-md px-1 py-0.5 text-xs"
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) =>
                        setPatterns((rows) =>
                          rows.map((r) =>
                            r.id === p.id ? { ...r, enabled: e.target.checked } : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => update(p)}
                      disabled={busy === p.id}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-2 py-1 rounded-md"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePattern(p.id)}
                      disabled={busy === p.id}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded-md"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
