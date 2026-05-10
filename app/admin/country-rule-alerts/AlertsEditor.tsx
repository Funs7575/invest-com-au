"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import {
  COUNTRY_RULE_ALERT_COUNTRIES,
  SEVERITY_LABELS,
  type AdminRuleAlert,
  type AlertSeverity,
  type AlertCountry,
} from "@/lib/country-rule-alerts";

const log = logger("admin-country-rule-alerts-editor");

const SEVERITIES: AlertSeverity[] = ["info", "warning", "urgent"];

type DraftAlert = Omit<AdminRuleAlert, "id" | "created_at" | "updated_at">;

const EMPTY_DRAFT: DraftAlert = {
  alert_key: "",
  country_code: "uk",
  severity: "info",
  headline: "",
  body: "",
  source: "",
  cta_href: null,
  cta_label: null,
  stales_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  display_order: 10,
  active: true,
};

export default function AlertsEditor() {
  const [rows, setRows] = useState<AdminRuleAlert[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [editing, setEditing] = useState<AdminRuleAlert | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftAlert>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  async function load() {
    const url = filter
      ? `/api/admin/country-rule-alerts?country_code=${encodeURIComponent(filter)}`
      : "/api/admin/country-rule-alerts";
    const res = await fetch(url);
    if (!res.ok) {
      log.error("Failed to load alerts", { status: res.status });
      return;
    }
    const data = (await res.json()) as { rows?: AdminRuleAlert[] };
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
      const res = await fetch("/api/admin/country-rule-alerts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...draft, id: editing.id } : draft),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "Save failed");
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
    if (!confirm("Delete this alert? This is destructive.")) return;
    const res = await fetch(`/api/admin/country-rule-alerts?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    await load();
  }

  function startEdit(row: AdminRuleAlert) {
    setEditing(row);
    setCreating(false);
    setDraft({
      alert_key: row.alert_key,
      country_code: row.country_code,
      severity: row.severity,
      headline: row.headline,
      body: row.body,
      source: row.source,
      cta_href: row.cta_href,
      cta_label: row.cta_label,
      stales_at: row.stales_at,
      display_order: row.display_order,
      active: row.active,
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
          <label className="text-sm text-slate-600">Country</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All</option>
            {COUNTRY_RULE_ALERT_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded"
        >
          + New alert
        </button>
      </div>

      {(editing || creating) && (
        <AlertForm
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

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Country</th>
              <th className="text-left px-3 py-2">Severity</th>
              <th className="text-left px-3 py-2">Headline</th>
              <th className="text-left px-3 py-2">Stales</th>
              <th className="text-left px-3 py-2">Active</th>
              <th className="text-left px-3 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-6">
                  No alerts match the filter.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isStale = new Date(r.stales_at) < new Date();
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono uppercase">{r.country_code}</td>
                  <td className="px-3 py-2 text-xs">{SEVERITY_LABELS[r.severity]}</td>
                  <td className="px-3 py-2">{r.headline}</td>
                  <td
                    className={`px-3 py-2 text-xs ${isStale ? "text-amber-700 font-bold" : "text-slate-500"}`}
                  >
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

interface AlertFormProps {
  draft: DraftAlert;
  setDraft: (d: DraftAlert) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  isEdit: boolean;
}

function AlertForm({ draft, setDraft, onSave, onCancel, busy, isEdit }: AlertFormProps) {
  function set<K extends keyof DraftAlert>(key: K, value: DraftAlert[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-5 space-y-3">
      <h2 className="font-bold text-slate-900">
        {isEdit ? "Edit alert" : "New alert"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Country (intent code, lowercase)">
          <select
            value={draft.country_code}
            onChange={(e) => set("country_code", e.target.value as AlertCountry)}
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            {COUNTRY_RULE_ALERT_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity">
          <select
            value={draft.severity}
            onChange={(e) => set("severity", e.target.value as AlertSeverity)}
            className="w-full text-sm border rounded px-2 py-1.5"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Display order (low first)">
          <input
            type="number"
            value={draft.display_order}
            onChange={(e) => set("display_order", parseInt(e.target.value, 10) || 0)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <Field label="Alert key (stable; used for sessionStorage dismissal — change only when text materially changes)">
        <input
          type="text"
          value={draft.alert_key}
          onChange={(e) => set("alert_key", e.target.value)}
          placeholder="e.g. uk-firb-established-ban-2025"
          className="w-full text-sm border rounded px-2 py-1.5 font-mono"
          disabled={isEdit}
        />
      </Field>

      <Field label="Headline">
        <input
          type="text"
          value={draft.headline}
          onChange={(e) => set("headline", e.target.value)}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <Field label="Body (1-3 sentences)">
        <textarea
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          rows={4}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Source (e.g. ATO, IRS, FIRB)">
          <input
            type="text"
            value={draft.source}
            onChange={(e) => set("source", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Stales at (review-by date)">
          <input
            type="date"
            value={draft.stales_at}
            onChange={(e) => set("stales_at", e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="CTA href (optional)">
          <input
            type="text"
            value={draft.cta_href ?? ""}
            onChange={(e) => set("cta_href", e.target.value || null)}
            placeholder="/foreign-investment/united-kingdom"
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="CTA label (optional)">
          <input
            type="text"
            value={draft.cta_label ?? ""}
            onChange={(e) => set("cta_label", e.target.value || null)}
            placeholder="UK investor guide"
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
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create alert"}
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
