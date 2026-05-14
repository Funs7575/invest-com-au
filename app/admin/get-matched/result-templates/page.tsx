"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface TemplateRow {
  id: number;
  route: string;
  intent_slug: string | null;
  headline: string;
  why_text: string;
  checklist: { label: string; href?: string; brief_template?: string }[];
  primary_cta: { label: string; href: string };
  secondary_ctas: { label: string; href: string }[];
  cross_sells: { label: string; href: string; icon?: string }[];
  enabled: boolean;
}

export default function AdminGmResultTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<number, Partial<TemplateRow>>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/get-matched/result-templates");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load");
      setRows((json.templates ?? []) as TemplateRow[]);
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
      const res = await fetch("/api/admin/get-matched/result-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: merged.id,
          route: merged.route,
          intent_slug: merged.intent_slug ?? null,
          headline: merged.headline,
          why_text: merged.why_text,
          checklist: merged.checklist,
          primary_cta: merged.primary_cta,
          secondary_ctas: merged.secondary_ctas,
          cross_sells: merged.cross_sells,
          enabled: merged.enabled,
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
      title="Get Matched · Result templates"
      subtitle="The headline, checklist, primary CTA and cross-sells for each route × intent combo."
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
          <p className="text-sm text-slate-500">No templates.</p>
        ) : (
          rows.map((r) => {
            const draft = edited[r.id] ?? {};
            const merged = { ...r, ...draft };
            return (
              <article key={r.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="font-bold uppercase tracking-widest text-slate-700">
                    {merged.route}
                  </span>
                  {merged.intent_slug && (
                    <span className="text-slate-500">
                      · intent: {merged.intent_slug}
                    </span>
                  )}
                  <label className="ml-auto flex items-center gap-1">
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
                </div>
                <input
                  type="text"
                  value={merged.headline}
                  onChange={(e) =>
                    setEdited({
                      ...edited,
                      [r.id]: { ...draft, headline: e.target.value },
                    })
                  }
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm font-semibold mb-2"
                />
                <textarea
                  rows={2}
                  value={merged.why_text}
                  onChange={(e) =>
                    setEdited({
                      ...edited,
                      [r.id]: { ...draft, why_text: e.target.value },
                    })
                  }
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs mb-2"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <JsonField
                    label="checklist"
                    value={merged.checklist}
                    onChange={(v) =>
                      setEdited({
                        ...edited,
                        [r.id]: { ...draft, checklist: v as TemplateRow["checklist"] },
                      })
                    }
                  />
                  <JsonField
                    label="primary_cta"
                    value={merged.primary_cta}
                    onChange={(v) =>
                      setEdited({
                        ...edited,
                        [r.id]: { ...draft, primary_cta: v as TemplateRow["primary_cta"] },
                      })
                    }
                  />
                  <JsonField
                    label="secondary_ctas (max 3)"
                    value={merged.secondary_ctas}
                    onChange={(v) =>
                      setEdited({
                        ...edited,
                        [r.id]: { ...draft, secondary_ctas: v as TemplateRow["secondary_ctas"] },
                      })
                    }
                  />
                  <JsonField
                    label="cross_sells (max 3)"
                    value={merged.cross_sells}
                    onChange={(v) =>
                      setEdited({
                        ...edited,
                        [r.id]: { ...draft, cross_sells: v as TemplateRow["cross_sells"] },
                      })
                    }
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => save(r.id)}
                    disabled={saving === r.id || Object.keys(draft).length === 0}
                    className="text-xs bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-3 py-1.5 rounded-md"
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

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <textarea
        rows={4}
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            /* keep typing */
          }
        }}
        className="w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] font-mono"
      />
    </div>
  );
}
