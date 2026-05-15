"use client";

import { useState } from "react";
import type { RankingSurface } from "@/lib/marketplace-ranking";

export interface WeightRow {
  id: number;
  surface: RankingSurface;
  signal: string;
  weight_bps: number;
  enabled: boolean;
  notes: string;
  updated_at: string | null;
}

interface PreviewEntry {
  slug: string;
  name: string;
  score: number;
}

interface Props {
  advisorRows: WeightRow[];
  teamRows: WeightRow[];
  advisorPreview: PreviewEntry[];
  teamPreview: PreviewEntry[];
}

export default function MarketplaceRankingClient({
  advisorRows,
  teamRows,
  advisorPreview,
  teamPreview,
}: Props) {
  return (
    <div className="space-y-10">
      <SurfaceSection
        surface="advisors"
        title="Advisors surface"
        initialRows={advisorRows}
        preview={advisorPreview}
      />
      <SurfaceSection
        surface="teams"
        title="Teams surface"
        initialRows={teamRows}
        preview={teamPreview}
      />
    </div>
  );
}

interface SurfaceSectionProps {
  surface: RankingSurface;
  title: string;
  initialRows: WeightRow[];
  preview: PreviewEntry[];
}

function SurfaceSection({
  surface,
  title,
  initialRows,
  preview,
}: SurfaceSectionProps) {
  const [rows, setRows] = useState<WeightRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRow(idx: number, patch: Partial<WeightRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketplace-ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          weights: rows.map((r) => ({
            signal: r.signal,
            weight_bps: r.weight_bps,
            enabled: r.enabled,
            notes: r.notes || null,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setMessage(`Saved ${rows.length} weight row(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || rows.length === 0}
          className="px-4 py-2 bg-amber-500 text-black font-medium rounded hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {message && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 text-center">
            No weights configured for this surface. Defaults from{" "}
            <code>lib/marketplace-ranking</code> apply until rows are seeded.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Signal</th>
                <th className="text-left px-4 py-2 font-medium">Weight (bps)</th>
                <th className="text-left px-4 py-2 font-medium">Enabled</th>
                <th className="text-left px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700 font-mono text-xs">
                    {row.signal}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="100"
                      min="0"
                      max="100000"
                      value={row.weight_bps}
                      onChange={(e) =>
                        updateRow(idx, {
                          weight_bps:
                            parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        updateRow(idx, { enabled: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <textarea
                      value={row.notes}
                      onChange={(e) =>
                        updateRow(idx, { notes: e.target.value })
                      }
                      rows={1}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PreviewBlock preview={preview} surface={surface} />
    </section>
  );
}

function PreviewBlock({
  preview,
  surface,
}: {
  preview: PreviewEntry[];
  surface: RankingSurface;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Live preview — top 5 {surface} by current saved weights
      </h3>
      {preview.length === 0 ? (
        <p className="text-xs text-slate-500">
          No active professionals to preview. Save weights and reload to
          refresh.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {preview.map((p, i) => (
            <li
              key={p.slug}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold w-6">
                  #{i + 1}
                </span>
                <span className="text-slate-900">{p.name}</span>
                <span className="text-xs text-slate-400">/{p.slug}</span>
              </span>
              <span className="font-mono text-xs text-emerald-700">
                {p.score.toFixed(3)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[11px] text-slate-400 mt-3">
        Preview reflects the weights currently saved in the DB. Reload after
        clicking Save to see updates.
      </p>
    </div>
  );
}
