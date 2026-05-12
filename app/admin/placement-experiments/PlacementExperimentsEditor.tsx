"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import {
  ctr,
  conversionRate,
  normaliseVariants,
  normaliseMetrics,
  VARIANT_LABEL_PATTERN,
  type PlacementExperiment,
  type PlacementExperimentStatus,
  type PlacementVariant,
} from "@/lib/placement-experiments";

const log = logger("admin-placement-experiments-editor");

const STATUS_COLORS: Record<PlacementExperimentStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  running: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

interface DraftExperiment {
  slug: string;
  name: string;
  status: PlacementExperimentStatus;
  variants: PlacementVariant[];
  notes: string | null;
}

const EMPTY_DRAFT: DraftExperiment = {
  slug: "best/low-fees",
  name: "",
  status: "draft",
  variants: [
    { label: "control", broker_slug: null, weight: 50 },
    { label: "challenger", broker_slug: "", weight: 50 },
  ],
  notes: null,
};

function parseRow(raw: unknown): PlacementExperiment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const name = typeof r.name === "string" ? r.name : null;
  const status =
    typeof r.status === "string" &&
    ["draft", "running", "paused", "completed"].includes(r.status)
      ? (r.status as PlacementExperimentStatus)
      : null;
  if (id === null || !slug || !name || !status) return null;
  return {
    id,
    slug,
    name,
    status,
    variants: normaliseVariants(r.variants),
    metrics: normaliseMetrics(r.metrics),
    notes: typeof r.notes === "string" ? r.notes : null,
    winner_variant: typeof r.winner_variant === "string" ? r.winner_variant : null,
    created_at: typeof r.created_at === "string" ? r.created_at : "",
    updated_at: typeof r.updated_at === "string" ? r.updated_at : "",
    started_at: typeof r.started_at === "string" ? r.started_at : null,
    ended_at: typeof r.ended_at === "string" ? r.ended_at : null,
  };
}

