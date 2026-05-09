"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

const log = logger("admin-country-schemes-editor");

interface Scheme {
  id: number;
  country_code: string;
  audience: string;
  category: string;
  name: string;
  summary: string;
  body_md: string;
  threshold_cents: number | null;
  threshold_label: string | null;
  source_name: string;
  source_url: string;
  sourced_at: string;
  stales_at: string;
  display_order: number;
  active: boolean;
}

const AUDIENCES = [
  { value: "inbound_migrant", label: "Moving to AU" },
  { value: "us_au_dual", label: "US-AU dual" },
  { value: "non_resident_investor", label: "Non-resident investor" },
  { value: "outbound_australian", label: "Leaving AU" },
];

const CATEGORIES = [
  { value: "visa_pathway", label: "Visa pathway" },
  { value: "firb_threshold", label: "FIRB threshold" },
  { value: "tax_concession", label: "Tax concession" },
  { value: "super_rule", label: "Super rule" },
  { value: "pension_transfer", label: "Pension transfer" },
  { value: "first_home_buyer", label: "First-home buyer" },
  { value: "investor_grant", label: "Investor grant" },
  { value: "dual_tax_treaty", label: "Tax treaty" },
];

const COUNTRIES = ["GB", "US", "CN", "IN", "JP", "SG", "HK", "KR", "MY", "NZ", "AE", "SA"];

const EMPTY_FORM: Omit<Scheme, "id"> = {
  country_code: "GB",
  audience: "inbound_migrant",
  category: "tax_concession",
  name: "",
  summary: "",
  body_md: "",
  threshold_cents: null,
  threshold_label: null,
  source_name: "",
  source_url: "",
  sourced_at: new Date().toISOString().slice(0, 10),
  stales_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  display_order: 0,
  active: true,
};

export default function SchemesEditor() {
  const [rows, setRows] = useState<Scheme[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [editing, setEditing] = useState<Scheme | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Scheme, "id">>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  async function load() {
    const url = filter
      ? `/api/admin/country-schemes?country_code=${encodeURIComponent(filter)}`
      : "/api/admin/country-schemes";
    const res = await fetch(url);
    if (!res.ok) {
      log.error("Failed to load schemes", { status: res.status });
      return;
    }
    const data = await res.json();
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function save() {
    setBusy(true);
    try {
      const isEdit = editing !== null;
      const res = await fetch("/api/admin/country-schemes", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...draft, id: editing.id } : draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Save failed");
        return;
      }
      setEditing(null);
      setCreating(false);
      setDraft(EMPTY_FORM);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this scheme? This is destructive.")) return;
    const res = await fetch(`/api/admin/country-schemes?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    await load();
  }

  function startEdit(row: Scheme) {
    setEditing(row);
    setCreating(false);
    const { id: _id, ...rest } = row;
    void _id;
    setDraft(rest);
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setDraft(EMPTY_FORM);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Country</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded"
        >
          + New scheme
        </button>
      </div>

      {(editing || creating) && (
        <SchemeForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
            setDraft(EMPTY_FORM);
          }}
          busy={busy}
          isEdit={editing !== null}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Country</th>
              <th className="text-left px-3 py-2">Audience</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Stales</th>
              <th className="text-left px-3 py-2">Active</th>
              <th className="text-left px-3 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-6">
                  No schemes match the filter.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isStale = new Date(r.stales_at) < new Date();
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{r.country_code}</td>
                  <td className="px-3 py-2 text-xs">{r.audience}</td>
                  <td className="px-3 py-2 text-xs">{r.category}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className={`px-3 py-2 text-xs ${isStale ? "text-amber-700 font-bold" : "text-slate-500"}`}>
                    {r.stales_at}
                    {isStale && " ⚠"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-semibold ${r.active ? "text-emerald-700" : "text-slate-400"}`}
                    >
                      {r.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => remove(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SchemeFormProps {
  draft: Omit<Scheme, "id">;
  setDraft: (d: Omit<Scheme, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  isEdit: boolean;
}

function SchemeForm({ draft, setDraft, onSave, onCancel, busy, isEdit }: SchemeFormProps) {
  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-5 space-y-3">
      <h2 className="font-bold text-slate-900">{isEdit ? "Edit scheme" : "New scheme"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Country (ISO-2)">
          <select
            value={draft.country_code}
            onChange={(e) => set("country_code", e.target.value.toUpperCase())}
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Audience">
          <select
            value={draft.audience}
            onChange={(e) => set("audience", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Name">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <Field label="Summary (1-2 sentences shown on the card)">
        <textarea
          value={draft.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={2}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <Field label="Body (Markdown — bullets for details/strategy)">
        <textarea
          value={draft.body_md}
          onChange={(e) => set("body_md", e.target.value)}
          rows={6}
          className="w-full text-sm border rounded px-2 py-1.5 font-mono"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Threshold label (display, e.g. '$5M minimum')">
          <input
            type="text"
            value={draft.threshold_label ?? ""}
            onChange={(e) => set("threshold_label", e.target.value || null)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Threshold cents (numeric, optional)">
          <input
            type="number"
            value={draft.threshold_cents ?? ""}
            onChange={(e) =>
              set(
                "threshold_cents",
                e.target.value ? parseInt(e.target.value, 10) : null,
              )
            }
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Source name">
          <input
            type="text"
            value={draft.source_name}
            onChange={(e) => set("source_name", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Source URL">
          <input
            type="url"
            value={draft.source_url}
            onChange={(e) => set("source_url", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Sourced at (when verified)">
          <input
            type="date"
            value={draft.sourced_at}
            onChange={(e) => set("sourced_at", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Stales at (review-by)">
          <input
            type="date"
            value={draft.stales_at}
            onChange={(e) => set("stales_at", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Display order">
          <input
            type="number"
            value={draft.display_order}
            onChange={(e) =>
              set("display_order", parseInt(e.target.value, 10) || 0)
            }
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => set("active", e.target.checked)}
        />
        <span>Active (visible to public)</span>
      </label>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create scheme"}
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
