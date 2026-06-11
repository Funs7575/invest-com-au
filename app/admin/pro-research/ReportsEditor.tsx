"use client";

/**
 * Pro-research report editor — list + create/edit form + publish /
 * unpublish / delete. Same architecture as
 * app/admin/country-rule-alerts/AlertsEditor.tsx (the repo's reference
 * admin CRUD page): client component fetching /api/admin/pro-research.
 */

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

const log = logger("admin-pro-research-editor");

const TIERS = ["pro", "pro_research", "pro_full"] as const;
type ReportTier = (typeof TIERS)[number];

interface ReportListRow {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  tier: ReportTier;
  published_at: string | null;
  cover_image_url: string | null;
  reading_time_minutes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface DraftReport {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  body_html: string;
  tier: ReportTier;
  cover_image_url: string | null;
  reading_time_minutes: number;
  tags: string[];
}

const EMPTY_DRAFT: DraftReport = {
  slug: "",
  title: "",
  kicker: "",
  summary: "",
  body_html: "",
  tier: "pro",
  cover_image_url: null,
  reading_time_minutes: 10,
  tags: [],
};

export default function ReportsEditor() {
  const [rows, setRows] = useState<ReportListRow[]>([]);
  const [editing, setEditing] = useState<ReportListRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftReport>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [loadingBody, setLoadingBody] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/pro-research");
    if (!res.ok) {
      log.error("Failed to load reports", { status: res.status });
      return;
    }
    const data = (await res.json()) as { rows?: ReportListRow[] };
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaveError(null);
    setBusy(true);
    try {
      const isEdit = editing !== null;
      const res = await fetch("/api/admin/pro-research", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...draft, id: editing.id } : draft),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(err.error || "Save failed");
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

  async function setPublished(row: ReportListRow, published: boolean) {
    setActionError(null);
    const res = await fetch("/api/admin/pro-research", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, published }),
    });
    if (!res.ok) {
      setActionError(published ? "Publish failed" : "Unpublish failed");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    setPendingDeleteId(null);
    setActionError(null);
    const res = await fetch(`/api/admin/pro-research?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setActionError("Delete failed");
      return;
    }
    await load();
  }

  async function startEdit(row: ReportListRow) {
    setCreating(false);
    setEditing(row);
    setSaveError(null);
    setLoadingBody(true);
    // The list endpoint omits body_html (large) — fetch the full row.
    try {
      const res = await fetch(`/api/admin/pro-research?id=${encodeURIComponent(row.id)}`);
      const full = res.ok
        ? ((await res.json()) as ReportListRow & { body_html?: string })
        : null;
      setDraft({
        slug: row.slug,
        title: row.title,
        kicker: row.kicker,
        summary: row.summary,
        body_html: full?.body_html ?? "",
        tier: row.tier,
        cover_image_url: row.cover_image_url,
        reading_time_minutes: row.reading_time_minutes,
        tags: row.tags,
      });
    } finally {
      setLoadingBody(false);
    }
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setSaveError(null);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {rows.filter((r) => r.published_at).length} published ·{" "}
          {rows.filter((r) => !r.published_at).length} draft
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded"
        >
          + New report
        </button>
      </div>

      {(editing || creating) && (
        <ReportForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
            setDraft(EMPTY_DRAFT);
            setSaveError(null);
          }}
          busy={busy}
          loadingBody={loadingBody}
          isEdit={editing !== null}
          saveError={saveError}
        />
      )}

      {actionError && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm" aria-label="Pro research reports">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Tier</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Updated</th>
              <th className="text-left px-3 py-2 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-6">
                  No reports yet — create the first one.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <span className="font-medium text-slate-900">{r.title}</span>
                  <span className="block text-xs text-slate-400 font-mono">/pro/research/{r.slug}</span>
                </td>
                <td className="px-3 py-2 text-xs font-mono">{r.tier}</td>
                <td className="px-3 py-2">
                  {r.published_at ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      Published {new Date(r.published_at).toLocaleDateString("en-AU")}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Draft</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(r.updated_at).toLocaleDateString("en-AU")}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline mr-2"
                    onClick={() => void startEdit(r)}
                  >
                    Edit
                  </button>
                  {r.published_at ? (
                    <button
                      type="button"
                      className="text-amber-700 hover:underline mr-2"
                      onClick={() => void setPublished(r, false)}
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-emerald-700 hover:underline mr-2"
                      onClick={() => void setPublished(r, true)}
                    >
                      Publish
                    </button>
                  )}
                  {r.published_at && (
                    <a
                      href={`/pro/research/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:underline mr-2"
                    >
                      View
                    </a>
                  )}
                  {pendingDeleteId === r.id ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-red-700 font-semibold">Delete?</span>
                      <button
                        type="button"
                        className="text-red-600 hover:underline font-bold"
                        onClick={() => void remove(r.id)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 hover:underline"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        setActionError(null);
                        setPendingDeleteId(r.id);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ReportFormProps {
  draft: DraftReport;
  setDraft: (d: DraftReport) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  loadingBody: boolean;
  isEdit: boolean;
  saveError?: string | null;
}

function ReportForm({ draft, setDraft, onSave, onCancel, busy, loadingBody, isEdit, saveError }: ReportFormProps) {
  function set<K extends keyof DraftReport>(key: K, value: DraftReport[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-5 space-y-3">
      <h2 className="font-bold text-slate-900">{isEdit ? "Edit report" : "New report (saved as draft)"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Title">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="ASX Broker Fee Audit — 2026 Q3"
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Slug (URL: /pro/research/<slug>; lowercase kebab-case)">
          <input
            type="text"
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="asx-broker-fee-audit-2026-q3"
            className="w-full text-sm border rounded px-2 py-1.5 font-mono"
            disabled={isEdit}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Kicker (card badge, e.g. 'Fee audit')">
          <input
            type="text"
            value={draft.kicker}
            onChange={(e) => set("kicker", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Minimum tier">
          <select
            value={draft.tier}
            onChange={(e) => set("tier", e.target.value as ReportTier)}
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reading time (minutes)">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            value={draft.reading_time_minutes}
            onChange={(e) => set("reading_time_minutes", Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <Field label="Summary (public — shown on the index card and above the paywall)">
        <textarea
          value={draft.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={3}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <Field
        label={`Body HTML (Pro-gated; sanitised server-side on save)${loadingBody ? " — loading…" : ""}`}
      >
        <textarea
          value={draft.body_html}
          onChange={(e) => set("body_html", e.target.value)}
          rows={14}
          disabled={loadingBody}
          placeholder="<h2>What changed this quarter</h2><p>…</p>"
          className="w-full text-sm border rounded px-2 py-1.5 font-mono"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cover image URL (optional)">
          <input
            type="text"
            value={draft.cover_image_url ?? ""}
            onChange={(e) => set("cover_image_url", e.target.value || null)}
            placeholder="/images/research/fee-audit-q3.png"
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Tags (comma-separated, max 12)">
          <input
            type="text"
            value={draft.tags.join(", ")}
            onChange={(e) =>
              set(
                "tags",
                e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .slice(0, 12),
              )
            }
            placeholder="fee-audit, brokers, asx"
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={busy || loadingBody}
          onClick={onSave}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create draft"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded"
        >
          Cancel
        </button>
        {saveError && (
          <p role="alert" className="text-xs text-red-700 ml-2">
            {saveError}
          </p>
        )}
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
