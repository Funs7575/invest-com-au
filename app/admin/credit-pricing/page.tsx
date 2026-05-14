"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface PriceRow {
  id: number;
  brief_template: string;
  provider_type: string;
  credits_cost: number;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

export default function AdminCreditPricingPage() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/credit-pricing");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load prices");
      setRows((json.prices ?? []) as PriceRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = rows.map((r) => ({
        brief_template: r.brief_template,
        provider_type: r.provider_type,
        credits_cost: edited[r.id] ?? r.credits_cost,
        notes: r.notes ?? undefined,
      }));
      const res = await fetch("/api/admin/credit-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setEdited({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Brief credit pricing" subtitle="What it costs a provider to accept a brief.">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left py-2 pr-3">Template</th>
                  <th className="text-left py-2 pr-3">Provider type</th>
                  <th className="text-left py-2 pr-3">Credits</th>
                  <th className="text-left py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-mono">{r.brief_template}</td>
                    <td className="py-2 pr-3">{r.provider_type}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={edited[r.id] ?? r.credits_cost}
                        onChange={(e) =>
                          setEdited({ ...edited, [r.id]: Number(e.target.value) })
                        }
                        className="w-20 border border-slate-300 rounded-md px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{r.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={save}
              disabled={saving || Object.keys(edited).length === 0}
              className="mt-4 inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold px-3 py-2 rounded-lg"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </div>
    </AdminShell>
  );
}