export default function PlacementExperimentsEditor() {
  const [rows, setRows] = useState<PlacementExperiment[]>([]);
  const [filter, setFilter] = useState<"" | PlacementExperimentStatus>("");
  const [editing, setEditing] = useState<PlacementExperiment | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftExperiment>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  async function load() {
    const url = filter
      ? `/api/admin/placement-experiments?status=${filter}`
      : "/api/admin/placement-experiments";
    const res = await fetch(url);
    if (!res.ok) {
      log.error("Failed to load experiments", { status: res.status });
      return;
    }
    const data = (await res.json()) as { rows?: unknown[] };
    const parsed = (data.rows ?? [])
      .map(parseRow)
      .filter((r): r is PlacementExperiment => r !== null);
    setRows(parsed);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function validateDraft(d: DraftExperiment): string | null {
    if (!d.slug) return "Slug is required";
    if (!d.name) return "Name is required";
    if (d.variants.length < 2) return "Need at least 2 variants";
    const labels = new Set<string>();
    for (const v of d.variants) {
      if (!VARIANT_LABEL_PATTERN.test(v.label)) {
        return `Variant label "${v.label}" must be [a-z0-9][a-z0-9_-]{0,30}`;
      }
      if (labels.has(v.label)) return `Duplicate variant label: ${v.label}`;
      labels.add(v.label);
      if (v.weight < 0) return `Negative weight on ${v.label}`;
      if (
        v.broker_slug !== null &&
        v.broker_slug !== "" &&
        !/^[a-z0-9][a-z0-9-]*$/.test(v.broker_slug)
      ) {
        return `Invalid broker_slug on ${v.label}: ${v.broker_slug}`;
      }
    }
    return null;
  }

  async function save() {
    // Coerce empty broker_slug strings to null before validation, so
    // editors can leave the control variant's slug blank.
    const cleaned: DraftExperiment = {
      ...draft,
      variants: draft.variants.map((v) => ({
        ...v,
        broker_slug: v.broker_slug === "" ? null : v.broker_slug,
      })),
    };
    const err = validateDraft(cleaned);
    if (err) {
      alert(err);
      return;
    }

    setBusy(true);
    try {
      const isEdit = editing !== null;
      const body = isEdit
        ? {
            id: editing.id,
            name: cleaned.name,
            status: cleaned.status,
            variants: cleaned.variants,
            notes: cleaned.notes,
          }
        : cleaned;
      const res = await fetch("/api/admin/placement-experiments", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        alert(errData.error || "Save failed");
        return;
      }
      setEditing(null);
      setCreating(false);
      setDraft(EMPTY_DRAFT);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this experiment? Metrics will be lost.")) return;
    const res = await fetch(`/api/admin/placement-experiments?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    await load();
  }

  async function setStatus(row: PlacementExperiment, status: PlacementExperimentStatus) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/placement-experiments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        alert(errData.error || "Status change failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: PlacementExperiment) {
    setEditing(row);
    setCreating(false);
    setDraft({
      slug: row.slug,
      name: row.name,
      status: row.status,
      variants: row.variants.length >= 2 ? row.variants : EMPTY_DRAFT.variants,
      notes: row.notes,
    });
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Status</label>
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "" | PlacementExperimentStatus)
            }
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded"
        >
          + New experiment
        </button>
      </div>

      {(editing || creating) && (
        <ExperimentForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
            setDraft(EMPTY_DRAFT);
          }}
          busy={busy}
          isEdit={editing !== null}
        />
      )}

      {rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
          No experiments match the filter.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <ExperimentCard
              key={row.id}
              row={row}
              onEdit={() => startEdit(row)}
              onDelete={() => remove(row.id)}
              onStatus={(s) => setStatus(row, s)}
              busy={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentCard({
  row,
  onEdit,
  onDelete,
  onStatus,
  busy,
}: {
  row: PlacementExperiment;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: PlacementExperimentStatus) => void;
  busy: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">{row.name}</h3>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status]}`}
            >
              {row.status}
            </span>
            {row.winner_variant && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Winner: {row.winner_variant}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {row.slug}
            {row.started_at && (
              <> &middot; Started: {new Date(row.started_at).toLocaleDateString()}</>
            )}
            {row.ended_at && (
              <> &middot; Ended: {new Date(row.ended_at).toLocaleDateString()}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {row.status === "draft" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("running")}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Start
            </button>
          )}
          {row.status === "running" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("paused")}
              className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {row.status === "paused" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("running")}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {(row.status === "running" || row.status === "paused") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("completed")}
              className="px-3 py-1.5 bg-slate-600 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              Complete
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="text-blue-600 text-xs font-semibold hover:underline px-2"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-600 text-xs font-semibold hover:underline px-2"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Variant</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Broker</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Weight</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Impressions</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Clicks</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">CTR</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Conv</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">CR</th>
            </tr>
          </thead>
          <tbody>
            {row.variants.map((v) => {
              const m = row.metrics[v.label] ?? {};
              return (
                <tr key={v.label} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-semibold">
                    {v.label}
                    {row.winner_variant === v.label && (
                      <span className="ml-2 text-emerald-600">✓</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono text-slate-600">
                    {v.broker_slug ?? <em className="text-slate-400">— control —</em>}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{v.weight}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {(m.impressions ?? 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {(m.clicks ?? 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">
                    {(ctr(m) * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {(m.conversions ?? 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {(conversionRate(m) * 100).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {row.notes && (
        <p className="text-xs text-slate-500 mt-3 italic">{row.notes}</p>
      )}
    </div>
  );
}

function ExperimentForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy,
  isEdit,
}: {
  draft: DraftExperiment;
  setDraft: (d: DraftExperiment) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  isEdit: boolean;
}) {
  function setVariant(i: number, patch: Partial<PlacementVariant>) {
    const next = draft.variants.map((v, idx) =>
      idx === i ? { ...v, ...patch } : v,
    );
    setDraft({ ...draft, variants: next });
  }
  function addVariant() {
    if (draft.variants.length >= 8) return;
    setDraft({
      ...draft,
      variants: [
        ...draft.variants,
        { label: `variant_${draft.variants.length}`, broker_slug: "", weight: 25 },
      ],
    });
  }
  function removeVariant(i: number) {
    if (draft.variants.length <= 2) return;
    setDraft({
      ...draft,
      variants: draft.variants.filter((_, idx) => idx !== i),
    });
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-5 space-y-3">
      <h2 className="font-bold text-slate-900">
        {isEdit ? "Edit experiment" : "New experiment"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Placement slug (e.g. best/low-fees)">
          <input
            type="text"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            disabled={isEdit}
            className="w-full text-sm border rounded px-2 py-1.5 font-mono disabled:bg-slate-100"
          />
        </Field>
        <Field label="Status">
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft({
                ...draft,
                status: e.target.value as PlacementExperimentStatus,
              })
            }
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
      </div>

      <Field label="Experiment name (internal)">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="e.g. low-fees top-pick rotation — May 2026"
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-600">
          Variants (at least 2, max 8)
        </span>
        {draft.variants.map((v, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 items-center bg-white rounded border border-slate-200 p-2"
          >
            <input
              type="text"
              value={v.label}
              onChange={(e) => setVariant(i, { label: e.target.value })}
              placeholder="label"
              className="col-span-3 text-sm border rounded px-2 py-1 font-mono"
            />
            <input
              type="text"
              value={v.broker_slug ?? ""}
              onChange={(e) => setVariant(i, { broker_slug: e.target.value })}
              placeholder="broker slug (blank = control)"
              className="col-span-6 text-sm border rounded px-2 py-1 font-mono"
            />
            <input
              type="number"
              value={v.weight}
              onChange={(e) => setVariant(i, { weight: parseInt(e.target.value, 10) || 0 })}
              min={0}
              max={10000}
              className="col-span-2 text-sm border rounded px-2 py-1"
            />
            <button
              type="button"
              onClick={() => removeVariant(i)}
              disabled={draft.variants.length <= 2}
              className="col-span-1 text-red-600 text-xs font-bold disabled:opacity-30"
              aria-label="Remove variant"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addVariant}
          disabled={draft.variants.length >= 8}
          className="text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
        >
          + Add variant
        </button>
      </div>

      <Field label="Notes (optional — context for editorial / future-you)">
        <textarea
          value={draft.notes ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, notes: e.target.value || null })
          }
          rows={2}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create experiment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
