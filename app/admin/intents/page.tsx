"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface IntentRow {
  id: number;
  slug: string;
  label: string;
  description: string | null;
  default_route: string;
  default_brief_template: string | null;
  risk_level: "low" | "medium" | "high";
  enabled: boolean;
  sort_order: number;
}

const ROUTES = [
  "compare",
  "browse",
  "individual",
  "firm",
  "expert_team",
  "investor_brief",
  "listing_brief",
  "second_opinion",
  "guide",
] as const;

const RISK_LEVELS = ["low", "medium", "high"] as const;

export default function AdminIntentsPage() {
  const [intents, setIntents] = useState<IntentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/intents");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setIntents((json.intents ?? []) as IntentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(row: IntentRow) {
    setSavingId(row.id);
    try {
      await fetch("/api/admin/intents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          slug: row.slug,
          label: row.label,
          description: row.description ?? undefined,
          default_route: row.default_route,
          default_brief_template: row.default_brief_template ?? null,
          risk_level: row.risk_level,
          enabled: row.enabled,
          sort_order: row.sort_order,
        }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell
      title="Intent taxonomy"
      subtitle="Top-level user goals Get Matched routes against."
    >
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left py-2 pr-3">Slug</th>
                <th className="text-left py-2 pr-3">Label</th>
                <th className="text-left py-2 pr-3">Default route</th>
                <th className="text-left py-2 pr-3">Brief template</th>
                <th className="text-left py-2 pr-3">Risk</th>
                <th className="text-left py-2 pr-3">Order</th>
                <th className="text-left py-2 pr-3">Enabled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {intents.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs">{row.slug}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        setIntents((rs) =>
                          rs.map((r) =>
                            r.id === row.id ? { ...r, label: e.target.value } : r,
                          ),
                        )
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 text-sm w-full"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={row.default_route}
                      onChange={(e) =>
                        setIntents((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? { ...r, default_route: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                    >
                      {ROUTES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={row.default_brief_template ?? ""}
                      onChange={(e) =>
                        setIntents((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  default_brief_template: e.target.value || null,
                                }
                              : r,
                          ),
                        )
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs w-28"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={row.risk_level}
                      onChange={(e) =>
                        setIntents((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? { ...r, risk_level: e.target.value as IntentRow["risk_level"] }
                              : r,
                          ),
                        )
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                    >
                      {RISK_LEVELS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={row.sort_order}
                      onChange={(e) =>
                        setIntents((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? { ...r, sort_order: Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs w-20"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        setIntents((rs) =>
                          rs.map((r) =>
                            r.id === row.id ? { ...r, enabled: e.target.checked } : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => save(row)}
                      disabled={savingId === row.id}
                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-md"
                    >
                      Save
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
