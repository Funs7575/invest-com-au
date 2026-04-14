"use client";

import { useState } from "react";

interface ConfigRow {
  id: number;
  classifier: string;
  threshold_name: string;
  value: number;
  min_value: number | null;
  max_value: number | null;
  description: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

/**
 * Table of classifier thresholds with inline editing. Each row has
 * a numeric input + a Save button; Save POSTs to the config API and
 * updates the local state on success.
 *
 * If initialRows is empty (fresh installation) the editor shows an
 * explanation that classifiers will fall back to hardcoded defaults
 * until a row is added.
 */
export default function ConfigEditor({ initialRows }: { initialRows: ConfigRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-600">
          No thresholds configured yet — classifiers are running with
          their hardcoded defaults. Insert rows into{" "}
          <code className="bg-slate-100 px-1 rounded">classifier_config</code> to
          override them at runtime.
        </p>
      </div>
    );
  }

  async function save(row: ConfigRow) {
    const key = `${row.classifier}:${row.threshold_name}`;
    const draftValue = draft[key];
    const value = draftValue !== undefined ? Number(draftValue) : row.value;
    if (!Number.isFinite(value)) {
      setError("Value must be a number");
      return;
    }
    setError(null);
    setFlash(null);
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch("/api/admin/automation/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classifier: row.classifier,
          thresholdName: row.threshold_name,
          value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id ? { ...r, value, updated_at: new Date().toISOString() } : r,
        ),
      );
      setDraft((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      setFlash(`${row.classifier}.${row.threshold_name} saved`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  // Group rows by classifier for readability.
  const grouped = new Map<string, ConfigRow[]>();
  for (const r of rows) {
    if (!grouped.has(r.classifier)) grouped.set(r.classifier, []);
    grouped.get(r.classifier)!.push(r);
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          ⚠ {error}
        </div>
      )}
      {flash && (
        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
          ✓ {flash}
        </div>
      )}

      {[...grouped.entries()].map(([classifier, cls]) => (
        <section key={classifier} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">{classifier}</h3>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 text-left font-semibold">Threshold</th>
                <th className="px-4 py-2 text-left font-semibold">Value</th>
                <th className="px-4 py-2 text-left font-semibold">Bounds</th>
                <th className="px-4 py-2 text-left font-semibold">Updated</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {cls.map((row) => {
                const key = `${row.classifier}:${row.threshold_name}`;
                const isSaving = !!saving[key];
                const draftValue = draft[key];
                const hasDraft = draftValue !== undefined && Number(draftValue) !== row.value;
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-800">
                      <div className="font-mono text-xs">{row.threshold_name}</div>
                      {row.description && (
                        <div className="text-[0.65rem] text-slate-500 mt-0.5">{row.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="any"
                        defaultValue={row.value}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [key]: e.target.value }))
                        }
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-[0.65rem] text-slate-500 font-mono">
                      {row.min_value ?? "—"} … {row.max_value ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                      {row.updated_at ? new Date(row.updated_at).toLocaleString("en-AU") : "—"}
                      {row.updated_by && (
                        <div className="truncate max-w-[12ch]">{row.updated_by}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => save(row)}
                        disabled={!hasDraft || isSaving}
                        className="px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {isSaving ? "…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
